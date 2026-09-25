# VhyxChart — diagrams that move

Write architecture, flows, sequences and algorithms as Markdown-friendly text
(Mermaid-compatible). Add a `scenario` and the diagram comes alive: requests
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
| `vhyxchart-vscode` | Markdown preview rendering, `.vhyx` language, live side preview, diagnostics, export |
| `apps/docs`, `apps/playground` | Documentation site and editor playground (built with VhyxUI; playground publishes a VhyxSeal manifest) |

## Develop

```bash
pnpm install
pnpm build && pnpm test
pnpm --filter @vhyxchart/playground dev   # http://localhost:3101
pnpm --filter @vhyxchart/docs dev         # http://localhost:3100
pnpm --filter vhyxchart-vscode package    # builds a .vsix
```

Sibling libraries (VhyxUI, VhyxSeal) are consumed as local tarballs in
`.tarballs/` — refresh them with `scripts/sync-siblings.sh`. See
`internal-tools/` for context, architecture, decisions and release notes.

The original visual-runtime experiments are preserved in `experiments/`.
