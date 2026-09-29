"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecutionCoordinator = createExecutionCoordinator;
const execution_coordination_1 = require("../contracts/execution-coordination");
function localOutcome(request, status, reason, extras = {}) {
    return execution_coordination_1.ExecutionOutcome.parse({
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status,
        started: false,
        reason,
        evidence_refs: request.evidence_refs,
        ...extras,
    });
}
function errorDetails(error) {
    const record = error !== null && (typeof error === 'object' || typeof error === 'function')
        ? error
        : undefined;
    return {
        error_name: record?.name || 'Error',
        error_message: record?.message || String(error),
    };
}
function createExecutionCoordinator({ executionSurface, }) {
    async function runAttempt(rawRequest) {
        const request = execution_coordination_1.ExecutionAttemptRequest.parse(rawRequest);
        if (request.cancellation_requested)
            return localOutcome(request, 'NO_START', 'CANCELLED_BEFORE_START');
        if (request.authorization.disposition !== 'AUTHORIZED') {
            return localOutcome(request, 'BLOCKED', `AUTHORIZATION_${request.authorization.disposition}`);
        }
        if (request.harness_conformance.disposition !== 'CONFORMING') {
            return localOutcome(request, 'BLOCKED', `HARNESS_${request.harness_conformance.disposition}`);
        }
        if (!executionSurface || typeof executionSurface.execute !== 'function') {
            return localOutcome(request, 'UNAVAILABLE', 'EXECUTION_SURFACE_UNAVAILABLE');
        }
        let rawOutcome;
        try {
            rawOutcome = await executionSurface.execute(request);
        }
        catch (error) {
            return execution_coordination_1.ExecutionOutcome.parse({
                operation_id: request.operation_id,
                execution_attempt_id: request.execution_attempt_id,
                status: 'UNKNOWN',
                started: true,
                reason: 'EXECUTION_SURFACE_ERROR_AFTER_INVOCATION',
                result: errorDetails(error),
                evidence_refs: request.evidence_refs,
            });
        }
        const parsed = execution_coordination_1.ExecutionOutcome.safeParse(rawOutcome);
        if (!parsed.success) {
            return execution_coordination_1.ExecutionOutcome.parse({
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
            return execution_coordination_1.ExecutionOutcome.parse({
                operation_id: request.operation_id,
                execution_attempt_id: request.execution_attempt_id,
                status: 'UNKNOWN',
                started: true,
                reason: 'EXECUTION_SURFACE_IDENTITY_MISMATCH_AFTER_INVOCATION',
                evidence_refs: request.evidence_refs,
            });
        }
        return execution_coordination_1.ExecutionOutcome.parse({
            ...outcome,
            evidence_refs: (0, execution_coordination_1.mergeEvidenceRefs)(request.evidence_refs, outcome.evidence_refs),
        });
    }
    return { execute: runAttempt, runAttempt };
}
