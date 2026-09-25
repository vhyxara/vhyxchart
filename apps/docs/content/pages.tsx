import React from 'react';
import { EXAMPLES } from '@vhyxchart/examples';
import { Code, Example, PLAYGROUND } from '../components/ui';

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  toc: Array<{ id: string; label: string }>;
  body: () => React.ReactElement;
}

const ex = (id: string): string => EXAMPLES.find((e) => e.id === id)?.source ?? '';

const FIRST = `flowchart LR
  user([User]) --> app[Web app] --> api[API] --> db[(Database)]

scenario Save a profile
  user -> app : click Save
  app -> api : PATCH /me
  api is active
  api -> db : UPDATE
  db is done
  api -> app : 200
  api is done
  note app : Saved ✓`;

export const PAGES: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'Your first moving diagram in one minute.',
    toc: [{ id: 'first', label: 'First diagram' }, { id: 'where', label: 'Where it runs' }, { id: 'install', label: 'Install' }],
    body: () => (
      <>
        <h1>Getting started</h1>
        <p>VhyxChart turns plain text into diagrams that <strong>move</strong>. The structure is Mermaid-compatible; a <code>scenario</code> block adds the story: tokens travel along edges, nodes change state, notes appear. Play, pause, step and scrub like a video.</p>
        <h2 id="first">Your first diagram</h2>
        <Example source={FIRST} />
        <p>Three ideas are all you need:</p>
        <ul>
          <li><strong>Structure</strong> — nodes and edges, exactly like Mermaid: <code>a[Label] --&gt; b[(Database)]</code>.</li>
          <li><strong>Scenario</strong> — <code>a -&gt; b : label</code> sends a token along the edge (either direction).</li>
          <li><strong>State</strong> — <code>api is active | done | error | warn</code> colours a node until changed.</li>
        </ul>
        <h2 id="where">Where it runs</h2>
        <ul>
          <li>Markdown: <code>```vhyx</code> fences in docs sites, VS Code preview, and GitHub READMEs (via animated SVG export).</li>
          <li>React: <code>&lt;VhyxChart&gt;</code>, a headless hook, and a server-rendered component.</li>
          <li>Any page: one script tag and a <code>&lt;vhyx-chart&gt;</code> element.</li>
          <li><a href={PLAYGROUND}>The playground</a> — edit and share.</li>
        </ul>
        <h2 id="install">Install</h2>
        <Code>{`pnpm add @vhyxchart/react        # React
pnpm add @vhyxchart/core         # framework-free engine + player
pnpm add -D @vhyxchart/cli       # render .vhyx / README.md to animated SVG`}</Code>
      </>
    ),
  },
  {
    slug: 'why',
    title: 'Why VhyxChart',
    description: 'What moving diagrams add, and how VhyxChart compares.',
    toc: [{ id: 'compare', label: 'Comparison' }, { id: 'model', label: 'The model' }],
    body: () => (
      <>
        <h1>Why VhyxChart</h1>
        <p>Static diagrams show <em>what exists</em>. Systems are about <em>what happens</em>: a request hops through services, a job fails, a value moves during a sort. VhyxChart diagrams carry that behaviour, so one diagram replaces a slide deck of screenshots.</p>
        <h2 id="compare">Comparison</h2>
        <table className="cmp">
          <thead><tr><th /><th>VhyxChart</th><th>Mermaid</th><th>D2 / PlantUML</th><th>Hand-made animation</th></tr></thead>
          <tbody>
            <tr><td>Text source, diff-able</td><td>✓</td><td>✓</td><td>✓</td><td>✗</td></tr>
            <tr><td>Automatic layout</td><td>✓</td><td>✓</td><td>✓</td><td>✗</td></tr>
            <tr><td>Animated scenarios, many per diagram</td><td>✓</td><td>✗</td><td>✗</td><td>one per file</td></tr>
            <tr><td>Play / pause / step / scrub</td><td>✓</td><td>✗</td><td>✗</td><td>✗</td></tr>
            <tr><td>Animated SVG that plays on GitHub</td><td>✓</td><td>✗</td><td>✗</td><td>GIF</td></tr>
            <tr><td>Line-accurate errors with fixes</td><td>✓</td><td>partial</td><td>partial</td><td>—</td></tr>
            <tr><td>Size (browser bundle, gzip)</td><td>~30 KB</td><td>hundreds of KB</td><td>server-side</td><td>—</td></tr>
          </tbody>
        </table>
        <h2 id="model">The model</h2>
        <p>Structure is laid out once and never moves. A scenario compiles to a timeline, and every frame is a pure function of time. That is why scrubbing backwards is exact, exports are deterministic, and the same diagram renders identically in Node, the browser and VS Code.</p>
        <Example source={ex('pipeline')} />
      </>
    ),
  },
  {
    slug: 'mermaid',
    title: 'Coming from Mermaid',
    description: 'Paste your Mermaid, then add motion.',
    toc: [{ id: 'same', label: 'What stays the same' }, { id: 'add', label: 'What you add' }],
    body: () => (
      <>
        <h1>Coming from Mermaid</h1>
        <p>Flowcharts (<code>graph</code>/<code>flowchart</code>), sequence diagrams and state diagrams use Mermaid syntax, so existing diagrams render unchanged. Set <code>vhyxchart.renderMermaidFences</code> in VS Code, or pass <code>{'{ mermaid: true }'}</code> to <code>autoRender</code>, to take over <code>```mermaid</code> fences.</p>
        <h2 id="same">What stays the same</h2>
        <ul>
          <li>All node shapes, edge kinds (<code>--&gt; -.-&gt; ==&gt; --- --o --x &lt;--&gt; ~~~</code>), labels, <code>&amp;</code>, <code>subgraph</code>, <code>classDef</code>, <code>class</code>, <code>:::</code>, <code>style</code>.</li>
          <li>Sequence arrows, activations, notes, <code>loop/alt/else/opt/par/and/critical/break/rect</code>, <code>autonumber</code>.</li>
          <li><code>stateDiagram-v2</code> with <code>[*]</code>.</li>
        </ul>
        <h2 id="add">What you add</h2>
        <Example source={`graph TD
  A[Christmas] -->|Get money| B(Go shopping)
  B --> C{Let me think}
  C -->|One| D[Laptop]
  C -->|Two| E[iPhone]

scenario Decide
  A -> B : 💰
  B -> C
  C is active
  wait 600ms
  C -> D : One
  D is done`} />
      </>
    ),
  },
  {
    slug: 'flowchart',
    title: 'Flowcharts & architecture',
    description: 'Nodes, shapes, edges, groups.',
    toc: [{ id: 'direction', label: 'Direction' }, { id: 'shapes', label: 'Shapes' }, { id: 'edges', label: 'Edges' }, { id: 'groups', label: 'Groups' }],
    body: () => (
      <>
        <h1>Flowcharts & architecture</h1>
        <h2 id="direction">Direction</h2>
        <p>Start with <code>flowchart LR</code> (also <code>TB</code>, <code>BT</code>, <code>RL</code>). <code>architecture</code> is a flowchart that defaults to left-to-right. Layout is automatic: layers, crossing reduction, and smooth routing.</p>
        <h2 id="shapes">Shapes</h2>
        <Example source={`flowchart LR
  a[Rect] --> b(Round) --> c([Stadium]) --> d[(Database)]
  e[[Subroutine]] --> f((Circle)) --> g{Decision} --> h{{Hexagon}}
  i[/Input/] --> j[\\Output\\] --> k[/Trapezoid\\] --> l>Flag]`} />
        <h2 id="edges">Edges</h2>
        <Example source={`flowchart LR
  a -->|label| b
  a -.->|dotted| c
  a ==>|thick| d
  a --- e
  a --o f
  a --x g
  a <--> h`} />
        <h2 id="groups">Groups</h2>
        <Example source={ex('checkout')} />
      </>
    ),
  },
  {
    slug: 'scenarios',
    title: 'Scenarios (motion)',
    description: 'Tokens, states, notes, captions, timing.',
    toc: [{ id: 'steps', label: 'Step reference' }, { id: 'parallel', label: 'Parallel' }, { id: 'many', label: 'Many scenarios' }, { id: 'settings', label: 'Settings' }],
    body: () => (
      <>
        <h1>Scenarios</h1>
        <p>A <code>scenario Name</code> block lists steps. Steps run one after another; each becomes a stop for the step buttons and arrow keys.</p>
        <h2 id="steps">Step reference</h2>
        <Code>{`a -> b : label          token travels along the edge (reverse direction works too)
a -> b -> c             chain
a -> b & c              fan out (parallel)
a -> b, c -> d          parallel clauses
api is active           states: idle active done error warn skipped
a, b are done           (aliases: running, success, failed, degraded, …)
note api : text         callout on a node        note "text"  caption band
caption Step 2 of 3     subtitle under the diagram
highlight api           pulse
wait 500ms              pause (also 1s, 1.5s)
together … end          block of parallel steps
reset                   clear states and notes`}</Code>
        <h2 id="parallel">Parallel</h2>
        <Example source={ex('fanout')} />
        <h2 id="many">Many scenarios, one diagram</h2>
        <p>Add as many <code>scenario</code> blocks as you like; the player shows a picker. Exports play them back to back.</p>
        <h2 id="settings">Settings (frontmatter)</h2>
        <Code>{`---
title: Checkout
theme: auto          # auto | light | dark
speed: 1.5           # playback multiplier
travel: 700ms        # time for one hop
loop: true
autoplay: true
controls: true
spacing: relaxed     # compact | normal | relaxed
---`}</Code>
      </>
    ),
  },
  {
    slug: 'sequence',
    title: 'Sequence diagrams',
    description: 'Messages animate in order.',
    toc: [{ id: 'basics', label: 'Basics' }, { id: 'frames', label: 'Frames' }],
    body: () => (
      <>
        <h1>Sequence diagrams</h1>
        <h2 id="basics">Basics</h2>
        <p>Messages send in order; <code>par</code> branches run together. Arrows: <code>-&gt;&gt;</code> solid, <code>--&gt;&gt;</code> reply, <code>-x</code> lost, <code>-)</code> async; <code>+</code>/<code>-</code> after the arrow activates/deactivates. <code>wait 1s</code> adds a pause.</p>
        <Example source={ex('oauth')} />
        <h2 id="frames">Frames</h2>
        <Example source={ex('handshake')} />
      </>
    ),
  },
  {
    slug: 'state',
    title: 'State diagrams',
    description: 'Mermaid stateDiagram, animated.',
    toc: [{ id: 'example', label: 'Example' }],
    body: () => (
      <>
        <h1>State diagrams</h1>
        <p><code>[*]</code> becomes a start node (id <code>__start_root</code>) when it is a source and an end node (<code>__end_root</code>) when it is a target.</p>
        <h2 id="example">Example</h2>
        <Example source={ex('order-states')} />
      </>
    ),
  },
  {
    slug: 'arrays',
    title: 'Arrays & algorithms',
    description: 'Values that move: sorting and searching.',
    toc: [{ id: 'syntax', label: 'Syntax' }, { id: 'trace', label: 'Generate from code' }],
    body: () => (
      <>
        <h1>Arrays & algorithms</h1>
        <p>Cells stay put; <em>values</em> travel. Great for teaching sorting, searching and two-pointer techniques.</p>
        <h2 id="syntax">Syntax</h2>
        <Code>{`array Title
  values 5 3 8 1
  compare 0 1       swap 0 1       set 2 9
  mark 3 sorted     mark 0..2 done unmark 1
  pointer i 2       pointer i none
  note text         caption text   wait 300ms`}</Code>
        <Example source={ex('binary-search')} />
        <h2 id="trace">Generate from real code</h2>
        <Code>{`import { traceArray } from '@vhyxchart/core';

const source = traceArray('Bubble sort', [5, 1, 4, 2, 8], (a) => {
  for (let i = 0; i < a.values.length - 1; i++)
    for (let j = 0; j < a.values.length - i - 1; j++)
      if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
});`}</Code>
        <Example source={ex('bubble')} />
      </>
    ),
  },
  {
    slug: 'styling',
    title: 'Styling & themes',
    description: 'Themes, classes, CSS variables.',
    toc: [{ id: 'classes', label: 'Classes' }, { id: 'themes', label: 'Themes' }, { id: 'css', label: 'CSS variables' }],
    body: () => (
      <>
        <h1>Styling & themes</h1>
        <h2 id="classes">Classes</h2>
        <p>Built-in classes follow one colour language: <code>success</code>, <code>info</code>, <code>warn</code>, <code>danger</code>, <code>accent</code>, <code>muted</code>. Add your own with <code>classDef</code>.</p>
        <Example source={`flowchart LR
  a[Healthy]:::success --> b[Degraded]:::warn --> c[Down]:::danger
  d[Custom]:::brand
  classDef brand fill:#fdf4ff,stroke:#c026d3,color:#86198f`} />
        <h2 id="themes">Themes</h2>
        <p><code>theme: auto</code> (default) follows the OS, and also <code>data-theme=&quot;dark&quot;</code> or <code>.dark</code> on the page. Force with <code>light</code> / <code>dark</code>.</p>
        <h2 id="css">CSS variables</h2>
        <Code>{`.vc {
  --vc-node-fill: var(--vhyx-color-surface);   /* e.g. map to VhyxUI tokens */
  --vc-node-stroke: var(--vhyx-color-border);
  --vc-blue: var(--vhyx-color-info);
  --vc-token: var(--vhyx-color-accent);
}`}</Code>
      </>
    ),
  },
  {
    slug: 'markdown',
    title: 'Markdown & GitHub',
    description: 'Fences in docs, READMEs that animate.',
    toc: [{ id: 'fence', label: 'Fences' }, { id: 'github', label: 'GitHub READMEs' }],
    body: () => (
      <>
        <h1>Markdown & GitHub</h1>
        <h2 id="fence">Fences</h2>
        <Code>{'```vhyx\nflowchart LR\n  a --> b\n```'}</Code>
        <p>Docs sites: call <code>autoRender()</code> after your Markdown renders, or run <code>renderMarkdown(md)</code> at build time to inline animated SVG.</p>
        <h2 id="github">GitHub READMEs</h2>
        <p>GitHub strips scripts but plays SMIL animations inside SVG images. The CLI converts every fence into an animated SVG and links it:</p>
        <Code>{`npx vhyxchart render README.src.md -o README.md --out-dir docs/diagrams
# CI lint:
npx vhyxchart check README.src.md docs/**/*.vhyx`}</Code>
      </>
    ),
  },
  {
    slug: 'vscode',
    title: 'VS Code',
    description: 'Live preview while you type.',
    toc: [{ id: 'features', label: 'Features' }, { id: 'install', label: 'Install' }],
    body: () => (
      <>
        <h1>VS Code</h1>
        <h2 id="features">Features</h2>
        <ul>
          <li><code>```vhyx</code> fences animate inside the built-in Markdown preview (<code>Ctrl/Cmd+Shift+V</code>).</li>
          <li><code>.vhyx</code> files: highlighting, snippets (<code>flow</code>, <code>seq</code>, <code>array</code>, <code>scenario</code>), folding.</li>
          <li><strong>Open Animated Preview to the Side</strong> (<code>Ctrl/Cmd+K V</code>) updates as you type.</li>
          <li>Errors are underlined with the exact line and a suggested fix.</li>
          <li>Export animated SVG or interactive HTML.</li>
        </ul>
        <h2 id="install">Install (local build)</h2>
        <Code>{`pnpm --filter vhyxchart-vscode package
code --install-extension packages/vscode/vhyxchart-vscode-0.1.0.vsix`}</Code>
      </>
    ),
  },
  {
    slug: 'react',
    title: 'React',
    description: 'Component, hook, and server rendering.',
    toc: [{ id: 'component', label: 'Component' }, { id: 'hook', label: 'Custom controls' }, { id: 'server', label: 'Server components' }],
    body: () => (
      <>
        <h1>React</h1>
        <h2 id="component">Component</h2>
        <Code>{`import { VhyxChart } from '@vhyxchart/react';

<VhyxChart theme="dark" onReady={(player) => player.play()}>{\`
  flowchart LR
    a --> b
  scenario Go
    a -> b
\`}</VhyxChart>`}</Code>
        <h2 id="hook">Custom controls (headless)</h2>
        <Code>{`const { ref, player, state } = useVhyxChart(source, { controls: false });
return (
  <>
    <div ref={ref} />
    <Button onClick={() => player?.toggle()}>{state.playing ? 'Pause' : 'Play'}</Button>
    <Text>{Math.round(state.time)} / {Math.round(state.duration)} ms</Text>
  </>
);`}</Code>
        <h2 id="server">Server components</h2>
        <Code>{`import { VhyxChartStatic } from '@vhyxchart/react/static';

// No client JavaScript — still animated via SMIL.
export default function Page() {
  return <VhyxChartStatic>{'flowchart LR\\n  a --> b'}</VhyxChartStatic>;
}`}</Code>
      </>
    ),
  },
  {
    slug: 'html',
    title: 'Any website',
    description: 'One script tag.',
    toc: [{ id: 'script', label: 'Script tag' }, { id: 'element', label: 'Custom element' }],
    body: () => (
      <>
        <h1>Any website</h1>
        <h2 id="script">Script tag</h2>
        <Code>{`<script src="https://unpkg.com/@vhyxchart/core/dist/vhyxchart.global.js" data-auto></script>
<!-- renders every <pre><code class="language-vhyx"> on the page -->`}</Code>
        <h2 id="element">Custom element</h2>
        <Code>{`<vhyx-chart theme="dark" controls="false">
  flowchart LR
    a --> b
</vhyx-chart>
<vhyx-chart src="/diagrams/checkout.vhyx"></vhyx-chart>`}</Code>
      </>
    ),
  },
  {
    slug: 'cli',
    title: 'CLI',
    description: 'Render, export, lint.',
    toc: [{ id: 'commands', label: 'Commands' }],
    body: () => (
      <>
        <h1>CLI</h1>
        <h2 id="commands">Commands</h2>
        <Code>{`vhyxchart render flow.vhyx                 # → flow.svg (animated, plays in <img> and on GitHub)
vhyxchart render flow.vhyx --static --theme dark
vhyxchart render README.src.md -o README.md --out-dir docs/diagrams
vhyxchart render doc.md --inline           # inline <svg> for HTML pipelines
vhyxchart html flow.vhyx                    # single-file interactive page
vhyxchart check docs/**/*.md               # lint; exits 1 on errors`}</Code>
      </>
    ),
  },
  {
    slug: 'api',
    title: 'JavaScript API',
    description: 'The engine, piece by piece.',
    toc: [{ id: 'pipeline', label: 'Pipeline' }, { id: 'player', label: 'Player' }],
    body: () => (
      <>
        <h1>JavaScript API</h1>
        <h2 id="pipeline">Pipeline</h2>
        <Code>{`import { parse, layout, renderSvg, compileTimeline, frameAt, renderAnimatedSvg, render } from '@vhyxchart/core';

const { diagram, diagnostics } = parse(source);   // never throws; parseStrict() does
const l = layout(diagram);                        // deterministic
const tl = compileTimeline(diagram, 0);           // scenario → timed actions
const svg = renderSvg(diagram, l, { frame: frameAt(tl, 1200) });   // any instant
const animated = renderAnimatedSvg(diagram);      // SMIL, no JS
const { svg: quick } = render(source, { animated: true });`}</Code>
        <h2 id="player">Player</h2>
        <Code>{`import { createPlayer } from '@vhyxchart/core/browser';

const player = createPlayer(element, source, { theme: 'auto', autoplay: true });
player.play(); player.pause(); player.step(1); player.seek(1500);
player.setScenario(1); player.setSpeed(2); player.setSource(next);
player.on('frame', (f) => …); player.toSvg(true); player.destroy();`}</Code>
      </>
    ),
  },
  {
    slug: 'examples',
    title: 'Examples',
    description: 'Every curated example.',
    toc: EXAMPLES.map((e) => ({ id: e.id, label: e.title })),
    body: () => (
      <>
        <h1>Examples</h1>
        {EXAMPLES.map((e) => (
          <section key={e.id}>
            <h2 id={e.id}>{e.title}</h2>
            <p>{e.description}</p>
            <Example source={e.source} />
          </section>
        ))}
      </>
    ),
  },
];
