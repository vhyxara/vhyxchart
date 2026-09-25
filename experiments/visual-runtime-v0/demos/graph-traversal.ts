import { createGraphStructure, createGraphRuntime } from '@vhyxui/visual-runtime';
import { VhyxUIErrorCode } from '@vhyxui/core';
import { assertDeepEqual, assertTrue, expectInvariantViolation } from './_lib/assert.js';

console.log('=== graph-traversal (BFS + DFS on the same structure) ===');

// A -> B, A -> C, B -> D, C -> D, D -> E: D is reachable via two paths
// (the same multi-path shape that stress-tested discover-once in v0.4).
const nodes = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id }));
const edges = [
  { id: 'e-ab', from: 'A', to: 'B' },
  { id: 'e-ac', from: 'A', to: 'C' },
  { id: 'e-bd', from: 'B', to: 'D' },
  { id: 'e-cd', from: 'C', to: 'D' },
  { id: 'e-de', from: 'D', to: 'E' },
];
const structure = createGraphStructure(nodes, edges);

function edgesFrom(nodeId: string) {
  return edges.filter((e) => e.from === nodeId);
}

// BFS — frontier (queue) and `visited` are producer-private (I-008): the
// generator checks its own set before calling discover, exactly like the
// v0.4 spike, so the runtime is never asked to double-discover under normal use.
function runBfs(rt: ReturnType<typeof createGraphRuntime>, start: string): void {
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  rt.discover(start);
  while (queue.length > 0) {
    const node = queue.shift() as string;
    rt.visit(node);
    for (const edge of edgesFrom(node)) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        rt.traverseEdge(edge.id);
        rt.discover(edge.to);
        queue.push(edge.to);
      }
    }
  }
}

// DFS — same runtime shape, same applyEvent code (createGraphRuntime), only
// the *order* of discover/visit/traverseEdge calls differs (JS call stack
// instead of a queue) — this is the byte-identical-code claim from v0.4.
function runDfs(rt: ReturnType<typeof createGraphRuntime>, start: string): void {
  const visited = new Set<string>();
  function visit(node: string): void {
    visited.add(node);
    rt.discover(node);
    rt.visit(node);
    for (const edge of edgesFrom(node)) {
      if (!visited.has(edge.to)) {
        rt.traverseEdge(edge.id);
        visit(edge.to);
      }
    }
  }
  visit(start);
}

const bfsRuntime = createGraphRuntime(structure);
runBfs(bfsRuntime, 'A');
const bfsState = bfsRuntime.getState();
const bfsDiscovered = nodes.map((n) => n.id).filter((id) => bfsState.nodes[id]!.discovered).sort();

console.log('BFS discovery order (history):', bfsRuntime.getHistory().filter((e) => e.type === 'discover'));
assertDeepEqual(bfsDiscovered, ['A', 'B', 'C', 'D', 'E'], 'BFS discovers every reachable node exactly once');

const dfsRuntime = createGraphRuntime(structure);
runDfs(dfsRuntime, 'A');
const dfsState = dfsRuntime.getState();
const dfsDiscovered = nodes.map((n) => n.id).filter((id) => dfsState.nodes[id]!.discovered).sort();

console.log('DFS discovery order (history):', dfsRuntime.getHistory().filter((e) => e.type === 'discover'));
assertDeepEqual(dfsDiscovered, ['A', 'B', 'C', 'D', 'E'], 'DFS discovers every reachable node exactly once');

assertTrue(
  JSON.stringify(bfsDiscovered) === JSON.stringify(dfsDiscovered) &&
    JSON.stringify(bfsRuntime.getHistory().map((e) => e.type).sort()) ===
      JSON.stringify(dfsRuntime.getHistory().map((e) => e.type).sort()),
  'BFS and DFS reach the same final discovered set via the identical event-type vocabulary, differing only in order',
);

// Deliberately trigger discover-once: D was already discovered by the BFS
// run above (via B or C). Directly feeding the runtime an invalid
// discover(D) again — not trusting generator correctness — must be rejected.
expectInvariantViolation(
  'discover-once (re-discovering an already-discovered node)',
  VhyxUIErrorCode.VHYXUI_RUNTIME_INVARIANT_VIOLATION,
  () => ({ state: bfsRuntime.getState(), history: bfsRuntime.getHistory() }),
  () => bfsRuntime.discover('D'),
);

console.log('graph-traversal: ALL CHECKS PASSED\n');
