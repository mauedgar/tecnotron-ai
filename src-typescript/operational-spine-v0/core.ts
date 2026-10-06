import {
  type AuthorizationContext,
  type EvidenceRef,
  type ExecutionAttemptId,
  type ExecutionAttemptRequestInput,
  type ExecutionOutcome,
  type HarnessConformance,
  type OperationId,
} from '../contracts/execution-coordination';
import {
  ExecutionPlan,
  RecipeReceipt,
  type Capability,
  type EffectDescriptor,
  type ExecutionContextInput,
  type ExecutionPlan as ExecutionPlanValue,
  type ExecutionPlanInput,
  type RecipeReceipt as RecipeReceiptValue,
  type Reference,
} from './contracts';
import type { ExecutionRecordStorePort } from './execution-record-store';
import type { RecipePreflight, RecipeRegistryPort } from './recipe-registry';
import { requireExecutionLifecycleCapability, type ExecutionLifecycleCapability } from './taskcycle-lifecycle-capability';
import { materializeExecutionPlan, type OperationAggregate } from './resolution';

/**
 * @deprecated Type-only compatibility for historical downstream typechecks.
 * OperationalSpine no longer depends on this shape.
 */
export interface StateKernelPort {
  inspectOperation(operationId: OperationId): unknown;
}

export interface ExecutionCoordinatorPort {
  runAttempt(request: ExecutionAttemptRequestInput): Promise<ExecutionOutcome>;
}

export interface OperationalSpineDependencies {
  readonly executionLifecycle?: ExecutionLifecycleCapability;
  /**
   * @deprecated Boundary-only compatibility for existing callers.
   * The value is normalized immediately into ExecutionLifecycleCapability.
   */
  readonly stateKernel?: unknown;
  readonly recipeRegistry: RecipeRegistryPort;
  readonly executionCoordinator: ExecutionCoordinatorPort;
  readonly executionRecordStore: ExecutionRecordStorePort;
}

export interface PlanRequest {
  readonly operationId: OperationId;
  readonly executionContext: ExecutionContextInput;
  readonly requiredCapabilities: readonly Capability[];
  readonly authorityRefs?: readonly Reference[];
  readonly evidenceRefs?: readonly Reference[];
  readonly input?: unknown;
}

export interface ExecutePlanRequest {
  readonly executionAttemptId: ExecutionAttemptId;
  readonly authorization: AuthorizationContext;
  readonly harnessConformance: HarnessConformance;
  readonly input?: unknown;
  readonly cancellationRequested?: boolean;
}

function errorRecord(error: unknown): { name?: unknown; message?: unknown } | undefined {
  return error !== null && (typeof error === 'object' || typeof error === 'function')
    ? error as { name?: unknown; message?: unknown }
    : undefined;
}

function errorDetails(error: unknown): { error_name: unknown; error_message: unknown } {
  const record = errorRecord(error);
  return {
    error_name: record?.name || 'Error',
    error_message: record?.message || String(error),
  };
}

function errorMessage(error: unknown): string {
  const message = errorRecord(error)?.message;
  return message ? String(message) : String(error);
}

