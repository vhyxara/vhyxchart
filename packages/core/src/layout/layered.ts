import type { FlowDiagram, FlowNode, NodeShape } from '../model.js';
import { measure } from './text.js';
import { routeToPath, pointAt, smoothRoute, type Point, type Route, type Rect } from './geometry.js';
import type { FlowLayout, LaidOutEdge, LaidOutGroup, LaidOutNode } from './types.js';

/** Layout constants shared with the renderer. */
export const FONT_SIZE = 14;
export const LABEL_FONT_SIZE = 12;
const MAX_LABEL_WIDTH = 180;
const PAD_X = 16;
const PAD_Y = 10;
const GROUP_PAD = 16;
const GROUP_LABEL = 22;
const MARGIN = 24;

const SPACING = {
  compact: { node: 28, rank: 46 },
  normal: { node: 44, rank: 64 },
  relaxed: { node: 64, rank: 92 },
} as const;

interface VNode {
  id: string;
  /** Size across the rank (x in TB space). */
  w: number;
  /** Size along the rank axis (y in TB space). */
  h: number;
  rank: number;
  order: number;
  x: number;
  dummy: boolean;
  group?: string;
  shape?: NodeShape;
}

/** Visual size of a node from its label and shape. */
export function nodeSize(node: FlowNode): { width: number; height: number; lines: string[] } {
  if (node.shape === 'start') return { width: 18, height: 18, lines: [] };
  if (node.shape === 'end') return { width: 22, height: 22, lines: [] };
  const box = measure(node.label, FONT_SIZE, MAX_LABEL_WIDTH);
  let width = Math.max(box.width + PAD_X * 2, 64);
  let height = Math.max(box.height + PAD_Y * 2, 38);
  switch (node.shape) {
    case 'circle':
    case 'doublecircle': {
      const d = Math.max(width, height) + (node.shape === 'doublecircle' ? 12 : 4);
      width = d;
      height = d;
      break;
    }
    case 'diamond':
      width = width * 1.45;
      height = Math.max(height * 1.45, width * 0.55);
      break;
    case 'hexagon':
      width += 24;
      break;
    case 'parallelogram':
    case 'parallelogram-alt':
    case 'trapezoid':
    case 'trapezoid-alt':
      width += 28;
      break;
    case 'cylinder':
      height += 14;
      break;
    case 'stadium':
      width += 12;
      break;
    case 'subroutine':
      width += 16;
      break;
    case 'asymmetric':
      width += 14;
      break;
    default:
      break;
  }
  return { width: Math.round(width), height: Math.round(height), lines: box.lines };
}

/** Pool-adjacent-violators: minimise Σw(y−t)² subject to y non-decreasing. */
function isotonic(targets: number[], weights: number[]): number[] {
  const blocks: Array<{ value: number; weight: number; count: number }> = [];
  for (let i = 0; i < targets.length; i++) {
    blocks.push({ value: targets[i] as number, weight: weights[i] as number, count: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1] as { value: number; weight: number; count: number };
      const a = blocks[blocks.length - 2] as { value: number; weight: number; count: number };
      if (a.value <= b.value) break;
      const weight = a.weight + b.weight;
      blocks.splice(blocks.length - 2, 2, { value: (a.value * a.weight + b.value * b.weight) / weight, weight, count: a.count + b.count });
    }
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.count; k++) out.push(b.value);
  return out;
}

function countCrossings(layers: VNode[][], edgesByUpper: Map<string, string[]>): number {
  let crossings = 0;
  for (let r = 0; r < layers.length - 1; r++) {
    const upper = layers[r] as VNode[];
    const lowerPos = new Map((layers[r + 1] as VNode[]).map((n) => [n.id, n.order]));
    const pairs: Array<[number, number]> = [];
    for (const u of upper) for (const v of edgesByUpper.get(u.id) ?? []) {
      const p = lowerPos.get(v);
      if (p !== undefined) pairs.push([u.order, p]);
    }
    for (let a = 0; a < pairs.length; a++) {
      for (let b = a + 1; b < pairs.length; b++) {
        const [a0, a1] = pairs[a] as [number, number];
        const [b0, b1] = pairs[b] as [number, number];
        if ((a0 - b0) * (a1 - b1) < 0) crossings++;
      }
    }
  }
  return crossings;
}

