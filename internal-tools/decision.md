# decision.md — Operational rules for this codebase

_This file is the local, code-level distillation of `cs-platform-architecture-FINAL.md` and `cs-platform-development-governance.md`. If anything here ever appears to conflict with those documents, the architecture documents win — report the conflict as an escalation, don't silently pick one._


---

# Product decisions — 2026-09-25 (owner delegated full authority)

## VC-001 · VhyxChart owns its engine
`@vhyxchart/core` replaces `@vhyxui/visual-runtime` as the runtime. The experiments' invariants are kept; the evidence-scoped v1 contract generalises to a text-first product. VhyxUI's visual-runtime is frozen (VhyxUI UI-007).

## VC-002 · Mermaid compatibility is a feature
Structure syntax follows Mermaid so existing diagrams render unchanged; motion is additive (`scenario` blocks). Adoption over novelty.

## VC-003 · One timeline model for every diagram kind
Flow, sequence and array diagrams compile to the same `Timeline`/`Frame` types; renderers are per kind but share theme, player and export. Resolves the experiments' Pattern A/B question pragmatically: state is keyed by structure id (nodes, cells) while moving things (tokens, array values) are runtime entities with identity.

## VC-004 · Layout is structure-only and deterministic
No DOM measurement; text metrics are table-based so Node, browser and VS Code produce identical output. Scenarios never trigger relayout (I-001/I-007).

## VC-005 · Never throw on user input
`parse` returns diagnostics with line, code and suggestion; rendering continues with whatever parsed. `parseStrict` exists for CI. Mirrors VhyxSeal's "never crash the visual layer".

## VC-006 · SMIL for portable animation
Exports use SMIL (works in `<img>`, GitHub, no JS). Live player uses CSS transitions + a pure frame function.

## VC-007 · Zero runtime dependencies in core
Core bundles to ~30 KB gzip. React, CLI and VS Code packages are thin wrappers.

## VC-008 · Apps dogfood the family
Docs/playground use VhyxUI (layouts, components) and VhyxSeal (manifest); packages never depend on them.
