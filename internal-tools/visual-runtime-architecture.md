# Visual Runtime Project — Exploration & Planning Doc

Status: EARLY EXPLORATION — nothing frozen yet.
Working name: "Visual Runtime" (placeholder, not final).

---

## 1. The Idea (as stated)

Mermaid's model: `text/code -> parser -> static diagram`.
Proposed model: `declarative diagram model -> interactive visual state -> animation/runtime`.

Core differentiators over Mermaid/PlantUML/D2:

- Diagrams carry **state** (node status: waiting/processing/done/failed), not just structure.
- **Animation represents change in the underlying model**, not decoration.
- One diagram can hold **multiple scenarios** (success path, failure path, timeout) as branches of the same graph, instead of separate hand-drawn diagrams per case.
- Three authoring modes into the same model: visual editor, simple declarative syntax, AI ("animate the request", "show the failure scenario").

## 2. Competitive Landscape (why this gap might actually be real)

| Tool                    | Declarative/text-driven          | Has real layout engine | Has state semantics   | Has animation                     | Has scenario branching   |
| ----------------------- | -------------------------------- | ---------------------- | --------------------- | --------------------------------- | ------------------------ |
| Mermaid / PlantUML / D2 | Yes                              | Yes (mature)           | No                    | No                                | No                       |
| Excalidraw / tldraw     | No (freehand)                    | No                     | No                    | No (some libs add basic tweening) | No                       |
| React Flow              | Partial (you build it)           | You supply/plug in     | You build it          | You build it                      | You build it             |
| Rive                    | No (visual state-machine editor) | N/A (manual placement) | Yes (its whole point) | Yes (its whole point)             | Not diagram-graph shaped |
| Motion Canvas / Manim   | Code-driven                      | You build it           | You build it          | Yes (strong)                      | You build it             |

**Conclusion:** nobody currently combines "declarative diagram → auto-laid-out graph → stateful → animated → branchable scenarios" into one accessible tool. That's a real whitespace, not an already-solved problem. But every piece of that combination is separately hard, which is why nobody's shipped it well yet.

## 3. Biggest Technical Risk: Layout

Automatic graph layout (Sugiyama-style layered layout, force-directed, constraint-based) is the actual moat/blocker, not the animation system. Mermaid/Graphviz/D2 lean on dagre/ELK-style algorithms refined over years and still produce awkward results on non-trivial graphs. This project needs to either:

- (a) accept manual/semi-manual node placement for v1 and treat auto-layout as a v2+ problem, or
- (b) scope the graphs small and shape-constrained enough (e.g. linear/branching flows, not arbitrary meshes) that a simpler layered layout suffices.

Recommendation: **(b) for v1** — constrain to flow/pipeline-shaped diagrams (the exact shape system-design and algorithm-trace diagrams actually are), not arbitrary graphs. This sidesteps the hardest layout problems while still covering the target use case.

## 4. Layered Architecture (superseded by Section 10 — kept here only as historical context)

```
Input Layer        UI editor / simple DSL / AI intent
        v
Diagram Model       graph (nodes, edges) + state + scenario branches
        v
Layout Engine        v1: constrained layered layout (flow-shaped graphs only)
        v
Render Engine        SVG/Canvas
        v
Animation Runtime     event -> state transition -> visual interpolation
        v
Interactive UI        play/pause/step/scenario-switch
```

**This diagram is stale — see Section 10's Structure/Runtime/Presentation decomposition for the evidenced version.** Two corrections the experiments forced: (1) "Diagram Model" conflated Structure and Runtime into one box, which five experiments now show are genuinely separate (Structure is frozen topology; Runtime is mutable state + entities + event history); (2) "scenario branches" belonging to the Model was the original thesis but the experiments give a cleaner formulation — a scenario is an event log/program _supplied to_ Runtime, not something stored inside Structure: `Structure S + Scenario/EventLog A → Runtime A`, `Structure S + Scenario/EventLog B → Runtime B`. Same structure, different execution histories. That's stronger than the original wording, not a rejection of it.

Key discipline unchanged: the **Structure is the only source of topological truth**; UI, DSL, and AI are all just different ways to produce/edit it. Nothing downstream should ever be hand-patched independent of the model.

## 5. Feature Tiers

**Core (v1 — must work end to end on one real use case):**

- Node/edge model with per-node status enum (waiting/processing/done/failed)
- Simple declarative syntax (human-friendly, not Mermaid-style)
- Constrained auto-layout for flow-shaped graphs
- Single scenario replay: events fire in sequence, nodes/edges animate through states
- Manual node repositioning override (escape hatch when layout gets it wrong)

**Near-term (v1.1–v2):**

- Multiple scenarios per diagram, user-switchable
- Timeline scrub (play/pause/step forward-backward)
- Visual editor (drag nodes, edit via panel) as an alternative to the DSL

**Later (v3+, only after v1 proves out on a real use case):**

