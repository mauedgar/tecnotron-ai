import { z } from 'zod';
export type Reference = {
    kind: 'AUTHORITY' | 'EVIDENCE' | 'ARTIFACT' | 'GIT_OBJECT';
    id: string;
    location?: string | undefined;
    sha256?: string | undefined;
    git_oid?: string | undefined;
};
export declare const ReferenceSchema: z.ZodType<Reference>;
export declare const Capability: z.ZodString;
export type Capability = z.output<typeof Capability>;
export declare const RepositoryContext: z.ZodObject<{
    identity: z.ZodString;
    location: z.ZodString;
}, z.core.$strict>;
export type RepositoryContext = z.output<typeof RepositoryContext>;
export declare const WorktreeContext: z.ZodObject<{
    identity: z.ZodString;
    location: z.ZodString;
}, z.core.$strict>;
export type WorktreeContext = z.output<typeof WorktreeContext>;
export declare const GitContext: z.ZodObject<{
    expected_ref: z.ZodString;
    expected_commit: z.ZodString;
}, z.core.$strict>;
export type GitContext = z.output<typeof GitContext>;
export declare const RuntimeContext: z.ZodObject<{
    executor: z.ZodString;
    platform: z.ZodString;
    runtime_identity: z.ZodString;
}, z.core.$strict>;
export type RuntimeContext = z.output<typeof RuntimeContext>;
export declare const StateStoreContext: z.ZodObject<{
    reference: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type StateStoreContext = z.output<typeof StateStoreContext>;
export declare const ExecutionContext: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-execution-context/v0">;
    operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
    taskcycle_id: z.ZodString;
    repository: z.ZodObject<{
        identity: z.ZodString;
        location: z.ZodString;
    }, z.core.$strict>;
    worktree: z.ZodOptional<z.ZodObject<{
        identity: z.ZodString;
        location: z.ZodString;
    }, z.core.$strict>>;
    git: z.ZodOptional<z.ZodObject<{
        expected_ref: z.ZodString;
        expected_commit: z.ZodString;
    }, z.core.$strict>>;
    runtime: z.ZodObject<{
        executor: z.ZodString;
        platform: z.ZodString;
        runtime_identity: z.ZodString;
    }, z.core.$strict>;
    state_store: z.ZodObject<{
        reference: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    authority_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
}, z.core.$strict>;
export type ExecutionContext = z.output<typeof ExecutionContext>;
export type ExecutionContextInput = z.input<typeof ExecutionContext>;
export declare const EffectDescriptor: z.ZodObject<{
    effect: z.ZodString;
    scope: z.ZodString;
}, z.core.$strict>;
export type EffectDescriptor = z.output<typeof EffectDescriptor>;
export declare const RecipeDefinition: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    provides: z.ZodArray<z.ZodString>;
    required_inputs: z.ZodDefault<z.ZodArray<z.ZodString>>;
    preconditions: z.ZodDefault<z.ZodArray<z.ZodString>>;
    effects: z.ZodDefault<z.ZodArray<z.ZodObject<{
        effect: z.ZodString;
        scope: z.ZodString;
    }, z.core.$strict>>>;
    postconditions: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export type RecipeDefinition = z.output<typeof RecipeDefinition>;
export type RecipeDefinitionInput = z.input<typeof RecipeDefinition>;
export declare const RecipeRequest: z.ZodObject<{
    recipe_id: z.ZodString;
    recipe_version: z.ZodString;
    operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
    execution_attempt_id: z.core.$ZodBranded<z.ZodString, "ExecutionAttemptId", "out">;
    context: z.ZodObject<{
        schema_version: z.ZodLiteral<"tecnotron-execution-context/v0">;
        operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
        taskcycle_id: z.ZodString;
        repository: z.ZodObject<{
            identity: z.ZodString;
            location: z.ZodString;
        }, z.core.$strict>;
        worktree: z.ZodOptional<z.ZodObject<{
            identity: z.ZodString;
            location: z.ZodString;
        }, z.core.$strict>>;
        git: z.ZodOptional<z.ZodObject<{
            expected_ref: z.ZodString;
            expected_commit: z.ZodString;
        }, z.core.$strict>>;
        runtime: z.ZodObject<{
            executor: z.ZodString;
            platform: z.ZodString;
            runtime_identity: z.ZodString;
        }, z.core.$strict>;
        state_store: z.ZodObject<{
            reference: z.ZodString;
            location: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        authority_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
        evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    }, z.core.$strict>;
    authorization: z.ZodObject<{
        disposition: z.ZodEnum<{
            AUTHORIZED: "AUTHORIZED";
            DENIED: "DENIED";
            UNKNOWN: "UNKNOWN";
        }>;
        authority_reference: z.ZodString;
        effect_constraints: z.ZodArray<z.ZodObject<{
            effect: z.ZodString;
            scope: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    preflight_handoff: z.ZodOptional<z.ZodUnknown>;
    input: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strict>;
export type RecipeRequest = z.output<typeof RecipeRequest>;
export type RecipeRequestInput = z.input<typeof RecipeRequest>;
export declare const RecipeReceiptStatus: z.ZodEnum<{
    BLOCKED: "BLOCKED";
    CANCELLED: "CANCELLED";
    FAIL: "FAIL";
    PASS: "PASS";
    UNAVAILABLE: "UNAVAILABLE";
    UNKNOWN: "UNKNOWN";
}>;
export type RecipeReceiptStatus = z.output<typeof RecipeReceiptStatus>;
declare const RecipeReceiptSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-recipe-receipt/v0">;
    receipt_ref: z.ZodString;
    recipe_id: z.ZodString;
    recipe_version: z.ZodString;
    operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
    execution_attempt_id: z.core.$ZodBranded<z.ZodString, "ExecutionAttemptId", "out">;
    status: z.ZodEnum<{
        BLOCKED: "BLOCKED";
        CANCELLED: "CANCELLED";
        FAIL: "FAIL";
        PASS: "PASS";
        UNAVAILABLE: "UNAVAILABLE";
        UNKNOWN: "UNKNOWN";
    }>;
    effect_state: z.ZodEnum<{
        CONFIRMED: "CONFIRMED";
        NONE: "NONE";
        UNKNOWN: "UNKNOWN";
    }>;
    reason: z.ZodOptional<z.ZodString>;
    output: z.ZodOptional<z.ZodUnknown>;
    result_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
}, z.core.$strict>;
type ReceiptShape = z.output<typeof RecipeReceiptSchema>;
type ReceiptCommon = Omit<ReceiptShape, 'status' | 'effect_state' | 'reason'>;
export type RecipeReceipt = (ReceiptCommon & {
    status: 'PASS';
    effect_state: 'NONE' | 'CONFIRMED';
    reason?: string;
}) | (ReceiptCommon & {
    status: 'FAIL' | 'BLOCKED' | 'UNAVAILABLE' | 'CANCELLED';
    effect_state: 'NONE' | 'CONFIRMED';
    reason: string;
}) | (ReceiptCommon & {
    status: 'UNKNOWN';
    effect_state: 'UNKNOWN';
    reason: string;
});
export type RecipeReceiptInput = z.input<typeof RecipeReceiptSchema>;
export declare const RecipeReceipt: z.ZodType<RecipeReceipt, RecipeReceiptInput>;
export declare const SelectedRecipe: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strict>;
export type SelectedRecipe = z.output<typeof SelectedRecipe>;
export declare const SemanticEscalation: z.ZodObject<{
    reason: z.ZodEnum<{
        AMBIGUOUS_DETERMINISTIC_RECIPE: "AMBIGUOUS_DETERMINISTIC_RECIPE";
        NO_DETERMINISTIC_RECIPE: "NO_DETERMINISTIC_RECIPE";
    }>;
    required_capabilities: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type SemanticEscalation = z.output<typeof SemanticEscalation>;
declare const ExecutionPlanSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<"tecnotron-execution-plan/v0">;
    operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
    taskcycle_id: z.ZodString;
    resolution: z.ZodEnum<{
        DETERMINISTIC_RECIPE: "DETERMINISTIC_RECIPE";
        SEMANTIC_ESCALATION_REQUIRED: "SEMANTIC_ESCALATION_REQUIRED";
    }>;
    required_capabilities: z.ZodArray<z.ZodString>;
    execution_context: z.ZodObject<{
        schema_version: z.ZodLiteral<"tecnotron-execution-context/v0">;
        operation_id: z.core.$ZodBranded<z.ZodString, "OperationId", "out">;
        taskcycle_id: z.ZodString;
        repository: z.ZodObject<{
            identity: z.ZodString;
            location: z.ZodString;
        }, z.core.$strict>;
        worktree: z.ZodOptional<z.ZodObject<{
            identity: z.ZodString;
            location: z.ZodString;
        }, z.core.$strict>>;
        git: z.ZodOptional<z.ZodObject<{
            expected_ref: z.ZodString;
            expected_commit: z.ZodString;
        }, z.core.$strict>>;
        runtime: z.ZodObject<{
            executor: z.ZodString;
            platform: z.ZodString;
            runtime_identity: z.ZodString;
        }, z.core.$strict>;
        state_store: z.ZodObject<{
            reference: z.ZodString;
            location: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        authority_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
        evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    }, z.core.$strict>;
    recipe: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>>;
    expected_effects: z.ZodArray<z.ZodObject<{
        effect: z.ZodString;
        scope: z.ZodString;
    }, z.core.$strict>>;
    authority_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    evidence_refs: z.ZodDefault<z.ZodArray<z.ZodType<Reference, unknown, z.core.$ZodTypeInternals<Reference, unknown>>>>;
    semantic_escalation: z.ZodNullable<z.ZodObject<{
        reason: z.ZodEnum<{
            AMBIGUOUS_DETERMINISTIC_RECIPE: "AMBIGUOUS_DETERMINISTIC_RECIPE";
            NO_DETERMINISTIC_RECIPE: "NO_DETERMINISTIC_RECIPE";
        }>;
        required_capabilities: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
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
export declare const ExecutionPlan: z.ZodType<ExecutionPlan, ExecutionPlanInput>;
export {};
