"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperationalSpine = createOperationalSpine;
const contracts_1 = require("./contracts");
const taskcycle_lifecycle_capability_1 = require("./taskcycle-lifecycle-capability");
const resolution_1 = require("./resolution");
function errorRecord(error) {
    return error !== null && (typeof error === 'object' || typeof error === 'function')
        ? error
        : undefined;
}
function errorDetails(error) {
    const record = errorRecord(error);
    return {
        error_name: record?.name || 'Error',
        error_message: record?.message || String(error),
    };
}
function errorMessage(error) {
    const message = errorRecord(error)?.message;
    return message ? String(message) : String(error);
}
function preflightReceipt({ plan, attemptId, status, reason, evidenceRefs = [], }) {
    return contracts_1.RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `recipe-receipt:${attemptId}:preflight`,
        recipe_id: plan.recipe.id,
        recipe_version: plan.recipe.version,
        operation_id: plan.operation_id,
        execution_attempt_id: attemptId,
        status,
        effect_state: 'NONE',
        reason,
        result_refs: [],
        evidence_refs: evidenceRefs,
    });
}
function unknownAfterDispatchReceipt({ plan, attemptId, reason, output, evidenceRefs = [], }) {
    return contracts_1.RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `recipe-receipt:${attemptId}:unknown-after-dispatch`,
        recipe_id: plan.recipe.id,
        recipe_version: plan.recipe.version,
        operation_id: plan.operation_id,
        execution_attempt_id: attemptId,
        status: 'UNKNOWN',
        effect_state: 'UNKNOWN',
        reason,
        ...(output !== undefined ? { output } : {}),
        result_refs: [],
        evidence_refs: evidenceRefs,
    });
}
function toCoordinatorEvidence(refs) {
    return refs.map((ref) => ({ kind: ref.kind.toLowerCase(), ref: ref.id }));
}
function authorizationCoversPlan(executionPlan, authorization) {
    if (!authorization || authorization.disposition !== 'AUTHORIZED')
        return false;
    return executionPlan.expected_effects.every((expected) => authorization.effect_constraints.some((constraint) => constraint.effect === expected.effect && constraint.scope === expected.scope));
}
function authorityReferenceMatchesPlan(executionPlan, authorization) {
    if (!authorization || typeof authorization.authority_reference !== 'string')
        return false;
    return executionPlan.authority_refs.some((ref) => ref.kind === 'AUTHORITY' && ref.id === authorization.authority_reference);
}
function effectProfileKey(effects) {
    return [...effects]
        .map(({ effect, scope }) => `${effect}\u0000${scope}`)
        .sort((left, right) => left.localeCompare(right, 'en'))
        .join('\u0001');
}
function createOperationalSpine({ executionLifecycle, recipeRegistry, executionCoordinator, executionRecordStore, }) {
    const lifecycle = (0, taskcycle_lifecycle_capability_1.requireExecutionLifecycleCapability)(executionLifecycle);
    if (!recipeRegistry || typeof recipeRegistry.resolve !== 'function')
        throw new TypeError('recipeRegistry is required');
    if (!executionCoordinator || typeof executionCoordinator.runAttempt !== 'function') {
        throw new TypeError('executionCoordinator.runAttempt is required');
    }
    if (!executionRecordStore || typeof executionRecordStore.savePlan !== 'function') {
        throw new TypeError('executionRecordStore is required');
    }
    function plan({ operationId, executionContext, requiredCapabilities, authorityRefs, evidenceRefs, input, }) {
        const observed = lifecycle.observeOperation(operationId).aggregate;
        let executionPlan = (0, resolution_1.materializeExecutionPlan)({
            operation: observed,
            executionContext,
            requiredCapabilities,
            recipeRegistry,
            ...(authorityRefs === undefined ? {} : { authorityRefs }),
            ...(evidenceRefs === undefined ? {} : { evidenceRefs }),
        });
        if (executionPlan.resolution === 'DETERMINISTIC_RECIPE') {
            const expectedEffects = typeof recipeRegistry.resolveEffects === 'function'
                ? recipeRegistry.resolveEffects(executionPlan.recipe.id, executionPlan.recipe.version, input)
                : executionPlan.expected_effects;
            executionPlan = contracts_1.ExecutionPlan.parse({ ...executionPlan, expected_effects: expectedEffects });
        }
        executionRecordStore.savePlan(executionPlan);
        return executionPlan;
    }
    async function executePlan(rawPlan, { executionAttemptId, authorization, harnessConformance, input, cancellationRequested = false, }) {
        const executionPlan = contracts_1.ExecutionPlan.parse(rawPlan);
        const planRef = executionRecordStore.savePlan(executionPlan);
        if (executionPlan.resolution === 'SEMANTIC_ESCALATION_REQUIRED') {
            return {
                status: 'SEMANTIC_ESCALATION_REQUIRED',
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        let executionEffects;
        try {
            executionEffects = typeof recipeRegistry.resolveEffects === 'function'
                ? recipeRegistry.resolveEffects(executionPlan.recipe.id, executionPlan.recipe.version, input)
                : executionPlan.expected_effects;
        }
        catch (error) {
            return {
                status: 'BLOCKED',
                reason: `EFFECT_PROFILE_RESOLUTION_FAILED:${errorMessage(error)}`,
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        if (effectProfileKey(executionEffects) !== effectProfileKey(executionPlan.expected_effects)) {
            return {
                status: 'BLOCKED',
                reason: 'EXECUTION_INPUT_EFFECT_PROFILE_MISMATCH',
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        if (cancellationRequested) {
            return {
                status: 'NO_START',
                reason: 'CANCELLED_BEFORE_ATTEMPT',
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        if (!authorization || authorization.disposition !== 'AUTHORIZED') {
            return {
                status: 'BLOCKED',
                reason: `AUTHORIZATION_${authorization?.disposition || 'MISSING'}`,
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        if (!authorityReferenceMatchesPlan(executionPlan, authorization)) {
            return {
                status: 'BLOCKED',
                reason: 'AUTHORITY_REFERENCE_NOT_IN_PLAN',
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        if (!authorizationCoversPlan(executionPlan, authorization)) {
            return {
                status: 'BLOCKED',
                reason: 'EFFECT_AUTHORIZATION_INCOMPLETE',
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        if (!harnessConformance || harnessConformance.disposition !== 'CONFORMING') {
            return {
                status: 'BLOCKED',
                reason: `HARNESS_${harnessConformance?.disposition || 'MISSING'}`,
                plan: executionPlan,
                attempt: null,
                operation: lifecycle.observeOperation(executionPlan.operation_id),
                plan_ref: planRef,
            };
        }
        const recipeRequest = {
            recipe_id: executionPlan.recipe.id,
            recipe_version: executionPlan.recipe.version,
            operation_id: executionPlan.operation_id,
            execution_attempt_id: executionAttemptId,
            context: executionPlan.execution_context,
            authorization,
            evidence_refs: executionPlan.evidence_refs,
            input,
        };
        const preflight = await recipeRegistry.preflight(recipeRequest);
        if (!preflight || typeof preflight.status !== 'string')
            throw new Error('recipe preflight returned a nonconformant result');
        if (!['READY', 'BLOCKED', 'UNAVAILABLE', 'CANCELLED'].includes(preflight.status)) {
            throw new Error(`unsupported recipe preflight status: ${preflight.status}`);
        }
        lifecycle.prepareAttempt({
            attemptId: executionAttemptId,
            operationId: executionPlan.operation_id,
            authorityRefs: executionPlan.authority_refs,
        });
        if (preflight.status !== 'READY') {
            let terminalStatus = preflight.status;
            let receipt = preflightReceipt({
                plan: executionPlan,
                attemptId: executionAttemptId,
                status: terminalStatus,
                reason: preflight.reason || `RECIPE_PREFLIGHT_${terminalStatus}`,
                evidenceRefs: preflight.evidence_refs ?? [],
            });
            let receiptArtifactRef = null;
            try {
                receiptArtifactRef = executionRecordStore.saveReceipt(receipt);
            }
            catch {
                terminalStatus = 'BLOCKED';
                receipt = preflightReceipt({
                    plan: executionPlan,
                    attemptId: executionAttemptId,
                    status: terminalStatus,
                    reason: 'RECEIPT_PERSISTENCE_FAILED_BEFORE_DISPATCH',
                    evidenceRefs: preflight.evidence_refs ?? [],
                });
            }
            const lifecycleResult = lifecycle.recordPreflightTerminalOutcome({
                attemptId: executionAttemptId,
                operationId: executionPlan.operation_id,
                status: terminalStatus,
                receipt,
                resultRefs: receiptArtifactRef ? [planRef, receiptArtifactRef] : [planRef],
            });
            return {
                status: terminalStatus,
                plan: executionPlan,
                receipt,
                plan_ref: planRef,
                receipt_artifact_ref: receiptArtifactRef,
                ...lifecycleResult,
            };
        }
        lifecycle.confirmDispatchStart(executionAttemptId);
        const executionRecipeRequest = preflight.handoff === undefined
            ? recipeRequest
            : { ...recipeRequest, preflight_handoff: preflight.handoff };
        let coordinatorOutcome;
        try {
            coordinatorOutcome = await executionCoordinator.runAttempt({
                operation_id: executionPlan.operation_id,
                execution_attempt_id: executionAttemptId,
                resolved_execution: {
                    decision_ref: `recipe:${executionPlan.recipe.id}@${executionPlan.recipe.version}`,
                    actor_id: 'deterministic-recipe',
                    runtime_id: executionPlan.execution_context.runtime.runtime_identity,
                },
                authorization,
                harness_conformance: harnessConformance,
                evidence_refs: toCoordinatorEvidence(executionPlan.evidence_refs),
                cancellation_requested: false,
                input: { recipe_request: executionRecipeRequest },
            });
        }
        catch (error) {
            coordinatorOutcome = {
                operation_id: executionPlan.operation_id,
                execution_attempt_id: executionAttemptId,
                status: 'UNKNOWN',
                started: true,
                reason: 'COORDINATOR_EXCEPTION_AFTER_DISPATCH',
                result: unknownAfterDispatchReceipt({
                    plan: executionPlan,
                    attemptId: executionAttemptId,
                    reason: 'COORDINATOR_EXCEPTION_AFTER_DISPATCH',
                    output: errorDetails(error),
                }),
                evidence_refs: [],
            };
        }
        // Once dispatched, an outcome claiming no confirmed start cannot prove no effect occurred.
        if (!coordinatorOutcome || coordinatorOutcome.started !== true) {
            const original = coordinatorOutcome;
            const reason = `POST_DISPATCH_COORDINATOR_${original?.status || 'NO_RESULT'}:${original?.reason || 'NO_REASON'}`;
            coordinatorOutcome = {
                operation_id: executionPlan.operation_id,
                execution_attempt_id: executionAttemptId,
                status: 'UNKNOWN',
                started: true,
                reason,
                result: unknownAfterDispatchReceipt({
                    plan: executionPlan,
                    attemptId: executionAttemptId,
                    reason,
                    output: { coordinator_status: original?.status || null },
                }),
                evidence_refs: Array.isArray(original?.evidence_refs) ? original.evidence_refs : [],
            };
        }
        let receipt;
        try {
            receipt = coordinatorOutcome.result
                ? contracts_1.RecipeReceipt.parse(coordinatorOutcome.result)
                : contracts_1.RecipeReceipt.parse({
                    schema_version: 'tecnotron-recipe-receipt/v0',
                    receipt_ref: `recipe-receipt:${executionAttemptId}:coordinator`,
                    recipe_id: executionPlan.recipe.id,
                    recipe_version: executionPlan.recipe.version,
                    operation_id: executionPlan.operation_id,
                    execution_attempt_id: executionAttemptId,
                    status: coordinatorOutcome.status === 'UNKNOWN' ? 'UNKNOWN' : 'FAIL',
                    effect_state: coordinatorOutcome.status === 'UNKNOWN' ? 'UNKNOWN' : 'NONE',
                    reason: coordinatorOutcome.reason || 'COORDINATOR_RESULT_WITHOUT_RECIPE_RECEIPT',
                    result_refs: [],
                    evidence_refs: [],
                });
        }
        catch (error) {
            receipt = unknownAfterDispatchReceipt({
                plan: executionPlan,
                attemptId: executionAttemptId,
                reason: 'NONCONFORMANT_RECIPE_RECEIPT_AFTER_DISPATCH',
                output: errorDetails(error),
            });
            coordinatorOutcome = {
                operation_id: executionPlan.operation_id,
                execution_attempt_id: executionAttemptId,
                status: 'UNKNOWN',
                started: true,
                reason: receipt.reason,
                result: receipt,
                evidence_refs: [],
            };
        }
        const expectedReceiptStatus = {
            SUCCESS: 'PASS',
            FAILED: 'FAIL',
            CANCELLED: 'CANCELLED',
            UNKNOWN: 'UNKNOWN',
        };
        if (!expectedReceiptStatus[coordinatorOutcome.status]
            || receipt.status !== expectedReceiptStatus[coordinatorOutcome.status]) {
            const reason = `COORDINATOR_RECEIPT_STATUS_MISMATCH:${coordinatorOutcome.status}:${receipt.status}`;
            receipt = unknownAfterDispatchReceipt({
                plan: executionPlan,
                attemptId: executionAttemptId,
                reason,
                output: { coordinator_status: coordinatorOutcome.status, receipt_status: receipt.status },
                evidenceRefs: receipt.evidence_refs,
            });
            coordinatorOutcome = {
                operation_id: executionPlan.operation_id,
                execution_attempt_id: executionAttemptId,
                status: 'UNKNOWN',
                started: true,
                reason,
                result: receipt,
                evidence_refs: [],
            };
        }
        let receiptArtifactRef = null;
        try {
            receiptArtifactRef = executionRecordStore.saveReceipt(receipt);
        }
        catch (error) {
            receipt = unknownAfterDispatchReceipt({
                plan: executionPlan,
                attemptId: executionAttemptId,
                reason: 'RECEIPT_PERSISTENCE_FAILED_AFTER_DISPATCH',
                output: errorDetails(error),
                evidenceRefs: receipt.evidence_refs,
            });
            coordinatorOutcome = {
                operation_id: executionPlan.operation_id,
                execution_attempt_id: executionAttemptId,
                status: 'UNKNOWN',
                started: true,
                reason: receipt.reason,
                result: receipt,
                evidence_refs: [],
            };
        }
        const lifecycleResult = lifecycle.recordExecutionOutcome({
            attemptId: executionAttemptId,
            operationId: executionPlan.operation_id,
            coordinatorOutcome,
            receipt,
            resultRefs: receiptArtifactRef ? [planRef, receiptArtifactRef] : [planRef],
        });
        return {
            status: coordinatorOutcome.status,
            plan: executionPlan,
            receipt,
            plan_ref: planRef,
            receipt_artifact_ref: receiptArtifactRef,
            coordinator_outcome: coordinatorOutcome,
            ...lifecycleResult,
        };
    }
    return { plan, executePlan };
}
