# @vhyxchart/react

React components for VhyxChart — animated diagrams written as text.

> **Alpha** — requires React 18 or newer.

## Install

```bash
npm install @vhyxchart/react @vhyxchart/core
```

## Interactive player

```tsx
import { VhyxChart } from "@vhyxchart/react";

const source = `
flowchart LR
  client([Browser]) --> api[API] --> db[(Postgres)]

scenario Save a profile
  client -> api : PATCH /me
  api -> db : UPDATE
  db is done
`;

export function Architecture() {
  return <VhyxChart source={source} autoplay loop controls />;
}
```

Player options: `autoplay`, `loop`, `controls`, `speed`, `scenario`, `theme` (`auto` | `light` | `dark`).

## Server components

`VhyxChartStatic` renders the SVG on the server with no client JavaScript:

```tsx
import { VhyxChartStatic } from "@vhyxchart/react/static";

<VhyxChartStatic source={source} animated />
```

## Custom controls

```tsx
import { useVhyxChart } from "@vhyxchart/react";

function Diagram({ source }: { source: string }) {
  const { ref, player, state } = useVhyxChart(source, { controls: false });
  return (
    <>
      <div ref={ref} />
      <button onClick={() => (state.playing ? player?.pause() : player?.play())}>
        {state.playing ? "Pause" : "Play"}
      </button>
    </>
  );
}
```

## Links

- Documentation — https://github.com/vhyxara/vhyxchart#readme
- Source — https://github.com/vhyxara/vhyxchart/tree/main/packages/react
- License — MIT
