import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, basename, extname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { parse, render, renderMarkdown, extractBlocks, type Diagnostic } from '@vhyxchart/core';

/** Parsed CLI arguments. */
export interface Args {
  command: string | undefined;
  files: string[];
  flags: Record<string, string | true>;
}

/** Minimal argv parser (`--flag`, `--key value`, `--key=value`, `-o value`). */
export function parseArgs(argv: readonly string[]): Args {
  const files: string[] = [];
  const flags: Record<string, string | true> = {};
  const valued = new Set(['o', 'out', 'out-dir', 'theme', 'scenario']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a.startsWith('-')) {
      const body = a.replace(/^--?/, '');
      const eq = body.indexOf('=');
      if (eq >= 0) flags[body.slice(0, eq)] = body.slice(eq + 1);
      else if (valued.has(body) && i + 1 < argv.length) flags[body] = argv[++i] ?? '';
      else flags[body] = true;
    } else {
      files.push(a);
    }
  }
  const [command, ...rest] = files;
  return { command, files: rest, flags };
}

const str = (v: string | true | undefined): string | undefined => (typeof v === 'string' ? v : undefined);
const theme = (v: string | undefined): 'auto' | 'light' | 'dark' | undefined => (v === 'light' || v === 'dark' || v === 'auto' ? v : undefined);

function formatDiagnostics(file: string, diagnostics: Diagnostic[], lineOffset = 0): string[] {
  return diagnostics.map((d) => {
    const colour = d.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
    return `${colour}${file}:${d.line + lineOffset}\x1b[0m ${d.severity}: ${d.message} [${d.code}]${d.suggestion ? `\n    → ${d.suggestion}` : ''}`;
  });
}

/** Output sink so tests can capture messages. */
export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => process.stdout.write(l + '\n'), err: (l) => process.stderr.write(l + '\n') };

/**
 * `vhyxchart check <files…>` — lints diagrams (and diagrams inside Markdown).
 * @returns number of errors.
 */
export function check(files: string[], io: Io = defaultIo): number {
  let errors = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const units = extname(file).toLowerCase() === '.md' ? extractBlocks(text).map((b) => ({ source: b.source, offset: b.line })) : [{ source: text, offset: 0 }];
    for (const u of units) {
      const { diagnostics } = parse(u.source);
      errors += diagnostics.filter((d) => d.severity === 'error').length;
      for (const line of formatDiagnostics(file, diagnostics, u.offset)) io.err(line);
    }
  }
  io.out(errors === 0 ? `\x1b[32m✔ ${files.length} file(s) OK\x1b[0m` : `\x1b[31m✖ ${errors} error(s)\x1b[0m`);
  return errors;
}

/**
 * `vhyxchart render <file> [-o out]` — `.vhyx`/`.mmd` → SVG (animated unless
 * `--static`); `.md` → a copy with every ```vhyx fence replaced by an
 * animated SVG file + image link (GitHub-ready) or inline SVG (`--inline`).
 * @returns written file paths.
 */
export function renderFile(file: string, flags: Args['flags'], io: Io = defaultIo): string[] {
  const text = readFileSync(file, 'utf8');
  const t = theme(str(flags['theme']));
  const written: string[] = [];
  if (extname(file).toLowerCase() === '.md') {
    const outFile = str(flags['o']) ?? str(flags['out']) ?? file.replace(/\.md$/i, '.rendered.md');
    const assetDir = str(flags['out-dir']) ?? join(dirname(outFile), 'diagrams');
    const stem = basename(file, extname(file));
    const result = flags['inline']
      ? renderMarkdown(text, { ...(t ? { theme: t } : {}) })
      : renderMarkdown(text, {
          ...(t ? { theme: t } : {}),
          asset: (svg, i) => {
            mkdirSync(assetDir, { recursive: true });
            const svgPath = join(assetDir, `${stem}-${i + 1}.svg`);
            writeFileSync(svgPath, svg);
            written.push(svgPath);
            return `![diagram ${i + 1}](${relative(dirname(outFile), svgPath).split('\\').join('/')})`;
          },
        });
    writeFileSync(outFile, result);
    written.push(outFile);
  } else {
    const outFile = str(flags['o']) ?? str(flags['out']) ?? file.replace(/\.(vhyx|vhyxchart|mmd|mermaid|txt)$/i, '') + '.svg';
    const { svg, diagnostics } = render(text, { animated: !flags['static'], ...(t ? { theme: t } : {}) });
    for (const line of formatDiagnostics(file, diagnostics)) io.err(line);
    writeFileSync(outFile, svg);
    written.push(outFile);
  }
  for (const w of written) io.out(`\x1b[32m✔\x1b[0m ${w}`);
  return written;
}

function globalBundle(): string {
  const require = createRequire(import.meta.url);
  const path = require.resolve('@vhyxchart/core/vhyxchart.global.js');
  return readFileSync(path, 'utf8');
}

/**
 * `vhyxchart html <file> [-o out.html]` — standalone interactive page
 * (player with controls, offline, single file).
 */
export function htmlFile(file: string, flags: Args['flags'], io: Io = defaultIo): string {
  const text = readFileSync(file, 'utf8');
  const outFile = str(flags['o']) ?? str(flags['out']) ?? file.replace(/\.[^.]+$/, '') + '.html';
  const title = parse(text).diagram.config.title ?? basename(file);
  const t = theme(str(flags['theme'])) ?? 'auto';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<style>body{margin:0;padding:24px;font-family:system-ui,sans-serif;background:#fff;color:#0f172a}@media (prefers-color-scheme:dark){body{background:#0b1120;color:#f9fafb}}</style>
</head><body>
<vhyx-chart theme="${t}">${escaped}</vhyx-chart>
<script>${globalBundle()}</script>
</body></html>
`;
  writeFileSync(outFile, html);
  io.out(`\x1b[32m✔\x1b[0m ${outFile}`);
  return outFile;
}

export const HELP = `vhyxchart — diagrams that move

Usage:
  vhyxchart render <file.vhyx|file.md> [-o out] [--static] [--theme light|dark|auto]
      .vhyx/.mmd → animated SVG (plays in GitHub READMEs, <img>, Notion…)
      .md        → Markdown copy with fences replaced by SVG files (--out-dir) or --inline SVG
  vhyxchart html <file.vhyx> [-o out.html]   interactive single-file page with playback controls
  vhyxchart check <files…>                   lint diagrams (also inside .md); exit 1 on errors
`;

/** Runs the CLI; returns the exit code. */
export function run(argv: readonly string[], io: Io = defaultIo): number {
  const { command, files, flags } = parseArgs(argv);
  try {
    switch (command) {
      case 'render':
        if (files.length === 0) throw new Error('render needs a file');
        for (const f of files) {
          const perFile = { ...flags };
          if (files.length > 1) {
            delete perFile['o'];
            delete perFile['out'];
          }
          renderFile(f, perFile, io);
        }
        return 0;
      case 'html':
        if (files.length === 0) throw new Error('html needs a file');
        htmlFile(files[0] ?? '', flags, io);
        return 0;
      case 'check':
        if (files.length === 0) throw new Error('check needs files');
        for (const f of files) if (!existsSync(resolve(f))) throw new Error(`No such file: ${f}`);
        return check(files, io) > 0 ? 1 : 0;
      case undefined:
      case 'help':
        io.out(HELP);
        return 0;
      default:
        io.err(`Unknown command "${command}"`);
        io.out(HELP);
        return 1;
    }
  } catch (e) {
    io.err(`\x1b[31m${e instanceof Error ? e.message : String(e)}\x1b[0m`);
    return 1;
  }
}
