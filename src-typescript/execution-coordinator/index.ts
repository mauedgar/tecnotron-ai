import {
  ExecutionAttemptRequest,
  ExecutionOutcome,
  mergeEvidenceRefs,
  type ExecutionAttemptRequest as ExecutionAttemptRequestValue,
  type ExecutionAttemptRequestInput,
  type ExecutionOutcome as ExecutionOutcomeValue,
  type ExecutionOutcomeInput,
} from '../contracts/execution-coordination';

export interface ExecutionSurfacePort {
  execute(request: Readonly<ExecutionAttemptRequestValue>): ExecutionOutcomeInput | Promise<ExecutionOutcomeInput>;
}

export interface ExecutionCoordinatorPort {
  execute(rawRequest: ExecutionAttemptRequestInput): Promise<ExecutionOutcomeValue>;
  runAttempt(rawRequest: ExecutionAttemptRequestInput): Promise<ExecutionOutcomeValue>;
}

function localOutcome(
  request: ExecutionAttemptRequestValue,
  status: 'NO_START' | 'BLOCKED' | 'UNAVAILABLE',
  reason: string,
  extras: Partial<ExecutionOutcomeInput> = {},
): ExecutionOutcomeValue {
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

function errorDetails(error: unknown): { error_name: unknown; error_message: unknown } {
  const record = error !== null && (typeof error === 'object' || typeof error === 'function')
    ? error as { name?: unknown; message?: unknown }
    : undefined;
  return {
    error_name: record?.name || 'Error',
    error_message: record?.message || String(error),
  };
}

export function createExecutionCoordinator({
  executionSurface,
}: {
  readonly executionSurface: ExecutionSurfacePort | null | undefined;
}): ExecutionCoordinatorPort {
  async function runAttempt(rawRequest: ExecutionAttemptRequestInput): Promise<ExecutionOutcomeValue> {
    const request = ExecutionAttemptRequest.parse(rawRequest);
    if (request.cancellation_requested) return localOutcome(request, 'NO_START', 'CANCELLED_BEFORE_START');
    if (request.authorization.disposition !== 'AUTHORIZED') {
      return localOutcome(request, 'BLOCKED', `AUTHORIZATION_${request.authorization.disposition}`);
    }
    if (request.harness_conformance.disposition !== 'CONFORMING') {
      return localOutcome(request, 'BLOCKED', `HARNESS_${request.harness_conformance.disposition}`);
    }
    if (!executionSurface || typeof executionSurface.execute !== 'function') {
      return localOutcome(request, 'UNAVAILABLE', 'EXECUTION_SURFACE_UNAVAILABLE');
    }

    let rawOutcome: ExecutionOutcomeInput;
    try {
      rawOutcome = await executionSurface.execute(request);
    } catch (error) {
      return ExecutionOutcome.parse({
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'UNKNOWN',
        started: true,
        reason: 'EXECUTION_SURFACE_ERROR_AFTER_INVOCATION',
        result: errorDetails(error),
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
    if (outcome.operation_id !== request.operation_id || outcome.execution_attempt_id !== request.execution_attempt_id) {
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

  return { execute: runAttempt, runAttempt };
}
