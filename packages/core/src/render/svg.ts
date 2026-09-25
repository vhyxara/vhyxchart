import type { Diagram, FlowDiagram, Step } from '../model.js';
import type { ArrayLayout, FlowLayout, LaidOutNode, Layout, SequenceLayout } from '../layout/types.js';
import { pointAt } from '../layout/geometry.js';
import { measure } from '../layout/text.js';
import type { Frame } from '../timeline/index.js';
import { baseCss, BUILTIN_CLASSES } from './theme.js';

/** Options for {@link renderSvg}. */
export interface RenderOptions {
  /** Unique id prefix (defaults to a hash of the diagram). Needed when several diagrams share a page. */
  id?: string;
  /** Overrides the diagram's theme. */
  theme?: 'auto' | 'light' | 'dark';
  /** Draw state at this frame (static snapshot). */
  frame?: Frame;
  /** Paint a background rect. @default true */
  background?: boolean;
  /** Include the <style> block. Disable when the host page already has it. @default true */
  includeStyle?: boolean;
  /** Ambient edge flow animation (CSS). Defaults to diagram config when there is no scenario. */
  ambient?: boolean;
  /** Extra markup injected before </svg> (used by the animated exporter). */
  extra?: string;
  /** Injection points used by the animated exporter. */
  hooks?: RenderHooks;
}

/** Markup injection points inside structural elements. */
export interface RenderHooks {
  /** Inserted between a node's shape and its label. */
  node?: (id: string) => string;
  /** Appended inside an edge group. */
  edge?: (id: string) => string;
  /** Children appended to a message group, and attributes for its path. */
  message?: (index: number) => { inner?: string; pathAttrs?: string; pathChildren?: string };
  /** Appended inside a revealable element (sequence note/frame). */
  reveal?: (id: string) => string;
  /** Inserted after an array cell rect. */
  cell?: (index: number) => string;
}

/** Escapes text for XML. */
export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const n2 = (x: number): string => String(Math.round(x * 100) / 100);

/** Stable short hash for default ids. */
export function hashId(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `vc${(h >>> 0).toString(36)}`;
}

/** Multi-line centred text. */
export function textBlock(lines: readonly string[], x: number, y: number, lineHeight: number, cls = ''): string {
  if (lines.length === 0) return '';
  const top = y - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines.map((l, i) => `<tspan x="${n2(x)}" y="${n2(top + i * lineHeight)}">${esc(l)}</tspan>`).join('');
  return `<text${cls ? ` class="${cls}"` : ''}>${tspans}</text>`;
}

