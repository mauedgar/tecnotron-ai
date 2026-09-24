'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createExecutionCoordinator } = require('../../src/execution-coordinator');

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
      { kind: 'authority', ref: 'authority:001' },
    ],
    cancellation_requested: false,
    input: { objective: 'already resolved work' },
    ...overrides,
  };
}

test('forwards one already-resolved request without routing or substitution', async () => {
  let observedRequest;
  let calls = 0;

  const surface = {
    async execute(request) {
      calls += 1;
      observedRequest = request;
      return {
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'SUCCESS',
        started: true,
        result: { ok: true },
        evidence_refs: [
          { kind: 'surface', ref: 'surface:001' },
        ],
      };
    },
  };

  const request = validRequest();
  const coordinator = createExecutionCoordinator({ executionSurface: surface });
  const result = await coordinator.execute(request);

  assert.equal(calls, 1);
  assert.deepEqual(observedRequest.resolved_execution, request.resolved_execution);
  assert.deepEqual(observedRequest.authorization.effect_constraints, request.authorization.effect_constraints);
  assert.equal(result.status, 'SUCCESS');
  assert.deepEqual(result.evidence_refs, [
    { kind: 'decision', ref: 'decision:001' },
    { kind: 'authority', ref: 'authority:001' },
    { kind: 'surface', ref: 'surface:001' },
  ]);
});

test('authorization DENIED or UNKNOWN fails closed without invoking surface', async () => {
  for (const disposition of ['DENIED', 'UNKNOWN']) {
    let calls = 0;
    const coordinator = createExecutionCoordinator({
      executionSurface: {
        async execute() {
          calls += 1;
          throw new Error('must not execute');
        },
      },
    });

    const result = await coordinator.execute(validRequest({
      authorization: {
        disposition,
        authority_reference: 'authority:001',
        effect_constraints: [
          { effect: 'repository_write', scope: 'candidate-only' },
        ],
      },
    }));

    assert.equal(calls, 0);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.started, false);
  }
});

test('nonconforming or unknown harness fails closed without invoking surface', async () => {
  for (const disposition of ['NONCONFORMING', 'UNKNOWN']) {
    let calls = 0;
    const coordinator = createExecutionCoordinator({
      executionSurface: {
        async execute() {
          calls += 1;
          throw new Error('must not execute');
        },
      },
    });

    const result = await coordinator.execute(validRequest({
      harness_conformance: {
        disposition,
        evidence_ref: 'evidence:harness:001',
      },
    }));

    assert.equal(calls, 0);
    assert.equal(result.status, 'BLOCKED');
  }
});

test('pre-start cancellation reports NO_START and does not invoke surface', async () => {
  let calls = 0;
  const coordinator = createExecutionCoordinator({
    executionSurface: {
      async execute() {
        calls += 1;
      },
    },
  });

  const result = await coordinator.execute(validRequest({
    cancellation_requested: true,
  }));

  assert.equal(calls, 0);
  assert.equal(result.status, 'NO_START');
  assert.equal(result.reason, 'CANCELLED_BEFORE_START');
  assert.equal(result.started, false);
});

test('missing surface reports UNAVAILABLE with no hidden fallback', async () => {
  const coordinator = createExecutionCoordinator({ executionSurface: null });
  const result = await coordinator.execute(validRequest());

  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.started, false);
  assert.equal(result.reason, 'EXECUTION_SURFACE_UNAVAILABLE');
});

test('malformed post-invocation surface result becomes UNKNOWN and preserves coordinator identities', async () => {
  const coordinator = createExecutionCoordinator({
    executionSurface: {
      async execute() {
        return {
          status: 'SUCCESS',
        };
      },
    },
  });

  const result = await coordinator.execute(validRequest());

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.started, true);
  assert.equal(result.operation_id, 'OP-001');
  assert.equal(result.execution_attempt_id, 'ATTEMPT-001');
  assert.equal(result.reason, 'EXECUTION_SURFACE_RESULT_NONCONFORMANT_AFTER_INVOCATION');
});

test('post-invocation surface identity mismatch becomes UNKNOWN instead of adopting substituted identity', async () => {
  const coordinator = createExecutionCoordinator({
    executionSurface: {
      async execute(request) {
        return {
          operation_id: 'OP-SUBSTITUTED',
          execution_attempt_id: request.execution_attempt_id,
          status: 'SUCCESS',
          started: true,
          result: { ok: true },
          evidence_refs: [],
        };
      },
    },
  });

  const result = await coordinator.execute(validRequest());

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.started, true);
  assert.equal(result.operation_id, 'OP-001');
  assert.equal(result.reason, 'EXECUTION_SURFACE_IDENTITY_MISMATCH_AFTER_INVOCATION');
});

test('partial result and in-flight cancellation remain explicit', async () => {
  for (const expected of [
    {
      status: 'PARTIAL_RESULT',
      started: true,
      reason: 'SURFACE_PARTIAL',
      partial_result: { completed: ['a'] },
      evidence_refs: [],
    },
    {
      status: 'CANCELLED',
      started: true,
      reason: 'SURFACE_CANCELLED',
      evidence_refs: [],
    },
  ]) {
    const coordinator = createExecutionCoordinator({
      executionSurface: {
        async execute(request) {
          return {
            operation_id: request.operation_id,
            execution_attempt_id: request.execution_attempt_id,
            ...expected,
          };
        },
      },
    });

    const result = await coordinator.execute(validRequest());
    assert.equal(result.status, expected.status);
    assert.equal(result.started, true);
  }
});

test('distinct attempts may execute for one Operation without collapsing identity', async () => {
  const seen = [];
  const coordinator = createExecutionCoordinator({
    executionSurface: {
      async execute(request) {
        seen.push(request.execution_attempt_id);
        return {
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'SUCCESS',
          started: true,
          result: null,
          evidence_refs: [],
        };
      },
    },
  });

  await coordinator.execute(validRequest({ execution_attempt_id: 'ATTEMPT-A' }));
  await coordinator.execute(validRequest({ execution_attempt_id: 'ATTEMPT-B' }));

  assert.deepEqual(seen, ['ATTEMPT-A', 'ATTEMPT-B']);
});

test('runAttempt alias preserves UNKNOWN returned by a conforming execution surface', async () => {
  const coordinator = createExecutionCoordinator({
    executionSurface: {
      async execute(request) {
        return {
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'UNKNOWN',
          started: true,
          reason: 'EFFECT_AMBIGUOUS_AFTER_DISPATCH',
          evidence_refs: [],
        };
      },
    },
  });

  assert.equal(typeof coordinator.runAttempt, 'function');
  const result = await coordinator.runAttempt(validRequest());
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.started, true);
});

test('surface exception after invocation becomes UNKNOWN because effect cannot be excluded', async () => {
  const coordinator = createExecutionCoordinator({
    executionSurface: {
      async execute() {
        throw new Error('transport lost');
      },
    },
  });

  const result = await coordinator.runAttempt(validRequest());
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.started, true);
  assert.equal(result.reason, 'EXECUTION_SURFACE_ERROR_AFTER_INVOCATION');
});
