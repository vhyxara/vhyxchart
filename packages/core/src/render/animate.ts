import type { Diagram, NodeState } from '../model.js';
import type { ArrayLayout, FlowLayout, Layout, SequenceLayout } from '../layout/types.js';
import { layout as computeLayout } from '../layout/index.js';
import { compileTimeline, type Timeline, type TimedAction } from '../timeline/index.js';
import { emptyFrame, esc, renderDynamic, renderSvg, shapeMarkup, type RenderHooks } from './svg.js';

/** Options for {@link renderAnimatedSvg}. */
export interface AnimatedSvgOptions {
  /** Scenario index, or `'all'` to play every scenario back to back. @default 0 */
  scenario?: number | 'all';
  theme?: 'auto' | 'light' | 'dark';
  /** Loop forever. Defaults to the diagram's `loop` setting. */
  loop?: boolean;
  /** Pause at the end of each loop (ms). @default 1600 */
  hold?: number;
  /** Id prefix for defs. */
  id?: string;
}

const f4 = (x: number): string => String(Math.round(x * 10000) / 10000);
const n2 = (x: number): string => String(Math.round(x * 100) / 100);

/** Plays every scenario in order, resetting state between them. */
function combine(diagram: Diagram, scenario: number | 'all'): Timeline {
  if (scenario !== 'all' || diagram.kind === 'sequence' || diagram.scenarios.length <= 1) {
    return compileTimeline(diagram, scenario === 'all' ? 0 : scenario);
  }
  const parts = diagram.scenarios.map((_, i) => compileTimeline(diagram, i));
  const actions: TimedAction[] = [];
  const steps: Timeline['steps'] = [];
  let offset = 0;
  parts.forEach((tl, i) => {
    if (i > 0) {
      actions.push({ start: offset, end: offset + 1, step: steps.length, action: { kind: 'reset' } });
      offset += 400;
    }
    for (const a of tl.actions) actions.push({ ...a, start: a.start + offset, end: a.end + offset, step: a.step + steps.length });
    for (const s of tl.steps) steps.push({ ...s, start: s.start + offset, end: s.end + offset });
    offset += tl.duration;
  });
  return { scenario: 'All scenarios', duration: offset, actions, steps, initialValues: parts[0]?.initialValues ?? [] };
}

class Anim {
  constructor(
    readonly total: number,
    readonly loop: boolean,
  ) {}

  private timing(): string {
    return `dur="${n2(this.total / 1000)}s" repeatCount="${this.loop ? 'indefinite' : '1'}" fill="freeze"`;
  }

  kt(t: number): number {
    return Math.min(1, Math.max(0, t / this.total));
  }

  /** Discrete value changes: [[time, value], …] with an initial value at 0. */
  discrete(attr: string, initial: string, changes: Array<[number, string]>): string {
    const times = ['0'];
    const values = [initial];
    for (const [t, v] of [...changes].sort((a, b) => a[0] - b[0])) {
      const k = this.kt(t);
      if (Number(times[times.length - 1]) === Number(f4(k))) {
        values[values.length - 1] = v;
      } else {
        times.push(f4(k));
        values.push(v);
      }
    }
    return `<animate attributeName="${attr}" calcMode="discrete" keyTimes="${times.join(';')}" values="${values.join(';')}" ${this.timing()}/>`;
  }

  /** Motion along a path between start and end with ease-in-out. */
  motion(path: string, start: number, end: number, reverse: boolean): string {
    const a = this.kt(start);
    const b = Math.max(a + 0.0001, this.kt(end));
    const from = reverse ? 1 : 0;
    const to = reverse ? 0 : 1;
    const times = a === 0 ? `0;${f4(b)};1` : `0;${f4(a)};${f4(b)};1`;
    const points = a === 0 ? `${from};${to};${to}` : `${from};${from};${to};${to}`;
    const splines = a === 0 ? '.65 0 .35 1;0 0 1 1' : '0 0 1 1;.65 0 .35 1;0 0 1 1';
    return `<animateMotion path="${path}" keyTimes="${times}" keyPoints="${points}" calcMode="spline" keySplines="${splines}" ${this.timing()}/>`;
  }

  /** Linear value ramp between start and end. */
  ramp(attr: string, fromValue: string, toValue: string, start: number, end: number): string {
    const a = this.kt(start);
    const b = Math.max(a + 0.0001, this.kt(end));
    const times = a === 0 ? `0;${f4(b)};1` : `0;${f4(a)};${f4(b)};1`;
    const values = a === 0 ? `${fromValue};${toValue};${toValue}` : `${fromValue};${fromValue};${toValue};${toValue}`;
    return `<animate attributeName="${attr}" keyTimes="${times}" values="${values}" ${this.timing()}/>`;
  }

