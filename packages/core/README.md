# @vhyxchart/core

Text-to-diagram like Mermaid — but diagrams **move**. Write flowcharts, sequence
diagrams and algorithms as text, add a `scenario`, and requests travel along
edges, services change state and notes appear. Play, pause, step and scrub like
a video, or export an animated SVG that plays on GitHub.

> **Alpha** — the syntax and API may change between minor versions.

## Install

```bash
npm install @vhyxchart/core
```

Zero dependencies, about 30 KB gzipped, runs in Node and the browser.

## Syntax

Structure is Mermaid-compatible; motion is an added `scenario` block.

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

Supported: `flowchart`/`graph`, `sequenceDiagram`, `stateDiagram` and `array` (for algorithms).

## Render to SVG

```ts
import { render } from "@vhyxchart/core";

const { svg, diagnostics } = render(source);                    // static SVG
const { svg: animated } = render(source, { animated: true });   // self-playing SVG (SMIL)
```

Invalid input never throws: `diagnostics` lists each problem with its line and a suggestion.
Use `parseStrict()` in CI when you want errors to fail the build.

## In the browser

```html
<script type="module">
  import { defineElement } from "https://unpkg.com/@vhyxchart/core/dist/browser.js";
  defineElement();
</script>

<vhyx-chart>
flowchart LR
  a[Start] --> b[Done]
</vhyx-chart>
```

Or render every ` ```vhyx ` code block on a page with the global bundle:

```html
<script src="https://unpkg.com/@vhyxchart/core/dist/vhyxchart.global.js" data-auto></script>
```

## Related packages

- `@vhyxchart/react` — React components
- `@vhyxchart/cli` — render diagrams from the command line

## Links

- Documentation — https://github.com/vhyxara/vhyxchart#readme
- Source — https://github.com/vhyxara/vhyxchart/tree/main/packages/core
- License — MIT
