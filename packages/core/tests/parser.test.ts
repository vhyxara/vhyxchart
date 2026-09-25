import { describe, it, expect } from 'vitest';
import { parse, parseStrict, VhyxChartError, type FlowDiagram, type SequenceDiagram, type ArrayDiagram } from '../src/index.js';

const flow = (src: string): FlowDiagram => {
  const d = parse(src).diagram;
  if (d.kind !== 'flow') throw new Error('expected flow');
  return d;
};

describe('frontmatter', () => {
  it('reads settings and ignores unknown keys', () => {
    const { diagram, diagnostics } = parse('---\ntitle: Hello\ntheme: dark\nspeed: 2\nloop: false\ntravel: 500ms\nfuture: yes\n---\nflowchart\n  A --> B');
    expect(diagram.config).toMatchObject({ title: 'Hello', theme: 'dark', speed: 2, loop: false, travelMs: 500 });
    expect(diagnostics).toEqual([]);
  });

  it('reports an unclosed block', () => {
    expect(parse('---\ntitle: x\nflowchart\n A-->B').diagnostics[0]?.code).toBe('VC_BAD_FRONTMATTER');
  });
});

describe('flowchart parsing (Mermaid compatible)', () => {
  it('reads direction and all node shapes', () => {
    const d = flow(`flowchart LR
      a[rect] --> b(round) --> c([stadium]) --> d[[sub]] --> e[(db)]
      e --> f((circle)) --> g{diamond} --> h{{hex}} --> i[/para/] --> j[\\alt\\]
      j --> k[/trap\\] --> l[\\trapalt/] --> m>asym] --> n(((double)))`);
    expect(d.direction).toBe('LR');
    const shapes = Object.fromEntries(d.nodes.map((n) => [n.id, n.shape]));
    expect(shapes).toEqual({
      a: 'rect', b: 'round', c: 'stadium', d: 'subroutine', e: 'cylinder', f: 'circle', g: 'diamond',
      h: 'hexagon', i: 'parallelogram', j: 'parallelogram-alt', k: 'trapezoid', l: 'trapezoid-alt', m: 'asymmetric', n: 'doublecircle',
    });
    expect(d.edges).toHaveLength(13);
  });

  it('parses edge kinds, labels and heads', () => {
    const d = flow(`graph TD
      A -->|yes| B
      A -- no --> C
      A -.-> D
      A -. maybe .-> E
      A ==> F
      A == big ==> G
      A --- H
      A --o I
      A --x J
      A <--> K
      A ~~~ L`);
    const by = Object.fromEntries(d.edges.map((e) => [e.to, e]));
    expect(by.B).toMatchObject({ label: 'yes', stroke: 'solid', head: 'arrow' });
    expect(by.C).toMatchObject({ label: 'no', stroke: 'solid' });
    expect(by.D).toMatchObject({ stroke: 'dotted', head: 'arrow' });
    expect(by.E).toMatchObject({ stroke: 'dotted', label: 'maybe' });
    expect(by.F).toMatchObject({ stroke: 'thick' });
    expect(by.G).toMatchObject({ stroke: 'thick', label: 'big' });
    expect(by.H).toMatchObject({ head: 'none' });
    expect(by.I).toMatchObject({ head: 'circle' });
    expect(by.J).toMatchObject({ head: 'cross' });
    expect(by.K).toMatchObject({ head: 'arrow', tail: 'arrow' });
    expect(by.L).toMatchObject({ stroke: 'invisible' });
  });

  it('supports & fan-out, chains, ; separators and quoted labels with <br>', () => {
    const d = flow('flowchart\n  A & B --> C & D; D --> E["Hello<br/>World"]');
    expect(d.edges.map((e) => e.id)).toEqual(['A->C', 'A->D', 'B->C', 'B->D', 'D->E']);
    expect(d.nodes.find((n) => n.id === 'E')?.label).toBe('Hello\nWorld');
  });

  it('keeps hyphenated ids and distinguishes duplicate edges', () => {
    const d = flow('flowchart\n  cart-btn --> pay-btn\n  cart-btn --> pay-btn');
    expect(d.nodes.map((n) => n.id)).toEqual(['cart-btn', 'pay-btn']);
    expect(d.edges.map((e) => e.id)).toEqual(['cart-btn->pay-btn', 'cart-btn->pay-btn#2']);
  });

  it('parses subgraphs (nested), classDef, class, :::class and style', () => {
    const d = flow(`flowchart
      subgraph outer [Outer box]
        subgraph inner
          a
        end
        b:::hot
      end
      classDef hot fill:#f00,stroke:#900
      class a hot
      style b stroke-width:4px`);
    expect(d.groups.map((g) => [g.id, g.parent])).toEqual([['outer', undefined], ['inner', 'outer']]);
    expect(d.groups[0]?.label).toBe('Outer box');
    expect(d.nodes.find((n) => n.id === 'a')?.group).toBe('inner');
    expect(d.nodes.find((n) => n.id === 'a')?.classes).toEqual(['hot']);
    expect(d.nodes.find((n) => n.id === 'b')?.classes).toEqual(['hot']);
    expect(d.classDefs['hot']).toEqual({ fill: '#f00', stroke: '#900' });
    expect(d.nodes.find((n) => n.id === 'b')?.style).toEqual({ 'stroke-width': '4px' });
  });

  it('parses state diagrams with [*], descriptions and transition labels', () => {
    const d = flow(`stateDiagram-v2
      [*] --> Idle
      Idle --> Running : start
      Running --> [*]
      Idle : Waiting for work`);
    expect(d.nodes.find((n) => n.id === '__start_root')?.shape).toBe('start');
    expect(d.nodes.find((n) => n.id === '__end_root')?.shape).toBe('end');
    expect(d.edges.find((e) => e.from === 'Idle')?.label).toBe('start');
    expect(d.nodes.find((n) => n.id === 'Idle')?.label).toBe('Waiting for work');
  });

  it('architecture defaults to LR', () => {
    expect(flow('architecture\n  a --> b').direction).toBe('LR');
  });

  it('reports errors with line numbers and suggestions but still returns a diagram', () => {
    const r = parse('flowchart\n  A --> B\n  A -> -> B\n  subgraph x\n  C');
    expect(r.diagram.kind).toBe('flow');
    const codes = r.diagnostics.map((d) => [d.code, d.line]);
    expect(codes).toContainEqual(['VC_UNKNOWN_STATEMENT', 3]);
    expect(codes).toContainEqual(['VC_UNCLOSED_BLOCK', 4]);
    expect(r.diagnostics.every((d) => d.message.length > 0)).toBe(true);
  });

  it('ignores %% comments, # comments and init directives', () => {
    const r = parse('%%{init: {"theme":"dark"}}%%\nflowchart\n  # comment\n  A --> B %% trailing');
    expect(r.diagnostics).toEqual([]);
    expect((r.diagram as FlowDiagram).edges).toHaveLength(1);
  });
});