  /** Visible (opacity 1) during [start, end). */
  window(start: number, end: number): string {
    return this.discrete('opacity', '0', [
      [start, '1'],
      [end, '0'],
    ]);
  }
}

function resetTimes(tl: Timeline): number[] {
  return tl.actions.filter((a) => a.action.kind === 'reset').map((a) => a.start);
}

function flowParts(diagram: Diagram, l: FlowLayout, tl: Timeline, anim: Anim): { hooks: RenderHooks; extra: string } {
  const resets = resetTimes(tl);
  const end = tl.duration;
  // Node state overlays
  const nodeChanges = new Map<string, Array<[number, NodeState | null]>>();
  for (const a of tl.actions) {
    if (a.action.kind === 'state') nodeChanges.set(a.action.node, [...(nodeChanges.get(a.action.node) ?? []), [a.start, a.action.state]]);
  }
  for (const r of resets) for (const list of nodeChanges.values()) list.push([r, null]);
  // Edges: visible highlight from first travel start until next reset/end
  const edgeChanges = new Map<string, Array<[number, string]>>();
  for (const a of tl.actions) {
    if (a.action.kind !== 'travel') continue;
    const list = edgeChanges.get(a.action.edgeId) ?? [];
    list.push([a.start, '0.85']);
    const nextReset = resets.find((r) => r > a.start) ?? end;
    list.push([nextReset, '0']);
    edgeChanges.set(a.action.edgeId, list);
  }

  const hooks: RenderHooks = {
    node: (id) => {
      const changes = nodeChanges.get(id);
      const n = l.nodes.find((x) => x.id === id);
      if (!changes || !n) return '';
      const states = [...new Set(changes.map((c) => c[1]).filter((s): s is NodeState => s !== null && s !== 'idle'))];
      return states
        .map((s) => {
          const ch: Array<[number, string]> = changes.map(([t, v]) => [t, v === s ? '1' : '0']);
          ch.push([end, '0']);
          return `<g opacity="0">${shapeMarkup(n, `vc-ov-${s}`)}${anim.discrete('opacity', '0', ch)}</g>`;
        })
        .join('');
    },
    edge: (id) => {
      const changes = edgeChanges.get(id);
      const e = l.edges.find((x) => x.id === id);
      if (!changes || !e) return '';
      return `<path d="${e.path}" style="fill:none;stroke:var(--vc-blue);stroke-width:2.2" opacity="0">${anim.discrete('opacity', '0', changes)}</path>`;
    },
  };

  let extra = '<g class="vc-anim">';
  for (const a of tl.actions) {
    if (a.action.kind !== 'travel') continue;
    const e = l.edges.find((x) => x.id === (a.action as { edgeId: string }).edgeId);
    if (!e) continue;
    const label = a.action.label;
    const labelMarkup = label
      ? `<g class="vc-token-label"><rect x="${n2(-(label.length * 6.2 + 14) / 2)}" y="-31" width="${n2(label.length * 6.2 + 14)}" height="18" rx="9"/><text x="0" y="-22">${esc(label)}</text></g>`
      : '';
    extra += `<g class="vc-token" opacity="0"><circle class="vc-token-halo" r="11"/><circle class="vc-token-dot" r="6"/>${labelMarkup}${anim.motion(e.path, a.start, a.end, a.action.reverse)}${anim.window(a.start, a.end)}</g>`;
  }
  extra += notesAndCaptions(diagram, l, tl, anim);
  extra += '</g>';
  return { hooks, extra };
}

function notesAndCaptions(diagram: Diagram, l: Layout, tl: Timeline, anim: Anim): string {
  const resets = resetTimes(tl);
  let out = '';
  const notes = tl.actions.filter((a) => a.action.kind === 'note');
  notes.forEach((a, i) => {
    if (a.action.kind !== 'note') return;
    const target = a.action.target ?? '';
    const next = notes.slice(i + 1).find((b) => b.action.kind === 'note' && (b.action.target ?? '') === target);
    const stop = Math.min(next?.start ?? tl.duration, resets.find((r) => r > a.start) ?? tl.duration);
    const frame = emptyFrame();
    frame.notes = [{ ...(a.action.target ? { target: a.action.target } : {}), text: a.action.text, opacity: 1 }];
    out += `<g opacity="0">${renderDynamic(diagram, l, frame)}${anim.window(a.start, stop)}</g>`;
  });
  const captions = tl.actions.filter((a) => a.action.kind === 'caption');
  captions.forEach((a, i) => {
    if (a.action.kind !== 'caption') return;
    const stop = captions[i + 1]?.start ?? tl.duration;
    const frame = emptyFrame();
    frame.caption = a.action.text;
    out += `<g opacity="0">${renderDynamic(diagram, l, frame)}${anim.window(a.start, stop)}</g>`;
  });
  return out;
}