/**
 * Layered (Sugiyama-style) layout for flow diagrams:
 * cycle breaking → longest-path ranking → dummy nodes → barycentric
 * crossing reduction (group-aware) → isotonic coordinate assignment →
 * smooth spline routing with distributed ports.
 *
 * Deterministic: same input, same output, in every runtime.
 */
export function layoutFlow(diagram: FlowDiagram): FlowLayout {
  const horizontal = diagram.direction === 'LR' || diagram.direction === 'RL';
  const spacing = SPACING[diagram.config.spacing];
  const hasGroups = diagram.groups.length > 0;
  const titleHeight = diagram.config.title ? 36 : 0;

  // ── Sizes ───────────────────────────────────────────────
  const sizes = new Map(diagram.nodes.map((n) => [n.id, nodeSize(n)]));
  const v = new Map<string, VNode>();
  diagram.nodes.forEach((n, idx) => {
    const s = sizes.get(n.id) as { width: number; height: number };
    v.set(n.id, {
      id: n.id,
      w: horizontal ? s.height : s.width,
      h: horizontal ? s.width : s.height,
      rank: 0,
      order: idx,
      x: 0,
      dummy: false,
      shape: n.shape,
      ...(n.group !== undefined ? { group: n.group } : {}),
    });
  });

  // ── Cycle breaking (DFS, declaration order) ──────────────
  const out = new Map<string, string[]>();
  for (const e of diagram.edges) {
    if (e.from === e.to) continue;
    out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  }
  const reversed = new Set<string>();
  const state = new Map<string, 0 | 1 | 2>();
  const dfs = (id: string): void => {
    state.set(id, 1);
    for (const e of diagram.edges) {
      if (e.from !== id || e.from === e.to) continue;
      const s = state.get(e.to) ?? 0;
      if (s === 1) reversed.add(e.id);
      else if (s === 0) dfs(e.to);
    }
    state.set(id, 2);
  };
  for (const n of diagram.nodes) if ((state.get(n.id) ?? 0) === 0) dfs(n.id);

  const dag = diagram.edges
    .filter((e) => e.from !== e.to)
    .map((e) => (reversed.has(e.id) ? { id: e.id, from: e.to, to: e.from } : { id: e.id, from: e.from, to: e.to }));

  // ── Ranking (longest path) ───────────────────────────────
  const indeg = new Map(diagram.nodes.map((n) => [n.id, 0]));
  for (const e of dag) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const queue = diagram.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const topo: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    topo.push(id);
    for (const e of dag) {
      if (e.from !== id) continue;
      const to = v.get(e.to) as VNode;
      to.rank = Math.max(to.rank, (v.get(id) as VNode).rank + 1);
      indeg.set(e.to, (indeg.get(e.to) ?? 0) - 1);
      if (indeg.get(e.to) === 0) queue.push(e.to);
    }
  }
  // Pull pure sources down next to their first child (avoids long first edges).
  for (const id of [...topo].reverse()) {
    const node = v.get(id) as VNode;
    const hasIn = dag.some((e) => e.to === id);
    const children = dag.filter((e) => e.from === id).map((e) => (v.get(e.to) as VNode).rank);
    if (!hasIn && children.length > 0) node.rank = Math.max(0, Math.min(...children) - 1);
  }

  // ── Dummy nodes for long edges ───────────────────────────
  const chains = new Map<string, string[]>();
  const layerEdges: Array<{ from: string; to: string }> = [];
  for (const e of dag) {
    const a = v.get(e.from) as VNode;
    const b = v.get(e.to) as VNode;
    const chain = [e.from];
    let prev = e.from;
    for (let r = a.rank + 1; r < b.rank; r++) {
      const id = `__d_${e.id}_${r}`;
      v.set(id, { id, w: 0, h: 0, rank: r, order: 0, x: 0, dummy: true, ...(a.group !== undefined && a.group === b.group ? { group: a.group } : {}) });
      layerEdges.push({ from: prev, to: id });
      chain.push(id);
      prev = id;
    }
    layerEdges.push({ from: prev, to: e.to });
    chain.push(e.to);
    chains.set(e.id, chain);
  }

  const maxRank = Math.max(0, ...[...v.values()].map((n) => n.rank));
  const layers: VNode[][] = Array.from({ length: maxRank + 1 }, () => []);
  const firstSeen = new Map<string, number>();
  let seen = 0;
  const visitOrder = (id: string): void => {
    if (firstSeen.has(id)) return;
    firstSeen.set(id, seen++);
    for (const e of layerEdges) if (e.from === id) visitOrder(e.to);
  };
  for (const n of diagram.nodes) visitOrder(n.id);
  for (const node of v.values()) (layers[node.rank] as VNode[]).push(node);
  for (const layer of layers) {
    layer.sort((a, b) => (firstSeen.get(a.id) ?? 0) - (firstSeen.get(b.id) ?? 0));
    layer.forEach((n, i) => (n.order = i));
  }

  const up = new Map<string, string[]>();
  const down = new Map<string, string[]>();
  for (const e of layerEdges) {
    down.set(e.from, [...(down.get(e.from) ?? []), e.to]);
    up.set(e.to, [...(up.get(e.to) ?? []), e.from]);
  }

  // ── Crossing reduction ───────────────────────────────────
  const sortLayer = (layer: VNode[], neighbours: Map<string, string[]>): void => {
    const bary = new Map<string, number>();
    for (const n of layer) {
      const ns = (neighbours.get(n.id) ?? []).map((id) => (v.get(id) as VNode).order);
      bary.set(n.id, ns.length > 0 ? ns.reduce((s, x) => s + x, 0) / ns.length : n.order);
    }
    // Keep group members contiguous: sort by group mean first.
    const groupMean = new Map<string, number>();
    if (hasGroups) {
      const acc = new Map<string, number[]>();
      for (const n of layer) if (n.group) acc.set(n.group, [...(acc.get(n.group) ?? []), bary.get(n.id) as number]);
      for (const [g, xs] of acc) groupMean.set(g, xs.reduce((s, x) => s + x, 0) / xs.length);
    }
    const key = (n: VNode): number => (n.group !== undefined ? (groupMean.get(n.group) as number) : (bary.get(n.id) as number));
    layer.sort((a, b) => key(a) - key(b) || (a.group ?? '').localeCompare(b.group ?? '') || (bary.get(a.id) as number) - (bary.get(b.id) as number) || a.order - b.order);
    layer.forEach((n, i) => (n.order = i));
  };

  let best = countCrossings(layers, down);
  let bestOrder = new Map([...v.values()].map((n) => [n.id, n.order]));
  for (let iter = 0; iter < 24 && best > 0; iter++) {
    if (iter % 2 === 0) for (let r = 1; r < layers.length; r++) sortLayer(layers[r] as VNode[], up);
    else for (let r = layers.length - 2; r >= 0; r--) sortLayer(layers[r] as VNode[], down);
    const c = countCrossings(layers, down);
    if (c < best) {
      best = c;
      bestOrder = new Map([...v.values()].map((n) => [n.id, n.order]));
    }
  }
  for (const layer of layers) {
    layer.sort((a, b) => (bestOrder.get(a.id) as number) - (bestOrder.get(b.id) as number));
    layer.forEach((n, i) => (n.order = i));
  }

  // ── Coordinates across ranks (isotonic regression) ───────
  const sep = (a: VNode, b: VNode): number => {
    const base = a.dummy && b.dummy ? 14 : a.dummy || b.dummy ? spacing.node / 2 : spacing.node;
    const groupGap = a.group !== b.group && (a.group !== undefined || b.group !== undefined) ? GROUP_PAD * 2 : 0;
    return (a.w + b.w) / 2 + base + groupGap;
  };
  for (const layer of layers) {
    let x = 0;
    layer.forEach((n, i) => {
      if (i > 0) x += sep(layer[i - 1] as VNode, n);
      n.x = x;
    });
  }
  const place = (layer: VNode[], desired: number[], weights: number[]): void => {
    const offsets: number[] = [];
    let acc = 0;
    layer.forEach((n, i) => {
      if (i > 0) acc += sep(layer[i - 1] as VNode, n);
      offsets.push(acc);
    });
    const fitted = isotonic(desired.map((d, i) => d - (offsets[i] as number)), weights);
    layer.forEach((n, i) => (n.x = (fitted[i] as number) + (offsets[i] as number)));
  };
  for (let iter = 0; iter < 12; iter++) {
    const order = iter % 2 === 0 ? layers : [...layers].reverse();
    for (const layer of order) {
      const desired: number[] = [];
      const weights: number[] = [];
      for (const n of layer) {
        const ns = [...(up.get(n.id) ?? []), ...(down.get(n.id) ?? [])].map((id) => (v.get(id) as VNode).x);
        desired.push(ns.length > 0 ? ns.reduce((s, x) => s + x, 0) / ns.length : n.x);
        weights.push(n.dummy ? 2 : ns.length > 0 ? 1 : 0.2);
      }
      place(layer, desired, weights);
    }
  }

  // ── Rank positions ───────────────────────────────────────
  const labelBoxes = new Map(
    diagram.edges.filter((e) => e.label).map((e) => [e.id, measure(e.label as string, LABEL_FONT_SIZE, 140)]),
  );
  const rankSize = layers.map((layer) => Math.max(0, ...layer.map((n) => n.h)));
  const gapExtra = layers.map(() => 0);
  for (const e of dag) {
    const box = labelBoxes.get(e.id);
    if (!box) continue;
    const r = (v.get(e.from) as VNode).rank;
    const along = horizontal ? box.width + 16 : box.height + 10;
    gapExtra[r] = Math.max(gapExtra[r] as number, along);
  }
  const rankY: number[] = [];
  let y = 0;
  layers.forEach((_, r) => {
    rankY.push(y + (rankSize[r] as number) / 2);
    y += (rankSize[r] as number) + spacing.rank + (gapExtra[r] as number) + (hasGroups ? GROUP_LABEL : 0);
  });

  // ── Map to final coordinates ─────────────────────────────
  const flipRank = diagram.direction === 'BT' || diagram.direction === 'RL';
  const totalRank = y;
  const toXY = (cross: number, rank: number): Point => {
    const rr = flipRank ? totalRank - rank : rank;
    return horizontal ? { x: rr, y: cross } : { x: cross, y: rr };
  };

  const laidNodes = new Map<string, LaidOutNode>();
  for (const n of diagram.nodes) {
    const vn = v.get(n.id) as VNode;
    const s = sizes.get(n.id) as { width: number; height: number; lines: string[] };
    const p = toXY(vn.x, rankY[vn.rank] as number);
    laidNodes.set(n.id, { id: n.id, x: p.x, y: p.y, width: s.width, height: s.height, shape: n.shape, lines: s.lines, node: n });
  }

  // ── Edge routing ─────────────────────────────────────────
  const portOffset = (nodeId: string, neighbourIds: string[], neighbour: string): number => {
    const node = v.get(nodeId) as VNode;
    if (neighbourIds.length <= 1 || node.shape === 'diamond' || node.shape === 'circle' || node.shape === 'doublecircle' || node.shape === 'start' || node.shape === 'end') return 0;
    const sorted = [...neighbourIds].sort((a, b) => (v.get(a) as VNode).x - (v.get(b) as VNode).x);
    const idx = sorted.indexOf(neighbour);
    const span = node.w * 0.6;
    return -span / 2 + (span * idx) / (sorted.length - 1);
  };

  const edges: LaidOutEdge[] = [];
  for (const e of diagram.edges) {
    const a = laidNodes.get(e.from);
    const b = laidNodes.get(e.to);
    if (!a || !b) continue;
    let route: Route;
    if (e.from === e.to) {
      const s = horizontal ? { x: a.x, y: a.y + a.height / 2 } : { x: a.x + a.width / 2, y: a.y };
      const loop = 28;
      route = horizontal
        ? { segments: [{ p0: { x: a.x - 10, y: s.y }, c1: { x: a.x - 20, y: s.y + loop }, c2: { x: a.x + 20, y: s.y + loop }, p1: { x: a.x + 10, y: s.y } }] }
        : { segments: [{ p0: { x: s.x, y: a.y - 10 }, c1: { x: s.x + loop, y: a.y - 20 }, c2: { x: s.x + loop, y: a.y + 20 }, p1: { x: s.x, y: a.y + 10 } }] };
    } else {
      const chain = chains.get(e.id) as string[];
      const isRev = reversed.has(e.id);
      const top = chain[0] as string;
      const bottom = chain[chain.length - 1] as string;
      const second = chain[1] as string;
      const penultimate = chain[chain.length - 2] as string;
      const topV = v.get(top) as VNode;
      const bottomV = v.get(bottom) as VNode;
      const pts: Point[] = [];
      const startCross = topV.x + portOffset(top, down.get(top) ?? [], second);
      const endCross = bottomV.x + portOffset(bottom, up.get(bottom) ?? [], penultimate);
      pts.push(toXY(startCross, (rankY[topV.rank] as number) + topV.h / 2));
      for (const id of chain.slice(1, -1)) {
        const d = v.get(id) as VNode;
        pts.push(toXY(d.x, rankY[d.rank] as number));
      }
      pts.push(toXY(endCross, (rankY[bottomV.rank] as number) - bottomV.h / 2));
      if (isRev) pts.reverse();
      route = smoothRoute(pts, horizontal ? 'x' : 'y');
    }
    const box = labelBoxes.get(e.id);
    const mid = pointAt(route, 0.5);
    edges.push({
      id: e.id,
      from: e.from,
      to: e.to,
      route,
      path: routeToPath(route),
      edge: e,
      ...(box ? { label: { lines: box.lines, x: mid.x, y: mid.y, width: box.width + 12, height: box.height + 6 } } : {}),
    });
  }

  // ── Parallel edges: fan out edges that share the same pair of nodes ──
  const pairs = new Map<string, LaidOutEdge[]>();
  for (const e of edges) {
    if (e.from === e.to) continue;
    const key = [e.from, e.to].sort().join('\u0000');
    pairs.set(key, [...(pairs.get(key) ?? []), e]);
  }
  for (const group of pairs.values()) {
    if (group.length < 2) continue;
    // Stable orientation: measure the normal against the canonical (sorted) direction.
    const [ka, kb] = [group[0]!.from, group[0]!.to].sort();
    const A = laidNodes.get(ka as string) as LaidOutNode;
    const B = laidNodes.get(kb as string) as LaidOutNode;
    const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const nx = -(B.y - A.y) / len;
    const ny = (B.x - A.x) / len;
    group.forEach((e, i) => {
      const d = (i - (group.length - 1) / 2) * 24;
      const move = (p: Point, f: number): Point => ({ x: p.x + nx * d * f, y: p.y + ny * d * f });
      const segs = e.route.segments;
      e.route = {
        segments: segs.map((sg, k) => ({
          p0: move(sg.p0, k === 0 ? 0.35 : 1),
          c1: move(sg.c1, 1),
          c2: move(sg.c2, 1),
          p1: move(sg.p1, k === segs.length - 1 ? 0.35 : 1),
        })),
      };
      e.path = routeToPath(e.route);
      if (e.label) {
        const mid = pointAt(e.route, 0.5);
        e.label = { ...e.label, x: mid.x, y: mid.y };
      }
    });
  }

  // ── Groups ───────────────────────────────────────────────
  const depthOf = (id: string): number => {
    let d = 0;
    let g = diagram.groups.find((x) => x.id === id);
    while (g?.parent !== undefined) {
      d++;
      g = diagram.groups.find((x) => x.id === g?.parent);
    }
    return d;
  };
  const groupRects = new Map<string, Rect>();
  const byDepth = [...diagram.groups].sort((a, b) => depthOf(b.id) - depthOf(a.id));
  for (const g of byDepth) {
    const members: Rect[] = [];
    for (const n of laidNodes.values()) {
      if (n.node.group === g.id) members.push({ x: n.x - n.width / 2, y: n.y - n.height / 2, width: n.width, height: n.height });
    }
    for (const child of diagram.groups.filter((c) => c.parent === g.id)) {
      const r = groupRects.get(child.id);
      if (r) members.push(r);
    }
    if (members.length === 0) continue;
    const minX = Math.min(...members.map((m) => m.x)) - GROUP_PAD;
    const minY = Math.min(...members.map((m) => m.y)) - GROUP_PAD - GROUP_LABEL;
    const maxX = Math.max(...members.map((m) => m.x + m.width)) + GROUP_PAD;
    const maxY = Math.max(...members.map((m) => m.y + m.height)) + GROUP_PAD;
    const labelW = measure(g.label, LABEL_FONT_SIZE, 400).width + GROUP_PAD * 2;
    groupRects.set(g.id, { x: minX, y: minY, width: Math.max(maxX - minX, labelW), height: maxY - minY });
  }
  const groups: LaidOutGroup[] = diagram.groups
    .filter((g) => groupRects.has(g.id))
    .map((g) => ({ id: g.id, label: g.label, rect: groupRects.get(g.id) as Rect, depth: depthOf(g.id), classes: g.classes }))
    .sort((a, b) => a.depth - b.depth);

  // ── Normalise into the viewport ─────────────────────────
  const boxes: Rect[] = [
    ...[...laidNodes.values()].map((n) => ({ x: n.x - n.width / 2, y: n.y - n.height / 2, width: n.width, height: n.height })),
    ...groups.map((g) => g.rect),
    ...edges.flatMap((e) => (e.label ? [{ x: e.label.x - e.label.width / 2, y: e.label.y - e.label.height / 2, width: e.label.width, height: e.label.height }] : [])),
    ...edges.flatMap((e) => e.route.segments.flatMap((s) => [s.p0, s.c1, s.c2, s.p1]).map((p) => ({ x: p.x, y: p.y, width: 0, height: 0 }))),
  ];
  const minX = boxes.length ? Math.min(...boxes.map((b) => b.x)) : 0;
  const minY = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0;
  const maxX = boxes.length ? Math.max(...boxes.map((b) => b.x + b.width)) : 0;
  const maxY = boxes.length ? Math.max(...boxes.map((b) => b.y + b.height)) : 0;
  const dx = MARGIN - minX;
  const dy = MARGIN + titleHeight - minY;
  const shift = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy });
  for (const n of laidNodes.values()) {
    n.x += dx;
    n.y += dy;
  }
  for (const e of edges) {
    e.route = { segments: e.route.segments.map((s) => ({ p0: shift(s.p0), c1: shift(s.c1), c2: shift(s.c2), p1: shift(s.p1) })) };
    e.path = routeToPath(e.route);
    if (e.label) {
      e.label.x += dx;
      e.label.y += dy;
    }
  }
  for (const g of groups) {
    g.rect = { ...g.rect, x: g.rect.x + dx, y: g.rect.y + dy };
  }

  const titleWidth = diagram.config.title ? measure(diagram.config.title, 16, 2000).width + MARGIN * 2 : 0;
  return {
    kind: 'flow',
    width: Math.ceil(Math.max(maxX - minX + MARGIN * 2, titleWidth, 120)),
    height: Math.ceil(maxY - minY + MARGIN * 2 + titleHeight),
    nodes: [...laidNodes.values()],
    edges,
    groups,
    titleHeight,
    horizontal,
  };
}
