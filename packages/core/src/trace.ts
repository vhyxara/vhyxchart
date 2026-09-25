import type { CellValue } from './model.js';

/** Recorder handed to {@link traceArray} callbacks. */
export interface ArrayTracer {
  /** Current values (read-only view; mutate through the tracer). */
  readonly values: readonly CellValue[];
  /** Records a comparison and returns `values[i] - values[j]` (or string compare). */
  compare(i: number, j: number): number;
  swap(i: number, j: number): void;
  set(i: number, value: CellValue): void;
  mark(i: number | number[], state?: 'done' | 'active' | 'warn' | 'error'): void;
  unmark(i: number | number[]): void;
  pointer(name: string, index: number | null): void;
  note(text: string): void;
  caption(text: string): void;
  wait(ms: number): void;
}

/**
 * Runs a real algorithm against a tracer and returns VhyxChart source that
 * replays it. Algorithm bookkeeping (loops, stacks, temp arrays) stays in
 * your code — only visible operations are recorded (invariant I-008).
 *
 * @example
 * const source = traceArray('Bubble sort', [5, 3, 8, 1], (a) => {
 *   for (let i = 0; i < a.values.length; i++)
 *     for (let j = 0; j < a.values.length - i - 1; j++)
 *       if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
 * });
 */
export function traceArray(title: string, initial: readonly CellValue[], algorithm: (tracer: ArrayTracer) => void): string {
  const values = [...initial];
  const lines: string[] = [`array ${title}`, `  values ${values.join(' ')}`];
  const list = (i: number | number[]): string => (Array.isArray(i) ? i.join(',') : String(i));
  const tracer: ArrayTracer = {
    get values() {
      return values;
    },
    compare(i, j) {
      lines.push(`  compare ${i} ${j}`);
      const a = values[i];
      const b = values[j];
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    },
    swap(i, j) {
      lines.push(`  swap ${i} ${j}`);
      const t = values[i] as CellValue;
      values[i] = values[j] as CellValue;
      values[j] = t;
    },
    set(i, value) {
      lines.push(`  set ${i} ${value}`);
      values[i] = value;
    },
    mark(i, state = 'done') {
      lines.push(`  mark ${list(i)} ${state}`);
    },
    unmark(i) {
      lines.push(`  unmark ${list(i)}`);
    },
    pointer(name, index) {
      lines.push(`  pointer ${name} ${index === null ? 'none' : index}`);
    },
    note(text) {
      lines.push(`  note "${text.replace(/"/g, "'")}"`);
    },
    caption(text) {
      lines.push(`  caption ${text}`);
    },
    wait(ms) {
      lines.push(`  wait ${ms}ms`);
    },
  };
  algorithm(tracer);
  return lines.join('\n') + '\n';
}
