/** Stable diagnostic codes. */
export enum ChartErrorCode {
  UNKNOWN_STATEMENT = 'VC_UNKNOWN_STATEMENT',
  UNCLOSED_BLOCK = 'VC_UNCLOSED_BLOCK',
  UNEXPECTED_END = 'VC_UNEXPECTED_END',
  UNKNOWN_NODE = 'VC_UNKNOWN_NODE',
  NO_EDGE = 'VC_NO_EDGE',
  BAD_INDEX = 'VC_BAD_INDEX',
  BAD_VALUE = 'VC_BAD_VALUE',
  BAD_FRONTMATTER = 'VC_BAD_FRONTMATTER',
  EMPTY = 'VC_EMPTY',
}

/** A parser or validation finding with a precise location and a fix. */
export interface Diagnostic {
  code: ChartErrorCode;
  message: string;
  /** 1-based line. */
  line: number;
  severity: 'error' | 'warning';
  suggestion?: string;
}

/**
 * Error thrown by strict APIs (`parseStrict`). Non-strict APIs return
 * diagnostics instead and still render whatever parsed — a diagram with a
 * typo should degrade, never blank the page.
 */
export class VhyxChartError extends Error {
  readonly diagnostics: readonly Diagnostic[];

  constructor(diagnostics: readonly Diagnostic[]) {
    const first = diagnostics[0];
    super(first ? `Line ${first.line}: ${first.message}` : 'Invalid diagram');
    this.name = 'VhyxChartError';
    this.diagnostics = diagnostics;
  }
}