/** Shape outline centred on (0,0). The main element gets class `vc-shape` (or `cls`). */
export function shapeMarkup(node: Pick<LaidOutNode, 'shape' | 'width' | 'height'>, cls = 'vc-shape'): string {
  const w = node.width;
  const h = node.height;
  const x = -w / 2;
  const y = -h / 2;
  switch (node.shape) {
    case 'round':
      return `<rect class="${cls}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="12"/>`;
    case 'stadium':
      return `<rect class="${cls}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(h / 2)}"/>`;
    case 'subroutine':
      return `<rect class="${cls}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="3"/><path class="vc-deco" d="M${n2(x + 8)},${n2(y)}v${n2(h)}M${n2(-x - 8)},${n2(y)}v${n2(h)}" style="stroke:var(--vc-node-stroke);fill:none"/>`;
    case 'cylinder': {
      const ry = 7;
      return `<path class="${cls}" d="M${n2(x)},${n2(y + ry)}a${n2(w / 2)},${ry} 0 0,1 ${n2(w)},0v${n2(h - ry * 2)}a${n2(w / 2)},${ry} 0 0,1 ${n2(-w)},0z"/><path d="M${n2(x)},${n2(y + ry)}a${n2(w / 2)},${ry} 0 0,0 ${n2(w)},0" style="fill:none;stroke:var(--vc-node-stroke);stroke-width:1.5"/>`;
    }
    case 'circle':
      return `<circle class="${cls}" r="${n2(w / 2)}"/>`;
    case 'doublecircle':
      return `<circle class="${cls}" r="${n2(w / 2)}"/><circle r="${n2(w / 2 - 5)}" style="fill:none;stroke:var(--vc-node-stroke);stroke-width:1.5"/>`;
    case 'diamond':
      return `<path class="${cls}" d="M0,${n2(y)}L${n2(-x)},0L0,${n2(-y)}L${n2(x)},0z"/>`;
    case 'hexagon': {
      const k = 14;
      return `<path class="${cls}" d="M${n2(x + k)},${n2(y)}H${n2(-x - k)}L${n2(-x)},0L${n2(-x - k)},${n2(-y)}H${n2(x + k)}L${n2(x)},0z"/>`;
    }
    case 'parallelogram':
      return `<path class="${cls}" d="M${n2(x + 14)},${n2(y)}H${n2(-x)}L${n2(-x - 14)},${n2(-y)}H${n2(x)}z"/>`;
    case 'parallelogram-alt':
      return `<path class="${cls}" d="M${n2(x)},${n2(y)}H${n2(-x - 14)}L${n2(-x)},${n2(-y)}H${n2(x + 14)}z"/>`;
    case 'trapezoid':
      return `<path class="${cls}" d="M${n2(x + 14)},${n2(y)}H${n2(-x - 14)}L${n2(-x)},${n2(-y)}H${n2(x)}z"/>`;
    case 'trapezoid-alt':
      return `<path class="${cls}" d="M${n2(x)},${n2(y)}H${n2(-x)}L${n2(-x - 14)},${n2(-y)}H${n2(x + 14)}z"/>`;
    case 'asymmetric':
      return `<path class="${cls}" d="M${n2(x)},${n2(y)}H${n2(-x)}V${n2(-y)}H${n2(x)}L${n2(x + 12)},0z"/>`;
    case 'start':
      return `<circle class="${cls} vc-start" r="${n2(w / 2)}"/>`;
    case 'end':
      return `<circle class="${cls} vc-end-outer" r="${n2(w / 2)}"/><circle class="vc-end-inner" r="${n2(w / 2 - 4)}"/>`;
    case 'rect':
    default:
      return `<rect class="${cls}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="6"/>`;
  }
}

