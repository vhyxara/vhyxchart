import type { SequenceDiagram } from '../model.js';
import { measure, lineWidth } from './text.js';
import type { SequenceLayout } from './types.js';

const FONT = 14;
const LABEL_FONT = 13;
const MARGIN = 24;
const HEAD_H = 44;
const MIN_GAP = 150;
const MSG_GAP = 46;
const NOTE_PAD = 10;

/**
 * Sequence diagram layout: participants in declaration order, spaced so the
 * widest message label between neighbours fits; messages stacked vertically.
 */
export function layoutSequence(d: SequenceDiagram): SequenceLayout {
  const titleHeight = d.config.title ? 36 : 0;
  const index = new Map(d.participants.map((p, i) => [p.id, i]));
  const heads = d.participants.map((p) => {
    const box = measure(p.label, FONT, 160);
    return { width: Math.max(box.width + 28, 96), height: Math.max(box.height + 18, HEAD_H), lines: box.lines };
  });

  // Required distance between adjacent lifelines.
  const gaps = d.participants.map((_, i) => (i === 0 ? 0 : Math.max(MIN_GAP, ((heads[i - 1]?.width ?? 0) + (heads[i]?.width ?? 0)) / 2 + 24)));
  for (const m of d.messages) {
    const a = index.get(m.from) ?? 0;
    const b = index.get(m.to) ?? 0;
    const w = lineWidth(m.label, LABEL_FONT) + 40;
    if (a === b) {
      const k = Math.min(a + 1, gaps.length - 1);
      if (k > 0) gaps[k] = Math.max(gaps[k] as number, w + 30);
      continue;
    }
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const span = gaps.slice(lo + 1, hi + 1).reduce((s, g) => s + g, 0);
    if (span < w) {
      const extra = (w - span) / (hi - lo);
      for (let k = lo + 1; k <= hi; k++) gaps[k] = (gaps[k] as number) + extra;
    }
  }
  const xs: number[] = [];
  let x = MARGIN + (heads[0]?.width ?? 96) / 2;
  d.participants.forEach((_, i) => {
    x += i === 0 ? 0 : (gaps[i] as number);
    xs.push(x);
  });

  const headTop = MARGIN + titleHeight;
  const headH = Math.max(HEAD_H, ...heads.map((h) => h.height));
  let y = headTop + headH + 28;

  const notesAfter = new Map<number, typeof d.notes>();
  for (const n of d.notes) notesAfter.set(n.after, [...(notesAfter.get(n.after) ?? []), n]);
  const frameStarts = new Map<number, number>();
  for (const f of d.frames) frameStarts.set(f.startMessage, (frameStarts.get(f.startMessage) ?? 0) + 1);
  const frameEnds = new Map<number, number>();
  for (const f of d.frames) frameEnds.set(f.endMessage, (frameEnds.get(f.endMessage) ?? 0) + 1);
  const sectionAt = new Set<number>();
  for (const f of d.frames) f.sections.slice(1).forEach((s) => sectionAt.add(s.startMessage));

  const notes: SequenceLayout['notes'] = [];
  const placeNotes = (after: number): void => {
    for (const n of notesAfter.get(after) ?? []) {
      const ids = n.participants.map((p) => index.get(p) ?? 0);
      const box = measure(n.text, LABEL_FONT, 200);
      const w = Math.max(box.width + NOTE_PAD * 2, 80);
      const h = box.height + NOTE_PAD * 2;
      let left: number;
      let width = w;
      if (n.position === 'over') {
        const a = xs[Math.min(...ids)] as number;
        const b = xs[Math.max(...ids)] as number;
        width = Math.max(w, b - a + 60);
        left = (a + b) / 2 - width / 2;
      } else if (n.position === 'left') {
        left = (xs[ids[0] ?? 0] as number) - 16 - w;
      } else {
        left = (xs[ids[0] ?? 0] as number) + 16;
      }
      notes.push({ note: n, rect: { x: left, y, width, height: h }, lines: box.lines });
      y += h + 14;
    }
  };

  const msgYs: number[] = [];
  const messages: SequenceLayout['messages'] = [];
  placeNotes(-1);
  d.messages.forEach((m, i) => {
    y += (frameStarts.get(i) ?? 0) * 40 + (sectionAt.has(i) ? 26 : 0);
    const a = index.get(m.from) ?? 0;
    const b = index.get(m.to) ?? 0;
    const box = measure(m.label, LABEL_FONT, 10_000);
    y += Math.max(0, box.lines.length - 1) * 16;
    const x1 = xs[a] as number;
    const x2 = xs[b] as number;
    const self = a === b;
    const labelY = y - 8;
    const path = self
      ? `M${x1},${y} C${x1 + 60},${y} ${x1 + 60},${y + 30} ${x1 + 4},${y + 30}`
      : `M${x1},${y} L${x2 + (x2 > x1 ? -2 : 2)},${y}`;
    messages.push({
      message: m,
      index: i,
      y,
      x1,
      x2,
      path,
      self,
      labelLines: box.lines,
      labelX: self ? x1 + 12 : (x1 + x2) / 2,
      labelY,
      number: i + 1,
    });
    msgYs.push(y);
    y += self ? MSG_GAP + 26 : MSG_GAP;
    y += (frameEnds.get(i) ?? 0) * 14;
    placeNotes(i);
  });

  // Activations from +/- markers.
  const activations: SequenceLayout['activations'] = [];
  const stacks = new Map<string, Array<{ y: number; start: number }>>();
  d.messages.forEach((m, i) => {
    const my = msgYs[i] as number;
    if (m.activate === 'target') {
      stacks.set(m.to, [...(stacks.get(m.to) ?? []), { y: my, start: i }]);
    } else if (m.activate === 'source-end') {
      const st = stacks.get(m.from) ?? [];
      const top = st.pop();
      if (top) {
        const depth = st.length;
        activations.push({ participant: m.from, x: (xs[index.get(m.from) ?? 0] as number) + depth * 6, y1: top.y, y2: my, startMessage: top.start });
      }
    }
  });
  for (const [p, st] of stacks) {
    for (const top of st) activations.push({ participant: p, x: xs[index.get(p) ?? 0] as number, y1: top.y, y2: y - 10, startMessage: top.start });
  }

  // Frames around message ranges.
  const frames: SequenceLayout['frames'] = [];
  const minX = MARGIN;
  for (const f of d.frames) {
    const covered = d.messages.slice(f.startMessage, f.endMessage + 1);
    const ids = covered.flatMap((m) => [index.get(m.from) ?? 0, index.get(m.to) ?? 0]);
    const lo = ids.length ? Math.min(...ids) : 0;
    const hi = ids.length ? Math.max(...ids) : d.participants.length - 1;
    const pad = 18 + (2 - Math.min(f.depth, 2)) * 8;
    const nestedBelow = d.frames.filter((g) => g.startMessage === f.startMessage && g.depth > f.depth).length;
    const top = (msgYs[f.startMessage] ?? y) - 44 - nestedBelow * 40;
    const bottom = (msgYs[f.endMessage] ?? y) + (covered[covered.length - 1] && index.get(covered[covered.length - 1]?.from ?? '') === index.get(covered[covered.length - 1]?.to ?? '') ? 44 : 16);
    const left = Math.max(minX, (xs[lo] as number) - (heads[lo]?.width ?? 96) / 2 - pad + 20);
    const right = (xs[hi] as number) + (heads[hi]?.width ?? 96) / 2 + pad - 20 + (lo === hi ? 70 : 0);
    frames.push({
      frame: f,
      rect: { x: left, y: top, width: right - left, height: bottom - top },
      sectionYs: f.sections.slice(1).map((s) => ({ y: (msgYs[s.startMessage] ?? bottom) - 40, label: s.label })),
    });
  }

  const lifelineBottom = y + 10;
  const width = Math.max(
    (xs[xs.length - 1] ?? 0) + (heads[heads.length - 1]?.width ?? 96) / 2 + MARGIN + 60,
    ...notes.map((n) => n.rect.x + n.rect.width + MARGIN),
    ...frames.map((f) => f.rect.x + f.rect.width + MARGIN),
    d.config.title ? lineWidth(d.config.title, 16) + MARGIN * 2 : 0,
  );
  return {
    kind: 'sequence',
    width: Math.ceil(width),
    height: Math.ceil(lifelineBottom + headH + MARGIN),
    titleHeight,
    participants: d.participants.map((p, i) => ({
      participant: p,
      x: xs[i] as number,
      headY: headTop,
      footY: lifelineBottom,
      width: heads[i]?.width ?? 96,
      height: headH,
      lines: heads[i]?.lines ?? [p.label],
    })),
    lifelineTop: headTop + headH,
    lifelineBottom,
    messages,
    notes,
    frames,
    activations,
  };
}
