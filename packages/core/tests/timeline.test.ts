import { describe, it, expect } from 'vitest';
import { parse, compileTimeline, frameAt, finalFrame, traceArray } from '../src/index.js';

const SRC = `---
travel: 1000ms
---
flowchart LR
  a --> b --> c
  scenario main
    a -> b : hi
    b is active
    b -> a
    note b : hello
    caption working
    wait 500ms
    b is done
    reset
    c is error`;

describe('timeline', () => {
  const d = parse(SRC).diagram;
  const tl = compileTimeline(d, 0);

  it('compiles steps with durations', () => {
    expect(tl.steps).toHaveLength(9);
    expect(tl.steps[0]).toMatchObject({ start: 0, end: 1000 });
    expect(tl.duration).toBeGreaterThan(3000);
  });

  it('is deterministic (I-003)', () => {
    expect(JSON.stringify(compileTimeline(d, 0))).toBe(JSON.stringify(tl));
    expect(JSON.stringify(frameAt(tl, 1234))).toBe(JSON.stringify(frameAt(tl, 1234)));
  });

  it('moves tokens along edges, in reverse when travelling against the arrow', () => {
    const mid = frameAt(tl, 500);
    expect(mid.tokens).toHaveLength(1);
    expect(mid.tokens[0]).toMatchObject({ edgeId: 'a->b', reverse: false, label: 'hi', progress: 0.5 });
    expect(mid.activeEdges['a->b']).toBe(1);
    const back = frameAt(tl, tl.steps[2]!.start + 10);
    expect(back.tokens[0]?.reverse).toBe(true);
    expect(frameAt(tl, 1001).visitedEdges['a->b']).toBe(true);
  });

  it('keeps persistent state until reset (I-006) and scrubbing backwards is exact', () => {
    const afterActive = frameAt(tl, tl.steps[1]!.end + 1);
    expect(afterActive.nodeStates['b']).toBe('active');
    expect(frameAt(tl, tl.steps[6]!.start + 1).nodeStates['b']).toBe('done');
    const end = finalFrame(tl);
    expect(end.nodeStates).toEqual({ c: 'error' });
    expect(end.notes).toEqual([]);
    expect(frameAt(tl, 10).nodeStates).toEqual({});
  });

  it('shows notes and captions', () => {
    const f = frameAt(tl, tl.steps[5]!.end + 1);
    expect(f.notes[0]).toMatchObject({ target: 'b', text: 'hello' });
    expect(f.caption).toBe('working');
  });

  it('speed scales durations', () => {
    const fast = parse(SRC.replace('travel: 1000ms', 'travel: 1000ms\nspeed: 2')).diagram;
    expect(compileTimeline(fast, 0).duration).toBeCloseTo(tl.duration / 2, 5);
  });

  it('runs parallel steps concurrently', () => {
    const p = compileTimeline(parse('flowchart\n a --> b\n a --> c\nscenario x\n  a -> b, a -> c').diagram, 0);
    expect(p.steps).toHaveLength(1);
    expect(frameAt(p, 400).tokens).toHaveLength(2);
  });

  it('returns an empty timeline for diagrams without scenarios', () => {
    expect(compileTimeline(parse('flowchart\n a --> b').diagram, 0).duration).toBe(0);
  });
});

describe('sequence timeline', () => {
  it('sends messages in order and par branches together', () => {
    const d = parse('sequenceDiagram\n A->>B: 1\n Note over A: n\n par\n  A->>B: 2\n and\n  B->>A: 3\n end').diagram;
    const tl = compileTimeline(d, 0);
    expect(tl.steps).toHaveLength(2);
    const f = frameAt(tl, tl.steps[1]!.start + 100);
    expect(Object.keys(f.messages).sort()).toEqual(['0', '1', '2']);
    expect(f.messages[0]).toBe(1);
    expect(f.revealed['note0']).toBe(true);
    expect(frameAt(tl, 1).messages[1]).toBeUndefined();
  });
});

describe('array timeline', () => {
  const d = parse('array\n values 5 3 8\n compare 0 1\n swap 0 1\n set 2 9\n mark 0 sorted\n pointer i 2').diagram;
  const tl = compileTimeline(d, 0);

  it('keeps value identity through swaps (values move, cells stay)', () => {
    const mid = frameAt(tl, tl.steps[1]!.start + (tl.steps[1]!.end - tl.steps[1]!.start) / 2);
    const five = mid.array!.items.find((i) => i.value === 5)!;
    expect(five.pos).toBeGreaterThan(0);
    expect(five.pos).toBeLessThan(1);
    expect(Math.abs(five.lift)).toBeGreaterThan(0.5);
    const end = finalFrame(tl);
    const byPos = Object.fromEntries(end.array!.items.map((i) => [i.pos, i.value]));
    expect(byPos).toEqual({ 0: 3, 1: 5, 2: 9 });
    expect(end.array!.marks).toEqual({ 0: 'done' });
    expect(end.array!.pointers).toEqual({ i: 2 });
  });

  it('highlights compared cells only while comparing', () => {
    expect(frameAt(tl, 10).array!.compare).toEqual([0, 1]);
    expect(finalFrame(tl).array!.compare).toBeNull();
  });
});

describe('traceArray', () => {
  it('records a real algorithm and replays it to a sorted array', () => {
    const src = traceArray('Bubble', [5, 1, 4, 2], (a) => {
      const n = a.values.length;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
        a.mark(n - i - 1, 'done');
      }
    });
    const r = parse(src);
    expect(r.diagnostics).toEqual([]);
    const end = finalFrame(compileTimeline(r.diagram, 0));
    const sorted = [...end.array!.items].sort((x, y) => x.pos - y.pos).map((i) => i.value);
    expect(sorted).toEqual([1, 2, 4, 5]);
    expect(Object.keys(end.array!.marks)).toHaveLength(4);
  });
});