- AI layer: natural-language -> diagram intent -> model edits
- Record/replay of real system events (not just authored scenarios)
- Export/embed as a component (`<Diagram source={model} />`)
- Generalizing beyond flow-shaped graphs to arbitrary graphs (state machines, git graphs, etc.) — this is the point where "universal visual runtime" becomes realistic, not before

**Explicitly deferred, not rejected:**

- "Time travel" full state reconstruction from any timeline point — cute, but a v1 distraction
- Universal visual language / cross-app embed spec — real long-term possibility, wrong place to start

## 6. Resolved Core Questions (v0.1 — revisit if evidence contradicts)

- **Where does state live?** ~~On nodes and edges.~~ **Superseded by evidence (flagged stale by GPT's review of the actual contract) — v0.5 demonstrated nodes carry zero state; messages are independent Runtime entities with a `location` attribute. Correct current statement:** Structure owns topology. Runtime owns mutable execution state. State may be associated with structural entities (sequence sorts) _or_ represented by independent runtime entities (graph/flow) depending on the experimentally validated domain — **the unifying representation remains unresolved, deliberately.** Graph-level status (e.g. "system degraded") is a derived read, never stored state.
- **What is animation?** A visualization of a state transition, not an independent authoring primitive. No "move node to x=300" in the model — only `event -> state change -> visual layer decides how to render it`.
- **What is a scenario?** A different event sequence over the same graph, not a different graph. This is what makes scenarios cheap (one model, N event sequences) instead of expensive (N hand-drawn diagrams).
- **Does layout understand state?** No. Layout is structure-only and frozen at authoring time. State changes never trigger relayout — they only change how existing, fixed positions render (color/pulse/token-along-edge). This is deliberate: it sidesteps the hardest version of the layout problem (layout-that-must-also-preserve-continuity-under-animation) by making continuity free — nothing repositions, ever, after authoring.
- **Where does time live?** In the Runtime layer only. Model = static structure. Runtime = events + state + time. Presentation = a stateless projection of "runtime at time T." Play/pause/step/scrub all fall out of this for free once Runtime holds a proper event sequence — they are not separate features to build.
- **Render/animation implementation:** ~~extend VhyxUI rather than build a renderer from zero~~ **Partially corrected by Step 0 recon (F1):** true only at the infrastructure-pattern level (module boundaries, `VhyxUIError` taxonomy, CSS-Modules + tokens theming, vite build shape, testing conventions) — false at the rendering-primitive level. No SVG/Canvas/shape-drawing/layout code exists anywhere in VhyxUI today (Popover/Select only do DOM/CSS positioning). A Presentation layer must be built substantially from scratch. Original assumption stands corrected, not rejected outright — the infra-reuse case remains real, just narrower than stated.

## 7. Open Questions (deliberately still open)

- RQ1/RQ3/RQ8/RQ10 (what is a diagram/event, determinism guarantees, which abstraction survives) — answered by building Experiment 1, not by further discussion.
- Standalone product vs CS-platform-internal-first — still open; leaning toward CS-platform-internal-first per the risk/reward discussion, not yet decided.

## 8. First Concrete Experiment

**Experiment 1 — Bubble Sort**, as the smallest real test of the model:

- Nodes = array cells. Edges = comparison pairs (ephemeral/logical, not structural — they exist only while a comparison event is active).
- Node state: `default -> comparing -> swapped -> sorted`.
- Events: `compare(i, j)`, `swap(i, j)`.
- Layout: fixed row of cells, never repositioned — only per-cell highlight/swap animation.
- Goal: prove the Model -> Runtime -> Presentation split holds up, and that scenario/playback (play/pause/step) fall out of the event sequence for free, before generalizing to Merge Sort, Binary Search, graph traversal, then system-architecture flows (per the DSA-laboratory progression).

## 9. Decision Log

- **v0.1:** Structure/behavior separated; layout is structure-only and frozen (no dynamic relayout); animation = state-transition visualization; scenario = event sequence over one graph, not separate graphs; time lives in Runtime only; render/animation layer built as a VhyxUI extension, not from scratch; first concrete build is Experiment 1 (Bubble Sort), not the DSL or a general layout engine.
- **v0.2 (post architecture-review + runtime spike, all empirically tested via a throwaway Node spike, not just argued):**
  - Structure holds only `{id, position}` — no values baked in. Initial values are a separate runtime seed. (Resolves cell-identity-vs-value-identity leak.)
  - Swap = values exchange between two fixed cells, rendered in place (cross-highlight). No token/value-identity object yet — deliberately deferred until a use case actually needs a value to visually travel (not needed by any sort algorithm).
  - `move` primitive eliminated. Insertion Sort's "shift" is mechanically a chain of adjacent `compare`+`swap`, identical to Bubble Sort's primitives — proven by spike, not just argued. Event vocabulary is now 4 primitives (`compare`, `swap`, `select`, `commit`), 3 of which are cross-validated by two algorithms.
  - `selected`/`sorted` are independent persistent boolean flags on runtime state (set/cleared by `select`/`commit`), not a single status enum — fixes Selection Sort's "selected must survive several compares" leak. Confirmed working in spike (selected cell stays flagged across a multi-compare sequence).
  - Transient decoration (`comparing`/`swapping`) still derived purely from the current event; only momentary highlight state, never anything that needs to persist.
  - Time: `RuntimePosition = { eventIndex, progress }` shape reserved conceptually, **not implemented** — v0.1/0.2 only support event-cursor granularity (step, not sub-event scrubbing).
  - Runtime confirmed sequential-single-current-event only (no parallelism) — recorded as an explicit v0.2 constraint, to be stress-tested by Merge Sort next (Merge Sort is the next adversarial experiment: tests parallelism/multiple-current-events and whether a "sequence" structure still suffices once sub-arrays are conceptually separate regions).
  - Renderer-blindness test run empirically (throwaway Node spike, not hand-argued): `applyEvent`/`render` contain zero algorithm-name branching; Bubble, Selection, and Insertion Sort all fold correctly through the identical runtime and produce correctly sorted output.
  - Not yet handed to Claude Code — still pre-production spike code; production build brief follows only after Merge Sort (or another structure-breaking case) is tested against the same model.
- **v0.3 (post Merge Sort spike):**
  - Accepted invariants (I-001–I-007, verbatim from GPT's review): structure immutability; renderer algorithm-blindness; deterministic replay (same structure + seed + events → same state); events describe operations not animation instructions; runtime owns temporal progression; persistent state survives unrelated events; visual movement ≠ structural movement.
  - Hypothesis H-001 recorded: "sequence values are payloads, not entities" — proven for linear in-place sorts; explicitly not yet claimed to generalize to message tokens, network packets, graph-traveling entities, or physical simulation.
  - `select` scope precisely bounded: proven as a persistent-state transition in linear algorithm traces; generality (search, graph traversal, UI selection) unproven and not being chased yet.
  - Merge Sort spike (real recursive algorithm, run through the model, not argued): sorted correctly. Structure over-provisioned upfront (n visible + n scratch cells, all frozen at authoring time) — I-001 held without needing dynamic entity creation, because "frozen" doesn't require "minimal," only "declared before runtime starts." Presentation chose not to render scratch cells — a rendering decision, not a structural one.
  - No tree/hierarchical Structure type needed for divide-and-conquer — "left half"/"right half" is implicit in which cell ids a given event references, not stored structure. Narrows H-001's open hierarchy question.
  - No genuine concurrency found or needed — every `write` is causally dependent on the `compare` immediately before it, confirmed both analytically (predicted before running) and empirically.
  - New primitive discovered and justified: `write(from, to)` — one-directional copy, mechanically distinct from `swap` (symmetric exchange). Vocabulary is now 5 primitives (`compare`, `swap`, `write`, `select`, `commit`), each earned by a specific mechanical need rather than assumed upfront.
  - Next open stress test (not yet run): a case that might actually require true token/value identity or genuine concurrency — candidates to consider: a graph-traversal algorithm (BFS/DFS, tests non-sequence Structure type for the first time) or a system-diagram-style flow (tests whether edges are real for once, unlike every sort algorithm so far).
- **v0.4 (post BFS/DFS spike):**
  - First experiment where edges are genuinely first-class: `Structure { type: "graph", nodes, edges }`, and traversal is literally inexpressible without them. Resolves the earlier open question conservatively, in GPT's exact phrasing: edges were unnecessary for four sequence-shaped algorithms, and are necessary once relationships aren't implicit in position — both are now evidenced, not assumed.
  - BFS and DFS run through byte-identical `applyEvent`/`render` code (checked programmatically, zero algorithm-name branching) — they differ only in event _order_, produced by the generator's own private bookkeeping (a queue for BFS, the JS call stack for DFS). Confirms GPT's hypothesis: frontier/queue/stack are never Runtime-visible state, exactly like Merge Sort's shadow array — they're generator-internal, not part of the model.
  - Multi-path graph (D reachable via two edges) resolved cleanly: real generator runs never double-discovered D (correctly checked their own `discovered` set first). To test the invariant itself rather than trust generator correctness, fed the runtime a deliberately invalid event sequence (`discover(D)` twice) directly — runtime threw `INVARIANT VIOLATION`, confirming persistent-state protection is enforced by Runtime, not merely honored by well-behaved algorithms.
  - Known untested gap: edge direction. This graph was effectively undirected (`neighborsOf` treats `from`/`to` symmetrically); a directed graph where traversal direction matters is not yet covered.
  - Next planned experiment (v0.5, per GPT): flow/system diagram with a value that actually travels across edges (client→gateway→service→db), testing whether payload/token identity is required — the first case where `write`/exchange-in-place may not be sufficient.
- **v0.5 (post system-flow spike):**
  - New invariant I-008 (GPT, adopted verbatim): algorithm execution state (queues, stacks, temp arrays, pointers) is producer-private and never enters Runtime unless visualizing it is itself an explicit requirement — generalizes the Merge Sort/BFS-DFS shadow-state findings.
  - Ran the naive approach deliberately (reusing sequence model's single-scalar-per-node) rather than assuming it fails: it fails _silently_ — `A.value = "M2"` overwrites `A.value = "M1"` with no error, no detectable trace that M1 was ever there. This is a worse failure class than every prior limitation (which were all "can't express this," caught at write-time) — this one produces a confidently wrong runtime state.
  - Resolution: messages are independent Runtime-level entities with a `location` attribute referencing a Structure node — never stored on the node itself. Nodes carry zero state; they're pure structural anchors. This is the third conceptual layer GPT was hunting for (Structure / Runtime-entities-with-identity / the relationship between them).
  - Edges required directionality for the first time (v0.4's edges were direction-agnostic) — `transfer(messageId, edgeId)` is validated against `edge.from === message.location`; a mismatched transfer throws `INVARIANT VIOLATION`, tested directly (not just trusted).
  - New invariant I-009: Structure-level entities (nodes, edges) remain immutable per I-001; Runtime-level entities (messages/tokens) may be created dynamically (`spawn`) — the distinction I-001 always implied but this is the first experiment where it was actually exercised.
  - Q4 (partial/continuous movement, e.g. "40% between A and B") remains genuinely open and untested — this model only proves discrete per-event location jumps. Correctly still deferred, not resolved.
  - Two messages (M1, M2) tracked independently through the same path (A→B→C) with no cross-contamination — direct evidence identity was necessary, not merely convenient.

## 10. v1 Contract — Evidence-Scoped Schema

**v1 is not the universal visual runtime. It is the smallest model currently supported by five experiments** (Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, BFS/DFS, system-flow/messages). Every element below is tagged with what actually earned it.

### Structure — with explicit structural invariants (added per review; Step 0 must determine where these are validated)

```ts
type Structure =
  | { type: "sequence"; entities: { id: string; position: number }[] }
  | {
      type: "graph";
      nodes: { id: string }[];
      edges: { id: string; from: string; to: string }[];
    }; // directed
```

Required at minimum: `edge.id` unique · `node.id` unique · **`entity.id`/`node.id` unique within a `sequence` structure too** (added retroactively — implementation correctly found this omission: sequence events address cells by id, so duplicate ids make addressing ambiguous; Section 10's original text only stated uniqueness for the graph variant) · `edge.from` references an existing node · `edge.to` references an existing node · an edge represents `from → to` only — the reverse relationship does not exist unless separately declared.

### Runtime — two coexisting patterns, deliberately left unreconciled (see adversarial finding #1)

- **Pattern A (sequence sorts):** state keyed directly by structural entity id: `{ value, sorted, selected }`.
- **Pattern B (graph/flow):** an independent entity registry (messages), each with a `location` attribute pointing at a Structure node id. Nodes themselves carry no state.

This is currently an **architectural observation, not a schema** — the document should not imply these will merge. **Step 0 investigation item:** determine whether the existing experiments imply one runtime state algebra or legitimately require multiple state representations; do not unify them without evidence.

### Event vocabulary currently evidenced across tested domains (not yet proven a primitive algebra)

`compare`, `swap`, `write`, `select`, `commit` (sequence topology) · `discover`, `visit`, `traverseEdge`, `spawn`, `transfer` (graph topology)

These are evidenced _event types_ — each one was shown to work. They are not yet evidenced as the _fundamental units_ of the runtime; that would require demonstrating compositional semantics and validation rules across primitives, which hasn't been attempted. Calling them "primitives" risks Claude Code encoding the ten names as a permanent core API rather than a currently-evidenced vocabulary.

### Invariants

I-001 Structure immutability · **I-002 Renderer algorithm-blindness within an implemented topology** (narrowed — see finding #3; the stronger open hypothesis, "can one renderer project multiple Structure topology types without topology- or algorithm-specific branching," remains a separate, untested question) · I-003 Deterministic replay (explicitly tested, not merely assumed) · I-004 Events describe operations, not animation instructions · I-005 Runtime owns temporal progression · I-006 Persistent state survives unrelated events · I-007 Visual movement ≠ structural movement · I-008 Algorithm execution state is producer-private · **I-009 Runtime entity lifecycle is independent of Structure lifecycle. Runtime entities may be created during execution without modifying Structure topology; runtime entity _removal_ is untested and not claimed.** (Tightened: creation is evidenced, removal is not — the original wording risked implying both were proven.)

### Acceptance criterion — post-commit mutation rejection (finding #5, now a hard requirement, not an invariant sentence)

```text
Given:  cell A has committed = true
When:   swap(A, B)
Then:   Runtime must reject the event.
        It must not: mutate A, mutate B, append a partially applied event, or silently ignore the violation.
        Rejected events must leave Runtime state completely unchanged (no partial mutation before the rejection).
```

This is a mandatory correctness requirement for the Claude Code implementation, not an architectural suggestion — the confirmed gap (sequence-side runtime currently allows this silently) must not ship.

### Evidence table (reclassified per adversarial review)

| Element                                            | Status                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| Immutable Structure                                | Proven within tested scope                                                      |
| Sequence topology                                  | Proven (4 algorithms)                                                           |
| Directed graph topology                            | Proven (2 algorithms)                                                           |
| Runtime owns mutable state                         | Proven                                                                          |
| Algorithm execution state remains producer-private | Proven                                                                          |
| Runtime entity identity                            | Proven                                                                          |
| Runtime entity location                            | Proven                                                                          |
| Deterministic replay                               | Proven (explicitly tested, not assumed)                                         |
| Runtime validation exists                          | Proven, uneven coverage                                                         |
| Event vocabulary                                   | Proven as domain-specific event types; primitive algebra **open**               |
| `write`                                            | Proven (Merge Sort only)                                                        |
| `select`                                           | Partially proven (Selection Sort only)                                          |
| `discover` / `traverseEdge`                        | Proven                                                                          |
| `spawn` / `transfer`                               | Proven (one scenario)                                                           |
| Runtime validation (graph/flow side)               | Proven (discover-once, edge-direction-match both throw on violation)            |
| Runtime validation (sequence side)                 | **Confirmed gap → implementation requirement** (see acceptance criterion above) |
| Cross-topology unified renderer                    | Open                                                                            |
| Unified Runtime state representation               | Open                                                                            |
| Partial-time/interpolation                         | Open                                                                            |
| Concurrency                                        | Open, not required by any tested algorithm                                      |
| Dynamic Structure                                  | Explicitly unsupported                                                          |
| Dynamic layout                                     | Explicitly unsupported                                                          |

### Adversarial findings (self-review, then externally reviewed against this exact document)

1. **Two Runtime patterns coexist with no unifying account.** Not resolved by fiat — forcing convergence now would be designing ahead of evidence. The contract states this as an open Step 0 investigation item, not a resolved architecture, so neither pattern is accidentally privileged by the schema.
2. **`write`/`swap` (direct cell-to-cell) vs `transfer` (edge-mediated) are different movement primitives, and that's correct, not an inconsistency** — sequences have no edges (D5), so movement must reference cells directly; graphs have edges, so movement is edge-mediated.
3. **Renderer-blindness (I-002) was proven per-topology only** — narrowed in the invariant itself, not just the evidence table, so the phrase "algorithm-blindness" can't silently read as "topology-blindness" too.
4. **Determinism (I-003) is now genuinely evidenced**, not assumed — explicit replay-equality test run and confirmed.
5. **Sequence-side invariant gap is now a mandatory acceptance criterion** (above), not a deferred observation, with the atomicity property (no partial mutation on rejection) made explicit per GPT's addition.
6. **`select`'s persistent-clear semantics and `visit`'s transient "current" marker are conceptually related but unreconciled** — both mean "presently the focus," one persists, one doesn't. Low priority; noted rather than silently left inconsistent.

### Structure → Runtime → Presentation, made explicit

```
Structure (topology + identity, immutable)
        |
        v
Runtime (mutable state, runtime entities, event history, execution position)
        | snapshot
        v
Presentation (visual projection, animation, interaction)

Algorithm / Scenario Generator --produces--> Event sequence --executed by--> Runtime
```

The algorithm is not part of Runtime — it produces the history Runtime executes. A scenario is an event log supplied to Runtime, not something stored inside Structure.

### What Step 0 reconnaissance should actually be asked to do

Not "implement the Visual Runtime." Instead: **reconnoiter the repository and determine where the experimentally validated v1 contract can be introduced without prematurely resolving the two open architectural questions** (unified Runtime representation; cross-topology renderer). Identify existing VhyxUI infrastructure that can support the Presentation boundary. Report proposed file/module boundaries, dependencies, conflicts, and implementation risks. Do not write production code until the reconnaissance is reviewed. The post-commit-mutation acceptance criterion is a mandatory correctness requirement for whatever gets built, not an optional invariant.

**Recommended next step:** address finding #5 (sequence-side invariant enforcement) as a concrete requirement in the implementation brief; leave #1 and #6 as documented open questions rather than resolving them speculatively. Then proceed to Claude Code Step 0 reconnaissance.

## 11. Step 0 Reconnaissance — Complete (2026-09-05)

No production code written, no open architectural question resolved. Full JSON report in `vhyxChart/session_update.md`. Headline outcomes:

- **New package proposed:** `packages/visual-runtime` → `@vhyxui/visual-runtime`, sibling to core/react/tokens. Structure + Runtime as pure TypeScript, zero React dependency. Depends only on `@vhyxui/core` (for error-taxonomy reuse).
- **Runtime patterns stay separate on disk** (`sequenceRuntime.ts` / `graphRuntime.ts`), sharing only error/invariant-throwing plumbing — an infrastructure-level DRY choice, explicitly **not** a resolution of the Pattern A/B unification question. State shapes and fold logic remain fully independent between the two files.
- **F1 (significant):** VhyxUI has zero rendering primitives today — corrected the doc's prior assumption (see Section 6 edit above). Presentation must be built substantially from scratch; deliberately left unscoped for brief #1.
- **F3:** naming collision found — `@vhyxui/core/contracts` already means VhyxSeal's agent-contract system (safety levels, permissions), unrelated to this project's "v1 Contract." Reported, not unilaterally renamed.
- **Section 5 mechanism accepted:** Runtime-exclusive validate-then-commit (check all preconditions before any mutation — atomicity falls out for free, no rollback needed). Reuses `VhyxUIError`/`VhyxUIErrorCode` with a new code; formalizes the already-proven graph-side throw-on-violation behavior into the same taxonomy rather than inventing new behavior. Test proposed asserts both the thrown error code and full pre/post state snapshot equality.
- **No prior visualization/diagram work found elsewhere in Vhyxara** (checked vhyxara-academy) — no conflicts.

**Pending Super Leader sign-off before any implementation brief:** (1) confirm `@vhyxui/visual-runtime` as the package name, (2) confirm `schema` replaces `contract` in code/module naming to avoid the F3 collision, (3) confirm Presentation stays out of scope for implementation brief #1 (Structure + Runtime + Section 5 acceptance criterion only).

## 12. Implementation Brief #1 — Complete, Pending Commit Authorization (2026-09-05)

`@vhyxui/visual-runtime` built. Full monorepo build/test/typecheck green (6/6, 9/9, 11/11 Turbo tasks); 31 new tests including the exact Given/When/Then acceptance criterion (state+history snapshot-equality on rejection, both sequence and graph sides). Full JSON report in `vhyxChart/session_update.md` (Entry 2). No commit made — gated on review, per protocol.

- **F4 (process lesson, not an implementation defect):** this monorepo's sibling packages depend on each other via published npm-registry tarballs, not workspace links — a fact Step 0 recon didn't check (it inspected package.json/vite.config.ts/turbo.json but never traced `pnpm-lock.yaml` resolution). The only published `@vhyxui/core` (0.1.0-alpha.1) predates the two new error codes this brief required, so `@vhyxui/visual-runtime` uses `workspace:*` instead — a deliberate, flagged deviation, accepted as provisional until the next real `@vhyxui/core` publish. **Retrospective protocol lesson:** future Step 0 briefs should check lockfile dependency-resolution style, not just config files, the same way this protocol already accumulates other retrospective fixes.
- **F6:** `exactOptionalPropertyTypes` rejects naive optional-context forwarding into `VhyxUIError`; fixed via conditional spread. Flagged for whoever writes the next such helper.
- **Two interpretive calls, both surfaced rather than silently settled:** sequence entity-id uniqueness (now folded back into Section 10 above, since it was a genuine omission in the contract, not a liberty taken) and `visit`/`traverseEdge` implemented as non-mutating/transient (correctly left as the conservative, still-open choice the brief itself flagged as unresolved).
- Reviewed against the brief's exit criteria: all pass, including the anti-implicit-unification checks (no shared `BaseRuntimeState`/`RuntimeEntity`/`applyEvent`) and the requirement that the package build through the generic Turbo task with no speculative override.
- **Claude's review verdict: ready for Super Leader commit authorization**, with F4's `workspace:*` deviation accepted as provisional pending the next `@vhyxui/core` publish.
- **GPT's adversarial verdict: COMMIT AUTHORIZED.** Confirmed the larger architectural check explicitly — the implementation did not sneak in a unified Pattern A/B runtime, a generic `Runtime<T>`, a universal event dispatcher, an abstract event algebra, animation/time machinery, Presentation scaffolding, dynamic Structure, or renderer abstractions. Shared error plumbing remains infrastructure, not evidence of unification.
- **RETRO-001 recorded** (protocol-level lesson, belongs in the vhyxai protocol's own retrospective-updates list, not just this project): _Static inspection of package manifests/workspace/build configuration does not reveal actual dependency-resolution behavior (registry tarball vs. workspace link) — future Step 0 reconnaissance must inspect the lockfile and verify the resolved source/version of relevant cross-package dependencies, since manifest intent and actual resolution are not equivalent._

**Final state this cycle:** Step 0 ✅ signed off · Brief #1 ✅ authorized · Implementation ✅ meets scope · F4 ⚠️ accepted provisional deviation · F6 📝 recorded, no action · sequence-id invariant 🔒 folded into Section 10 · Pattern A/B 🔓 still unresolved · Presentation 🚫 still excluded · event algebra 🔓 still unresolved · **Commit: AUTHORIZED.**

## 13. vhyxChart Verification (pre-publish dogfooding) — Complete (2026-09-05)

All six demos (bubble/selection/insertion/merge sort, BFS/DFS, system-flow) passed against a real tarball-installed `@vhyxui/visual-runtime` — genuine external `npm install`, no symlinks. All three mandatory invariant violations (post-commit mutation, discover-once, edge-direction-match) confirmed with the correct error code and zero-partial-mutation proof. No package source modified, no publish performed.

- **F7 (confirms and hardens F4 into a reproduced blocker):** `pnpm pack` rewrites `workspace:*` to a pinned `@vhyxui/core@0.1.3-alpha`, but the real registry only has `0.1.0-alpha.1` published. A real external `npm install` of the tarball fails immediately (`ETARGET`) — reproduced first try, no workaround. **This is the actual publish blocker: nobody outside this monorepo can install `@vhyxui/visual-runtime` today, in any form**, until `@vhyxui/core` is published at `>=0.1.3-alpha`. **RESOLVED (2026-09-06):** Tanveer manually published `@vhyxui/core@0.1.3-alpha` (`npm publish --access public --tag alpha`, run by him directly — Claude Code provided instructions but did not execute the publish, deliberately, since it's a hard-to-reverse shared-registry action). Re-verified: all six demos + typecheck re-run against a clean `npm install` with the local-tarball/override workaround fully removed — `@vhyxui/core` now resolves straight from `registry.npmjs.org`, integrity-hash-verified, no regressions. **Caveat, not fully closed:** only the `alpha` dist-tag was advanced — `latest` still points at the stale `0.1.0-alpha.1`. Any consumer installing `@vhyxui/core` with a bare `latest`/no-tag reference still gets the version missing the two new error codes. Fine for the `alpha`-tagged path this was tested against; not fixed for every possible consumer.
- **F8:** CJS `require()` of the package transitively breaks — `@vhyxui/core`'s barrel re-exports VhyxSeal's `@vhyxseal/core` contracts module, which is a real upstream bug (declares a CJS build it doesn't ship). Doesn't block the demos (ESM via tsx) but would block any real CJS consumer today. **Decision (2026-09-06): defer, don't fix.** Doesn't block the sixth experiment (browser/ESM, orthogonal to this). No known consumer needs CJS today. The actual fix (splitting `contracts` out of `@vhyxui/core`'s root barrel into a subpath export) is a real design change to a shared package other things depend on, not a quick aside — and the root cause is upstream in `@vhyxseal/core`, which may fix itself. **Sharpened by F10 (Experiment 6, Entry 5):** the same barrel-bloat root cause independently bit a build-free browser context too (needing to import-map around a transitive `react` dependency neither Structure nor Runtime ever touches), not just CJS. Two independent symptoms now point at the same cause. Still deferred — a real bundler-based consumer (Vite/webpack/esbuild, which is what the CS platform will actually use) tree-shakes this away automatically, so the cost is currently confined to build-free static pages, a narrow and self-chosen constraint of the experiments themselves, not of real consumers. **Revised revisit trigger:** reconsider if either a real CJS consumer _or_ a real (non-experimental) build-free-browser consumer appears — not just CJS alone.
- **F9:** `noUncheckedIndexedAccess` forces a non-null assertion at every state-lookup site (~25 across six demos) — real authoring-ergonomics cost, not a bug, no API change requested.
- **Process note (recurred — second incident):** this exact drift (Claude Code reading a stale copy of this document) happened again in Experiment 6 (ESC-1: it read the pre-F8-deferral text and correctly flagged the apparent contradiction rather than guessing). Reminding to "copy the file over" clearly isn't sufficient by itself. **Process fix, effective now:** before any brief that depends on this document, the current real-repo copy gets pasted/uploaded back into this conversation first, and edits happen against that — the same read-before-write discipline used elsewhere — rather than this conversation's copy being assumed authoritative.
- **ESC-2 (Experiment 6, Entry 5) — resolved:** Section 10 was physically misplaced (appeared after Section 13 instead of after Section 9), an artifact of how earlier edits targeted text near the end of Section 9. Fixed directly in this pass — sections now run 1–13 in physical order. A duplicate Structure type-definition block (a leftover short version alongside the fuller one with invariants) was also found and removed while fixing this.

**Decision (2026-09-06): hold the "playground + Claude-in-Chrome" idea for now.** Reasoning: (1) F7 is the actual blocker — nothing external-facing is worth building on a package nobody can install yet; (2) a visual playground is Presentation work, which F1 already showed is a from-scratch build, not a small add-on, and deserves its own evidence-gated experiment rather than an unscoped "visualize everything + other supporting things"; (3) Claude-in-Chrome has nothing to browse to until a minimal Presentation prototype exists. **Agreed next steps, in order:** ~~(1) resolve F7 — publish `@vhyxui/core` at `>=0.1.3-alpha`;~~ **(1) done, see above;** ~~(2) decide F8;~~ **(2) deferred — doesn't block (3), see F8 above;** (3) a scoped sixth experiment — one demo (e.g. Bubble Sort) rendered as plain colored boxes in a bare HTML page, treated with the same experiment discipline as the first five — is the point where a playground and Claude-in-Chrome would actually earn their place. **Ready to scope now.**

## 14. Experiment 6 — Minimal Browser Presentation Spike, Bubble Sort — Complete (2026-09-06)

Built `vhyxChart/playground/` (static HTML + vanilla JS, no build step, no framework). All three hypotheses tested against a real browser and the real tarball-installed package:

- **H1 (pure projection, zero branching): PROVEN**, per-topology (sequence only), matching I-002's existing scope — `render(structure, snapshot, transient)` contains no algorithm-name or hardcoded-id branch, confirmed by reading and grep.
- **H2 (no-motion legibility): PROVEN legible**, evidenced by real screenshots (sent to Tanveer directly for independent confirmation) — comparing/swapping/sorted/default states visually distinct at a glance, swap shown as values exchanging in place with zero position change, exactly as Section 6 specified. **Closed (2026-09-06): Tanveer ran the page himself and confirmed it working, independently observing a swap event (c2/c3) with the exact predicted effect — values exchanged in place, positions untouched, orange highlight, event counter tracking Runtime's own history.** This is the actual close on H2, not Claude Code's screenshot review — a live human's own eyes on the running page.
- **H3 (play/pause/step free from an event-indexed Runtime): PROVEN** — zero bespoke timing/interpolation logic; Step/Play/Pause/Reset are just cursor movement through a pre-generated event array. Confirmed interactively that Pause genuinely freezes state (not just visually).

**Tool substitution:** "Claude-in-Chrome" wasn't available this session; substituted a real cached Chrome-for-Testing binary driven via puppeteer-core for genuine browser automation (screenshots, real clicks, real timing) rather than skipping the verification step or fabricating an observation. Disclosed explicitly, not silently swapped in.

**F10:** the same barrel-bloat issue underlying F8 independently resurfaced here in ESM/browser form (needing an import-map workaround for a transitive `react` dependency neither Structure nor Runtime touches) — folded into F8's entry in Section 13 rather than tracked as a separate open item, since it's the same root cause with a second symptom.

**F11:** live interactive testing (not code review, not console snapshots) caught a real Play/Pause button-state boundary bug in the playground's own code — invisible on a skim, only visible by actually clicking through it. Direct evidence for why an interactive-verification step exists as its own thing, separate from "write it and read it back."

**Escalations (ESC-1, ESC-2) — both resolved, see Section 13's updated F8/process-note entries above.**

## 15. Experiment 7 — Minimal Browser Presentation Spike, Graph (BFS/DFS) — Complete (2026-09-06)

Built `vhyxChart/playground/graph.html` + `graph.js`, additive to Experiment 6 (its files untouched). Reused Experiment 4's exact directed-graph topology (A→B, A→C, B→D, C→D, D→E) and its BFS/DFS event-generation logic verbatim, driven through a second, wholly independent `render()`.

- **H7-1 (presentable without layout computation): PROVEN** — node positions are a static hand-authored lookup, never computed, never touched by Runtime state; identical cx/cy confirmed across every captured screenshot in both BFS and DFS runs.
- **H7-2 (Runtime history changes the projection, not the graph): PROVEN**, and sharply — the standout evidence is BFS vs. DFS compared at the identical step count (5 steps in): same Structure, but BFS is mid-edge-traversal while DFS is mid-node-visit at that exact point. Same input, different history, different _kind_ of visual state, not just different nodes lit up.
- **H7-3 (independent second renderer, no sequence-renderer assumptions): PROVEN** — `graph.js` shares zero code with Experiment 6's `script.js`; its `render()` grepped clean of any algorithm-name or hardcoded node/edge-id branch, same discipline as Experiment 6's H1 check.

**Pattern A/B and cross-topology-renderer bearing — reported, not resolved, as instructed:** this experiment touched Pattern B exclusively (no Pattern A code path involved); the two renderers remain fully independent, which is a data point _for_ "independent per-topology renderers work fine in practice," not evidence for or against a future unified renderer, since none was attempted. One weak, non-conclusive observation: treating `visit`/`traverseEdge` as purely transient (never persisted) caused no legibility problem here — relevant to adversarial finding #6, but a single scoped observation, not a resolution.

No unexpected findings this time — expected, since this experiment reused Experiment 6's harness pattern and Experiment 4's algorithms verbatim rather than breaking new ground the way Experiment 6 did. Process note: no sync-staleness escalation was raised this time — a positive signal the "paste current doc back before starting" fix is working, but **classified as process evidence, not architectural evidence**: one clean cycle doesn't prove the workflow permanently fixed, it's a data point worth recording, not a closed claim.

**Closed (2026-09-06): Tanveer independently confirmed, via his own screenshots (deliberately captured mid-process rather than at a clean end state, to show discovered/green, traversing/orange, and pending/gray simultaneously in one frame).** Same BFS-vs-DFS-at-identical-event-index comparison Claude Code's report highlighted (event 12/14: BFS on `traverseEdge(e-de)`, DFS on `traverseEdge(e-ac)` — same Structure, different active edge, positions unmoved) — this is the closing, human-verified evidence for H7, the same standard applied to H2's closure in Experiment 6.

**Experiment 7 verdict: CLOSED / PASS.** Presentation has now independently projected two structurally different Structure types (sequence, directed graph) into real browser output, in both cases preserving the Structure/Runtime boundary, in neither case attempting unification. That's sufficient evidence to stop here and wait for a real use case to raise the next question, rather than manufacturing an Experiment 8 just to keep the counter moving — the same "evidence over speculation" discipline this whole project has run on from Experiment 1 onward.
