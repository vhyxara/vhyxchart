import { ChartErrorCode, VhyxChartError, type Diagnostic } from '../errors.js';
import type { Diagram, FlowDiagram, Step } from '../model.js';
import { Diagnostics, preprocess } from './common.js';
import { isFlowHeader, parseFlow } from './flow.js';
import { isSequenceHeader, parseSequence } from './sequence.js';
import { isArrayHeader, parseArray } from './array.js';

/** Result of parsing: always a diagram (possibly partial) plus diagnostics. */
export interface ParseResult {
  diagram: Diagram;
  diagnostics: Diagnostic[];
}

function validateFlowScenarios(d: FlowDiagram, diags: Diagnostics): void {
  const nodeIds = new Set(d.nodes.map((n) => n.id));
  const hasEdge = (a: string, b: string): boolean => d.edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  const visit = (step: Step): void => {
    switch (step.kind) {
      case 'travel':
        for (const id of [step.from, step.to]) {
          if (!nodeIds.has(id)) diags.error(ChartErrorCode.UNKNOWN_NODE, step.line, `Unknown node "${id}" in scenario`, `Declare it first, e.g. ${id}[${id}]`);
        }
        if (nodeIds.has(step.from) && nodeIds.has(step.to) && !hasEdge(step.from, step.to)) {
          diags.error(ChartErrorCode.NO_EDGE, step.line, `No edge between "${step.from}" and "${step.to}"`, `Tokens travel along edges. Add: ${step.from} --> ${step.to}`);
        }
        return;
      case 'state':
      case 'pulse':
        for (const id of step.nodes) if (!nodeIds.has(id)) diags.error(ChartErrorCode.UNKNOWN_NODE, step.line, `Unknown node "${id}" in scenario`);
        return;
      case 'note':
        if (step.target && !nodeIds.has(step.target)) diags.error(ChartErrorCode.UNKNOWN_NODE, step.line, `Unknown node "${step.target}" in note`);
        return;
      case 'parallel':
        step.steps.forEach(visit);
        return;
      default:
        return;
    }
  };
  d.scenarios.forEach((s) => s.steps.forEach(visit));
}

/**
 * Parses VhyxChart source. Never throws: syntax problems are returned as
 * diagnostics and everything that could be understood is still rendered.
 *
 * The diagram type comes from the first line (`flowchart LR`, `graph TD`,
 * `sequenceDiagram`, `stateDiagram`, `architecture`, `array`) and defaults to
 * a top-down flowchart.
 *
 * @example
 * const { diagram, diagnostics } = parse('flowchart LR\n  A --> B');
 */
export function parse(source: string): ParseResult {
  const diags = new Diagnostics();
  const { config, lines } = preprocess(source, diags);
  const first = lines[0]?.text ?? '';
  let diagram: Diagram;
  if (lines.length === 0) {
    diags.warn(ChartErrorCode.EMPTY, 1, 'Diagram is empty', 'Start with: flowchart LR');
    diagram = { kind: 'flow', direction: 'TB', nodes: [], edges: [], groups: [], classDefs: {}, scenarios: [], config };
  } else if (isSequenceHeader(first) || (!isFlowHeader(first) && /^(participant|actor)\b|->>/.test(first))) {
    diagram = parseSequence(lines, config, diags);
  } else if (isArrayHeader(first)) {
    diagram = parseArray(lines, config, diags);
  } else {
    diagram = parseFlow(lines, config, diags);
    validateFlowScenarios(diagram, diags);
  }
  return { diagram, diagnostics: diags.list };
}

/**
 * Like {@link parse} but throws a VhyxChartError when there are errors.
 * @throws {VhyxChartError} with every error diagnostic attached.
 */
export function parseStrict(source: string): Diagram {
  const result = parse(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new VhyxChartError(errors);
  return result.diagram;
}
