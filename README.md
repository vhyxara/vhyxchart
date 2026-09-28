# VhyxChart — diagrams that move

[![npm](https://img.shields.io/npm/v/@vhyxchart/core?label=%40vhyxchart%2Fcore)](https://www.npmjs.com/package/@vhyxchart/core)
[![Open VSX](https://img.shields.io/open-vsx/v/vhyxara/vhyxchart-vscode?label=Open%20VSX)](https://open-vsx.org/extension/vhyxara/vhyxchart-vscode)

Write architecture, flows, sequences and algorithms as Markdown-friendly text
(familiar flowchart and sequence syntax). Add a `scenario` and the diagram comes alive: requests
travel along edges, services change state, notes appear, values sort. Play,
pause, step and scrub like a video — in docs sites, VS Code, React, plain HTML,
and GitHub READMEs (as animated SVG).

```vhyx
flowchart LR
  client([Browser]) --> api[API] --> db[(Postgres)]

scenario Save a profile
  client -> api : PATCH /me
  api is active
  api -> db : UPDATE
  db is done
  api -> client : 200
  api is done
```

## Packages

| Package | What |
|---|---|
| `@vhyxchart/core` | Parser, layered layout, timeline, SVG + SMIL renderer, browser player, `<vhyx-chart>` element. Zero dependencies, ~30 KB gzip. |
| `@vhyxchart/react` | `<VhyxChart>`, `useVhyxChart` (headless), `<VhyxChartStatic>` (server components) |
| `@vhyxchart/cli` | `vhyxchart render` (.vhyx/.md → animated SVG), `html`, `check` |
| [`vhyxchart-vscode`](https://open-vsx.org/extension/vhyxara/vhyxchart-vscode) | Markdown preview rendering, `.vhyx` language, live side preview, diagnostics, export |
| `apps/docs`, `apps/playground` | Documentation site and editor playground (built with VhyxUI; playground publishes a VhyxSeal manifest) |

## VS Code and Cursor

Install **VhyxChart** from the Extensions view in Cursor, VSCodium or Windsurf, or
from [Open VSX](https://open-vsx.org/extension/vhyxara/vhyxchart-vscode). In VS Code, download the
[.vsix](https://open-vsx.org/api/vhyxara/vhyxchart-vscode/0.1.0/file/vhyxara.vhyxchart-vscode-0.1.0.vsix) and run
**Extensions: Install from VSIX…**. `` ```vhyx `` fences then animate in the Markdown
preview, and `.vhyx` files get highlighting, errors and a live side preview.

## Develop

```bash
pnpm install
pnpm build && pnpm test
pnpm --filter @vhyxchart/playground dev   # http://localhost:3101
pnpm --filter @vhyxchart/docs dev         # http://localhost:3100
pnpm --filter vhyxchart-vscode package    # builds a .vsix
```

Requires Node.js 20.19 or newer. The docs and playground use the published
VhyxUI and VhyxSeal packages from npm.
