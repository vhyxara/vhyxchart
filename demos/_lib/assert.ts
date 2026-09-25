import { VhyxUIError, VhyxUIErrorCode } from '@vhyxui/core';

export function assertDeepEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL: ${label}\n  actual:   ${a}\n  expected: ${e}`);
  }
  console.log(`  PASS: ${label}`);
}

export function assertTrue(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`  PASS: ${label}`);
}

/**
 * Runs `fn`, expecting it to throw a VhyxUIError with `expectedCode`, and
 * confirms the runtime's state+history are byte-identical before and after
 * the throw (proving zero partial mutation, not just "an error was thrown").
 */
export function expectInvariantViolation(
  label: string,
  expectedCode: VhyxUIErrorCode,
  snapshotBefore: () => unknown,
  fn: () => void,
): void {
  const before = JSON.stringify(snapshotBefore());
  let thrown: unknown = undefined;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }

  assertTrue(thrown instanceof VhyxUIError, `${label} — throws a VhyxUIError`);
  assertTrue(
    (thrown as VhyxUIError).code === expectedCode,
    `${label} — code is ${expectedCode} (got ${(thrown as VhyxUIError)?.code})`,
  );

  const after = JSON.stringify(snapshotBefore());
  assertTrue(before === after, `${label} — state+history unchanged after rejection`);
}
