# @vhyxchart/cli

Render VhyxChart diagrams from the command line — animated SVGs for READMEs,
interactive HTML pages, and a linter for CI.

> **Alpha**

## Install

```bash
npm install --save-dev @vhyxchart/cli
# or run without installing
npx @vhyxchart/cli render diagram.vhyx
```

## Commands

```text
vhyxchart render <file.vhyx|file.md> [-o out] [--static] [--theme light|dark|auto]
    .vhyx/.mmd → animated SVG (plays in GitHub READMEs, <img>, Notion…)
    .md        → Markdown copy with diagram fences replaced by SVG files (--out-dir) or --inline SVG
vhyxchart html <file.vhyx> [-o out.html]    interactive single-file page with playback controls
vhyxchart check <files…>                    lint diagrams (also inside .md); exits 1 on errors
```

## Animated diagrams in a GitHub README

```bash
npx @vhyxchart/cli render docs/architecture.vhyx -o docs/architecture.svg
```

```md
![Architecture](docs/architecture.svg)
```

The SVG animates with SMIL, so it plays wherever images render — no JavaScript needed.

## Links

- Documentation — https://github.com/vhyxara/vhyxchart#readme
- Source — https://github.com/vhyxara/vhyxchart/tree/main/packages/cli
- License — MIT
