import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { vhyxMarkdownIt, documentDiagnostics, type MarkdownItLike } from '../src/pure.js';

const opts = { mermaid: false, theme: 'auto' as const, autoplay: true };

describe('markdown-it plugin', () => {
  it('replaces vhyx fences with escaped placeholders and leaves others alone', () => {
    const md = vhyxMarkdownIt(new MarkdownIt() as unknown as MarkdownItLike, () => opts) as unknown as MarkdownIt;
    const html = md.render('```vhyx\nflowchart\n  a["<b>"] --> b\n```\n\n```js\nx\n```\n\n```mermaid\ngraph TD\n```\n');
    expect(html).toContain('<div class="vhyxchart" data-theme="auto" data-autoplay="true" data-source="flowchart\n  a[&quot;&lt;b&gt;&quot;] --&gt; b\n">');
    expect(html).toContain('<code class="language-js">');
    expect(html).toContain('language-mermaid');
  });

  it('optionally takes over mermaid fences', () => {
    const md = vhyxMarkdownIt(new MarkdownIt() as unknown as MarkdownItLike, () => ({ ...opts, mermaid: true })) as unknown as MarkdownIt;
    expect(md.render('```mermaid\ngraph TD\n A-->B\n```\n')).toContain('class="vhyxchart"');
  });
});

describe('diagnostics', () => {
  it('maps .vhyx errors to 0-based lines with suggestions', () => {
    const d = documentDiagnostics('flowchart\n  a --> b\n  ???', false);
    expect(d[0]).toMatchObject({ line: 2, severity: 'error' });
  });

  it('maps errors inside markdown fences to document lines', () => {
    const d = documentDiagnostics('# Title\n\ntext\n\n```vhyx\nflowchart\n  a --> b\nscenario s\n  a -> zz\n```\n', true);
    expect(d.map((x) => x.line)).toContain(8);
  });
});
