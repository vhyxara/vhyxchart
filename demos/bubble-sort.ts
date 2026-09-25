import { createSequenceStructure, createSequenceRuntime } from '@vhyxui/visual-runtime';
import { VhyxUIErrorCode } from '@vhyxui/core';
import { assertDeepEqual, assertTrue, expectInvariantViolation } from './_lib/assert.js';

console.log('=== bubble-sort ===');

const values = [5, 3, 8, 1, 9, 2];
const ids = values.map((_, i) => `c${i}`);

const structure = createSequenceStructure(ids.map((id, position) => ({ id, position })));
const initialValues = Object.fromEntries(ids.map((id, i) => [id, values[i]]));
const rt = createSequenceRuntime(structure, initialValues);

const n = ids.length;
for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    const left = ids[j]!;
    const right = ids[j + 1]!;
    rt.compare(left, right);
    const state = rt.getState();
    if ((state[left]!.value as number) > (state[right]!.value as number)) {
      rt.swap(left, right);
    }
  }
  rt.commit(ids[n - 1 - i]!);
}
rt.commit(ids[0]!);

const finalState = rt.getState();
const finalValues = ids.map((id) => finalState[id]!.value);
const expectedSorted = [...values].sort((a, b) => a - b);

console.log('Final values:', finalValues);
assertDeepEqual(finalValues, expectedSorted, 'final array is sorted ascending');
assertTrue(
  ids.every((id) => finalState[id]!.sorted),
  'all cells committed (sorted=true)',
);

console.log(`Events replayed: ${rt.getHistory().length}`);

// Deliberately trigger post-commit mutation: every cell is committed at this
// point, so swapping the last two must be rejected without touching state.
expectInvariantViolation(
  'post-commit mutation (swap on committed cells)',
  VhyxUIErrorCode.VHYXUI_RUNTIME_INVARIANT_VIOLATION,
  () => ({ state: rt.getState(), history: rt.getHistory() }),
  () => rt.swap(ids[n - 1]!, ids[n - 2]!),
);

console.log('bubble-sort: ALL CHECKS PASSED\n');
