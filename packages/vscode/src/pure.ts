/**
 * Editor-independent logic (unit tested without VS Code).
 */
import { parse, extractBlocks, type Diagnostic } from '@vhyxchart/core';

/** Minimal slice of markdown-it we rely on. */
export interface MarkdownItLike {
  renderer: {
    rules: Record<string, ((tokens: Array<{ info: string; content: string }>, idx: number, options: unknown, env: unknown, self: unknown) => string) | undefined>;
  };
  utils: { escapeHtml: (s: string) => string };
}

/** Options read from `vhyxchart.*` settings. */
export interface FenceOptions {
  mermaid: boolean;
  theme: 'auto' | 'light' | 'dark';
  autoplay: boolean;
}

const LANGS = new Set(['vhyx', 'vhyxchart']);

/**
 * markdown-it plugin: turns ```vhyx fences into placeholders that the
 * preview script upgrades into live players. Other fences are untouched.
 */
export function vhyxMarkdownIt<T extends MarkdownItLike>(md: T, getOptions: () => FenceOptions): T {
  const previous = md.renderer.rules['fence'];
  md.renderer.rules['fence'] = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = (token?.info ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    const opts = getOptions();
    if (token && (LANGS.has(lang) || (opts.mermaid && lang === 'mermaid'))) {
      const source = md.utils.escapeHtml(token.content);
      return `<div class="vhyxchart" data-theme="${opts.theme}" data-autoplay="${opts.autoplay}" data-source="${source}">${source}</div>\n`;
    }
    return previous ? previous(tokens, idx, options, env, self) : '';
  };
  return md;
}

/** A diagnostic mapped to document lines (0-based, like VS Code). */
export interface MappedDiagnostic {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

function map(d: Diagnostic, offset: number): MappedDiagnostic {
  return {
    line: Math.max(0, d.line - 1 + offset),
    message: d.suggestion ? `${d.message}\n→ ${d.suggestion}` : d.message,
    severity: d.severity,
    code: d.code,
  };
}

/** Diagnostics for a .vhyx document, or for every ```vhyx fence in Markdown. */
export function documentDiagnostics(text: string, isMarkdown: boolean): MappedDiagnostic[] {
  if (!isMarkdown) return parse(text).diagnostics.map((d) => map(d, 0));
  return extractBlocks(text).flatMap((b) => parse(b.source).diagnostics.map((d) => map(d, b.line)));
}
