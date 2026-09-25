import { ChartErrorCode, type Diagnostic } from '../errors.js';
import { DEFAULT_CONFIG, type DiagramConfig, type NodeState } from '../model.js';

/** A logical source line. */
export interface SourceLine {
  /** 1-based line number in the original source. */
  line: number;
  /** Trimmed text with comments removed. */
  text: string;
  /** Leading whitespace width (for readability only — the grammar is not indentation-sensitive). */
  indent: number;
}

/** Shared diagnostic sink. */
export class Diagnostics {
  readonly list: Diagnostic[] = [];

  error(code: ChartErrorCode, line: number, message: string, suggestion?: string): void {
    this.list.push({ code, line, message, severity: 'error', ...(suggestion ? { suggestion } : {}) });
  }

  warn(code: ChartErrorCode, line: number, message: string, suggestion?: string): void {
    this.list.push({ code, line, message, severity: 'warning', ...(suggestion ? { suggestion } : {}) });
  }
}

/** Removes `%%` comments that are not inside quotes. */
function stripComment(raw: string): string {
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote && raw[i - 1] !== '\\') quote = null;
    } else if (ch === '"') {
      quote = ch;
    } else if (ch === '%' && raw[i + 1] === '%') {
      return raw.slice(0, i);
    }
  }
  return raw;
}

/** Splits on `;` outside quotes and brackets (Mermaid allows `A-->B; B-->C`). */
function splitStatements(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') quote = !quote;
    if (quote) continue;
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Result of splitting frontmatter from the body. */
export interface Preprocessed {
  config: DiagramConfig;
  lines: SourceLine[];
}

const BOOL: Record<string, boolean> = { true: true, yes: true, on: true, false: false, no: false, off: false };

/** Applies one `key: value` config entry. Unknown keys are ignored (forward compatible). */
export function applyConfig(config: DiagramConfig, key: string, value: string, line: number, diags: Diagnostics): void {
  const v = unquote(value);
  switch (key.trim().toLowerCase()) {
    case 'title':
      config.title = v;
      return;
    case 'theme':
      if (v === 'light' || v === 'dark' || v === 'auto') config.theme = v;
      else diags.warn(ChartErrorCode.BAD_FRONTMATTER, line, `Unknown theme "${v}"`, 'Use light, dark or auto.');
      return;
    case 'speed': {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) config.speed = n;
      else diags.warn(ChartErrorCode.BAD_FRONTMATTER, line, `speed must be a positive number`);
      return;
    }
    case 'travel':
    case 'duration': {
      const ms = parseDuration(v);
      if (ms !== null && ms > 0) config.travelMs = ms;
      return;
    }
    case 'spacing':
      if (v === 'compact' || v === 'normal' || v === 'relaxed') config.spacing = v;
      return;
    case 'loop':
    case 'autoplay':
    case 'controls':
    case 'ambient': {
      const b = BOOL[v.toLowerCase()];
      if (b === undefined) diags.warn(ChartErrorCode.BAD_FRONTMATTER, line, `${key} must be true or false`);
      else config[key.trim().toLowerCase() as 'loop' | 'autoplay' | 'controls' | 'ambient'] = b;
      return;
    }
    default:
      return;
  }
}

/**
 * Parses frontmatter (`---` block), drops comments and `%%{init}%%`
 * directives, and splits `;`-separated statements into logical lines.
 */
export function preprocess(source: string, diags: Diagnostics): Preprocessed {
  const config: DiagramConfig = { ...DEFAULT_CONFIG };
  const raw = source.replace(/\r\n?/g, '\n').split('\n');
  let start = 0;
  while (start < raw.length && (raw[start] ?? '').trim() === '') start++;
  if ((raw[start] ?? '').trim() === '---') {
    let end = start + 1;
    while (end < raw.length && (raw[end] ?? '').trim() !== '---') end++;
    if (end >= raw.length) {
      diags.error(ChartErrorCode.BAD_FRONTMATTER, start + 1, 'Frontmatter is not closed', 'Add a line containing only --- after the settings.');
    } else {
      for (let i = start + 1; i < end; i++) {
        const text = raw[i] ?? '';
        if (text.trim() === '' || text.trim().startsWith('#')) continue;
        const colon = text.indexOf(':');
        if (colon < 0) {
          diags.warn(ChartErrorCode.BAD_FRONTMATTER, i + 1, `Expected "key: value"`);
          continue;
        }
        applyConfig(config, text.slice(0, colon), text.slice(colon + 1), i + 1, diags);
      }
      start = end + 1;
    }
  }

  const lines: SourceLine[] = [];
  for (let i = start; i < raw.length; i++) {
    const original = raw[i] ?? '';
    const trimmedStart = original.trimStart();
    if (trimmedStart.startsWith('#') || trimmedStart.startsWith('//')) continue;
    if (/^%%\{.*\}%%$/.test(trimmedStart.trim())) continue;
    const text = stripComment(original).trim();
    if (text === '') continue;
    const indent = original.length - trimmedStart.length;
    for (const statement of splitStatements(text)) lines.push({ line: i + 1, text: statement, indent });
  }
  return { config, lines };
}

/**
 * Parses `500ms`, `1.5s`, `2` (seconds when < 20, else ms).
 * @returns milliseconds or null.
 */
export function parseDuration(text: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|seconds?)?$/i.exec(text.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === 'ms') return n;
  if (unit.startsWith('s')) return n * 1000;
  return n < 20 ? n * 1000 : n;
}

const STATE_ALIASES: Record<string, NodeState> = {
  idle: 'idle',
  pending: 'idle',
  waiting: 'idle',
  inactive: 'idle',
  active: 'active',
  running: 'active',
  processing: 'active',
  busy: 'active',
  working: 'active',
  done: 'done',
  success: 'done',
  ok: 'done',
  complete: 'done',
  completed: 'done',
  sorted: 'done',
  healthy: 'done',
  error: 'error',
  failed: 'error',
  fail: 'error',
  down: 'error',
  broken: 'error',
  warn: 'warn',
  warning: 'warn',
  degraded: 'warn',
  slow: 'warn',
  skipped: 'skipped',
  disabled: 'skipped',
};

/** Normalises a state word (`success`, `failed`, `degraded`…) to a NodeState. */
export function parseState(word: string): NodeState | null {
  return STATE_ALIASES[word.trim().toLowerCase()] ?? null;
}

/** Removes surrounding quotes and unescapes `\"`. */
export function unquote(text: string): string {
  const t = text.trim();
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

/** Normalises label text: `<br>`/`<br/>`/`\n` become real newlines, entities decoded. */
export function normaliseLabel(text: string): string {
  return unquote(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/#quot;/g, '"');
}

/** Parses `a, b ,c` into ids. */
export function splitIds(text: string): string[] {
  return text
    .split(/[,&]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
