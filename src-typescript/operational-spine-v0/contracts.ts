import { z } from 'zod';
import {
  AuthorizationContext,
} from '../contracts/execution-coordination';

const NonEmpty = z.string().min(1);

export type Reference = {
  kind: 'AUTHORITY' | 'EVIDENCE' | 'ARTIFACT' | 'GIT_OBJECT';
  id: string;
  location?: string | undefined;
  sha256?: string | undefined;
  git_oid?: string | undefined;
};
export const ReferenceSchema: z.ZodType<Reference> = z.object({
  kind: z.enum(['AUTHORITY', 'EVIDENCE', 'ARTIFACT', 'GIT_OBJECT']),
  id: NonEmpty,
  location: NonEmpty.optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  git_oid: z.string().regex(/^[a-f0-9]{40,64}$/).optional(),
}).strict();
const OperationIdSchema = z.string().min(1).brand<'OperationId'>();
const ExecutionAttemptIdSchema = z.string().min(1).brand<'ExecutionAttemptId'>();

export const Capability = NonEmpty;
export type Capability = z.output<typeof Capability>;

export const RepositoryContext = z.object({ identity: NonEmpty, location: NonEmpty }).strict();
export type RepositoryContext = z.output<typeof RepositoryContext>;

export const WorktreeContext = z.object({ identity: NonEmpty, location: NonEmpty }).strict();
export type WorktreeContext = z.output<typeof WorktreeContext>;

export const GitContext = z.object({
  expected_ref: NonEmpty,
  expected_commit: z.string().regex(/^[a-f0-9]{40,64}$/),
}).strict();
export type GitContext = z.output<typeof GitContext>;

export const RuntimeContext = z.object({
  executor: NonEmpty,
  platform: NonEmpty,
  runtime_identity: NonEmpty,
}).strict();
export type RuntimeContext = z.output<typeof RuntimeContext>;

export const StateStoreContext = z.object({
  reference: NonEmpty,
  location: NonEmpty.optional(),
}).strict();
export type StateStoreContext = z.output<typeof StateStoreContext>;

export const ExecutionContext = z.object({
  schema_version: z.literal('tecnotron-execution-context/v0'),
  operation_id: OperationIdSchema,
  taskcycle_id: NonEmpty,
  repository: RepositoryContext,
  worktree: WorktreeContext.optional(),
  git: GitContext.optional(),
  runtime: RuntimeContext,
  state_store: StateStoreContext,
  authority_refs: z.array(ReferenceSchema).default([]),
  evidence_refs: z.array(ReferenceSchema).default([]),
}).strict();
export type ExecutionContext = z.output<typeof ExecutionContext>;
export type ExecutionContextInput = z.input<typeof ExecutionContext>;

export const EffectDescriptor = z.object({ effect: NonEmpty, scope: NonEmpty }).strict();
export type EffectDescriptor = z.output<typeof EffectDescriptor>;

export const RecipeDefinition = z.object({
  id: NonEmpty,
  version: NonEmpty,
  provides: z.array(Capability).min(1),
  required_inputs: z.array(NonEmpty).default([]),
  preconditions: z.array(NonEmpty).default([]),
  effects: z.array(EffectDescriptor).default([]),
  postconditions: z.array(NonEmpty).default([]),
}).strict();
export type RecipeDefinition = z.output<typeof RecipeDefinition>;
export type RecipeDefinitionInput = z.input<typeof RecipeDefinition>;

export const RecipeRequest = z.object({
  recipe_id: NonEmpty,
  recipe_version: NonEmpty,
  operation_id: OperationIdSchema,
  execution_attempt_id: ExecutionAttemptIdSchema,
  context: ExecutionContext,
  authorization: AuthorizationContext,
  evidence_refs: z.array(ReferenceSchema).default([]),
  preflight_handoff: z.unknown().optional(),
  input: z.unknown().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.operation_id !== value.context.operation_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['context', 'operation_id'],
      message: 'ExecutionContext operation_id must match RecipeRequest operation_id',
    });
  }
});
export type RecipeRequest = z.output<typeof RecipeRequest>;
export type RecipeRequestInput = z.input<typeof RecipeRequest>;

export const RecipeReceiptStatus = z.enum(['PASS', 'FAIL', 'BLOCKED', 'UNAVAILABLE', 'CANCELLED', 'UNKNOWN']);
export type RecipeReceiptStatus = z.output<typeof RecipeReceiptStatus>;