function styleDecl(style: Record<string, string>): string {
  const allowed = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'color', 'opacity', 'font-weight', 'font-style'];
  return Object.entries(style)
    .filter(([k, v]) => allowed.includes(k) && /^[#\w\s.,%()-]+$/.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

function flowScopedCss(d: FlowDiagram, id: string): string {
  let css = '';
  for (const [name, style] of Object.entries(d.classDefs)) {
    const decl = styleDecl(style);
    const textColor = style['color'];
    if (decl) css += `[data-vc-id="${id}"] .vc-c-${name}>.vc-shape{${decl}}`;
    if (textColor && /^[#\w]+$/.test(textColor)) css += `[data-vc-id="${id}"] .vc-c-${name}>text{fill:${textColor}}`;
  }
  for (const node of d.nodes) {
    const decl = styleDecl(node.style);
    if (decl) css += `[data-vc-id="${id}"] [data-vc-node="${esc(node.id)}"]>.vc-shape{${decl}}`;
  }
  return css;
}

function markers(id: string): string {
  return `<defs>
<marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="vc-marker" d="M0,0L10,5L0,10z"/></marker>
<marker id="${id}-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><circle class="vc-marker" cx="5" cy="5" r="4"/></marker>
<marker id="${id}-cross" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="vc-marker-open" d="M1,1L9,9M9,1L1,9"/></marker>
<marker id="${id}-msg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="vc-msg-marker" d="M0,0L10,5L0,10z"/></marker>
<marker id="${id}-msg-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="vc-msg-marker-open" d="M0,0L10,5L0,10"/></marker>
<marker id="${id}-msg-cross" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path class="vc-msg-marker-open" d="M1,1L9,9M9,1L1,9"/></marker>
<marker id="${id}-msg-async" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="vc-msg-marker-open" d="M0,0L10,5"/></marker>
</defs>`.replace(/\n/g, '');
}

function scenarioHasBottomText(d: Diagram): boolean {
  const visit = (s: Step): boolean =>
    s.kind === 'caption' || (s.kind === 'note' && (d.kind === 'array' || !s.target)) || (s.kind === 'parallel' && s.steps.some(visit));
  return d.scenarios.some((sc) => sc.steps.some(visit));
}

/** Extra height reserved under the diagram for captions and global notes. */
export function bottomBand(d: Diagram): number {
  return d.kind !== 'sequence' && scenarioHasBottomText(d) ? 44 : 0;
}

// ── Flow ─────────────────────────────────────────────────

function renderFlowStructure(d: FlowDiagram, l: FlowLayout, id: string, frame?: Frame, hooks?: RenderHooks): string {
  let out = '';
  out += '<g class="vc-groups">';
  for (const g of l.groups) {
    const cls = g.classes.map((c) => ` vc-c-${esc(c)}`).join('');
    out += `<g class="vc-group${cls}" data-vc-group="${esc(g.id)}"><rect x="${n2(g.rect.x)}" y="${n2(g.rect.y)}" width="${n2(g.rect.width)}" height="${n2(g.rect.height)}" rx="10"/><text x="${n2(g.rect.x + 12)}" y="${n2(g.rect.y + 13)}">${esc(g.label)}</text></g>`;
  }
  out += '</g><g class="vc-edges">';
  for (const e of l.edges) {
    const head = e.edge.head === 'arrow' ? ` marker-end="url(#${id}-arrow)"` : e.edge.head === 'circle' ? ` marker-end="url(#${id}-circle)"` : e.edge.head === 'cross' ? ` marker-end="url(#${id}-cross)"` : '';
    const tail = e.edge.tail === 'arrow' ? ` marker-start="url(#${id}-arrow)"` : e.edge.tail === 'circle' ? ` marker-start="url(#${id}-circle)"` : e.edge.tail === 'cross' ? ` marker-start="url(#${id}-cross)"` : '';
    const active = frame?.activeEdges[e.id] ? ' data-active=""' : '';
    const visited = frame?.visitedEdges[e.id] ? ' data-visited=""' : '';
    out += `<g class="vc-edge" data-vc-edge="${esc(e.id)}" data-stroke="${e.edge.stroke}"${active}${visited}>`;
    out += `<path class="vc-edge-glow" d="${e.path}"/><path class="vc-edge-path" d="${e.path}"${head}${tail}/>`;
    out += hooks?.edge?.(e.id) ?? '';
    if (e.label) {
      const lb = e.label;
      out += `<g class="vc-edge-label"><rect x="${n2(lb.x - lb.width / 2)}" y="${n2(lb.y - lb.height / 2)}" width="${n2(lb.width)}" height="${n2(lb.height)}" rx="4"/>${textBlock(lb.lines, lb.x, lb.y, 15)}</g>`;
    }
    out += '</g>';
  }
  out += '</g><g class="vc-nodes">';
  for (const n of l.nodes) {
    const classes = n.node.classes.map((c) => ` vc-c-${esc(c)}`).join('');
    const state = frame?.nodeStates[n.id];
    const pulse = frame?.pulses[n.id] ?? 0;
    const scale = pulse > 0 ? ` scale(${n2(1 + pulse * 0.06)})` : '';
    out += `<g class="vc-node${classes}" data-vc-node="${esc(n.id)}"${state && state !== 'idle' ? ` data-state="${state}"` : ''} transform="translate(${n2(n.x)},${n2(n.y)})${scale}">`;
    out += shapeMarkup(n);
    out += hooks?.node?.(n.id) ?? '';
    out += textBlock(n.lines, 0, 0, 19);
    out += '</g>';
  }
  out += '</g>';
  return out;
}

function notePosition(l: FlowLayout, target: string | undefined, w: number, h: number, band: number): { x: number; y: number } {
  const node = target ? l.nodes.find((n) => n.id === target) : undefined;
  if (!node) return { x: (l.width - w) / 2, y: l.height + band - h - 8 };
  let x = node.x + node.width / 2 - 6;
  let y = node.y - node.height / 2 - h - 6;
  if (x + w > l.width - 4) x = node.x - node.width / 2 - w + 6;
  if (y < 4) y = node.y + node.height / 2 + 6;
  return { x: Math.max(4, x), y };
}

function renderFlowDynamic(l: FlowLayout, frame: Frame, band: number): string {
  let out = '';
  for (const tk of frame.tokens) {
    const edge = l.edges.find((e) => e.id === tk.edgeId);
    if (!edge) continue;
    const p = pointAt(edge.route, tk.reverse ? 1 - tk.progress : tk.progress);
    out += `<g class="vc-token" transform="translate(${n2(p.x)},${n2(p.y)})"><circle class="vc-token-halo" r="11"/><circle class="vc-token-dot" r="6"/>`;
    if (tk.label) {
      const w = measure(tk.label, 11, 400).width + 14;
      out += `<g class="vc-token-label"><rect x="${n2(-w / 2)}" y="-31" width="${n2(w)}" height="18" rx="9"/><text x="0" y="-22">${esc(tk.label)}</text></g>`;
    }
    out += '</g>';
  }
  for (const note of frame.notes) {
    const box = measure(note.text, 12, 220);
    const w = box.width + 20;
    const h = box.height + 12;
    const pos = notePosition(l, note.target, w, h, band);
    out += `<g class="vc-note" opacity="${n2(note.opacity)}"><rect x="${n2(pos.x)}" y="${n2(pos.y)}" width="${n2(w)}" height="${n2(h)}" rx="6"/>${textBlock(box.lines, pos.x + w / 2, pos.y + h / 2, 16)}</g>`;
  }
  return out;
}

// ── Sequence ─────────────────────────────────────────────

function participantHead(p: SequenceLayout['participants'][number], y: number): string {
  const { width: w, height: h, x } = p;
  const label = textBlock(p.lines, x, y + h / 2, 18);
  switch (p.participant.kind) {
    case 'actor':
      return `<g class="vc-node" data-vc-participant="${esc(p.participant.id)}"><g transform="translate(${n2(x)},${n2(y + 10)})" style="fill:none;stroke:var(--vc-fg);stroke-width:1.6"><circle cx="0" cy="0" r="6"/><path d="M0,6v12M-9,11h18M0,18l-7,9M0,18l7,9"/></g>${textBlock(p.lines, x, y + h - 2, 18)}</g>`;
    case 'database':
      return `<g class="vc-node" data-vc-participant="${esc(p.participant.id)}" transform="translate(${n2(x)},${n2(y + h / 2)})">${shapeMarkup({ shape: 'cylinder', width: w, height: h })}${textBlock(p.lines, 0, 3, 18)}</g>`;
    default:
      return `<g class="vc-node" data-vc-participant="${esc(p.participant.id)}"><rect class="vc-shape" x="${n2(x - w / 2)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="6"/>${label}</g>`;
  }
}

function renderSequenceStructure(l: SequenceLayout, id: string, autonumber: boolean, frame?: Frame, hooks?: RenderHooks): string {
  let out = '<g class="vc-frames">';
  for (const f of l.frames) {
    const r = f.rect;
    const kind = f.frame.kind === 'rect' ? '' : f.frame.kind;
    const tabW = Math.max(34, measure(kind, 11, 200).width + 16);
    const hidden = frame && !frame.revealed[f.frame.id] ? ' data-hidden=""' : '';
    out += `<g class="vc-frame vc-reveal" data-vc-reveal="${f.frame.id}"${hidden}><rect class="vc-frame-box" x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.width)}" height="${n2(r.height)}" rx="4"/>`;
    if (kind) {
      out += `<path d="M${n2(r.x)},${n2(r.y)}h${n2(tabW)}v12l-6,6h${n2(-tabW + 6)}z"/><text class="vc-frame-kind" x="${n2(r.x + 6)}" y="${n2(r.y + 9)}">${esc(kind)}</text>`;
      if (f.frame.label) out += `<text x="${n2(r.x + tabW + 8)}" y="${n2(r.y + 10)}">[${esc(f.frame.label)}]</text>`;
    }
    out += hooks?.reveal?.(f.frame.id) ?? '';
    for (const s of f.sectionYs) {
      out += `<line x1="${n2(r.x)}" x2="${n2(r.x + r.width)}" y1="${n2(s.y)}" y2="${n2(s.y)}"/>`;
      if (s.label) out += `<text x="${n2(r.x + 8)}" y="${n2(s.y + 10)}">[${esc(s.label)}]</text>`;
    }
    out += '</g>';
  }
  out += '</g><g class="vc-lifelines">';
  for (const p of l.participants) out += `<line class="vc-lifeline" x1="${n2(p.x)}" x2="${n2(p.x)}" y1="${n2(l.lifelineTop)}" y2="${n2(l.lifelineBottom)}"/>`;
  out += '</g><g class="vc-activations">';
  for (const a of l.activations) out += `<rect class="vc-activation" x="${n2(a.x - 5)}" y="${n2(a.y1)}" width="10" height="${n2(Math.max(8, a.y2 - a.y1))}"/>`;
  out += '</g><g class="vc-participants">';
  for (const p of l.participants) out += participantHead(p, p.headY) + participantHead(p, p.footY);
  out += '</g><g class="vc-messages">';
  for (const m of l.messages) {
    const marker =
      m.message.head === 'arrow' ? `${id}-msg` : m.message.head === 'cross' ? `${id}-msg-cross` : m.message.head === 'async' ? `${id}-msg-async` : `${id}-msg-open`;
    const progress = frame ? frame.messages[m.index] : 1;
    const state = progress === undefined ? 'pending' : progress < 1 ? 'sending' : 'sent';
    const dash = progress !== undefined && progress < 1 ? ` stroke-dasharray="1" stroke-dashoffset="${n2(1 - progress)}"` : '';
    const hook = hooks?.message?.(m.index) ?? {};
    out += `<g class="vc-msg" data-vc-msg="${m.index}" data-stroke="${m.message.stroke}" data-state="${state}">`;
    out += `<path class="vc-msg-path" d="${m.path}" pathLength="1"${dash}${hook.pathAttrs ?? ''} marker-end="url(#${marker})">${hook.pathChildren ?? ''}</path>`;
    if (m.labelLines.length > 0) {
      const top = m.labelY - (m.labelLines.length - 1) * 16;
      out += `<text class="vc-msg-label">${m.labelLines.map((line, i) => `<tspan x="${n2(m.labelX)}" y="${n2(top + i * 16)}"${m.self ? ' text-anchor="start"' : ''}>${esc(line)}</tspan>`).join('')}</text>`;
    }
    if (autonumber) out += `<g class="vc-num"><circle cx="${n2(m.x1)}" cy="${n2(m.y)}" r="8"/><text x="${n2(m.x1)}" y="${n2(m.y)}">${m.number}</text></g>`;
    out += hook.inner ?? '';
    out += '</g>';
  }
  out += '</g><g class="vc-seq-notes">';
  for (const n of l.notes) {
    const hidden = frame && !frame.revealed[n.note.id] ? ' data-hidden=""' : '';
    out += `<g class="vc-note vc-reveal" data-vc-reveal="${n.note.id}"${hidden}><rect x="${n2(n.rect.x)}" y="${n2(n.rect.y)}" width="${n2(n.rect.width)}" height="${n2(n.rect.height)}" rx="4"/>${textBlock(n.lines, n.rect.x + n.rect.width / 2, n.rect.y + n.rect.height / 2, 16)}${hooks?.reveal?.(n.note.id) ?? ''}</g>`;
  }
  out += '</g>';
  return out;
}

function renderSequenceDynamic(l: SequenceLayout, frame: Frame): string {
  let out = '';
  for (const [key, progress] of Object.entries(frame.messages)) {
    if (progress >= 1) continue;
    const m = l.messages[Number(key)];
    if (!m) continue;
    let x: number;
    let y = m.y;
    if (m.self) {
      const t = progress;
      x = m.x1 + Math.sin(t * Math.PI) * 44;
      y = m.y + t * 30;
    } else {
      x = m.x1 + (m.x2 - m.x1) * progress;
    }
    out += `<g class="vc-token" transform="translate(${n2(x)},${n2(y)})"><circle class="vc-token-halo" r="10"/><circle class="vc-token-dot" r="5"/></g>`;
  }
  return out;
}

// ── Array ────────────────────────────────────────────────

function renderArrayStructure(l: ArrayLayout, frame?: Frame, hooks?: RenderHooks): string {
  let out = '<g class="vc-cells">';
  const s = l.cellSize;
  for (const c of l.cells) {
    const mark = frame?.array?.marks[c.index];
    const cmp = frame?.array?.compare && frame.array.compare.includes(c.index) ? ' data-compare=""' : '';
    out += `<g class="vc-cell-g" data-vc-cell="${c.index}"${mark ? ` data-state="${mark}"` : ''}${cmp}><rect class="vc-cell" x="${n2(c.x)}" y="${n2(c.y)}" width="${s}" height="${s}" rx="8"/>${hooks?.cell?.(c.index) ?? ''}<text class="vc-index" x="${n2(c.x + s / 2)}" y="${n2(c.y + s + 12)}">${c.index}</text></g>`;
  }
  out += '</g>';
  return out;
}

function renderArrayDynamic(l: ArrayLayout, frame: Frame, band: number): string {
  let out = '';
  const s = l.cellSize;
  const step = l.cells.length > 1 ? (l.cells[1]?.x ?? 0) - (l.cells[0]?.x ?? 0) : s;
  const x0 = l.cells[0]?.x ?? 0;
  const items = frame.array?.items ?? l.values.map((value, i) => ({ id: i, value, pos: i, lift: 0, opacity: 1 }));
  for (const it of items) {
    const x = x0 + it.pos * step + s / 2;
    const y = (l.cells[0]?.y ?? 0) + s / 2 - it.lift * s * 0.7;
    out += `<g class="vc-item" data-vc-item="${it.id}" transform="translate(${n2(x)},${n2(y)})" opacity="${n2(it.opacity)}"><text x="0" y="0">${esc(String(it.value))}</text></g>`;
  }
  const byCell = new Map<number, string[]>();
  for (const [name, idx] of Object.entries(frame.array?.pointers ?? {})) byCell.set(idx, [...(byCell.get(idx) ?? []), name]);
  for (const [idx, names] of byCell) {
    const x = x0 + idx * step + s / 2;
    out += `<g class="vc-pointer" transform="translate(${n2(x)},${n2(l.pointerY)})"><path d="M0,-12L-6,-2H6z"/><text x="0" y="8">${esc(names.join(', '))}</text></g>`;
  }
  const note = frame.notes[frame.notes.length - 1];
  if (note) {
    out += `<g class="vc-note" opacity="${n2(note.opacity)}">${textBlock(measure(note.text, 12, l.width - 40).lines, l.width / 2, l.noteY, 16)}</g>`;
  }
  void band;
  return out;
}

// ── Public ───────────────────────────────────────────────

/** A frame with nothing happening. */
export function emptyFrame(): Frame {
  return { time: 0, stepIndex: -1, nodeStates: {}, pulses: {}, activeEdges: {}, visitedEdges: {}, tokens: [], notes: [], messages: {}, revealed: {} };
}

/**
 * Dynamic (per-frame) markup: tokens, notes, moving array values, pointers,
 * caption. The live player replaces only this layer every animation frame.
 */
export function renderDynamic(diagram: Diagram, l: Layout, frame: Frame): string {
  const band = bottomBand(diagram);
  let out = '';
  if (l.kind === 'flow') out += renderFlowDynamic(l, frame, band);
  else if (l.kind === 'sequence') out += renderSequenceDynamic(l, frame);
  else out += renderArrayDynamic(l, frame, band);
  if (frame.caption && l.kind !== 'sequence') {
    out += `<text class="vc-caption" x="${n2(l.width / 2)}" y="${n2(l.height + band - 14)}">${esc(frame.caption)}</text>`;
  }
  return out;
}

/** Full viewBox height including the caption band. */
export function viewHeight(diagram: Diagram, l: Layout): number {
  return l.height + bottomBand(diagram);
}

/**
 * Renders a complete, standalone SVG string. Works in Node and browsers.
 * With `frame`, draws that exact instant; without, draws the structure
 * (plus ambient edge flow when the diagram has no scenarios).
 *
 * @example
 * const svg = renderSvg(diagram, layout(diagram), { theme: 'dark' });
 */
export function renderSvg(diagram: Diagram, l: Layout, options: RenderOptions = {}): string {
  const id = options.id ?? hashId(JSON.stringify(l).slice(0, 4000) + diagram.kind);
  const theme = options.theme ?? diagram.config.theme;
  const height = viewHeight(diagram, l);
  const ambient = options.ambient ?? (diagram.kind === 'flow' && diagram.scenarios.length === 0 && diagram.config.ambient);
  const title = diagram.config.title;
  const cls = `vc vc-${diagram.kind}${ambient ? ' vc-ambient' : ''}`;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" data-vc-id="${id}" data-vc-theme="${theme}" viewBox="0 0 ${l.width} ${n2(height)}" width="${l.width}" height="${n2(height)}" role="img" aria-label="${esc(title ?? `${diagram.kind} diagram`)}">`;
  if (title) out += `<title>${esc(title)}</title>`;
  if (options.includeStyle !== false) {
    out += `<style>${baseCss()}${diagram.kind === 'flow' ? flowScopedCss(diagram, id) : ''}</style>`;
  }
  out += markers(id);
  if (options.background !== false) out += `<rect class="vc-bg" x="0" y="0" width="${l.width}" height="${n2(height)}" rx="0"/>`;
  if (title) out += `<text class="vc-title" x="${n2(l.width / 2)}" y="24">${esc(title)}</text>`;
  if (l.kind === 'flow' && diagram.kind === 'flow') out += renderFlowStructure(diagram, l, id, options.frame, options.hooks);
  else if (l.kind === 'sequence' && diagram.kind === 'sequence') out += renderSequenceStructure(l, id, diagram.autonumber, options.frame, options.hooks);
  else if (l.kind === 'array') out += renderArrayStructure(l, options.frame, options.hooks);
  const dynamic = options.frame
    ? renderDynamic(diagram, l, options.frame)
    : l.kind === 'array' && !options.hooks
      ? renderArrayDynamic(l, emptyFrame(), 0)
      : '';
  out += `<g class="vc-dynamic">${dynamic}</g>`;
  out += options.extra ?? '';
  out += '</svg>';
  return out;
}

export { BUILTIN_CLASSES };
