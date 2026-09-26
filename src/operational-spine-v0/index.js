'use strict';

const {
  RecipeReceipt,
  ExecutionPlan,
} = require('./contracts');
const { materializeExecutionPlan } = require('./resolution');

function preflightReceipt({
  plan,
  attemptId,
  status,
  reason,
  evidenceRefs = [],
}) {
  return RecipeReceipt.parse({
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


function unknownAfterDispatchReceipt({
  plan,
  attemptId,
  reason,
  output,
  evidenceRefs = [],
}) {
  return RecipeReceipt.parse({
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
  if (!authorization || authorization.disposition !== 'AUTHORIZED') return false;
  const constraints = authorization.effect_constraints || [];
  return executionPlan.expected_effects.every((expected) =>
    constraints.some((constraint) =>
      constraint.effect === expected.effect && constraint.scope === expected.scope));
}

function authorityReferenceMatchesPlan(executionPlan, authorization) {
  if (!authorization || typeof authorization.authority_reference !== 'string') return false;
  return executionPlan.authority_refs.some((ref) =>
    ref.kind === 'AUTHORITY' && ref.id === authorization.authority_reference);
}

function effectProfileKey(effects) {
  return [...effects]
    .map(({ effect, scope }) => `${effect}\u0000${scope}`)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .join('\u0001');
}

function createOperationalSpine({
  stateKernel,
  recipeRegistry,
  executionCoordinator,
  executionRecordStore,
}) {
  if (!stateKernel || typeof stateKernel.inspectOperation !== 'function') {
    throw new TypeError('stateKernel adapter is required');
  }
  if (!recipeRegistry || typeof recipeRegistry.resolve !== 'function') {
    throw new TypeError('recipeRegistry is required');
  }
  if (!executionCoordinator || typeof executionCoordinator.runAttempt !== 'function') {
    throw new TypeError('executionCoordinator.runAttempt is required');
  }
  if (!executionRecordStore || typeof executionRecordStore.savePlan !== 'function') {
    throw new TypeError('executionRecordStore is required');
  }

  function plan({
    operationId,
    executionContext,
    requiredCapabilities,
    authorityRefs,
    evidenceRefs,
    input,
  }) {
    const observed = stateKernel.inspectOperation(operationId).aggregate;
    let executionPlan = materializeExecutionPlan({
      operation: observed,
      executionContext,
      requiredCapabilities,
      recipeRegistry,
      authorityRefs,
      evidenceRefs,
    });

    if (executionPlan.resolution === 'DETERMINISTIC_RECIPE') {
      const expectedEffects = typeof recipeRegistry.resolveEffects === 'function'
        ? recipeRegistry.resolveEffects(
            executionPlan.recipe.id,
            executionPlan.recipe.version,
            input,
          )
        : executionPlan.expected_effects;
      executionPlan = ExecutionPlan.parse({
        ...executionPlan,
        expected_effects: expectedEffects,
      });
    }

    executionRecordStore.savePlan(executionPlan);
    return executionPlan;
  }

  async function executePlan(rawPlan, {
    executionAttemptId,
    authorization,
    harnessConformance,
    input,
    cancellationRequested = false,
  }) {
    const executionPlan = ExecutionPlan.parse(rawPlan);
    const planRef = executionRecordStore.savePlan(executionPlan);

    if (executionPlan.resolution === 'SEMANTIC_ESCALATION_REQUIRED') {
      return {
        status: 'SEMANTIC_ESCALATION_REQUIRED',
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    let executionEffects;
    try {
      executionEffects = typeof recipeRegistry.resolveEffects === 'function'
        ? recipeRegistry.resolveEffects(
            executionPlan.recipe.id,
            executionPlan.recipe.version,
            input,
          )
        : executionPlan.expected_effects;
    } catch (error) {
      return {
        status: 'BLOCKED',
        reason: `EFFECT_PROFILE_RESOLUTION_FAILED:${error && error.message ? error.message : String(error)}`,
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (effectProfileKey(executionEffects) !== effectProfileKey(executionPlan.expected_effects)) {
      return {
        status: 'BLOCKED',
        reason: 'EXECUTION_INPUT_EFFECT_PROFILE_MISMATCH',
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (cancellationRequested) {
      return {
        status: 'NO_START',
        reason: 'CANCELLED_BEFORE_ATTEMPT',
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (!authorization || authorization.disposition !== 'AUTHORIZED') {
      return {
        status: 'BLOCKED',
        reason: `AUTHORIZATION_${authorization?.disposition || 'MISSING'}`,
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (!authorityReferenceMatchesPlan(executionPlan, authorization)) {
      return {
        status: 'BLOCKED',
        reason: 'AUTHORITY_REFERENCE_NOT_IN_PLAN',
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (!authorizationCoversPlan(executionPlan, authorization)) {
      return {
        status: 'BLOCKED',
        reason: 'EFFECT_AUTHORIZATION_INCOMPLETE',
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (!harnessConformance || harnessConformance.disposition !== 'CONFORMING') {
      return {
        status: 'BLOCKED',
        reason: `HARNESS_${harnessConformance?.disposition || 'MISSING'}`,
        plan: executionPlan,
        attempt: null,
        operation: stateKernel.inspectOperation(executionPlan.operation_id),
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
    if (!preflight || typeof preflight.status !== 'string') {
      throw new Error('recipe preflight returned a nonconformant result');
    }
    if (!['READY', 'BLOCKED', 'UNAVAILABLE', 'CANCELLED'].includes(preflight.status)) {
      throw new Error(`unsupported recipe preflight status: ${preflight.status}`);
    }

    stateKernel.ensureOperationRunning(executionPlan.operation_id);
    stateKernel.startAttempt({
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
        evidenceRefs: preflight.evidence_refs || [],
      });

      let receiptArtifactRef = null;
      try {
        receiptArtifactRef = executionRecordStore.saveReceipt(receipt);
      } catch (error) {
        terminalStatus = 'BLOCKED';
        receipt = preflightReceipt({
          plan: executionPlan,
          attemptId: executionAttemptId,
          status: terminalStatus,
          reason: 'RECEIPT_PERSISTENCE_FAILED_BEFORE_DISPATCH',
          evidenceRefs: preflight.evidence_refs || [],
        });
      }

      const lifecycle = stateKernel.recordPreflightTerminal({
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
        ...lifecycle,
      };
    }

    stateKernel.markAttemptDispatched(executionAttemptId);
    stateKernel.markAttemptRunning(executionAttemptId);

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
        input: { recipe_request: recipeRequest },
      });
    } catch (error) {
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
          output: {
            error_name: error && error.name ? error.name : 'Error',
            error_message: error && error.message ? error.message : String(error),
          },
        }),
        evidence_refs: [],
      };
    }

    // The State Kernel attempt is already DISPATCHED/RUNNING here. A generic
    // coordinator result that claims no confirmed start cannot safely prove
    // that no effect occurred, so preserve the ambiguity instead of rewriting
    // durable lifecycle as a pre-start failure.
    if (!coordinatorOutcome || coordinatorOutcome.started !== true) {
      const original = coordinatorOutcome || {};
      const reason = `POST_DISPATCH_COORDINATOR_${original.status || 'NO_RESULT'}:${original.reason || 'NO_REASON'}`;
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
          output: { coordinator_status: original.status || null },
        }),
        evidence_refs: Array.isArray(original.evidence_refs) ? original.evidence_refs : [],
      };
    }

    let receipt;
    try {
      receipt = coordinatorOutcome.result
        ? RecipeReceipt.parse(coordinatorOutcome.result)
        : RecipeReceipt.parse({
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
    } catch (error) {
      receipt = unknownAfterDispatchReceipt({
        plan: executionPlan,
        attemptId: executionAttemptId,
        reason: 'NONCONFORMANT_RECIPE_RECEIPT_AFTER_DISPATCH',
        output: {
          error_name: error && error.name ? error.name : 'Error',
          error_message: error && error.message ? error.message : String(error),
        },
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

    const expectedReceiptStatus = ({
      SUCCESS: 'PASS',
      FAILED: 'FAIL',
      CANCELLED: 'CANCELLED',
      UNKNOWN: 'UNKNOWN',
    })[coordinatorOutcome.status];

    if (!expectedReceiptStatus || receipt.status !== expectedReceiptStatus) {
      const reason = `COORDINATOR_RECEIPT_STATUS_MISMATCH:${coordinatorOutcome.status}:${receipt.status}`;
      receipt = unknownAfterDispatchReceipt({
        plan: executionPlan,
        attemptId: executionAttemptId,
        reason,
        output: {
          coordinator_status: coordinatorOutcome.status,
          receipt_status: receipt.status,
        },
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
    } catch (error) {
      receipt = unknownAfterDispatchReceipt({
        plan: executionPlan,
        attemptId: executionAttemptId,
        reason: 'RECEIPT_PERSISTENCE_FAILED_AFTER_DISPATCH',
        output: {
          error_name: error && error.name ? error.name : 'Error',
          error_message: error && error.message ? error.message : String(error),
        },
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

    const lifecycle = stateKernel.recordExecutionOutcome({
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
      ...lifecycle,
    };
  }

  return { plan, executePlan };
}

module.exports = {
  createOperationalSpine,
  ...require('./resolution'),
  ...require('./recipe-registry'),
  ...require('./recipe-execution-surface'),
  ...require('./state-kernel-adapter'),
  ...require('./execution-record-store'),
  ...require('./recipes/integrate-accepted-candidate'),
  ...require('./recipes/reconcile-and-close-taskcycle'),
  ...require('./recipes/render-current-state'),
};
