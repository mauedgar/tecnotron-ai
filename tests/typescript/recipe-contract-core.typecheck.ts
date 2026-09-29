import {
  ExecutionAttemptRequest,
  ExecutionOutcome,
  type AuthorizationContext,
  type EvidenceRef,
  type ExecutionAttemptId,
  type OperationId,
  type ResolvedExecution,
} from '../../src-typescript/contracts/execution-coordination';
import {
  ExecutionPlan,
  RecipeReceipt,
  type ExecutionPlan as ExecutionPlanValue,
  type RecipeRequest,
  type RecipeReceipt as RecipeReceiptValue,
  type Reference,
} from '../../src-typescript/operational-spine-v0/contracts';
import type { ExecutionOutcome as PublicExecutionOutcome } from '../../src/contracts';
import contracts from '../../src/contracts';
import type { StateKernelPort } from '../../src-typescript/operational-spine-v0/core';

const request = ExecutionAttemptRequest.parse({
  operation_id: 'OP-001',
  execution_attempt_id: 'ATTEMPT-001',
  resolved_execution: { decision_ref: 'decision:1', actor_id: 'actor:1', runtime_id: 'runtime:1' },
  authorization: {
    disposition: 'AUTHORIZED',
    authority_reference: 'authority:1',
    effect_constraints: [{ effect: 'repository_write', scope: 'candidate-only' }],
  },
  harness_conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:1' },
});

const operationId: OperationId = request.operation_id;
const attemptId: ExecutionAttemptId = request.execution_attempt_id;
const publicOutcome: PublicExecutionOutcome = ExecutionOutcome.parse({
  operation_id: operationId,
  execution_attempt_id: attemptId,
  status: 'SUCCESS',
  started: true,
});
contracts.ExecutionOutcome.parse(publicOutcome);
declare const stateKernelPort: StateKernelPort;
stateKernelPort.inspectOperation(operationId);
// @ts-expect-error State Kernel operation lookups cannot accept attempt identities.
stateKernelPort.inspectOperation(attemptId);
// @ts-expect-error Operation and attempt identities are nominally distinct.
const wrongAttempt: ExecutionAttemptId = operationId;

declare const resolvedExecution: ResolvedExecution;
// @ts-expect-error Resolution identity is not observed runtime evidence.
const observedEvidence: EvidenceRef = resolvedExecution;

declare const authorityReference: Reference;
// @ts-expect-error A semantic authority reference is not execution authorization.
const executionAuthorization: AuthorizationContext = authorityReference;

function narrowOutcome(outcome: ReturnType<typeof ExecutionOutcome.parse>): boolean {
  if (outcome.status === 'UNKNOWN') return outcome.started && outcome.reason.length > 0;
  if (outcome.status === 'NO_START') return outcome.started === false;
  if (outcome.status === 'FAILED') return typeof outcome.started === 'boolean';
  return true;
}

narrowOutcome(ExecutionOutcome.parse({
  operation_id: operationId,
  execution_attempt_id: attemptId,
  status: 'FAILED',
  started: false,
  reason: 'FAILED_BEFORE_CONFIRMED_START',
}));
narrowOutcome(ExecutionOutcome.parse({
  operation_id: operationId,
  execution_attempt_id: attemptId,
  status: 'FAILED',
  started: true,
  reason: 'FAILED_AFTER_START',
}));

// @ts-expect-error UNKNOWN is necessarily post-start.
const impossibleOutcome: ReturnType<typeof ExecutionOutcome.parse> = { operation_id: operationId, execution_attempt_id: attemptId, status: 'UNKNOWN', started: false, reason: 'ambiguous', evidence_refs: [] };

function narrowReceipt(receipt: RecipeReceiptValue): boolean {
  if (receipt.status === 'UNKNOWN') {
    return receipt.effect_state === 'UNKNOWN' && receipt.reason.length > 0;
  }
  const knownEffect: 'NONE' | 'CONFIRMED' = receipt.effect_state;
  return knownEffect.length > 0;
}

narrowReceipt(RecipeReceipt.parse({
  schema_version: 'tecnotron-recipe-receipt/v0',
  receipt_ref: 'receipt:1',
  recipe_id: 'recipe:1',
  recipe_version: 'v1',
  operation_id: operationId,
  execution_attempt_id: attemptId,
  status: 'UNKNOWN',
  effect_state: 'UNKNOWN',
  reason: 'effect ambiguous',
}));

// @ts-expect-error UNKNOWN receipts cannot claim a known effect state.
const impossibleReceipt: RecipeReceiptValue = { schema_version: 'tecnotron-recipe-receipt/v0', receipt_ref: 'receipt:2', recipe_id: 'recipe:1', recipe_version: 'v1', operation_id: operationId, execution_attempt_id: attemptId, status: 'UNKNOWN', effect_state: 'NONE', reason: 'invalid', result_refs: [], evidence_refs: [] };

// @ts-expect-error A parsed execution request is not a Recipe receipt.
const requestAsReceipt: RecipeReceiptValue = request;
declare const recipeRequest: RecipeRequest;
// @ts-expect-error A Recipe request is not a Recipe receipt.
const recipeRequestAsReceipt: RecipeReceiptValue = recipeRequest;

function narrowPlan(plan: ExecutionPlanValue): string {
  return plan.resolution === 'DETERMINISTIC_RECIPE'
    ? plan.recipe.id
    : plan.semantic_escalation.reason;
}

const context = {
  schema_version: 'tecnotron-execution-context/v0' as const,
  operation_id: operationId,
  taskcycle_id: 'TC-001',
  repository: { identity: 'repo:1', location: 'C:/repo' },
  runtime: { executor: 'node', platform: 'win32', runtime_identity: 'runtime:1' },
  state_store: { reference: 'state:1' },
};
narrowPlan(ExecutionPlan.parse({
  schema_version: 'tecnotron-execution-plan/v0',
  operation_id: operationId,
  taskcycle_id: 'TC-001',
  resolution: 'DETERMINISTIC_RECIPE',
  required_capabilities: ['render'],
  execution_context: context,
  recipe: { id: 'recipe:1', version: 'v1' },
  expected_effects: [],
  semantic_escalation: null,
}));

// @ts-expect-error Deterministic plans require a selected recipe.
const impossiblePlan: ExecutionPlanValue = { schema_version: 'tecnotron-execution-plan/v0', operation_id: operationId, taskcycle_id: 'TC-001', resolution: 'DETERMINISTIC_RECIPE', required_capabilities: ['render'], execution_context: { ...context, authority_refs: [], evidence_refs: [] }, recipe: null, expected_effects: [], authority_refs: [], evidence_refs: [], semantic_escalation: null };