function sequenceParts(l: SequenceLayout, tl: Timeline, anim: Anim): { hooks: RenderHooks; extra: string } {
  const msgTimes = new Map<number, TimedAction>();
  const revealTimes = new Map<string, number>();
  for (const a of tl.actions) {
    if (a.action.kind === 'message') msgTimes.set(a.action.index, a);
    if (a.action.kind === 'reveal') revealTimes.set(a.action.id, a.start);
  }
  const hooks: RenderHooks = {
    message: (i) => {
      const a = msgTimes.get(i);
      const m = l.messages[i];
      if (!a || !m) return {};
      const fade = anim.discrete('opacity', '0.14', [[a.start, '1']]);
      const draw = m.message.stroke === 'solid' ? { pathAttrs: ' stroke-dasharray="1"', pathChildren: anim.ramp('stroke-dashoffset', '1', '0', a.start, a.end) } : {};
      return { inner: fade, ...draw };
    },
    reveal: (id) => {
      const t = revealTimes.get(id);
      return t === undefined || t <= 0 ? '' : anim.discrete('opacity', '0', [[t, '1']]);
    },
  };
  let extra = '<g class="vc-anim">';
  for (const [i, a] of msgTimes) {
    const m = l.messages[i];
    if (!m) continue;
    extra += `<g class="vc-token" opacity="0"><circle class="vc-token-halo" r="10"/><circle class="vc-token-dot" r="5"/>${anim.motion(m.path, a.start, a.end, false)}${anim.window(a.start, a.end)}</g>`;
  }
  extra += '</g>';
  return { hooks, extra };
}

