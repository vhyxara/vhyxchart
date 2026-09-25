import { createSequenceStructure, createSequenceRuntime } from '@vhyxui/visual-runtime';
import { assertDeepEqual, assertTrue } from './_lib/assert.js';

console.log('=== merge-sort ===');

const values = [38, 27, 43, 3, 9, 82, 10];
const n = values.length;

// Per decision.md v0.3: structure over-provisioned upfront with n visible +
// n scratch cells, all frozen at authoring time (I-001) — no dynamic entity
// creation needed. Scratch cells are never rendered by a Presentation layer,
// but that's a rendering decision, not a structural one; here we just log both.
const visibleIds = Array.from({ length: n }, (_, i) => `v${i}`);
const scratchIds = Array.from({ length: n }, (_, i) => `s${i}`);

const structure = createSequenceStructure([
  ...visibleIds.map((id, position) => ({ id, position })),
  ...scratchIds.map((id, position) => ({ id, position: n + position })),
]);

const initialValues: Record<string, unknown> = {};
visibleIds.forEach((id, i) => (initialValues[id] = values[i]));
scratchIds.forEach((id) => (initialValues[id] = null));

const rt = createSequenceRuntime(structure, initialValues);

function merge(lo: number, mid: number, hi: number): void {
  for (let k = lo; k <= hi; k++) {
    rt.write(visibleIds[k]!, scratchIds[k]!);
  }
  let i = lo;
  let j = mid + 1;
  let k = lo;
  while (i <= mid && j <= hi) {
    const scratchI = scratchIds[i]!;
    const scratchJ = scratchIds[j]!;
    rt.compare(scratchI, scratchJ);
    const state = rt.getState();
    if ((state[scratchI]!.value as number) <= (state[scratchJ]!.value as number)) {
      rt.write(scratchI, visibleIds[k]!);
      i++;
    } else {
      rt.write(scratchJ, visibleIds[k]!);
      j++;
    }
    k++;
  }
  while (i <= mid) {
    rt.write(scratchIds[i]!, visibleIds[k]!);
    i++;
    k++;
  }
  while (j <= hi) {
    rt.write(scratchIds[j]!, visibleIds[k]!);
    j++;
    k++;
  }
}

// Recursion (lo/mid/hi indices) is producer-private control flow — never
// enters Runtime, matching I-008 (algorithm execution state is producer-private).
function mergeSort(lo: number, hi: number): void {
  if (lo >= hi) return;
  const mid = Math.floor((lo + hi) / 2);
  mergeSort(lo, mid);
  mergeSort(mid + 1, hi);
  merge(lo, mid, hi);
}

mergeSort(0, n - 1);
for (const id of visibleIds) {
  rt.commit(id);
}

const finalState = rt.getState();
const finalValues = visibleIds.map((id) => finalState[id]!.value);
const expectedSorted = [...values].sort((a, b) => a - b);

console.log('Final values:', finalValues);
assertDeepEqual(finalValues, expectedSorted, 'final array is sorted ascending');
assertTrue(
  visibleIds.every((id) => finalState[id]!.sorted),
  'all visible cells committed (sorted=true)',
);

console.log(`Events replayed: ${rt.getHistory().length}`);
console.log('merge-sort: ALL CHECKS PASSED\n');
