"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionPlan = exports.SemanticEscalation = exports.SelectedRecipe = exports.RecipeReceipt = exports.RecipeReceiptStatus = exports.RecipeRequest = exports.RecipeDefinition = exports.EffectDescriptor = exports.ExecutionContext = exports.StateStoreContext = exports.RuntimeContext = exports.GitContext = exports.WorktreeContext = exports.RepositoryContext = exports.Capability = void 0;
const zod_1 = require("zod");
const execution_coordination_1 = require("../contracts/execution-coordination");
const { referenceSchema } = require('../state-kernel-v0/contracts');
const NonEmpty = zod_1.z.string().min(1);
const OperationIdSchema = zod_1.z.string().min(1).brand();
const ExecutionAttemptIdSchema = zod_1.z.string().min(1).brand();
exports.Capability = NonEmpty;
exports.RepositoryContext = zod_1.z.object({ identity: NonEmpty, location: NonEmpty }).strict();
exports.WorktreeContext = zod_1.z.object({ identity: NonEmpty, location: NonEmpty }).strict();
exports.GitContext = zod_1.z.object({
    expected_ref: NonEmpty,
    expected_commit: zod_1.z.string().regex(/^[a-f0-9]{40,64}$/),
}).strict();
exports.RuntimeContext = zod_1.z.object({
    executor: NonEmpty,
    platform: NonEmpty,
    runtime_identity: NonEmpty,
}).strict();
exports.StateStoreContext = zod_1.z.object({
    reference: NonEmpty,
    location: NonEmpty.optional(),
}).strict();
exports.ExecutionContext = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-execution-context/v0'),
    operation_id: OperationIdSchema,
    taskcycle_id: NonEmpty,
    repository: exports.RepositoryContext,
    worktree: exports.WorktreeContext.optional(),
    git: exports.GitContext.optional(),
    runtime: exports.RuntimeContext,
    state_store: exports.StateStoreContext,
    authority_refs: zod_1.z.array(referenceSchema).default([]),
    evidence_refs: zod_1.z.array(referenceSchema).default([]),
}).strict();
exports.EffectDescriptor = zod_1.z.object({ effect: NonEmpty, scope: NonEmpty }).strict();
exports.RecipeDefinition = zod_1.z.object({
    id: NonEmpty,
    version: NonEmpty,
    provides: zod_1.z.array(exports.Capability).min(1),
    required_inputs: zod_1.z.array(NonEmpty).default([]),
    preconditions: zod_1.z.array(NonEmpty).default([]),
    effects: zod_1.z.array(exports.EffectDescriptor).default([]),
    postconditions: zod_1.z.array(NonEmpty).default([]),
}).strict();
exports.RecipeRequest = zod_1.z.object({
    recipe_id: NonEmpty,
    recipe_version: NonEmpty,
    operation_id: OperationIdSchema,
    execution_attempt_id: ExecutionAttemptIdSchema,
    context: exports.ExecutionContext,
    authorization: execution_coordination_1.AuthorizationContext,
    evidence_refs: zod_1.z.array(referenceSchema).default([]),
    preflight_handoff: zod_1.z.unknown().optional(),
    input: zod_1.z.unknown().optional(),
}).strict().superRefine((value, ctx) => {
    if (value.operation_id !== value.context.operation_id) {
        ctx.addIssue({
            code: 'custom',
            path: ['context', 'operation_id'],
            message: 'ExecutionContext operation_id must match RecipeRequest operation_id',
        });
    }
});
exports.RecipeReceiptStatus = zod_1.z.enum(['PASS', 'FAIL', 'BLOCKED', 'UNAVAILABLE', 'CANCELLED', 'UNKNOWN']);
const RecipeReceiptSchema = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-recipe-receipt/v0'),
    receipt_ref: NonEmpty,
    recipe_id: NonEmpty,
    recipe_version: NonEmpty,
    operation_id: OperationIdSchema,
    execution_attempt_id: ExecutionAttemptIdSchema,
    status: exports.RecipeReceiptStatus,
    effect_state: zod_1.z.enum(['NONE', 'CONFIRMED', 'UNKNOWN']),
    reason: NonEmpty.optional(),
    output: zod_1.z.unknown().optional(),
    result_refs: zod_1.z.array(referenceSchema).default([]),
    evidence_refs: zod_1.z.array(referenceSchema).default([]),
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
exports.RecipeReceipt = RecipeReceiptSchema;
exports.SelectedRecipe = zod_1.z.object({ id: NonEmpty, version: NonEmpty }).strict();
exports.SemanticEscalation = zod_1.z.object({
    reason: zod_1.z.enum(['NO_DETERMINISTIC_RECIPE', 'AMBIGUOUS_DETERMINISTIC_RECIPE']),
    required_capabilities: zod_1.z.array(exports.Capability).min(1),
}).strict();
const ExecutionPlanSchema = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-execution-plan/v0'),
    operation_id: OperationIdSchema,
    taskcycle_id: NonEmpty,
    resolution: zod_1.z.enum(['DETERMINISTIC_RECIPE', 'SEMANTIC_ESCALATION_REQUIRED']),
    required_capabilities: zod_1.z.array(exports.Capability).min(1),
    execution_context: exports.ExecutionContext,
    recipe: exports.SelectedRecipe.nullable(),
    expected_effects: zod_1.z.array(exports.EffectDescriptor),
    authority_refs: zod_1.z.array(referenceSchema).default([]),
    evidence_refs: zod_1.z.array(referenceSchema).default([]),
    semantic_escalation: exports.SemanticEscalation.nullable(),
}).strict().superRefine((value, ctx) => {
    if (value.operation_id !== value.execution_context.operation_id) {
        ctx.addIssue({ code: 'custom', path: ['execution_context', 'operation_id'], message: 'ExecutionPlan operation_id must match ExecutionContext operation_id' });
    }
    if (value.taskcycle_id !== value.execution_context.taskcycle_id) {
        ctx.addIssue({ code: 'custom', path: ['execution_context', 'taskcycle_id'], message: 'ExecutionPlan taskcycle_id must match ExecutionContext taskcycle_id' });
    }
    if (value.resolution === 'DETERMINISTIC_RECIPE') {
        if (!value.recipe)
            ctx.addIssue({ code: 'custom', path: ['recipe'], message: 'deterministic resolution requires a recipe' });
        if (value.semantic_escalation !== null)
            ctx.addIssue({ code: 'custom', path: ['semantic_escalation'], message: 'deterministic resolution cannot contain semantic escalation' });
    }
    else {
        if (value.recipe !== null)
            ctx.addIssue({ code: 'custom', path: ['recipe'], message: 'semantic escalation cannot select a recipe' });
        if (!value.semantic_escalation)
            ctx.addIssue({ code: 'custom', path: ['semantic_escalation'], message: 'semantic escalation requires an explicit reason' });
    }
});
exports.ExecutionPlan = ExecutionPlanSchema;