describe('scenarios', () => {
  const src = `flowchart LR
    a --> b --> c
    scenario "Happy path"
      a -> b : req
      b -> c -> b
      b is active
      a, c are done
      b: failed
      note b : oops
      note "global"
      caption Step text
      highlight a
      wait 1.5s
      together
        a -> b
        c -> b
      end
      a -> b, b -> c
      reset
    scenario Second
      c -> b`;

  it('parses every step type', () => {
    const d = flow(src);
    expect(d.scenarios.map((s) => s.name)).toEqual(['Happy path', 'Second']);
    const kinds = d.scenarios[0]?.steps.map((s) => s.kind);
    expect(kinds).toEqual(['travel', 'travel', 'travel', 'state', 'state', 'state', 'note', 'note', 'caption', 'pulse', 'wait', 'parallel', 'parallel', 'reset']);
    const first = d.scenarios[0]?.steps[0];
    expect(first).toMatchObject({ from: 'a', to: 'b', label: 'req' });
    expect(d.scenarios[0]?.steps[5]).toMatchObject({ state: 'error' });
    expect(d.scenarios[0]?.steps[10]).toMatchObject({ ms: 1500 });
  });

  it('validates that tokens travel along existing edges (either direction)', () => {
    const r = parse('flowchart\n a --> b\n c\nscenario x\n  b -> a\n  a -> c\n  zz is done');
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('VC_NO_EDGE');
    expect(codes).toContain('VC_UNKNOWN_NODE');
    expect(r.diagnostics.find((d) => d.code === 'VC_NO_EDGE')?.suggestion).toBe('Tokens travel along edges. Add: a --> c');
  });

  it('parseStrict throws VhyxChartError with diagnostics', () => {
    expect(() => parseStrict('flowchart\n a --> b\nscenario x\n  a -> q')).toThrow(VhyxChartError);
    expect(parseStrict('flowchart\n a --> b').kind).toBe('flow');
  });
});

