/**
 * Deterministic text measurement without a DOM.
 *
 * Widths are relative advance widths of a typical UI sans-serif (Inter /
 * Helvetica metrics, em = 1). Layout must be identical in Node (CLI, SSR,
 * tests) and browsers, so we never measure with canvas. Slight
 * overestimation is intentional: labels never overflow their boxes.
 */
const NARROW = new Set("iljtfrI!|.,:;'`()[]{}");
const WIDE = new Set('mwMWOQGDH@%&');

function charWidth(ch: string): number {
  if (NARROW.has(ch)) return 0.34;
  if (WIDE.has(ch)) return 0.86;
  if (ch === ' ') return 0.3;
  if (/[A-Z]/.test(ch)) return 0.68;
  if (/[0-9]/.test(ch)) return 0.58;
  if (/[a-z]/.test(ch)) return 0.55;
  const code = ch.codePointAt(0) ?? 0;
  // CJK and emoji are roughly square.
  if (code >= 0x2e80) return 1.0;
  return 0.6;
}

/** Width in px of one line at the given font size. */
export function lineWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w * fontSize;
}

/** Word-wraps text to `maxWidth`, respecting explicit newlines. */
export function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && lineWidth(candidate, fontSize) > maxWidth) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    out.push(current);
  }
  return out;
}

/** Measured, wrapped text block. */
export interface TextBox {
  lines: string[];
  width: number;
  height: number;
}

/** Wraps and measures a label. */
export function measure(text: string, fontSize: number, maxWidth: number, lineHeight = 1.35): TextBox {
  const lines = text.length === 0 ? [] : wrapText(text, fontSize, maxWidth);
  const width = lines.reduce((m, l) => Math.max(m, lineWidth(l, fontSize)), 0);
  return { lines, width, height: lines.length * fontSize * lineHeight };
}
