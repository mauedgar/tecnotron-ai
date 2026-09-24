'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ExecutionAttemptRequest,
  ExecutionOutcome,
} = require('../../src/contracts/execution-coordination');

function validRequest(overrides = {}) {
  return {
    operation_id: 'OP-001',
    execution_attempt_id: 'ATTEMPT-001',
    resolved_execution: {
      decision_ref: 'decision:001',
      actor_id: 'implementer',
      runtime_id: 'runtime:selected',
      model_id: 'model:selected',
      provider_id: 'provider:selected',
    },
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: 'authority:001',
      effect_constraints: [
        { effect: 'repository_write', scope: 'candidate-only' },
      ],
    },
    harness_conformance: {
      disposition: 'CONFORMING',
      evidence_ref: 'evidence:harness:001',
    },
    evidence_refs: [
      { kind: 'decision', ref: 'decision:001' },
    ],
    cancellation_requested: false,
    input: { objective: 'already resolved work' },
    ...overrides,
  };
}

test('request keeps semantic Operation and execution attempt distinct', () => {
  assert.throws(() => ExecutionAttemptRequest.parse(validRequest({
    execution_attempt_id: 'OP-001',
  })));

  const parsed = ExecutionAttemptRequest.parse(validRequest());
  assert.equal(parsed.operation_id, 'OP-001');
  assert.equal(parsed.execution_attempt_id, 'ATTEMPT-001');
});

test('request requires explicit authorization and effect constraints', () => {
  assert.throws(() => ExecutionAttemptRequest.parse(validRequest({
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: 'authority:001',
      effect_constraints: [],
    },
  })));
});

test('partial result, cancellation, blocked, unavailable, failed and UNKNOWN are explicit outcomes', () => {
  const common = {
    operation_id: 'OP-001',
    execution_attempt_id: 'ATTEMPT-001',
    evidence_refs: [],
  };

  assert.equal(ExecutionOutcome.parse({
    ...common,
    status: 'PARTIAL_RESULT',
    started: true,
    reason: 'PARTIAL',
    partial_result: { completed: 1 },
  }).status, 'PARTIAL_RESULT');

  assert.equal(ExecutionOutcome.parse({
    ...common,
    status: 'CANCELLED',
    started: true,
    reason: 'CANCELLED_BY_CALLER',
  }).status, 'CANCELLED');

  for (const status of ['BLOCKED', 'UNAVAILABLE']) {
    assert.equal(ExecutionOutcome.parse({
      ...common,
      status,
      started: false,
      reason: status,
    }).status, status);
  }

  assert.equal(ExecutionOutcome.parse({
    ...common,
    status: 'FAILED',
    started: false,
    reason: 'FAILED_BEFORE_CONFIRMED_START',
  }).status, 'FAILED');

  assert.equal(ExecutionOutcome.parse({
    ...common,
    status: 'UNKNOWN',
    started: true,
    reason: 'EFFECT_AMBIGUOUS_AFTER_DISPATCH',
  }).status, 'UNKNOWN');
});

test('NO_START is explicit and cannot claim started=true', () => {
  assert.throws(() => ExecutionOutcome.parse({
    operation_id: 'OP-001',
    execution_attempt_id: 'ATTEMPT-001',
    status: 'NO_START',
    started: true,
    reason: 'CANCELLED_BEFORE_START',
    evidence_refs: [],
  }));
});