describe('sequence diagrams', () => {
  const d = parse(`sequenceDiagram
    title Login
    autonumber
    participant B as Browser
    actor U as User
    database D
    U->>B: click
    B->>+S: POST /login
    S-->>-B: 200
    B-xD: nope
    B-)S: async
    Note over B,S: TLS
    Note right of D: cold
    loop retry
      B->>S: ping
    end
    alt ok
      S-->>B: yes
    else fail
      S-->>B: no
    end
    par one
      B->>S: a
    and two
      B->>D: b
    end
    wait 500ms`).diagram as SequenceDiagram;

  it('reads participants in order with kinds and aliases', () => {
    expect(d.participants.map((p) => [p.id, p.label, p.kind])).toEqual([
      ['B', 'Browser', 'participant'],
      ['U', 'User', 'actor'],
      ['D', 'D', 'database'],
      ['S', 'S', 'participant'],
    ]);
    expect(d.config.title).toBe('Login');
    expect(d.autonumber).toBe(true);
  });

  it('reads arrows, activations, notes and frames', () => {
    expect(d.messages.map((m) => [m.head, m.stroke])).toEqual([
      ['arrow', 'solid'], ['arrow', 'solid'], ['arrow', 'dotted'], ['cross', 'solid'], ['async', 'solid'],
      ['arrow', 'solid'], ['arrow', 'dotted'], ['arrow', 'dotted'], ['arrow', 'solid'], ['arrow', 'solid'],
    ]);
    expect(d.messages[1]?.activate).toBe('target');
    expect(d.messages[2]?.activate).toBe('source-end');
    expect(d.notes.map((n) => [n.position, n.participants, n.after])).toEqual([[ 'over', ['B', 'S'], 4], ['right', ['D'], 4]]);
    expect(d.frames.map((f) => [f.kind, f.startMessage, f.endMessage, f.sections.length])).toEqual([
      ['loop', 5, 5, 1], ['alt', 6, 7, 2], ['par', 8, 9, 2],
    ]);
    expect(d.messages[8]?.parBranch).toBe(0);
    expect(d.messages[9]?.parBranch).toBe(1);
    expect(d.scenarios[0]?.steps).toEqual([{ kind: 'wait', ms: 500, line: 9 }]);
  });

  it('detects sequences without a header', () => {
    expect(parse('Alice->>Bob: hi').diagram.kind).toBe('sequence');
  });
});

describe('array diagrams', () => {
  it('parses values and algorithm steps', () => {
    const d = parse(`array Bubble
      values 5 3 8
      compare 0 1
      swap 0 1
      set 2 = 9
      mark 0..2 sorted
      unmark 1
      pointer i 2
      pointer i none
      highlight 1
      note done`).diagram as ArrayDiagram;
    expect(d.values).toEqual([5, 3, 8]);
    expect(d.config.title).toBe('Bubble');
    expect(d.scenarios[0]?.steps.map((s) => s.kind)).toEqual(['compare', 'swap', 'set', 'mark', 'mark', 'pointer', 'pointer', 'mark', 'note']);
    expect(d.scenarios[0]?.steps[3]).toMatchObject({ indices: [0, 1, 2], state: 'done' });
  });

  it('flags out-of-range indices and missing values', () => {
    const r = parse('array\n  compare 0 1');
    expect(r.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(['VC_EMPTY', 'VC_BAD_INDEX']));
  });

  it('accepts inline values and named scenarios', () => {
    const d = parse('array [1,2,3]\nscenario A\n  swap 0 2\nscenario B\n  mark 1').diagram as ArrayDiagram;
    expect(d.values).toEqual([1, 2, 3]);
    expect(d.scenarios.map((s) => s.name)).toEqual(['A', 'B']);
  });
});
