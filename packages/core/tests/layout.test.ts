import { describe, it, expect } from 'vitest';
import { parse, layout, type FlowLayout, type SequenceLayout, type ArrayLayout, type LaidOutNode } from '../src/index.js';

const flowLayout = (src: string): FlowLayout => layout(parse(src).diagram) as FlowLayout;

function overlaps(a: LaidOutNode, b: LaidOutNode): boolean {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width - 1 && Math.abs(a.y - b.y) * 2 < a.height + b.height - 1;
}

const BIG = `flowchart TB
  web[Web] --> gw[Gateway]
  mobile[Mobile] --> gw
  gw --> auth[Auth] & users[Users] & orders[Orders]
  orders --> pay[Payments] --> ledger[(Ledger)]
  orders --> inv[Inventory] --> db[(Stock DB)]
  users --> udb[(Users DB)]
  auth --> udb
  pay -.-> gw
  subgraph core [Core services]
    auth
    users
    orders
  end`;

describe('layered flow layout', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(flowLayout(BIG))).toBe(JSON.stringify(flowLayout(BIG)));
  });

  it('never overlaps nodes and keeps everything inside the canvas', () => {
    const l = flowLayout(BIG);
    for (let i = 0; i < l.nodes.length; i++) {
      for (let j = i + 1; j < l.nodes.length; j++) expect(overlaps(l.nodes[i]!, l.nodes[j]!)).toBe(false);
    }
    for (const n of l.nodes) {
      expect(n.x - n.width / 2).toBeGreaterThanOrEqual(0);
      expect(n.y - n.height / 2).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width / 2).toBeLessThanOrEqual(l.width);
      expect(n.y + n.height / 2).toBeLessThanOrEqual(l.height);
    }
  });

  it('places successors below predecessors in TB and right of them in LR', () => {
    const tb = flowLayout('flowchart TB\n a --> b --> c');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => tb.nodes.find((n) => n.id === id)!);
    expect(a!.y).toBeLessThan(b!.y);
    expect(b!.y).toBeLessThan(c!.y);
    const lr = flowLayout('flowchart LR\n a --> b');
    expect(lr.nodes[0]!.x).toBeLessThan(lr.nodes[1]!.x);
    const bt = flowLayout('flowchart BT\n a --> b');
    expect(bt.nodes[0]!.y).toBeGreaterThan(bt.nodes[1]!.y);
    const rl = flowLayout('flowchart RL\n a --> b');
    expect(rl.nodes[0]!.x).toBeGreaterThan(rl.nodes[1]!.x);
  });

  it('handles cycles and self loops without crashing', () => {
    const l = flowLayout('flowchart\n a --> b --> c --> a\n c --> c');
    expect(l.edges).toHaveLength(4);
    for (const e of l.edges) expect(e.path.startsWith('M')).toBe(true);
  });

  it('draws groups around all their members', () => {
    const l = flowLayout(BIG);
    const g = l.groups.find((x) => x.id === 'core')!;
    for (const id of ['auth', 'users', 'orders']) {
      const n = l.nodes.find((x) => x.id === id)!;
      expect(n.x - n.width / 2).toBeGreaterThanOrEqual(g.rect.x);
      expect(n.x + n.width / 2).toBeLessThanOrEqual(g.rect.x + g.rect.width);
      expect(n.y - n.height / 2).toBeGreaterThanOrEqual(g.rect.y);
      expect(n.y + n.height / 2).toBeLessThanOrEqual(g.rect.y + g.rect.height);
    }
  });

  it('keeps straight chains straight', () => {
    const l = flowLayout('flowchart TB\n a --> b --> c --> d');
    const xs = new Set(l.nodes.map((n) => Math.round(n.x)));
    expect(xs.size).toBe(1);
  });

  it('reserves room for edge labels and wraps long node labels', () => {
    const l = flowLayout('flowchart TB\n a -->|a fairly long edge label| b\n c[This is a very long node label that should wrap onto several lines]');
    const e = l.edges[0]!;
    expect(e.label).toBeDefined();
    const c = l.nodes.find((n) => n.id === 'c')!;
    expect(c.lines.length).toBeGreaterThan(1);
    expect(c.width).toBeLessThanOrEqual(240);
  });

  it('fans out parallel edges so their labels do not collide', () => {
    const l = flowLayout('flowchart LR\n a -->|ok| b\n b -.->|fail| a\n a -.->|enables| b');
    const ys = l.edges.map((e) => Math.round(e.label!.y));
    expect(new Set(ys).size).toBe(3);
  });

  it('handles an empty diagram', () => {
    const l = flowLayout('');
    expect(l.nodes).toEqual([]);
    expect(l.width).toBeGreaterThan(0);
  });
});

describe('sequence layout', () => {
  it('orders participants left to right and messages top to bottom', () => {
    const l = layout(parse('sequenceDiagram\n A->>B: a very long message label that needs space\n B->>C: x\n C->>C: self').diagram) as SequenceLayout;
    const xs = l.participants.map((p) => p.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    const ys = l.messages.map((m) => m.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(xs[1]! - xs[0]!).toBeGreaterThan(250);
    expect(l.messages[2]!.self).toBe(true);
  });
});

describe('array layout', () => {
  it('lays out one cell per value', () => {
    const l = layout(parse('array\n values 1 22 333').diagram) as ArrayLayout;
    expect(l.cells).toHaveLength(3);
    expect(l.cells[1]!.x).toBeGreaterThan(l.cells[0]!.x);
  });
});
