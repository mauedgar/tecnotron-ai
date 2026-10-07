import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLifecycleObservation } from "./normalize-lifecycle-observation.mjs";

test("normalizes required values and omitted subject_ref", () => {
  const result = normalizeLifecycleObservation({
    operation_id: " op-1 ",
    execution_attempt_id: " attempt-1 ",
    runtime_provider: " orca+opencode ",
    state: " started ",
    ignored: "value",
  });

  assert.deepEqual(result, {
    operation_id: "op-1",
    execution_attempt_id: "attempt-1",
    runtime_provider: "orca+opencode",
    state: "started",
    subject_ref: null,
    terminal: false,
  });
  assert.deepEqual(Object.keys(result), [
    "operation_id",
    "execution_attempt_id",
    "runtime_provider",
    "state",
    "subject_ref",
    "terminal",
  ]);
});

test("trims subject_ref and keeps idle non-terminal", () => {
  assert.deepEqual(
    normalizeLifecycleObservation({
      operation_id: "op-2",
      execution_attempt_id: "attempt-2",
      runtime_provider: "github",
      state: "idle",
      subject_ref: " commit:abc123 ",
    }),
    {
      operation_id: "op-2",
      execution_attempt_id: "attempt-2",
      runtime_provider: "github",
      state: "idle",
      subject_ref: "commit:abc123",
      terminal: false,
    },
  );
});

for (const state of ["completed", "failed", "blocked", "cancelled", "timed_out"]) {
  test(`${state} is terminal`, () => {
    const result = normalizeLifecycleObservation({
      operation_id: "op",
      execution_attempt_id: "attempt",
      runtime_provider: "provider",
      state,
    });
    assert.equal(result.terminal, true);
  });
}

test("rejects invalid state", () => {
  assert.throws(
    () =>
      normalizeLifecycleObservation({
        operation_id: "op",
        execution_attempt_id: "attempt",
        runtime_provider: "provider",
        state: "done",
      }),
    TypeError,
  );
});

for (const field of ["operation_id", "execution_attempt_id", "runtime_provider", "state"]) {
  test(`rejects missing or blank ${field}`, () => {
    const base = {
      operation_id: "op",
      execution_attempt_id: "attempt",
      runtime_provider: "provider",
      state: "progress",
    };
    delete base[field];
    assert.throws(() => normalizeLifecycleObservation(base), TypeError);
    assert.throws(() => normalizeLifecycleObservation({ ...base, [field]: "   " }), TypeError);
  });
}

for (const value of [null, [], "text", 42]) {
  test(`rejects non-object input: ${String(value)}`, () => {
    assert.throws(() => normalizeLifecycleObservation(value), TypeError);
  });
}

for (const subject_ref of ["   ", 42, false, {}]) {
  test(`rejects invalid subject_ref: ${String(subject_ref)}`, () => {
    assert.throws(
      () =>
        normalizeLifecycleObservation({
          operation_id: "op",
          execution_attempt_id: "attempt",
          runtime_provider: "provider",
          state: "heartbeat",
          subject_ref,
        }),
      TypeError,
    );
  });
}
