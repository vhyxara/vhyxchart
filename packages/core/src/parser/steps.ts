import { ChartErrorCode } from '../errors.js';
import type { CellValue, Step } from '../model.js';
import { Diagnostics, normaliseLabel, parseDuration, parseState, splitIds, type SourceLine } from './common.js';

/** Which vocabulary a scenario line may use. */
export type StepDialect = 'flow' | 'array';

const TRAVEL_ARROW = /\s*(?:-{1,2}>>?|=>|~>|→)\s*/;

function parseValue(text: string): CellValue {
  const t = text.trim();
  const n = Number(t);
  return t !== '' && Number.isFinite(n) ? n : normaliseLabel(t);
}

/** Parses `3`, `2..5`, `1,4,6` into indices. */
function parseIndices(text: string): number[] | null {
  const out: number[] = [];
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const range = /^(\d+)\s*\.\.\s*(\d+)$/.exec(part);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
    } else if (/^\d+$/.test(part)) {
      out.push(Number(part));
    } else {
      return null;
    }
  }
  return out.length > 0 ? out : null;
}

/** Parses travel clauses like `a -> b -> c : label` or `a -> b & c`. */
function parseTravel(text: string, line: number): Step[] | null {
  if (!TRAVEL_ARROW.test(text)) return null;
  let body = text;
  let label: string | undefined;
  const colon = findLabelColon(body);
  if (colon >= 0) {
    label = normaliseLabel(body.slice(colon + 1));
    body = body.slice(0, colon);
  }
  const hops = body.split(TRAVEL_ARROW).map((h) => splitIds(h));
  if (hops.length < 2 || hops.some((h) => h.length === 0)) return null;
  const sequence: Step[] = [];
  for (let i = 0; i < hops.length - 1; i++) {
    const fromIds = hops[i] ?? [];
    const toIds = hops[i + 1] ?? [];
    const legs: Step[] = [];
    for (const from of fromIds) {
      for (const to of toIds) {
        legs.push({ kind: 'travel', from, to, ...(label && i === hops.length - 2 ? { label } : {}), line });
      }
    }
    sequence.push(legs.length === 1 ? (legs[0] as Step) : { kind: 'parallel', steps: legs, line });
  }
  return sequence;
}

/** Finds a `:` that separates a label (ignores `::` class syntax). */
function findLabelColon(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ':' && text[i + 1] !== ':' && text[i - 1] !== ':') return i;
  }
  return -1;
}

/**
 * Parses one scenario line into steps. Returns null when the line is not a
 * step (so callers can report an unknown statement).
 */
