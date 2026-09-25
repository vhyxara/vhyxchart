import { createGraphStructure, createGraphRuntime } from '@vhyxui/visual-runtime';
import { VhyxUIErrorCode } from '@vhyxui/core';
import { assertDeepEqual, assertTrue, expectInvariantViolation } from './_lib/assert.js';

console.log('=== system-flow (two independent messages, A -> B -> C) ===');

const nodes = ['A', 'B', 'C'].map((id) => ({ id }));
const edges = [
  { id: 'e-ab', from: 'A', to: 'B' },
  { id: 'e-bc', from: 'B', to: 'C' },
];
const structure = createGraphStructure(nodes, edges);
const rt = createGraphRuntime(structure);

// Two messages tracked independently through the same path with no
// cross-contamination — the exact v0.5 spike check, run for real here.
rt.spawn('M1', 'A');
rt.spawn('M2', 'A');

rt.transfer('M1', 'e-ab');
let state = rt.getState();
assertDeepEqual(state.messages.M1!.location, 'B', 'M1 moved A -> B independently');
assertDeepEqual(state.messages.M2!.location, 'A', 'M2 still at A while M1 has moved');

rt.transfer('M2', 'e-ab');
state = rt.getState();
assertDeepEqual(state.messages.M2!.location, 'B', 'M2 moved A -> B independently');

rt.transfer('M1', 'e-bc');
state = rt.getState();
assertDeepEqual(state.messages.M1!.location, 'C', 'M1 moved B -> C');
assertDeepEqual(state.messages.M2!.location, 'B', 'M2 unaffected by M1 finishing its path');

rt.transfer('M2', 'e-bc');
state = rt.getState();
assertDeepEqual(state.messages.M2!.location, 'C', 'M2 moved B -> C, arriving independently of M1');

console.log(`Events replayed: ${rt.getHistory().length}`);

// Deliberately trigger edge-direction-match: M1 is now at C, so transferring
// it again across e-ab (whose `from` is A, not C) must be rejected.
expectInvariantViolation(
  'edge-direction-match (transfer from the wrong location)',
  VhyxUIErrorCode.VHYXUI_RUNTIME_INVARIANT_VIOLATION,
  () => ({ state: rt.getState(), history: rt.getHistory() }),
  () => rt.transfer('M1', 'e-ab'),
);

console.log('system-flow: ALL CHECKS PASSED\n');
