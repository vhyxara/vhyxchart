# VhyxChart — Context

_Sync ritual: read `claude.md` (process), this file, `decision.md`, `architecture.md`, the last 2–3 entries of `session_update.md`, and `visual-runtime-architecture.md` for the history of the model._

## What VhyxChart is

Text-to-diagram like Mermaid — but diagrams **move**. Structure is written in Mermaid-compatible syntax (flowchart/graph/architecture, sequenceDiagram, stateDiagram) plus an `array` type for algorithms. A `scenario` block describes behaviour: tokens travel along edges, nodes change state, notes and captions appear. The player can play, pause, step and scrub; exports produce SMIL-animated SVG that plays on GitHub and in `<img>` tags.

## Where it came from

The repo started as an evidence-driven experiment (Experiments 1–7: sorts, BFS/DFS, message flow) validating a Structure → Runtime → Presentation split with invariants I-001…I-009. Those experiments are preserved in `experiments/visual-runtime-v0/` and `visual-runtime-architecture.md`. This session turned the validated model into a product.

## Invariants carried over (still enforced)

- **I-001** Structure is immutable after parsing; layout is computed once and never changes during playback.
- **I-002** Renderers never branch on algorithm names — only on structure + frame data.
- **I-003** Deterministic: same source → same layout, timeline and frames (tested).
- **I-004** Scenario steps describe operations (travel, state, swap), never pixel animations.
- **I-005** Time lives only in the timeline; a frame is a pure function `frameAt(timeline, t)`.
- **I-006** Persistent state (node states, marks, pointers) survives until changed or `reset`.
- **I-007** Visual movement ≠ structural movement: array cells stay put, values (with identity) move.
- **I-008** Algorithm bookkeeping stays in the producer (`traceArray` records only visible operations).

Open questions from the experiments were resolved pragmatically: one timeline/frame representation serves all three diagram kinds, with kind-specific renderers sharing theme and player (decision VC-003).

## Packages

`@vhyxchart/core` · `@vhyxchart/react` · `@vhyxchart/cli` · `vhyxchart-vscode` · `@vhyxchart/examples` (private) · apps `docs`, `playground`.

## Family

Docs and playground are built with **VhyxUI** (`DocsLayout`, `MarketingLayout`, components). The playground publishes a **VhyxSeal** manifest (`/__agent__/manifest.json`). VhyxSeal's `visualize` command emits VhyxChart source; VhyxUI's docs embed VhyxChart architecture diagrams.

## Status (2026-09-25)

89 tests pass; build/typecheck green; docs (18 pages) and playground build; VS Code extension packages to a `.vsix`. Nothing published (tarballs/links only). Push blocked by GitHub App access (see notes.md).