function arrayParts(diagram: Diagram, l: ArrayLayout, tl: Timeline, anim: Anim): { hooks: RenderHooks; extra: string } {
  const s = l.cellSize;
  const step = l.cells.length > 1 ? (l.cells[1]?.x ?? 0) - (l.cells[0]?.x ?? 0) : s;
  const x0 = (l.cells[0]?.x ?? 0) + s / 2;
  const y0 = (l.cells[0]?.y ?? 0) + s / 2;
  const resets = resetTimes(tl);
  const end = tl.duration;

  const markChanges = new Map<number, Array<[number, NodeState | null]>>();
  const compareWindows = new Map<number, Array<[number, number]>>();
  for (const a of tl.actions) {
    const act = a.action;
    if (act.kind === 'mark') for (const i of act.indices) markChanges.set(i, [...(markChanges.get(i) ?? []), [a.start, act.state]]);
    if (act.kind === 'compare' || act.kind === 'swap') for (const i of [act.i, act.j]) compareWindows.set(i, [...(compareWindows.get(i) ?? []), [a.start, a.end]]);
  }
  for (const r of resets) for (const list of markChanges.values()) list.push([r, null]);

  const hooks: RenderHooks = {
    cell: (i) => {
      const c = l.cells[i];
      if (!c) return '';
      const rect = (cls: string): string => `<rect class="${cls}" x="${n2(c.x)}" y="${n2(c.y)}" width="${s}" height="${s}" rx="8"/>`;
      let out = '';
      const changes = markChanges.get(i);
      if (changes) {
        const states = [...new Set(changes.map((x) => x[1]).filter((x): x is NodeState => x !== null))];
        for (const st of states) {
          const ch: Array<[number, string]> = changes.map(([t, v]) => [t, v === st ? '1' : '0']);
          ch.push([end, '0']);
          out += `<g opacity="0">${rect(`vc-ov-${st}`)}${anim.discrete('opacity', '0', ch)}</g>`;
        }
      }
      for (const [a, b] of compareWindows.get(i) ?? []) out += `<g opacity="0">${rect('vc-ov-active')}${anim.window(a, b)}</g>`;
      return out;
    },
  };

  // Value identity: animate each item's translate across swaps.
  type Key = { t: number; pos: number; lift: number };
  const tracks = new Map<number, { value: string; keys: Key[]; appear: number; vanish: number }>();
  tl.initialValues.forEach((v, i) => tracks.set(i, { value: String(v), keys: [{ t: 0, pos: i, lift: 0 }], appear: 0, vanish: Infinity }));
  const posOf = (id: number): number => {
    const k = tracks.get(id)?.keys;
    return k ? (k[k.length - 1] as Key).pos : 0;
  };
  for (const a of tl.actions) {
    const act = a.action;
    if (act.kind === 'swap') {
      for (const [id, target, dir] of [[act.itemA, act.j, 1], [act.itemB, act.i, -1]] as Array<[number, number, number]>) {
        const tr = tracks.get(id);
        if (!tr) continue;
        const from = posOf(id);
        const mid = (a.start + a.end) / 2;
        tr.keys.push({ t: a.start, pos: from, lift: 0 }, { t: mid, pos: (from + target) / 2, lift: dir }, { t: a.end, pos: target, lift: 0 });
      }
    }
    if (act.kind === 'set') {
      const old = tracks.get(act.oldItem);
      if (old) old.vanish = a.start;
      tracks.set(act.newItem, { value: String(act.value), keys: [{ t: 0, pos: act.i, lift: 0 }], appear: a.start, vanish: Infinity });
    }
  }
  let extra = '<g class="vc-anim">';
  for (const [id, tr] of tracks) {
    const keys = tr.keys;
    const times = keys.map((k) => f4(anim.kt(k.t)));
    const values = keys.map((k) => `${n2(x0 + k.pos * step)},${n2(y0 - k.lift * s * 0.7)}`);
    // keyTimes must end at 1: hold last value.
    if (times[times.length - 1] !== '1') {
      times.push('1');
      values.push(values[values.length - 1] as string);
    }
    const move = `<animateTransform attributeName="transform" type="translate" keyTimes="${times.join(';')}" values="${values.join(';')}" dur="${n2(anim.total / 1000)}s" repeatCount="${anim.loop ? 'indefinite' : '1'}" fill="freeze"/>`;
    const visChanges: Array<[number, string]> = [];
    if (tr.appear > 0) visChanges.push([tr.appear, '1']);
    if (tr.vanish !== Infinity) visChanges.push([tr.vanish, '0']);
    const visible = visChanges.length > 0 ? anim.discrete('opacity', tr.appear > 0 ? '0' : '1', visChanges) : '';
    extra += `<g class="vc-item" data-vc-item="${id}" transform="translate(${values[0]})"><text x="0" y="0">${esc(tr.value)}</text>${move}${visible}</g>`;
  }
  // Pointers
  const pointerChanges = new Map<string, Array<[number, number | null]>>();
  for (const a of tl.actions) if (a.action.kind === 'pointer') pointerChanges.set(a.action.name, [...(pointerChanges.get(a.action.name) ?? []), [a.start, a.action.index]]);
  for (const r of resets) for (const list of pointerChanges.values()) list.push([r, null]);
  for (const [name, changes] of pointerChanges) {
    const first = changes.find((c) => c[1] !== null)?.[1] ?? 0;
    const pos: Array<[number, string]> = changes.filter((c) => c[1] !== null).map(([t, i]) => [t, `${n2(x0 + (i as number) * step)},${n2(l.pointerY)}`]);
    const vis: Array<[number, string]> = changes.map(([t, i]) => [t, i === null ? '0' : '1']);
    vis.push([end, '0']);
    extra += `<g class="vc-pointer" opacity="0" transform="translate(${n2(x0 + first * step)},${n2(l.pointerY)})"><path d="M0,-12L-6,-2H6z"/><text x="0" y="8">${esc(name)}</text><animateTransform attributeName="transform" type="translate" calcMode="discrete" keyTimes="0;${pos.map(([t]) => f4(anim.kt(t))).join(';')}" values="${n2(x0 + first * step)},${n2(l.pointerY)};${pos.map(([, v]) => v).join(';')}" dur="${n2(anim.total / 1000)}s" repeatCount="${anim.loop ? 'indefinite' : '1'}" fill="freeze"/>${anim.discrete('opacity', '0', vis)}</g>`;
  }
  extra += notesAndCaptions(diagram, l, tl, anim);
  extra += '</g>';
  return { hooks, extra };
}

/**
 * Exports a self-contained animated SVG using SMIL — no JavaScript, so it
 * plays anywhere an SVG image is shown: GitHub READMEs, `<img>` tags,
 * Notion, docs sites, slide decks. Structure is drawn once; tokens, states,
 * notes and moving values are declarative animations on a shared clock.
 *
 * @example
 * writeFileSync('flow.svg', renderAnimatedSvg(parse(src).diagram));
 */
export function renderAnimatedSvg(diagram: Diagram, options: AnimatedSvgOptions = {}): string {
  const l = computeLayout(diagram);
  const tl = combine(diagram, options.scenario ?? 'all');
  if (tl.duration <= 0) {
    return renderSvg(diagram, l, { ...(options.theme ? { theme: options.theme } : {}), ...(options.id ? { id: options.id } : {}) });
  }
  const hold = options.hold ?? 1600;
  const anim = new Anim(tl.duration + hold, options.loop ?? diagram.config.loop);
  const parts =
    l.kind === 'flow'
      ? flowParts(diagram, l, tl, anim)
      : l.kind === 'sequence'
        ? sequenceParts(l, tl, anim)
        : arrayParts(diagram, l, tl, anim);
  return renderSvg(diagram, l, {
    ...(options.theme ? { theme: options.theme } : {}),
    ...(options.id ? { id: options.id } : {}),
    ambient: false,
    hooks: parts.hooks,
    extra: parts.extra,
  });
}
