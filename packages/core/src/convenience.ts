import type { Diagnostic } from './errors.js';
import type { Diagram } from './model.js';
import { parse } from './parser/index.js';
import { layout } from './layout/index.js';
import type { Layout } from './layout/types.js';
import { renderSvg, type RenderOptions } from './render/svg.js';
import { renderAnimatedSvg } from './render/animate.js';

/** Everything produced by {@link render}. */
export interface RenderResult {
  svg: string;
  diagram: Diagram;
  layout: Layout;
  diagnostics: Diagnostic[];
}

/**
 * One call from text to SVG.
 * @param source - VhyxChart / Mermaid-compatible source.
 * @param options - `animated: true` produces a SMIL animated SVG (works in `<img>` and GitHub).
 * @example
 * const { svg } = render('flowchart LR\n  A --> B', { animated: true });
 */
export function render(source: string, options: RenderOptions & { animated?: boolean } = {}): RenderResult {
  const { diagram, diagnostics } = parse(source);
  const l = layout(diagram);
  const svg = options.animated
    ? renderAnimatedSvg(diagram, { ...(options.theme ? { theme: options.theme } : {}), ...(options.id ? { id: options.id } : {}) })
    : renderSvg(diagram, l, options);
  return { svg, diagram, layout: l, diagnostics };
}

/** A fenced diagram block found in Markdown. */
export interface MarkdownBlock {
  /** Language tag: vhyx, vhyxchart or mermaid. */
  lang: string;
  source: string;
  /** Character offsets of the whole fence in the document. */
  start: number;
  end: number;
  /** 1-based line of the opening fence. */
  line: number;
}

const FENCE = /^([ \t]*)(`{3,}|~{3,})[ \t]*(vhyx|vhyxchart|mermaid)\b[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm;

/**
 * Finds ```vhyx / ```vhyxchart (and optionally ```mermaid) fences.
 * @example
 * extractBlocks(readme).map((b) => b.source)
 */
export function extractBlocks(markdown: string, options: { mermaid?: boolean } = {}): MarkdownBlock[] {
  const out: MarkdownBlock[] = [];
  FENCE.lastIndex = 0;
  for (let m = FENCE.exec(markdown); m; m = FENCE.exec(markdown)) {
    const lang = (m[3] ?? '').toLowerCase();
    if (lang === 'mermaid' && !options.mermaid) continue;
    out.push({
      lang,
      source: m[4] ?? '',
      start: m.index,
      end: m.index + m[0].length,
      line: markdown.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

/**
 * Replaces diagram fences in Markdown with inline animated SVG, or with an
 * image link produced by `asset` (for static site generators and READMEs).
 *
 * @example
 * // Inline (HTML output, docs sites):
 * renderMarkdown(md)
 * // Files (GitHub README): write each SVG and link it
 * renderMarkdown(md, { asset: (svg, i) => { write(`docs/diagram-${i}.svg`, svg); return `![diagram](docs/diagram-${i}.svg)`; } })
 */
export function renderMarkdown(
  markdown: string,
  options: { mermaid?: boolean; theme?: 'auto' | 'light' | 'dark'; asset?: (svg: string, index: number, block: MarkdownBlock) => string } = {},
): string {
  const blocks = extractBlocks(markdown, options);
  let out = '';
  let cursor = 0;
  blocks.forEach((b, i) => {
    const { svg } = render(b.source, { animated: true, id: `vcmd${i}`, ...(options.theme ? { theme: options.theme } : {}) });
    out += markdown.slice(cursor, b.start);
    out += options.asset ? options.asset(svg, i, b) : `<div class="vhyxchart">${svg}</div>`;
    cursor = b.end;
  });
  return out + markdown.slice(cursor);
}
