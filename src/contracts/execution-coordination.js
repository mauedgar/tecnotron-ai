"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionOutcome = exports.OutcomeStatus = exports.ExecutionAttemptRequest = exports.HarnessConformance = exports.AuthorizationContext = exports.ResolvedExecution = exports.EffectConstraint = exports.EvidenceRef = void 0;
exports.mergeEvidenceRefs = mergeEvidenceRefs;
const zod_1 = require("zod");
const OperationIdSchema = zod_1.z.string().min(1).brand();
const ExecutionAttemptIdSchema = zod_1.z.string().min(1).brand();
exports.EvidenceRef = zod_1.z.object({
    kind: zod_1.z.string().min(1),
    ref: zod_1.z.string().min(1),
}).strict();
exports.EffectConstraint = zod_1.z.object({
    effect: zod_1.z.string().min(1),
    scope: zod_1.z.string().min(1),
}).strict();
exports.ResolvedExecution = zod_1.z.object({
    decision_ref: zod_1.z.string().min(1),
    actor_id: zod_1.z.string().min(1),
    runtime_id: zod_1.z.string().min(1),
    model_id: zod_1.z.string().min(1).optional(),
    provider_id: zod_1.z.string().min(1).optional(),
}).strict();
exports.AuthorizationContext = zod_1.z.object({
    disposition: zod_1.z.enum(['AUTHORIZED', 'DENIED', 'UNKNOWN']),
    authority_reference: zod_1.z.string().min(1),
    effect_constraints: zod_1.z.array(exports.EffectConstraint).min(1),
}).strict();
exports.HarnessConformance = zod_1.z.object({
    disposition: zod_1.z.enum(['CONFORMING', 'NONCONFORMING', 'UNKNOWN']),
    evidence_ref: zod_1.z.string().min(1),
}).strict();
exports.ExecutionAttemptRequest = zod_1.z.object({
    operation_id: OperationIdSchema,
    execution_attempt_id: ExecutionAttemptIdSchema,
    resolved_execution: exports.ResolvedExecution,
    authorization: exports.AuthorizationContext,
    harness_conformance: exports.HarnessConformance,
    evidence_refs: zod_1.z.array(exports.EvidenceRef).default([]),
    cancellation_requested: zod_1.z.boolean().default(false),
    input: zod_1.z.unknown().optional(),
}).strict().superRefine((value, ctx) => {
    if (value.operation_id === value.execution_attempt_id) {
        ctx.addIssue({
            code: 'custom',
            path: ['execution_attempt_id'],
            message: 'execution_attempt_id must remain distinct from operation_id',
        });
    }
});
exports.OutcomeStatus = zod_1.z.enum([
    'NO_START',
    'PARTIAL_RESULT',
    'SUCCESS',
    'FAILED',
    'BLOCKED',
    'UNAVAILABLE',
    'CANCELLED',
    'UNKNOWN',
]);
const ExecutionOutcomeSchema = zod_1.z.object({
    operation_id: OperationIdSchema,
    execution_attempt_id: ExecutionAttemptIdSchema,
    status: exports.OutcomeStatus,
    started: zod_1.z.boolean(),
    reason: zod_1.z.string().min(1).optional(),
    result: zod_1.z.unknown().optional(),
    partial_result: zod_1.z.unknown().optional(),
    evidence_refs: zod_1.z.array(exports.EvidenceRef).default([]),
}).strict().superRefine((value, ctx) => {
    if (['NO_START', 'BLOCKED', 'UNAVAILABLE'].includes(value.status) && value.started !== false) {
        ctx.addIssue({
            code: 'custom',
            path: ['started'],
            message: `${value.status} requires started=false`,
        });
    }
    if (['SUCCESS', 'PARTIAL_RESULT', 'CANCELLED', 'UNKNOWN'].includes(value.status) && value.started !== true) {
        ctx.addIssue({
            code: 'custom',
            path: ['started'],
            message: `${value.status} requires started=true`,
        });
    }
    if (value.status === 'PARTIAL_RESULT' && value.partial_result === undefined) {
        ctx.addIssue({
            code: 'custom',
            path: ['partial_result'],
            message: 'PARTIAL_RESULT requires partial_result',
        });
    }
    if (value.status !== 'SUCCESS' && !value.reason) {
        ctx.addIssue({
            code: 'custom',
            path: ['reason'],
            message: `${value.status} requires an explicit reason`,
        });
    }
});
exports.ExecutionOutcome = ExecutionOutcomeSchema;
function mergeEvidenceRefs(baseRefs, additionalRefs) {
    const seen = new Set();
    const merged = [];
    for (const entry of [...baseRefs, ...additionalRefs]) {
        const parsed = exports.EvidenceRef.parse(entry);
        const key = `${parsed.kind}\u0000${parsed.ref}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        merged.push(parsed);
    }
    return merged;
}
