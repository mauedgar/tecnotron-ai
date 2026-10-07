import {
  ExecutionContext,
  ExecutionPlan,
  type Capability,
  type ExecutionContextInput,
  type ExecutionPlan as ExecutionPlanValue,
  type Reference,
} from './contracts';
import type { OperationId } from '../contracts/execution-coordination';
import type { RecipeRegistryPort } from './recipe-registry';

export interface OperationAggregate {
  readonly kind: 'Operation';
  readonly id: OperationId;
  readonly taskcycle_id: string;
  readonly [key: string]: unknown;
}

export function sameReference(left: Reference | undefined, right: Reference | undefined): boolean {
  return ['kind', 'id', 'location', 'sha256', 'git_oid']
    .every((field) => left?.[field as keyof Reference] === right?.[field as keyof Reference]);
}

export function resolvePlanReferences(
  contextRefs: readonly Reference[],
  requestedRefs: readonly Reference[] | undefined,
  label: string,
): readonly Reference[] {
  const requested = requestedRefs === undefined ? contextRefs : requestedRefs;
  if (!Array.isArray(requested)) throw new TypeError(`${label} must be an array`);
  for (const ref of requested) {
    if (!contextRefs.some((candidate) => sameReference(candidate, ref))) {
      throw new Error(`${label} contains a reference not present in ExecutionContext: ${ref.id}`);
    }
  }
  return requested;
}

export interface MaterializeExecutionPlanInput {
  readonly operation: OperationAggregate;
  readonly executionContext: ExecutionContextInput;
  readonly requiredCapabilities: readonly Capability[];
  readonly recipeRegistry: Pick<RecipeRegistryPort, 'resolve'>;
  readonly authorityRefs?: readonly Reference[];
  readonly evidenceRefs?: readonly Reference[];
}

export function materializeExecutionPlan({
  operation,
  executionContext,
  requiredCapabilities,
  recipeRegistry,
  authorityRefs,
  evidenceRefs,
}: MaterializeExecutionPlanInput): ExecutionPlanValue {
  const context = ExecutionContext.parse(executionContext);
  if (!operation || operation.kind !== 'Operation') throw new TypeError('an Operation aggregate is required');
  if (operation.id !== context.operation_id) throw new Error('ExecutionContext operation_id does not match durable Operation');
  if (operation.taskcycle_id !== context.taskcycle_id) throw new Error('ExecutionContext taskcycle_id does not match durable Operation');
  if (!Array.isArray(requiredCapabilities) || requiredCapabilities.length === 0) {
    throw new TypeError('requiredCapabilities must be a non-empty array');
  }

  const capabilities = [...new Set(requiredCapabilities)].sort();
  const planAuthorityRefs = resolvePlanReferences(context.authority_refs, authorityRefs, 'authorityRefs');
  const planEvidenceRefs = resolvePlanReferences(context.evidence_refs, evidenceRefs, 'evidenceRefs');
  const resolution = recipeRegistry.resolve(capabilities);

  if (resolution.resolution === 'SELECTED') {
    return ExecutionPlan.parse({
      schema_version: 'tecnotron-execution-plan/v0',
      operation_id: operation.id,
      taskcycle_id: operation.taskcycle_id,
      resolution: 'DETERMINISTIC_RECIPE',
      required_capabilities: capabilities,
      execution_context: context,
      recipe: { id: resolution.recipe.id, version: resolution.recipe.version },
      expected_effects: resolution.recipe.effects,
      authority_refs: planAuthorityRefs,
      evidence_refs: planEvidenceRefs,
      semantic_escalation: null,
    });
  }

  return ExecutionPlan.parse({
    schema_version: 'tecnotron-execution-plan/v0',
    operation_id: operation.id,
    taskcycle_id: operation.taskcycle_id,
    resolution: 'SEMANTIC_ESCALATION_REQUIRED',
    required_capabilities: capabilities,
    execution_context: context,
    recipe: null,
    expected_effects: [],
    authority_refs: planAuthorityRefs,
    evidence_refs: planEvidenceRefs,
    semantic_escalation: {
      reason: resolution.resolution === 'AMBIGUOUS'
        ? 'AMBIGUOUS_DETERMINISTIC_RECIPE'
        : 'NO_DETERMINISTIC_RECIPE',
      required_capabilities: capabilities,
    },
  });
}
