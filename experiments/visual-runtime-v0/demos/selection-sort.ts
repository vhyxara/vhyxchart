import { createSequenceStructure, createSequenceRuntime } from '@vhyxui/visual-runtime';
import { assertDeepEqual, assertTrue } from './_lib/assert.js';

console.log('=== selection-sort ===');

const values = [29, 10, 14, 37, 13];
const ids = values.map((_, i) => `c${i}`);

const structure = createSequenceStructure(ids.map((id, position) => ({ id, position })));
const initialValues = Object.fromEntries(ids.map((id, i) => [id, values[i]]));
const rt = createSequenceRuntime(structure, initialValues);

const n = ids.length;
for (let i = 0; i < n; i++) {
  let minIdx = i;
  rt.select(ids[minIdx]!);
  for (let j = i + 1; j < n; j++) {
    const candidate = ids[j]!;
    rt.compare(ids[minIdx]!, candidate);
    const state = rt.getState();
    if ((state[candidate]!.value as number) < (state[ids[minIdx]!]!.value as number)) {
      minIdx = j;
      rt.select(ids[minIdx]!);
    }
  }
  if (minIdx !== i) {
    rt.swap(ids[i]!, ids[minIdx]!);
  }
  rt.commit(ids[i]!);
}

const finalState = rt.getState();
const finalValues = ids.map((id) => finalState[id]!.value);
const expectedSorted = [...values].sort((a, b) => a - b);

console.log('Final values:', finalValues);
assertDeepEqual(finalValues, expectedSorted, 'final array is sorted ascending');
assertTrue(
  ids.every((id) => finalState[id]!.sorted && !finalState[id]!.selected),
  'all cells committed, none left selected (commit clears selected)',
);

console.log(`Events replayed: ${rt.getHistory().length}`);
console.log('selection-sort: ALL CHECKS PASSED\n');