function preflightReceipt({
  plan,
  attemptId,
  status,
  reason,
  evidenceRefs = [],
}: {
  plan: Extract<ExecutionPlanValue, { resolution: 'DETERMINISTIC_RECIPE' }>;
  attemptId: string;
  status: Exclude<RecipePreflight['status'], 'READY'>;
  reason: string;
  evidenceRefs?: readonly Reference[];
}): RecipeReceiptValue {
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
}: {
  plan: Extract<ExecutionPlanValue, { resolution: 'DETERMINISTIC_RECIPE' }>;
  attemptId: string;
  reason: string;
  output?: unknown;
  evidenceRefs?: readonly Reference[];
}): RecipeReceiptValue {
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

function toCoordinatorEvidence(refs: readonly Reference[]): EvidenceRef[] {
  return refs.map((ref) => ({ kind: ref.kind.toLowerCase(), ref: ref.id }));
}

function authorizationCoversPlan(executionPlan: ExecutionPlanValue, authorization: AuthorizationContext): boolean {
  if (!authorization || authorization.disposition !== 'AUTHORIZED') return false;
  return executionPlan.expected_effects.every((expected) =>
    authorization.effect_constraints.some((constraint) =>
      constraint.effect === expected.effect && constraint.scope === expected.scope));
}

function authorityReferenceMatchesPlan(executionPlan: ExecutionPlanValue, authorization: AuthorizationContext): boolean {
  if (!authorization || typeof authorization.authority_reference !== 'string') return false;
  return executionPlan.authority_refs.some((ref) =>
    ref.kind === 'AUTHORITY' && ref.id === authorization.authority_reference);
}

function effectProfileKey(effects: readonly EffectDescriptor[]): string {
  return [...effects]
    .map(({ effect, scope }) => `${effect}\u0000${scope}`)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .join('\u0001');
}

interface LegacyExecutionLifecycleBoundary {
  inspectOperation(operationId: OperationId): unknown;
  ensureOperationRunning(operationId: OperationId): unknown;
  startAttempt(input: Readonly<{
    attemptId: ExecutionAttemptId;
    operationId: OperationId;
    authorityRefs: readonly Reference[];
  }>): unknown;
  markAttemptDispatched(attemptId: ExecutionAttemptId): unknown;
  markAttemptRunning(attemptId: ExecutionAttemptId): unknown;
  recordPreflightTerminal(input: Readonly<{
    attemptId: ExecutionAttemptId;
    operationId: OperationId;
    status: Exclude<RecipePreflight['status'], 'READY'>;
    receipt: RecipeReceiptValue;
    resultRefs: readonly Reference[];
  }>): Record<string, unknown>;
  recordExecutionOutcome(input: Readonly<{
    attemptId: ExecutionAttemptId;
    operationId: OperationId;
    coordinatorOutcome: ExecutionOutcome;
    receipt: RecipeReceiptValue;
    resultRefs: readonly Reference[];
  }>): Record<string, unknown>;
  inspectAttempt?(attemptId: ExecutionAttemptId): unknown;
}

function legacyExecutionLifecycleBoundary(value: unknown): ExecutionLifecycleCapability | null {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return null;
  const legacy = value as Partial<LegacyExecutionLifecycleBoundary>;
  const required = [
    'inspectOperation',
    'ensureOperationRunning',
    'startAttempt',
    'markAttemptDispatched',
    'markAttemptRunning',
    'recordPreflightTerminal',
    'recordExecutionOutcome',
  ] as const;
  if (required.some((name) => typeof legacy[name] !== 'function')) return null;

  return {
    observeOperation: (operationId) => legacy.inspectOperation!(operationId as OperationId) as any,
    observeAttemptPresence(attemptId) {
      if (typeof legacy.inspectAttempt !== 'function') return 'UNKNOWN';
      try {
        legacy.inspectAttempt(attemptId as ExecutionAttemptId);
        return 'PRESENT';
      } catch (error) {
        const message = errorMessage(error);
        if (message.includes(`missing ExecutionAttempt/${attemptId}`)) return 'ABSENT';
        return 'UNKNOWN';
      }
    },
    prepareAttempt(input) {
      legacy.ensureOperationRunning!(input.operationId);
      const started = legacy.startAttempt!(input);
      return {
        operation: legacy.inspectOperation!(input.operationId) as any,
        attempt: (typeof legacy.inspectAttempt === 'function'
          ? legacy.inspectAttempt(input.attemptId)
          : started) as any,
      };
    },
    confirmDispatchStart(attemptId) {
      legacy.markAttemptDispatched!(attemptId);
      const running = legacy.markAttemptRunning!(attemptId);
      return (typeof legacy.inspectAttempt === 'function'
        ? legacy.inspectAttempt(attemptId)
        : running) as any;
    },
    recordPreflightTerminalOutcome: (input) => legacy.recordPreflightTerminal!(input),
    recordExecutionOutcome: (input) => legacy.recordExecutionOutcome!(input),
  };
}

function resolveExecutionLifecycle(
  executionLifecycle: ExecutionLifecycleCapability | undefined,
  legacyBoundary: unknown,
): ExecutionLifecycleCapability {
  if (executionLifecycle !== undefined) {
    return requireExecutionLifecycleCapability(executionLifecycle);
  }
  if (legacyBoundary !== undefined) {
    try {
      return requireExecutionLifecycleCapability(legacyBoundary);
    } catch {
      const adapted = legacyExecutionLifecycleBoundary(legacyBoundary);
      if (adapted) return adapted;
    }
  }
  throw new TypeError('executionLifecycle is required');
}

export function createOperationalSpine({
  executionLifecycle,
  stateKernel,
  recipeRegistry,
  executionCoordinator,
  executionRecordStore,
}: OperationalSpineDependencies) {
  const lifecycle = resolveExecutionLifecycle(executionLifecycle, stateKernel);
  if (!recipeRegistry || typeof recipeRegistry.resolve !== 'function') throw new TypeError('recipeRegistry is required');
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
  }: PlanRequest): ExecutionPlanValue {
    const observed = lifecycle.observeOperation(operationId).aggregate;
    let executionPlan = materializeExecutionPlan({
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
      executionPlan = ExecutionPlan.parse({ ...executionPlan, expected_effects: expectedEffects });
    }
    executionRecordStore.savePlan(executionPlan);
    return executionPlan;
  }

  async function executePlan(rawPlan: ExecutionPlanInput, {
    executionAttemptId,
    authorization,
    harnessConformance,
    input,
    cancellationRequested = false,
  }: ExecutePlanRequest) {
    const executionPlan = ExecutionPlan.parse(rawPlan);
    const planRef = executionRecordStore.savePlan(executionPlan);

    if (executionPlan.resolution === 'SEMANTIC_ESCALATION_REQUIRED') {
      return {
        status: 'SEMANTIC_ESCALATION_REQUIRED' as const,
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    let executionEffects: EffectDescriptor[];
    try {
      executionEffects = typeof recipeRegistry.resolveEffects === 'function'
        ? recipeRegistry.resolveEffects(executionPlan.recipe.id, executionPlan.recipe.version, input)
        : executionPlan.expected_effects;
    } catch (error) {
      return {
        status: 'BLOCKED' as const,
        reason: `EFFECT_PROFILE_RESOLUTION_FAILED:${errorMessage(error)}`,
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (effectProfileKey(executionEffects) !== effectProfileKey(executionPlan.expected_effects)) {
      return {
        status: 'BLOCKED' as const,
        reason: 'EXECUTION_INPUT_EFFECT_PROFILE_MISMATCH',
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (cancellationRequested) {
      return {
        status: 'NO_START' as const,
        reason: 'CANCELLED_BEFORE_ATTEMPT',
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }

    if (!authorization || authorization.disposition !== 'AUTHORIZED') {
      return {
        status: 'BLOCKED' as const,
        reason: `AUTHORIZATION_${authorization?.disposition || 'MISSING'}`,
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }
    if (!authorityReferenceMatchesPlan(executionPlan, authorization)) {
      return {
        status: 'BLOCKED' as const,
        reason: 'AUTHORITY_REFERENCE_NOT_IN_PLAN',
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }
    if (!authorizationCoversPlan(executionPlan, authorization)) {
      return {
        status: 'BLOCKED' as const,
        reason: 'EFFECT_AUTHORIZATION_INCOMPLETE',
        plan: executionPlan,
        attempt: null,
        operation: lifecycle.observeOperation(executionPlan.operation_id),
        plan_ref: planRef,
      };
    }
    if (!harnessConformance || harnessConformance.disposition !== 'CONFORMING') {
      return {
        status: 'BLOCKED' as const,
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
    if (!preflight || typeof preflight.status !== 'string') throw new Error('recipe preflight returned a nonconformant result');
    if (!['READY', 'BLOCKED', 'UNAVAILABLE', 'CANCELLED'].includes(preflight.status)) {
      throw new Error(`unsupported recipe preflight status: ${(preflight as { status: string }).status}`);
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
      let receiptArtifactRef: Reference | null = null;
      try {
        receiptArtifactRef = executionRecordStore.saveReceipt(receipt);
      } catch {
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

    let coordinatorOutcome: ExecutionOutcome;
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
          output: errorDetails(error),
        }),
        evidence_refs: [],
      };
    }

    // Once dispatched, an outcome claiming no confirmed start cannot prove no effect occurred.
    if (!coordinatorOutcome || coordinatorOutcome.started !== true) {
      const original = coordinatorOutcome as ExecutionOutcome | undefined;
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

    let receipt: RecipeReceiptValue;
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
        output: errorDetails(error),
      });
      coordinatorOutcome = {
        operation_id: executionPlan.operation_id,
        execution_attempt_id: executionAttemptId,
        status: 'UNKNOWN',
        started: true,
        reason: receipt.reason!,
        result: receipt,
        evidence_refs: [],
      };
    }

    const expectedReceiptStatus: Partial<Record<ExecutionOutcome['status'], RecipeReceiptValue['status']>> = {
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

    let receiptArtifactRef: Reference | null = null;
    try {
      receiptArtifactRef = executionRecordStore.saveReceipt(receipt);
    } catch (error) {
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
        reason: receipt.reason!,
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
