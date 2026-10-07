import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLifecycleObservation } from "./normalize-lifecycle-observation.mjs";

function baseInput(overrides = {}) {
  return {
    operation_id: " op-1 ",
    execution_attempt_id: " attempt-1 ",
    runtime_provider: " opencode ",
    state: " started ",
    ...overrides,
  };
}

test("trims required values", () => {
  const out = normalizeLifecycleObservation(baseInput());
  assert.equal(out.operation_id, "op-1");
  assert.equal(out.execution_attempt_id, "attempt-1");
  assert.equal(out.runtime_provider, "opencode");
  assert.equal(out.state, "started");
});

test("subject_ref omitted => null", () => {
  const out = normalizeLifecycleObservation(baseInput());
  assert.equal(out.subject_ref, null);
});

test("subject_ref null => null", () => {
  const out = normalizeLifecycleObservation(baseInput({ subject_ref: null }));
  assert.equal(out.subject_ref, null);
});

test("subject_ref trimming", () => {
  const out = normalizeLifecycleObservation(baseInput({ subject_ref: " subj-1 " }));
  assert.equal(out.subject_ref, "subj-1");
});

test("started => terminal false", () => {
  assert.equal(normalizeLifecycleObservation(baseInput({ state: "started" })).terminal, false);
});

test("idle => terminal false", () => {
  assert.equal(normalizeLifecycleObservation(baseInput({ state: "idle" })).terminal, false);
});

test("each terminal state => terminal true", () => {
  for (const state of ["completed", "failed", "blocked", "cancelled", "timed_out"]) {
    assert.equal(normalizeLifecycleObservation(baseInput({ state })).terminal, true, state);
  }
});

test("invalid state throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation(baseInput({ state: "nope" })), TypeError);
});

test("missing required field throws TypeError", () => {
  const input = baseInput();
  delete input.operation_id;
  assert.throws(() => normalizeLifecycleObservation(input), TypeError);
});

test("blank required field throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation(baseInput({ state: "   " })), TypeError);
});

test("non-string required field throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation(baseInput({ runtime_provider: 42 })), TypeError);
});

test("array input throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation([]), TypeError);
});

test("null input throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation(null), TypeError);
});

test("non-object input throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation("x"), TypeError);
});

test("blank subject_ref throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation(baseInput({ subject_ref: "  " })), TypeError);
});

test("non-string subject_ref throws TypeError", () => {
  assert.throws(() => normalizeLifecycleObservation(baseInput({ subject_ref: 7 })), TypeError);
});

test("unrelated input keys do not appear in output", () => {
  const out = normalizeLifecycleObservation(baseInput({ extra: "nope", authority: "x" }));
  assert.deepEqual(Object.keys(out), [
    "operation_id",
    "execution_attempt_id",
    "runtime_provider",
    "state",
    "subject_ref",
    "terminal",
  ]);
});

test("output key order is exact", () => {
  const out = normalizeLifecycleObservation(baseInput());
  assert.deepEqual(Object.keys(out), [
    "operation_id",
    "execution_attempt_id",
    "runtime_provider",
    "state",
    "subject_ref",
    "terminal",
  ]);
});
