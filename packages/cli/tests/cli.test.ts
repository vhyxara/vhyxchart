import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, parseArgs, type Io } from '../src/index.js';

let dir: string;
let out: string[];
let err: string[];
const io: Io = { out: (l) => out.push(l), err: (l) => err.push(l) };
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vhyxchart-'));
  out = [];
  err = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const FLOW = 'flowchart LR\n  a --> b\nscenario s\n  a -> b\n  b is done\n';

describe('cli', () => {
  it('parses args', () => {
    expect(parseArgs(['render', 'x.vhyx', '-o', 'y.svg', '--static', '--theme=dark'])).toEqual({
      command: 'render',
      files: ['x.vhyx'],
      flags: { o: 'y.svg', static: true, theme: 'dark' },
    });
  });

  it('renders .vhyx to animated SVG, or static with --static', () => {
    const f = join(dir, 'flow.vhyx');
    writeFileSync(f, FLOW);
    expect(run(['render', f], io)).toBe(0);
    expect(readFileSync(join(dir, 'flow.svg'), 'utf8')).toContain('animateMotion');
    expect(run(['render', f, '-o', join(dir, 's.svg'), '--static', '--theme', 'dark'], io)).toBe(0);
    const s = readFileSync(join(dir, 's.svg'), 'utf8');
    expect(s).not.toContain('animateMotion');
    expect(s).toContain('data-vc-theme="dark"');
  });

  it('renders Markdown fences to SVG files with image links', () => {
    const md = join(dir, 'README.md');
    writeFileSync(md, '# Doc\n\n```vhyx\n' + FLOW + '```\n\nend\n');
    expect(run(['render', md], io)).toBe(0);
    const outMd = readFileSync(join(dir, 'README.rendered.md'), 'utf8');
    expect(outMd).toContain('![diagram 1](diagrams/README-1.svg)');
    expect(existsSync(join(dir, 'diagrams', 'README-1.svg'))).toBe(true);
    expect(run(['render', md, '--inline', '-o', join(dir, 'inline.md')], io)).toBe(0);
    expect(readFileSync(join(dir, 'inline.md'), 'utf8')).toContain('<svg');
  });

  it('check reports line-accurate errors (also inside Markdown) and exits 1', () => {
    const good = join(dir, 'good.vhyx');
    const bad = join(dir, 'bad.md');
    writeFileSync(good, FLOW);
    writeFileSync(bad, 'text\n\n```vhyx\nflowchart\n  a --> b\n  ??\n```\n');
    expect(run(['check', good], io)).toBe(0);
    expect(run(['check', good, bad], io)).toBe(1);
    expect(err.join('\n')).toContain('bad.md:6');
  });

  it('html writes a standalone interactive page', () => {
    const f = join(dir, 'flow.vhyx');
    writeFileSync(f, FLOW);
    expect(run(['html', f], io)).toBe(0);
    const html = readFileSync(join(dir, 'flow.html'), 'utf8');
    expect(html).toContain('<vhyx-chart');
    expect(html).toContain('customElements');
  });

  it('help and unknown commands', () => {
    expect(run([], io)).toBe(0);
    expect(run(['nope'], io)).toBe(1);
    expect(run(['render'], io)).toBe(1);
  });
});
