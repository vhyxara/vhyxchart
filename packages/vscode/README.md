# VhyxChart for VS Code

Animated diagrams that live next to your code.

- **Markdown preview**: ` ```vhyx ` fences render as live, animated players in VS Code's built-in Markdown preview (`Ctrl/Cmd+Shift+V`). Optionally take over ` ```mermaid ` fences too (`vhyxchart.renderMermaidFences`).
- **`.vhyx` files**: syntax highlighting, snippets (`flow`, `seq`, `array`, `scenario`), folding, and **Open Animated Preview to the Side** (`Ctrl/Cmd+K V`) that updates as you type.
- **Inline errors**: diagram mistakes are underlined with the exact line and a suggested fix — in `.vhyx` files and inside Markdown fences.
- **Export**: `VhyxChart: Export Animated SVG` (plays on GitHub, in `<img>`, Notion) and `VhyxChart: Export Interactive HTML`.

```vhyx
flowchart LR
  client([Browser]) --> api[API] --> db[(Postgres)]

scenario Request
  client -> api : GET /items
  api is active
  api -> db
  db is done
  api -> client : 200
  api is done
```

## Settings

| Setting | Default | |
|---|---|---|
| `vhyxchart.theme` | `auto` | `auto` follows the editor theme |
| `vhyxchart.autoplay` | `true` | Start scenarios automatically |
| `vhyxchart.renderMermaidFences` | `false` | Render ` ```mermaid ` fences with VhyxChart |

## Build locally

```bash
pnpm --filter vhyxchart-vscode build
cd packages/vscode && npx @vscode/vsce package --no-dependencies
code --install-extension vhyxchart-vscode-0.1.0.vsix
```
