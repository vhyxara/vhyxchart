import type { ArrayDiagram } from '../model.js';
import { lineWidth } from './text.js';
import type { ArrayLayout } from './types.js';

const MARGIN = 24;

/** Array layout: one fixed row of equal cells (cells never move — values do). */
export function layoutArray(d: ArrayDiagram): ArrayLayout {
  const titleHeight = d.config.title ? 36 : 0;
  const widest = Math.max(1, ...d.values.map((v) => lineWidth(String(v), 18)));
  const cellSize = Math.max(52, Math.ceil(widest + 24));
  const gap = 8;
  const top = MARGIN + titleHeight + 28;
  const cells = d.values.map((_, i) => ({ index: i, x: MARGIN + i * (cellSize + gap), y: top }));
  const width = Math.max(MARGIN * 2 + d.values.length * (cellSize + gap) - gap, d.config.title ? lineWidth(d.config.title, 16) + MARGIN * 2 : 0, 200);
  const pointerY = top + cellSize + 30;
  const noteY = pointerY + 36;
  return { kind: 'array', width: Math.ceil(width), height: Math.ceil(noteY + 40), titleHeight, cellSize, cells, values: d.values, pointerY, noteY };
}
