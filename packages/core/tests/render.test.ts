// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  parse,
  layout,
  render,
  renderSvg,
  renderAnimatedSvg,
  compileTimeline,
  frameAt,
  renderMarkdown,
  extractBlocks,
  baseCss,
} from '../src/index.js';

const FLOW = `---
title: A <b> & "quoted"
---
flowchart LR
  a[Start & go] -->|x < y| b{Check}
  b --> c[(DB)]
  classDef hot fill:#f00
  class c hot
  style a stroke:#0f0
scenario s
  a -> b : go
  b is active
  note b : wait
  caption hello
  b -> c
  c is done`;

function parseXml(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error(err.textContent ?? 'xml error');
  return doc;
}

describe('renderSvg', () => {
  it('produces well-formed, escaped, accessible SVG', () => {
    const { svg, diagnostics } = render(FLOW);
    expect(diagnostics).toEqual([]);
    const doc = parseXml(svg);
    const root = doc.documentElement;
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('A <b> & "quoted"');
    expect(doc.querySelectorAll('[data-vc-node]')).toHaveLength(3);
    expect(doc.querySelectorAll('[data-vc-edge]')).toHaveLength(2);
    expect(svg).toContain('Start &amp; go');
    expect(svg).toContain('x &lt; y');
  });

  it('scopes classDef and style rules to the diagram id', () => {
    const { svg } = render(FLOW, { id: 'demo' });
    expect(svg).toContain('[data-vc-id="demo"] .vc-c-hot>.vc-shape{fill:#f00}');
    expect(svg).toContain('[data-vc-id="demo"] [data-vc-node="a"]>.vc-shape{stroke:#0f0}');
    expect(svg).toContain('url(#demo-arrow)');
  });

  it('rejects CSS injection through classDef values', () => {
    const { svg } = render('flowchart\n a:::x\n classDef x fill:red}body{display:none', { id: 'safe' });
    expect(svg).not.toContain('body{display:none');
  });

  it('renders a frame: states, tokens, notes and captions', () => {
    const { diagram } = parse(FLOW);
    const l = layout(diagram);
    const tl = compileTimeline(diagram, 0);
    const mid = parseXml(renderSvg(diagram, l, { frame: frameAt(tl, 200) }));
    expect(mid.querySelectorAll('.vc-token')).toHaveLength(1);
    expect(mid.querySelector('[data-vc-edge="a->b"]')?.hasAttribute('data-active')).toBe(true);
    const later = parseXml(renderSvg(diagram, l, { frame: frameAt(tl, tl.steps[3]!.end + 1) }));
    expect(later.querySelector('[data-vc-node="b"]')?.getAttribute('data-state')).toBe('active');
    expect(later.querySelector('.vc-note')?.textContent).toBe('wait');
    expect(later.querySelector('.vc-caption')?.textContent).toBe('hello');
  });

  it('uses ambient edge animation only when there is nothing to play', () => {
    expect(render('flowchart\n a --> b').svg).toContain('class="vc vc-flow vc-ambient"');
    expect(render('---\nambient: false\n---\nflowchart\n a --> b').svg).toContain('class="vc vc-flow"');
    expect(render(FLOW).svg).toContain('class="vc vc-flow"');
  });

  it('supports themes', () => {
    expect(render(FLOW, { theme: 'dark' }).svg).toContain('data-vc-theme="dark"');
    expect(baseCss()).toContain('prefers-color-scheme:dark');
  });

  it('renders sequence and array diagrams', () => {
    const seq = parseXml(render('sequenceDiagram\n actor U\n database D\n U->>D: q\n loop x\n D-->>U: r\n end\n Note left of U: hi').svg);
    expect(seq.querySelectorAll('[data-vc-msg]')).toHaveLength(2);
    expect(seq.querySelectorAll('.vc-frame')).toHaveLength(1);
    const arr = parseXml(render('array\n values 1 2 3').svg);
    expect(arr.querySelectorAll('.vc-cell')).toHaveLength(3);
    expect(arr.querySelectorAll('.vc-item')).toHaveLength(3);
  });

  it('renders every node shape', () => {
    const shapes = 'flowchart\n a[x]-->b(x)-->c([x])-->d[[x]]-->e[(x)]-->f((x))-->g{x}-->h{{x}}-->i[/x/]-->j[\\x\\]-->k[/x\\]-->l[\\x/]-->m>x]-->n(((x)))';
    const doc = parseXml(render(shapes).svg);
    expect(doc.querySelectorAll('.vc-shape')).toHaveLength(14);
  });
});

describe('renderAnimatedSvg (SMIL)', () => {
  it('animates tokens, states, notes and captions without scripts', () => {
    const svg = renderAnimatedSvg(parse(FLOW).diagram);
    const doc = parseXml(svg);
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(doc.querySelectorAll('animateMotion')).toHaveLength(2);
    expect(doc.querySelectorAll('.vc-ov-active, .vc-ov-done').length).toBeGreaterThanOrEqual(2);
    expect(svg).toContain('repeatCount="indefinite"');
    for (const a of Array.from(doc.querySelectorAll('animate'))) {
      const kt = (a.getAttribute('keyTimes') ?? '0').split(';').map(Number);
      expect(kt[0]).toBe(0);
      for (let i = 1; i < kt.length; i++) expect(kt[i]!).toBeGreaterThanOrEqual(kt[i - 1]!);
      if (a.getAttribute('values')) expect(a.getAttribute('values')!.split(';')).toHaveLength(kt.length);
    }
  });

  it('respects loop: false', () => {
    expect(renderAnimatedSvg(parse(FLOW).diagram, { loop: false })).toContain('repeatCount="1"');
  });

  it('animates sequence messages and array value movement', () => {
    const seq = renderAnimatedSvg(parse('sequenceDiagram\n A->>B: x\n B-->>A: y').diagram);
    expect(seq).toContain('stroke-dashoffset');
    const arr = parseXml(renderAnimatedSvg(parse('array\n values 3 1\n swap 0 1\n pointer i 1\n mark 0 done').diagram));
    expect(arr.querySelectorAll('animateTransform').length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to a static SVG when there is nothing to animate', () => {
    expect(renderAnimatedSvg(parse('flowchart\n a --> b').diagram)).not.toContain('<animate');
  });

  it('plays all scenarios back to back by default', () => {
    const svg = renderAnimatedSvg(parse('flowchart\n a --> b\nscenario one\n a -> b\nscenario two\n b -> a').diagram);
    expect(parseXml(svg).querySelectorAll('animateMotion')).toHaveLength(2);
  });
});

describe('markdown', () => {
  const md = '# Title\n\n```vhyx\nflowchart\n  a --> b\n```\n\ntext\n\n~~~vhyxchart\nsequenceDiagram\n A->>B: hi\n~~~\n\n```mermaid\ngraph TD\n x --> y\n```\n';

  it('extracts fences with line numbers', () => {
    const blocks = extractBlocks(md);
    expect(blocks.map((b) => [b.lang, b.line])).toEqual([['vhyx', 3], ['vhyxchart', 10]]);
    expect(extractBlocks(md, { mermaid: true })).toHaveLength(3);
  });

  it('replaces fences with inline SVG or asset links', () => {
    const html = renderMarkdown(md);
    expect(html).toContain('# Title');
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).toContain('```mermaid');
    const files: string[] = [];
    const out = renderMarkdown(md, { asset: (svg, i) => (files.push(svg), `![d](d${i}.svg)`) });
    expect(out).toContain('![d](d0.svg)');
    expect(files).toHaveLength(2);
  });
});
