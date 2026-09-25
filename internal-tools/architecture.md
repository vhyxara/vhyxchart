# VhyxChart — Architecture

```
 source text
    │  parse()            never throws → { diagram, diagnostics[] (line, code, suggestion) }
    ▼
 Diagram  (flow | sequence | array) + scenarios + config (frontmatter)
    │  layout()           deterministic, structure-only
    ▼
 Layout   nodes/edges/groups with coordinates · routed spline paths
    │                                      │ compileTimeline(diagram, scenario)
    │                                      ▼
    │                                   Timeline  timed actions + step boundaries
    │                                      │ frameAt(t)   (pure)
    ▼                                      ▼
 renderSvg(layout, { frame })  ◄──────  Frame  states · tokens · notes · array items
    │                                      │
    ├─ player (browser): static SVG once, then per frame: set data-* attributes + re-render dynamic layer
    └─ renderAnimatedSvg: same structure + SMIL <animate>/<animateMotion> on one shared clock (no JS)
```

## Modules (`packages/core/src`)

| Module | Responsibility |
|---|---|
| `parser/common.ts` | frontmatter, comments, `;` splitting, durations, state aliases |
| `parser/flow.ts` | Mermaid flowchart/state grammar: shapes (nearest-closer disambiguation), edge ops, `&`, subgraphs, classDef/class/style, `[*]` |
| `parser/sequence.ts` | participants/actors/database, 8 arrow kinds, activations, notes, frames, par branches, waits |
| `parser/array.ts`, `parser/steps.ts` | array values and the scenario step language (travel chains, parallel, states, notes, captions, waits, together…end) |
| `layout/layered.ts` | Sugiyama-style: DFS cycle breaking → longest-path ranks → dummy nodes → group-aware barycentric crossing reduction (best-of-24) → isotonic-regression coordinates → label-aware rank gaps → spline routing with distributed ports → parallel-edge fan-out → group boxes |
| `layout/sequence.ts`, `layout/array.ts` | lifelines/messages/notes/frames/activations; fixed cell row |
| `layout/text.ts` | DOM-free text metrics (deterministic everywhere) |
| `timeline/` | scenario → actions; value identity for arrays; `frameAt` |
| `render/theme.ts` | CSS variables, light/dark/auto, Vhyxara colour language, built-in classes, state styles |
| `render/svg.ts` | structure + dynamic layer + hooks |
| `render/animate.ts` | SMIL export (discrete overlays for states, `animateMotion` for tokens, `animateTransform` for array values) |
| `player.ts`, `browser.ts`, `global.ts` | interactive player, `<vhyx-chart>`, `autoRender`, IIFE bundle |
| `convenience.ts`, `trace.ts` | `render`, `renderMarkdown`, `extractBlocks`, `traceArray` |

## Why SMIL for exports

GitHub and most Markdown hosts strip `<script>` and inline styles on HTML but render SVG images with their internal SMIL/CSS animations. SMIL is the only way to ship motion in a README without GIFs (lossy, heavy, not themeable). CSS-driven state classes are not animatable by SMIL, so exports animate the opacity of per-state overlay shapes instead.

## VS Code extension

- `markdown.markdownItPlugins` → fence rule emits `<div class="vhyxchart" data-source>`; `markdown.previewScripts` (`preview.js`) mounts players and re-mounts on `vscode.markdown.updateContent`.
- `.vhyx` language: TextMate grammar + markdown fence injection grammar, snippets, folding.
- Diagnostics collection (debounced 150 ms) for `.vhyx` and fences in Markdown.
- Webview side preview (CSP with nonce, local global bundle), SVG/HTML export commands.
