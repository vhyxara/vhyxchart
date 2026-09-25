import { createSequenceStructure, createSequenceRuntime } from '@vhyxui/visual-runtime';
import { assertDeepEqual, assertTrue } from './_lib/assert.js';

console.log('=== insertion-sort ===');

const values = [12, 11, 13, 5, 6];
const ids = values.map((_, i) => `c${i}`);

const structure = createSequenceStructure(ids.map((id, position) => ({ id, position })));
const initialValues = Object.fromEntries(ids.map((id, i) => [id, values[i]]));
const rt = createSequenceRuntime(structure, initialValues);

const n = ids.length;
// Insertion sort's "shift" is a chain of adjacent compare+swap (no `move`
// primitive — matches decision.md v0.2's Insertion Sort finding). Commits
// are deferred to the very end: unlike bubble/selection sort, no cell here
// reaches its FINAL position until the whole pass completes, so committing
// early would violate post-commit-mutation on a later shift.
for (let i = 1; i < n; i++) {
  let j = i;
  while (j > 0) {
    const left = ids[j - 1]!;
    const right = ids[j]!;
    rt.compare(left, right);
    const state = rt.getState();
    if ((state[left]!.value as number) > (state[right]!.value as number)) {
      rt.swap(left, right);
      j--;
    } else {
      break;
    }
  }
}
for (const id of ids) {
  rt.commit(id);
}

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
console.log('insertion-sort: ALL CHECKS PASSED\n');