export function parseStepLine(src: SourceLine, dialect: StepDialect, diags: Diagnostics): Step[] | null {
  const { text, line } = src;
  const lower = text.toLowerCase();

  const wait = /^(?:wait|pause|sleep|delay)\s+(.+)$/i.exec(text);
  if (wait) {
    const ms = parseDuration(wait[1] ?? '');
    if (ms === null) {
      diags.error(ChartErrorCode.BAD_VALUE, line, `Cannot read duration "${wait[1]}"`, 'Use 500ms, 1s or 1.5s.');
      return [];
    }
    return [{ kind: 'wait', ms, line }];
  }
  if (lower === 'reset' || lower === 'clear') return [{ kind: 'reset', line }];

  const caption = /^(?:caption|say|step|title)\s*:?\s+(.+)$/i.exec(text);
  if (caption) return [{ kind: 'caption', text: normaliseLabel(caption[1] ?? ''), line }];

  const note =
    /^note\s+(?:(?:over|on|at|for)\s+)?([^:"]*?)\s*:\s*(.+)$/i.exec(text) ??
    /^note\s+"(.+)"$/i.exec(text) ??
    /^note\s+([^:]+)$/i.exec(text);
  if (note) {
    if (note.length === 2) return [{ kind: 'note', text: normaliseLabel(note[1] ?? ''), line }];
    const target = (note[1] ?? '').trim();
    return [{ kind: 'note', ...(target ? { target } : {}), text: normaliseLabel(note[2] ?? ''), line }];
  }

  const pulse = /^(?:highlight|pulse|ping|focus)\s+(.+)$/i.exec(text);
  if (pulse) {
    if (dialect === 'array') {
      const idx = parseIndices(pulse[1] ?? '');
      if (!idx) return null;
      return [{ kind: 'mark', indices: idx, state: 'active', line }];
    }
    return [{ kind: 'pulse', nodes: splitIds(pulse[1] ?? ''), line }];
  }

  if (dialect === 'array') {
    const cmp = /^compare\s+(\d+)\s*[, ]\s*(\d+)$/i.exec(text);
    if (cmp) return [{ kind: 'compare', i: Number(cmp[1]), j: Number(cmp[2]), line }];
    const swap = /^swap\s+(\d+)\s*[, ]\s*(\d+)$/i.exec(text);
    if (swap) return [{ kind: 'swap', i: Number(swap[1]), j: Number(swap[2]), line }];
    const set = /^set\s+(\d+)\s*(?:=|to|\s)\s*(.+)$/i.exec(text);
    if (set) return [{ kind: 'set', i: Number(set[1]), value: parseValue(set[2] ?? ''), line }];
    const unmark = /^unmark\s+(.+)$/i.exec(text);
    if (unmark) {
      const idx = parseIndices(unmark[1] ?? '');
      return idx ? [{ kind: 'mark', indices: idx, state: null, line }] : null;
    }
    const mark = /^mark\s+([\d.,\s]+?)(?:\s+(?:as\s+)?([a-z]+))?$/i.exec(text);
    if (mark) {
      const idx = parseIndices(mark[1] ?? '');
      const state = mark[2] ? parseState(mark[2]) : 'done';
      if (!idx || !state) {
        diags.error(ChartErrorCode.BAD_VALUE, line, `Cannot read "${text}"`, 'Example: mark 3 sorted, mark 0..4 done');
        return [];
      }
      return [{ kind: 'mark', indices: idx, state, line }];
    }
    const ptr = /^(?:pointer|ptr|let)\s+([A-Za-z_][\w]*)\s*(?:=|->|at|\s)\s*(\d+|none|null|-)$/i.exec(text);
    if (ptr) {
      const raw = (ptr[2] ?? '').toLowerCase();
      const index = raw === 'none' || raw === 'null' || raw === '-' ? null : Number(raw);
      return [{ kind: 'pointer', name: ptr[1] ?? 'p', index, line }];
    }
    return null;
  }

  // `a is active`, `a, b are done`, `a: done`
  const state = /^(.+?)\s+(?:is|are|=|becomes)\s+([a-z]+)$/i.exec(text) ?? /^([\w\s,&-]+?)\s*:\s*([a-z]+)$/i.exec(text);
  if (state) {
    const parsed = parseState(state[2] ?? '');
    if (parsed) return [{ kind: 'state', nodes: splitIds(state[1] ?? ''), state: parsed, line }];
  }

  // `a -> b, c -> d` parallel clauses, else a chain.
  const clauses = text.split(/\s*,\s*(?=[^,]*(?:-{1,2}>>?|=>|~>|→))/);
  if (clauses.length > 1) {
    const parsed = clauses.map((c) => parseTravel(c, line));
    if (parsed.every((p): p is Step[] => p !== null)) {
      const flat = parsed.map((p) => (p.length === 1 ? (p[0] as Step) : ({ kind: 'parallel', steps: p, line } as Step)));
      return [{ kind: 'parallel', steps: flat, line }];
    }
  }
  return parseTravel(text, line);
}

/**
 * Parses a block of scenario lines, handling `together`/`parallel` … `end`.
 * @param lines - Lines after the `scenario` header.
 * @param start - Index of the first step line.
 * @returns Parsed steps and the index after the block.
 */
export function parseStepBlock(
  lines: readonly SourceLine[],
  start: number,
  dialect: StepDialect,
  diags: Diagnostics,
  isTerminator: (text: string) => boolean,
): { steps: Step[]; next: number } {
  const steps: Step[] = [];
  let i = start;
  while (i < lines.length) {
    const src = lines[i] as SourceLine;
    const lower = src.text.toLowerCase();
    if (lower === 'end') return { steps, next: i + 1 };
    if (isTerminator(src.text)) return { steps, next: i };
    if (lower === 'together' || lower === 'parallel' || lower === 'par' || lower === 'at the same time') {
      const inner = parseStepBlock(lines, i + 1, dialect, diags, isTerminator);
      steps.push({ kind: 'parallel', steps: inner.steps, line: src.line });
      i = inner.next;
      continue;
    }
    const parsed = parseStepLine(src, dialect, diags);
    if (parsed === null) {
      diags.error(
        ChartErrorCode.UNKNOWN_STATEMENT,
        src.line,
        `Unknown step "${src.text}"`,
        dialect === 'array'
          ? 'Array steps: compare i j · swap i j · set i value · mark i sorted · pointer name i · note text · wait 500ms'
          : 'Scenario steps: a -> b : label · a is active|done|error|warn · note a : text · highlight a · wait 1s · reset',
      );
    } else {
      steps.push(...parsed);
    }
    i++;
  }
  return { steps, next: i };
}
