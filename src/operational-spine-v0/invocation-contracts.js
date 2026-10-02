"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerInvocationEnvelope = exports.RecipeInvocationResult = exports.RecipeInvocationTerminalStatus = exports.InvocationObservedIdentity = exports.SurfaceResolution = exports.SurfaceResolutionStatus = exports.RecipeInvocationRequest = exports.RecipeInvocationEnvironment = exports.InvocationSurface = exports.DockerLinuxNodeSurface = exports.NativeNodeSurface = exports.SurfaceConformance = exports.ExecutionCapability = exports.RecipeIdentity = void 0;
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const contracts_1 = require("./contracts");
const { referenceSchema } = require('../state-kernel-v0/contracts');
const NonEmpty = zod_1.z.string().min(1);
const CrossPlatformAbsolutePath = NonEmpty.refine((value) => node_path_1.default.posix.isAbsolute(value) || node_path_1.default.win32.isAbsolute(value), 'path must be absolute');
const GitOid = zod_1.z.string().regex(/^[a-f0-9]{40,64}$/);
const BranchRef = zod_1.z.string().regex(/^refs\/heads\/[A-Za-z0-9._\/-]+$/);
const GitRemoteName = zod_1.z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
exports.GitExecutionQualificationStatus = zod_1.z.enum(['READY', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN']);
exports.GitExecutionQualificationRequest = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-git-execution-qualification-request/v0'),
    surface_id: NonEmpty,
    repository: zod_1.z.object({
        identity: NonEmpty,
        location: CrossPlatformAbsolutePath,
    }).strict(),
    expected_ref: BranchRef,
    expected_commit: GitOid,
    remote: zod_1.z.object({
        name: GitRemoteName,
        target_ref: BranchRef,
        expected_commit: GitOid,
    }).strict().optional(),
    remote_timeout_ms: zod_1.z.number().int().positive().max(30000).default(5000),
}).strict();
const GitQualificationRepositoryEvidence = zod_1.z.object({
    identity: NonEmpty,
    location: CrossPlatformAbsolutePath,
    observed_ref: BranchRef.nullable(),
    observed_commit: GitOid.nullable(),
}).strict();
const GitQualificationRemoteEvidence = zod_1.z.object({
    name_or_declared_identity: GitRemoteName,
    target_ref: BranchRef,
    observation_status: zod_1.z.enum(['NOT_ATTEMPTED', 'READY', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN']),
    observed_commit: GitOid.nullable(),
}).strict();
const GitQualificationSurfaceEvidence = zod_1.z.object({
    id: NonEmpty,
    qualification_method: zod_1.z.enum(['DIRECT', 'PROCESS_LOCAL_SAFE_DIRECTORY']),
}).strict();
const GitQualificationMutationEvidence = zod_1.z.object({
    repository: zod_1.z.literal('NONE'),
    remote: zod_1.z.literal('NONE'),
    persistent_global_git_config: zod_1.z.literal('NONE'),
}).strict();
exports.GitExecutionQualificationResult = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-git-execution-qualification-result/v0'),
    status: exports.GitExecutionQualificationStatus,
    reason: NonEmpty.optional(),
    evidence: zod_1.z.object({
        repository: GitQualificationRepositoryEvidence,
        remote: GitQualificationRemoteEvidence.nullable(),
        surface: GitQualificationSurfaceEvidence,
        mutations: GitQualificationMutationEvidence,
    }).strict(),
}).strict().superRefine((value, ctx) => {
    if (value.status !== 'READY' && !value.reason) {
        ctx.addIssue({ code: 'custom', path: ['reason'], message: value.status + ' requires reason' });
    }
});
exports.RecipeIdentity = zod_1.z.object({
    id: NonEmpty,
    version: NonEmpty,
}).strict();
exports.ExecutionCapability = zod_1.z.enum([
    'NODE_RUNTIME',
    'CHILD_PROCESS',
    'FILESYSTEM_WRITE',
    'REPOSITORY_ACCESS',
    'DURABLE_DIRECTORY_FSYNC',
    'LINUX_SEMANTICS',
    'NETWORK_REMOTE_GIT',
]);
exports.SurfaceConformance = zod_1.z.object({
    disposition: zod_1.z.enum(['CONFORMING', 'NONCONFORMING', 'UNKNOWN']),
    evidence_ref: NonEmpty,
}).strict();
const SurfaceCommon = {
    id: NonEmpty,
    capabilities: zod_1.z.array(exports.ExecutionCapability).min(1),
    conformance: exports.SurfaceConformance,
};
exports.NativeNodeSurface = zod_1.z.object({
    ...SurfaceCommon,
    adapter: zod_1.z.literal('NATIVE_NODE'),
}).strict();
exports.DockerLinuxNodeSurface = zod_1.z.object({
    ...SurfaceCommon,
    adapter: zod_1.z.literal('DOCKER_LINUX_NODE'),
    image: NonEmpty,
}).strict();
exports.InvocationSurface = zod_1.z.discriminatedUnion('adapter', [
    exports.NativeNodeSurface,
    exports.DockerLinuxNodeSurface,
]);
exports.RecipeInvocationEnvironment = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-recipe-invocation-environment/v0'),
    repository: zod_1.z.object({
        identity: NonEmpty,
        location: CrossPlatformAbsolutePath,
    }).strict(),
    state_store: zod_1.z.object({
        reference: NonEmpty,
        location: CrossPlatformAbsolutePath,
    }).strict(),
    surfaces: zod_1.z.array(exports.InvocationSurface).min(1),
}).strict().superRefine((value, ctx) => {
    const seen = new Set();
    for (const [index, surface] of value.surfaces.entries()) {
        if (seen.has(surface.id)) {
            ctx.addIssue({ code: 'custom', path: ['surfaces', index, 'id'], message: `duplicate surface id: ${surface.id}` });
        }
        seen.add(surface.id);
    }
});
exports.RecipeInvocationRequest = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-recipe-invocation-request/v0'),
    recipe: exports.RecipeIdentity,
    operation_ref: NonEmpty,
    responsibility_ref: NonEmpty,
    authority_ref: NonEmpty,
    expected_effects: zod_1.z.array(contracts_1.EffectDescriptor).min(1),
    evidence_refs: zod_1.z.array(referenceSchema).default([]),
    inputs: zod_1.z.unknown().optional(),
    execution_constraints: zod_1.z.object({
        require: zod_1.z.array(exports.ExecutionCapability).default([]),
    }).strict().default({ require: [] }),
}).strict();
exports.SurfaceResolutionStatus = zod_1.z.enum(['SELECTED', 'UNAVAILABLE', 'BLOCKED', 'AMBIGUOUS']);
const SurfaceResolutionSchema = zod_1.z.object({
    status: exports.SurfaceResolutionStatus,
    required_capabilities: zod_1.z.array(exports.ExecutionCapability),
    selected_surface: exports.InvocationSurface.nullable(),
    matching_surface_ids: zod_1.z.array(NonEmpty),
    reason: NonEmpty.optional(),
}).strict().superRefine((value, ctx) => {
    if (value.status === 'SELECTED' && value.selected_surface === null) {
        ctx.addIssue({ code: 'custom', path: ['selected_surface'], message: 'SELECTED requires selected_surface' });
    }
    if (value.status !== 'SELECTED' && value.selected_surface !== null) {
        ctx.addIssue({ code: 'custom', path: ['selected_surface'], message: value.status + ' cannot select a surface' });
    }
    if (value.status !== 'SELECTED' && !value.reason) {
        ctx.addIssue({ code: 'custom', path: ['reason'], message: value.status + ' requires reason' });
    }
});
exports.SurfaceResolution = SurfaceResolutionSchema;
exports.InvocationObservedIdentity = zod_1.z.object({
    surface_id: NonEmpty,
    platform: NonEmpty,
    runtime_identity: NonEmpty,
}).strict();
exports.RecipeInvocationTerminalStatus = zod_1.z.enum([
    'PASS',
    'FAIL',
    'BLOCKED',
    'UNAVAILABLE',
    'CANCELLED',
    'UNKNOWN',
    'AMBIGUOUS',
]);
function sameReference(left, right) {
    if (left === null || right === null)
        return left === right;
    return left.kind === right.kind
        && left.id === right.id
        && left.location === right.location
        && left.sha256 === right.sha256
        && left.git_oid === right.git_oid;
}
exports.RecipeInvocationResult = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-recipe-invocation-result/v0'),
    operation_ref: NonEmpty.nullable(),
    attempt_ref: NonEmpty.nullable(),
    recipe: exports.RecipeIdentity.nullable(),
    selected_surface: NonEmpty.nullable(),
    started: zod_1.z.boolean(),
    terminal_status: exports.RecipeInvocationTerminalStatus,
    effect_state: zod_1.z.enum(['NONE', 'CONFIRMED', 'UNKNOWN']),
    receipt_ref: NonEmpty.nullable(),
    receipt: contracts_1.RecipeReceipt.nullable().default(null),
    result_ref: referenceSchema.nullable(),
    execution_plan_ref: referenceSchema.nullable(),
    observed_identity: exports.InvocationObservedIdentity.nullable(),
    exit_code: zod_1.z.number().int().nullable(),
    stdout_ref: referenceSchema.nullable(),
    stderr_ref: referenceSchema.nullable(),
    terminal_artifact_ref: referenceSchema.nullable(),
    reason: NonEmpty.optional(),
    validation_issues: zod_1.z.array(NonEmpty).default([]),
    supplementary_diagnostics: zod_1.z.array(NonEmpty).default([]),
    git_execution_qualification: exports.GitExecutionQualificationResult.nullable().default(null),
}).strict().superRefine((value, ctx) => {
    if (!value.started && value.effect_state !== 'NONE') {
        ctx.addIssue({ code: 'custom', path: ['effect_state'], message: 'pre-start result requires effect_state=NONE' });
    }
    if (value.terminal_status === 'UNKNOWN' && (!value.started || value.effect_state !== 'UNKNOWN')) {
        ctx.addIssue({ code: 'custom', path: ['terminal_status'], message: 'UNKNOWN requires started=true and effect_state=UNKNOWN' });
    }
    if (value.effect_state === 'UNKNOWN' && value.terminal_status !== 'UNKNOWN') {
        ctx.addIssue({ code: 'custom', path: ['effect_state'], message: 'effect_state=UNKNOWN requires terminal_status=UNKNOWN' });
    }
    if (['UNAVAILABLE', 'BLOCKED', 'AMBIGUOUS'].includes(value.terminal_status) && !value.reason) {
        ctx.addIssue({ code: 'custom', path: ['reason'], message: `${value.terminal_status} requires reason` });
    }
    if (value.terminal_status === 'PASS' && !value.receipt_ref) {
        ctx.addIssue({ code: 'custom', path: ['receipt_ref'], message: 'PASS requires receipt_ref' });
    }
    if (value.started && value.terminal_status !== 'UNKNOWN' && value.observed_identity === null) {
        ctx.addIssue({ code: 'custom', path: ['observed_identity'], message: 'started terminal result requires observed_identity' });
    }
    if (value.observed_identity !== null && value.observed_identity.surface_id !== value.selected_surface) {
        ctx.addIssue({ code: 'custom', path: ['observed_identity', 'surface_id'], message: 'observed surface must match selected_surface' });
    }
    if (value.receipt === null) {
        if (value.receipt_ref !== null) {
            ctx.addIssue({ code: 'custom', path: ['receipt_ref'], message: 'receipt_ref requires embedded Receipt evidence' });
        }
        if (value.started && value.terminal_status !== 'UNKNOWN') {
            ctx.addIssue({ code: 'custom', path: ['receipt'], message: 'started terminal semantics require Receipt evidence' });
        }
        return;
    }
    const receipt = value.receipt;
    if (value.receipt_ref !== receipt.receipt_ref) {
        ctx.addIssue({ code: 'custom', path: ['receipt_ref'], message: 'receipt_ref must match Receipt evidence' });
    }
    if (value.operation_ref !== receipt.operation_id) {
        ctx.addIssue({ code: 'custom', path: ['operation_ref'], message: 'operation_ref must match Receipt evidence' });
    }
    if (value.attempt_ref !== receipt.execution_attempt_id) {
        ctx.addIssue({ code: 'custom', path: ['attempt_ref'], message: 'attempt_ref must match Receipt evidence' });
    }
    if (value.recipe?.id !== receipt.recipe_id || value.recipe?.version !== receipt.recipe_version) {
        ctx.addIssue({ code: 'custom', path: ['recipe'], message: 'recipe identity must match Receipt evidence' });
    }
    if (value.terminal_status !== receipt.status) {
        ctx.addIssue({ code: 'custom', path: ['terminal_status'], message: 'terminal_status must match Receipt evidence' });
    }
    if (value.effect_state !== receipt.effect_state) {
        ctx.addIssue({ code: 'custom', path: ['effect_state'], message: 'effect_state must match Receipt evidence' });
    }
    const receiptResultRef = receipt.result_refs[0] ?? null;
    if (!sameReference(value.result_ref, receiptResultRef)) {
        ctx.addIssue({ code: 'custom', path: ['result_ref'], message: 'result_ref must match Receipt evidence' });
    }
});
exports.WorkerInvocationEnvelope = zod_1.z.object({
    schema_version: zod_1.z.literal('tecnotron-recipe-invocation-worker-envelope/v0'),
    request: exports.RecipeInvocationRequest,
    attempt_ref: NonEmpty,
    environment: exports.RecipeInvocationEnvironment,
    selected_surface: exports.InvocationSurface,
}).strict();
