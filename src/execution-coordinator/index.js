'use strict';

const {
  ExecutionAttemptRequest,
  ExecutionOutcome,
  mergeEvidenceRefs,
} = require('../contracts/execution-coordination');

function localOutcome(request, status, reason, extras = {}) {
  return ExecutionOutcome.parse({
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    started: false,
    reason,
    evidence_refs: request.evidence_refs,
    ...extras,
  });
}

function createExecutionCoordinator({ executionSurface }) {
  async function runAttempt(rawRequest) {
      const request = ExecutionAttemptRequest.parse(rawRequest);

      if (request.cancellation_requested) {
        return localOutcome(request, 'NO_START', 'CANCELLED_BEFORE_START');
      }

      if (request.authorization.disposition !== 'AUTHORIZED') {
        return localOutcome(
          request,
          'BLOCKED',
          `AUTHORIZATION_${request.authorization.disposition}`,
        );
      }

      if (request.harness_conformance.disposition !== 'CONFORMING') {
        return localOutcome(
          request,
          'BLOCKED',
          `HARNESS_${request.harness_conformance.disposition}`,
        );
      }

      if (!executionSurface || typeof executionSurface.execute !== 'function') {
        return localOutcome(request, 'UNAVAILABLE', 'EXECUTION_SURFACE_UNAVAILABLE');
      }

      let rawOutcome;
      try {
        rawOutcome = await executionSurface.execute(request);
      } catch (error) {
        return ExecutionOutcome.parse({
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'UNKNOWN',
          started: true,
          reason: 'EXECUTION_SURFACE_ERROR_AFTER_INVOCATION',
          result: {
            error_name: error && error.name ? error.name : 'Error',
            error_message: error && error.message ? error.message : String(error),
          },
          evidence_refs: request.evidence_refs,
        });
      }

      const parsed = ExecutionOutcome.safeParse(rawOutcome);
      if (!parsed.success) {
        return ExecutionOutcome.parse({
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'UNKNOWN',
          started: true,
          reason: 'EXECUTION_SURFACE_RESULT_NONCONFORMANT_AFTER_INVOCATION',
          evidence_refs: request.evidence_refs,
        });
      }

      const outcome = parsed.data;

      if (
        outcome.operation_id !== request.operation_id ||
        outcome.execution_attempt_id !== request.execution_attempt_id
      ) {
        return ExecutionOutcome.parse({
          operation_id: request.operation_id,
          execution_attempt_id: request.execution_attempt_id,
          status: 'UNKNOWN',
          started: true,
          reason: 'EXECUTION_SURFACE_IDENTITY_MISMATCH_AFTER_INVOCATION',
          evidence_refs: request.evidence_refs,
        });
      }

      return ExecutionOutcome.parse({
        ...outcome,
        evidence_refs: mergeEvidenceRefs(request.evidence_refs, outcome.evidence_refs),
      });
  }

  return {
    execute: runAttempt,
    runAttempt,
  };
}

module.exports = {
  createExecutionCoordinator,
};