const RecipeReceiptSchema = z.object({
  schema_version: z.literal('tecnotron-recipe-receipt/v0'),
  receipt_ref: NonEmpty,
  recipe_id: NonEmpty,
  recipe_version: NonEmpty,
  operation_id: OperationIdSchema,
  execution_attempt_id: ExecutionAttemptIdSchema,
  status: RecipeReceiptStatus,
  effect_state: z.enum(['NONE', 'CONFIRMED', 'UNKNOWN']),
  reason: NonEmpty.optional(),
  output: z.unknown().optional(),
  result_refs: z.array(ReferenceSchema).default([]),
  evidence_refs: z.array(ReferenceSchema).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.status !== 'PASS' && !value.reason) {
    ctx.addIssue({ code: 'custom', path: ['reason'], message: `${value.status} requires an explicit reason` });
  }
  if (value.status === 'UNKNOWN' && value.effect_state !== 'UNKNOWN') {
    ctx.addIssue({ code: 'custom', path: ['effect_state'], message: 'UNKNOWN requires effect_state=UNKNOWN' });
  }
  if (value.effect_state === 'UNKNOWN' && value.status !== 'UNKNOWN') {
    ctx.addIssue({ code: 'custom', path: ['status'], message: 'effect_state=UNKNOWN requires status=UNKNOWN' });
  }
});

type ReceiptShape = z.output<typeof RecipeReceiptSchema>;
type ReceiptCommon = Omit<ReceiptShape, 'status' | 'effect_state' | 'reason'>;
export type RecipeReceipt =
  | (ReceiptCommon & { status: 'PASS'; effect_state: 'NONE' | 'CONFIRMED'; reason?: string })
  | (ReceiptCommon & { status: 'FAIL' | 'BLOCKED' | 'UNAVAILABLE' | 'CANCELLED'; effect_state: 'NONE' | 'CONFIRMED'; reason: string })
  | (ReceiptCommon & { status: 'UNKNOWN'; effect_state: 'UNKNOWN'; reason: string });
export type RecipeReceiptInput = z.input<typeof RecipeReceiptSchema>;
export const RecipeReceipt = RecipeReceiptSchema as z.ZodType<RecipeReceipt, RecipeReceiptInput>;

export const SelectedRecipe = z.object({ id: NonEmpty, version: NonEmpty }).strict();
export type SelectedRecipe = z.output<typeof SelectedRecipe>;

export const SemanticEscalation = z.object({
  reason: z.enum(['NO_DETERMINISTIC_RECIPE', 'AMBIGUOUS_DETERMINISTIC_RECIPE']),
  required_capabilities: z.array(Capability).min(1),
}).strict();
export type SemanticEscalation = z.output<typeof SemanticEscalation>;

const ExecutionPlanSchema = z.object({
  schema_version: z.literal('tecnotron-execution-plan/v0'),
  operation_id: OperationIdSchema,
  taskcycle_id: NonEmpty,
  resolution: z.enum(['DETERMINISTIC_RECIPE', 'SEMANTIC_ESCALATION_REQUIRED']),
  required_capabilities: z.array(Capability).min(1),
  execution_context: ExecutionContext,
  recipe: SelectedRecipe.nullable(),
  expected_effects: z.array(EffectDescriptor),
  authority_refs: z.array(ReferenceSchema).default([]),
  evidence_refs: z.array(ReferenceSchema).default([]),
  semantic_escalation: SemanticEscalation.nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.operation_id !== value.execution_context.operation_id) {
    ctx.addIssue({ code: 'custom', path: ['execution_context', 'operation_id'], message: 'ExecutionPlan operation_id must match ExecutionContext operation_id' });
  }
  if (value.taskcycle_id !== value.execution_context.taskcycle_id) {
    ctx.addIssue({ code: 'custom', path: ['execution_context', 'taskcycle_id'], message: 'ExecutionPlan taskcycle_id must match ExecutionContext taskcycle_id' });
  }
  if (value.resolution === 'DETERMINISTIC_RECIPE') {
    if (!value.recipe) ctx.addIssue({ code: 'custom', path: ['recipe'], message: 'deterministic resolution requires a recipe' });
    if (value.semantic_escalation !== null) ctx.addIssue({ code: 'custom', path: ['semantic_escalation'], message: 'deterministic resolution cannot contain semantic escalation' });
  } else {
    if (value.recipe !== null) ctx.addIssue({ code: 'custom', path: ['recipe'], message: 'semantic escalation cannot select a recipe' });
    if (!value.semantic_escalation) ctx.addIssue({ code: 'custom', path: ['semantic_escalation'], message: 'semantic escalation requires an explicit reason' });
  }
});

type PlanShape = z.output<typeof ExecutionPlanSchema>;
type PlanCommon = Omit<PlanShape, 'resolution' | 'recipe' | 'semantic_escalation'>;
export type DeterministicExecutionPlan = PlanCommon & {
  resolution: 'DETERMINISTIC_RECIPE';
  recipe: SelectedRecipe;
  semantic_escalation: null;
};
export type SemanticEscalationExecutionPlan = PlanCommon & {
  resolution: 'SEMANTIC_ESCALATION_REQUIRED';
  recipe: null;
  semantic_escalation: SemanticEscalation;
};
export type ExecutionPlan = DeterministicExecutionPlan | SemanticEscalationExecutionPlan;
export type ExecutionPlanInput = z.input<typeof ExecutionPlanSchema>;
export const ExecutionPlan = ExecutionPlanSchema as z.ZodType<ExecutionPlan, ExecutionPlanInput>;
