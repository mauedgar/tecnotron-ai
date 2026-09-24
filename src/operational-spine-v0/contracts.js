'use strict';

const { z } = require('zod');
const {
  AuthorizationContext,
} = require('../contracts/execution-coordination');
const { referenceSchema } = require('../state-kernel-v0/contracts');

const NonEmpty = z.string().min(1);
const Capability = NonEmpty;

const RepositoryContext = z.object({
  identity: NonEmpty,
  location: NonEmpty,
}).strict();

const WorktreeContext = z.object({
  identity: NonEmpty,
  location: NonEmpty,
}).strict();

const GitContext = z.object({
  expected_ref: NonEmpty,
  expected_commit: z.string().regex(/^[a-f0-9]{40,64}$/),
}).strict();

const RuntimeContext = z.object({
  executor: NonEmpty,
  platform: NonEmpty,
  runtime_identity: NonEmpty,
}).strict();

const StateStoreContext = z.object({
  reference: NonEmpty,
  location: NonEmpty.optional(),
}).strict();

const ExecutionContext = z.object({
  schema_version: z.literal('tecnotron-execution-context/v0'),
  operation_id: NonEmpty,
  taskcycle_id: NonEmpty,
  repository: RepositoryContext,
  worktree: WorktreeContext.optional(),
  git: GitContext.optional(),
  runtime: RuntimeContext,
  state_store: StateStoreContext,
  authority_refs: z.array(referenceSchema).default([]),
  evidence_refs: z.array(referenceSchema).default([]),
}).strict();

const EffectDescriptor = z.object({
  effect: NonEmpty,
  scope: NonEmpty,
}).strict();

const RecipeDefinition = z.object({
  id: NonEmpty,
  version: NonEmpty,
  provides: z.array(Capability).min(1),
  required_inputs: z.array(NonEmpty).default([]),
  preconditions: z.array(NonEmpty).default([]),
  effects: z.array(EffectDescriptor).default([]),
  postconditions: z.array(NonEmpty).default([]),
}).strict();

const RecipeRequest = z.object({
  recipe_id: NonEmpty,
  recipe_version: NonEmpty,
  operation_id: NonEmpty,
  execution_attempt_id: NonEmpty,
  context: ExecutionContext,
  authorization: AuthorizationContext,
  evidence_refs: z.array(referenceSchema).default([]),
  input: z.unknown().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.operation_id !== value.context.operation_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['context', 'operation_id'],
      message: 'ExecutionContext operation_id must match RecipeRequest operation_id',
    });
  }
});

const RecipeReceiptStatus = z.enum([
  'PASS',
  'FAIL',
  'BLOCKED',
  'UNAVAILABLE',
  'CANCELLED',
  'UNKNOWN',
]);

const RecipeReceipt = z.object({
  schema_version: z.literal('tecnotron-recipe-receipt/v0'),
  receipt_ref: NonEmpty,
  recipe_id: NonEmpty,
  recipe_version: NonEmpty,
  operation_id: NonEmpty,
  execution_attempt_id: NonEmpty,
  status: RecipeReceiptStatus,
  effect_state: z.enum(['NONE', 'CONFIRMED', 'UNKNOWN']),
  reason: NonEmpty.optional(),
  output: z.unknown().optional(),
  result_refs: z.array(referenceSchema).default([]),
  evidence_refs: z.array(referenceSchema).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.status !== 'PASS' && !value.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: `${value.status} requires an explicit reason`,
    });
  }

  if (value.status === 'UNKNOWN' && value.effect_state !== 'UNKNOWN') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['effect_state'],
      message: 'UNKNOWN requires effect_state=UNKNOWN',
    });
  }

  if (value.effect_state === 'UNKNOWN' && value.status !== 'UNKNOWN') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'effect_state=UNKNOWN requires status=UNKNOWN',
    });
  }
});

const SelectedRecipe = z.object({
  id: NonEmpty,
  version: NonEmpty,
}).strict();

const SemanticEscalation = z.object({
  reason: z.enum([
    'NO_DETERMINISTIC_RECIPE',
    'AMBIGUOUS_DETERMINISTIC_RECIPE',
  ]),
  required_capabilities: z.array(Capability).min(1),
}).strict();

const ExecutionPlan = z.object({
  schema_version: z.literal('tecnotron-execution-plan/v0'),
  operation_id: NonEmpty,
  taskcycle_id: NonEmpty,
  resolution: z.enum([
    'DETERMINISTIC_RECIPE',
    'SEMANTIC_ESCALATION_REQUIRED',
  ]),
  required_capabilities: z.array(Capability).min(1),
  execution_context: ExecutionContext,
  recipe: SelectedRecipe.nullable(),
  expected_effects: z.array(EffectDescriptor),
  authority_refs: z.array(referenceSchema).default([]),
  evidence_refs: z.array(referenceSchema).default([]),
  semantic_escalation: SemanticEscalation.nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.operation_id !== value.execution_context.operation_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['execution_context', 'operation_id'],
      message: 'ExecutionPlan operation_id must match ExecutionContext operation_id',
    });
  }

  if (value.taskcycle_id !== value.execution_context.taskcycle_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['execution_context', 'taskcycle_id'],
      message: 'ExecutionPlan taskcycle_id must match ExecutionContext taskcycle_id',
    });
  }

  if (value.resolution === 'DETERMINISTIC_RECIPE') {
    if (!value.recipe) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipe'],
        message: 'deterministic resolution requires a recipe',
      });
    }
    if (value.semantic_escalation !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['semantic_escalation'],
        message: 'deterministic resolution cannot contain semantic escalation',
      });
    }
  } else {
    if (value.recipe !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipe'],
        message: 'semantic escalation cannot select a recipe',
      });
    }
    if (!value.semantic_escalation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['semantic_escalation'],
        message: 'semantic escalation requires an explicit reason',
      });
    }
  }
});

module.exports = {
  Capability,
  RepositoryContext,
  WorktreeContext,
  GitContext,
  RuntimeContext,
  StateStoreContext,
  ExecutionContext,
  EffectDescriptor,
  RecipeDefinition,
  RecipeRequest,
  RecipeReceiptStatus,
  RecipeReceipt,
  SelectedRecipe,
  SemanticEscalation,
  ExecutionPlan,
};
