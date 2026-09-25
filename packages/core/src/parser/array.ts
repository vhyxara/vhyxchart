import { ChartErrorCode } from '../errors.js';
import type { ArrayDiagram, CellValue, DiagramConfig, Scenario, Step } from '../model.js';
import { Diagnostics, normaliseLabel, unquote, type SourceLine } from './common.js';
import { parseStepBlock } from './steps.js';

const HEADER = /^(array|algorithm|algo|sort)\b\s*(.*)$/i;

/** Returns true for lines that start an array diagram. */
export function isArrayHeader(text: string): boolean {
  return HEADER.test(text);
}

function parseValues(text: string): CellValue[] {
  const body = text.trim().replace(/^\[|\]$/g, '');
  return body
    .split(/[,\s]+/)
    .filter((s) => s.length > 0)
    .map((s) => {
      const n = Number(s);
      return Number.isFinite(n) ? n : normaliseLabel(s);
    });
}

function indicesOf(step: Step): number[] {
  switch (step.kind) {
    case 'compare':
    case 'swap':
      return [step.i, step.j];
    case 'set':
      return [step.i];
    case 'mark':
      return step.indices;
    case 'pointer':
      return step.index === null ? [] : [step.index];
    case 'parallel':
      return step.steps.flatMap(indicesOf);
    default:
      return [];
  }
}

/**
 * Parses an array/algorithm diagram:
 *
 *     array Bubble sort
 *       values 5 3 8 1
 *       compare 0 1
 *       swap 0 1
 *       mark 3 sorted
 *
 * Steps may also be grouped into named `scenario` blocks.
 */
export function parseArray(lines: readonly SourceLine[], config: DiagramConfig, diags: Diagnostics): ArrayDiagram {
  let values: CellValue[] = [];
  const scenarios: Scenario[] = [];
  let i = 0;
  const header = lines[0] ? HEADER.exec(lines[0].text) : null;
  if (header) {
    const rest = (header[2] ?? '').trim();
    if (rest.startsWith('[')) values = parseValues(rest);
    else if (rest && !config.title) config.title = unquote(rest);
    i = 1;
  }

  const isScenario = (text: string): boolean => /^(scenario|play|story)\b/i.test(text);
  const isValues = (text: string): boolean => /^(values|data|input)\b/i.test(text);

  // Values line(s) first
  while (i < lines.length && isValues((lines[i] as SourceLine).text)) {
    const src = lines[i] as SourceLine;
    values = parseValues(src.text.replace(/^(values|data|input)\s*[:=]?\s*/i, ''));
    i++;
  }

  if (i < lines.length && !isScenario((lines[i] as SourceLine).text)) {
    const block = parseStepBlock(lines, i, 'array', diags, isScenario);
    scenarios.push({ name: config.title ?? 'Run', steps: block.steps, line: (lines[i] as SourceLine).line });
    i = block.next;
  }
  while (i < lines.length) {
    const src = lines[i] as SourceLine;
    if (!isScenario(src.text)) {
      diags.error(ChartErrorCode.UNKNOWN_STATEMENT, src.line, `Unexpected "${src.text}"`);
      i++;
      continue;
    }
    const name = unquote(src.text.replace(/^(scenario|play|story)\s*:?\s*/i, '')) || `Run ${scenarios.length + 1}`;
    const block = parseStepBlock(lines, i + 1, 'array', diags, isScenario);
    scenarios.push({ name, steps: block.steps, line: src.line });
    i = block.next;
  }

  if (values.length === 0) {
    diags.error(ChartErrorCode.EMPTY, lines[0]?.line ?? 1, 'Array diagram has no values', 'Add a line like: values 5 3 8 1');
  }
  for (const s of scenarios) {
    for (const step of s.steps) {
      for (const idx of indicesOf(step)) {
        if (idx < 0 || idx >= values.length) {
          diags.error(ChartErrorCode.BAD_INDEX, step.line, `Index ${idx} is outside the array (0..${values.length - 1})`);
        }
      }
    }
  }
  return { kind: 'array', values, scenarios, config };
}
