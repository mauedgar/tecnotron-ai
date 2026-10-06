import path from 'node:path';
import { z } from 'zod';
import { EffectDescriptor, RecipeReceipt, type Reference } from './contracts';

const NonEmpty = z.string().min(1);
const RelativeReferenceLocation = NonEmpty.refine(
  (value) => !value.startsWith('/') && !value.includes('..') && !/^[A-Za-z]:/.test(value),
  'reference location must be relative',
);

const ReferenceFields = z.object({
  kind: z.enum(['AUTHORITY', 'EVIDENCE', 'ARTIFACT', 'GIT_OBJECT']),
  id: NonEmpty,
  location: RelativeReferenceLocation.optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  git_oid: z.string().regex(/^[a-f0-9]{40,64}$/).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.kind === 'GIT_OBJECT' && value.git_oid === undefined) {
    ctx.addIssue({ code: 'custom', path: ['git_oid'], message: 'Git object requires OID' });
  }
});

export const ReferenceSchema = ReferenceFields.transform((value): Reference => ({
  kind: value.kind,
  id: value.id,
  ...(value.location === undefined ? {} : { location: value.location }),
  ...(value.sha256 === undefined ? {} : { sha256: value.sha256 }),
  ...(value.git_oid === undefined ? {} : { git_oid: value.git_oid }),
}));
const CrossPlatformAbsolutePath = NonEmpty.refine(
  (value) => path.posix.isAbsolute(value) || path.win32.isAbsolute(value),
  'path must be absolute',
);

const GitOid = z.string().regex(/^[a-f0-9]{40,64}$/);
const BranchRef = z.string().regex(/^refs\/heads\/[A-Za-z0-9._\/-]+$/);
const GitRemoteName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

export const GitExecutionQualificationStatus = z.enum(['READY', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN']);
export type GitExecutionQualificationStatus = z.output<typeof GitExecutionQualificationStatus>;

export const GitExecutionQualificationRequest = z.object({
  schema_version: z.literal('tecnotron-git-execution-qualification-request/v0'),
  surface_id: NonEmpty,
  repository: z.object({
    identity: NonEmpty,
    location: CrossPlatformAbsolutePath,
  }).strict(),
  expected_ref: BranchRef,
  expected_commit: GitOid,
  remote: z.object({
    name: GitRemoteName,
    target_ref: BranchRef,
    expected_commit: GitOid,
  }).strict().optional(),
  remote_timeout_ms: z.number().int().positive().max(30000).default(5000),
}).strict();
export type GitExecutionQualificationRequest = z.output<typeof GitExecutionQualificationRequest>;
export type GitExecutionQualificationRequestInput = z.input<typeof GitExecutionQualificationRequest>;

const GitQualificationRepositoryEvidence = z.object({
  identity: NonEmpty,
  location: CrossPlatformAbsolutePath,
  observed_worktree: CrossPlatformAbsolutePath.nullable(),
  observed_ref: BranchRef.nullable(),
  observed_commit: GitOid.nullable(),
}).strict();

const GitQualificationRemoteEvidence = z.object({
  name_or_declared_identity: GitRemoteName,
  target_ref: BranchRef,
  observation_status: z.enum(['NOT_ATTEMPTED', 'READY', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN']),
  observed_commit: GitOid.nullable(),
  transport_class: z.enum(['LOCAL_PATH', 'HTTP', 'HTTPS', 'SSH', 'GIT', 'UNKNOWN']).nullable(),
  interaction_policy: z.literal('BOUNDED_NONINTERACTIVE_V0'),
}).strict();

const GitQualificationSurfaceEvidence = z.object({
  id: NonEmpty,
  qualification_method: z.enum(['DIRECT', 'PROCESS_LOCAL_SAFE_DIRECTORY']),
}).strict();

const GitQualificationMutationEvidence = z.object({
  repository: z.literal('NONE'),
  remote: z.literal('NONE'),
  persistent_global_git_config: z.literal('NONE'),
}).strict();

export const GitExecutionQualificationResult = z.object({
  schema_version: z.literal('tecnotron-git-execution-qualification-result/v0'),
  status: GitExecutionQualificationStatus,
  reason: NonEmpty.optional(),
  evidence: z.object({
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
export type GitExecutionQualificationResult = z.output<typeof GitExecutionQualificationResult>;

export const RecipeIdentity = z.object({
  id: NonEmpty,
  version: NonEmpty,
}).strict();
export type RecipeIdentity = z.output<typeof RecipeIdentity>;

export const ExecutionCapability = z.enum([
  'NODE_RUNTIME',
  'CHILD_PROCESS',
  'FILESYSTEM_WRITE',
  'REPOSITORY_ACCESS',
  'DURABLE_DIRECTORY_FSYNC',
  'LINUX_SEMANTICS',
  'NETWORK_REMOTE_GIT',
]);
export type ExecutionCapability = z.output<typeof ExecutionCapability>;

export const SurfaceConformance = z.object({
  disposition: z.enum(['CONFORMING', 'NONCONFORMING', 'UNKNOWN']),
  evidence_ref: NonEmpty,
}).strict();
export type SurfaceConformance = z.output<typeof SurfaceConformance>;

const SurfaceCommon = {
  id: NonEmpty,
  capabilities: z.array(ExecutionCapability).min(1),
  conformance: SurfaceConformance,
};

export const NativeNodeSurface = z.object({
  ...SurfaceCommon,
  adapter: z.literal('NATIVE_NODE'),
}).strict();
export type NativeNodeSurface = z.output<typeof NativeNodeSurface>;

export const DockerLinuxNodeSurface = z.object({
  ...SurfaceCommon,
  adapter: z.literal('DOCKER_LINUX_NODE'),
  image: NonEmpty,
}).strict();
export type DockerLinuxNodeSurface = z.output<typeof DockerLinuxNodeSurface>;

export const InvocationSurface = z.discriminatedUnion('adapter', [
  NativeNodeSurface,
  DockerLinuxNodeSurface,
]);
export type InvocationSurface = z.output<typeof InvocationSurface>;

export const RecipeInvocationEnvironment = z.object({
  schema_version: z.literal('tecnotron-recipe-invocation-environment/v0'),
  repository: z.object({
    identity: NonEmpty,
    location: CrossPlatformAbsolutePath,
  }).strict(),
  state_store: z.object({
    reference: NonEmpty,
    location: CrossPlatformAbsolutePath,
  }).strict(),
  surfaces: z.array(InvocationSurface).min(1),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  for (const [index, surface] of value.surfaces.entries()) {
    if (seen.has(surface.id)) {
      ctx.addIssue({ code: 'custom', path: ['surfaces', index, 'id'], message: `duplicate surface id: ${surface.id}` });
    }
    seen.add(surface.id);
  }
});
export type RecipeInvocationEnvironment = z.output<typeof RecipeInvocationEnvironment>;
export type RecipeInvocationEnvironmentInput = z.input<typeof RecipeInvocationEnvironment>;

export const RecipeInvocationRequest = z.object({
  schema_version: z.literal('tecnotron-recipe-invocation-request/v0'),
  recipe: RecipeIdentity,
  operation_ref: NonEmpty,
  responsibility_ref: NonEmpty,
  authority_ref: NonEmpty,
  expected_effects: z.array(EffectDescriptor).min(1),
  evidence_refs: z.array(ReferenceSchema).default([]),
  inputs: z.unknown().optional(),
  execution_constraints: z.object({
    require: z.array(ExecutionCapability).default([]),
  }).strict().default({ require: [] }),
}).strict();
export type RecipeInvocationRequest = z.output<typeof RecipeInvocationRequest>;
export type RecipeInvocationRequestInput = z.input<typeof RecipeInvocationRequest>;

export const SurfaceResolutionStatus = z.enum(['SELECTED', 'UNAVAILABLE', 'BLOCKED', 'AMBIGUOUS']);
export type SurfaceResolutionStatus = z.output<typeof SurfaceResolutionStatus>;

const SurfaceResolutionSchema = z.object({
  status: SurfaceResolutionStatus,
  required_capabilities: z.array(ExecutionCapability),
  selected_surface: InvocationSurface.nullable(),
  matching_surface_ids: z.array(NonEmpty),
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
type SurfaceResolutionShape = z.output<typeof SurfaceResolutionSchema>;
type SurfaceResolutionCommon = Omit<SurfaceResolutionShape, 'status' | 'selected_surface' | 'reason'>;
export type SurfaceResolution =
  | (SurfaceResolutionCommon & { status: 'SELECTED'; selected_surface: InvocationSurface; reason?: string })
  | (SurfaceResolutionCommon & { status: 'UNAVAILABLE' | 'BLOCKED' | 'AMBIGUOUS'; selected_surface: null; reason: string });
export type SurfaceResolutionInput = z.input<typeof SurfaceResolutionSchema>;
export const SurfaceResolution = SurfaceResolutionSchema as z.ZodType<SurfaceResolution, SurfaceResolutionInput>;

export const InvocationObservedIdentity = z.object({
  surface_id: NonEmpty,
  platform: NonEmpty,
  runtime_identity: NonEmpty,
}).strict();
export type InvocationObservedIdentity = z.output<typeof InvocationObservedIdentity>;

export const RecipeInvocationTerminalStatus = z.enum([
  'PASS',
  'FAIL',
  'BLOCKED',
  'UNAVAILABLE',
  'CANCELLED',
  'UNKNOWN',
  'AMBIGUOUS',
]);
export type RecipeInvocationTerminalStatus = z.output<typeof RecipeInvocationTerminalStatus>;

function sameReference(left: Reference | null, right: Reference | null): boolean {
  if (left === null || right === null) return left === right;
  return left.kind === right.kind
    && left.id === right.id
    && left.location === right.location
    && left.sha256 === right.sha256
    && left.git_oid === right.git_oid;
}

export const RecipeInvocationResult = z.object({
  schema_version: z.literal('tecnotron-recipe-invocation-result/v0'),
  operation_ref: NonEmpty.nullable(),
  attempt_ref: NonEmpty.nullable(),
  recipe: RecipeIdentity.nullable(),
  selected_surface: NonEmpty.nullable(),
  started: z.boolean(),
  terminal_status: RecipeInvocationTerminalStatus,
  effect_state: z.enum(['NONE', 'CONFIRMED', 'UNKNOWN']),
  receipt_ref: NonEmpty.nullable(),
  receipt: RecipeReceipt.nullable().default(null),
  result_ref: ReferenceSchema.nullable(),
  execution_plan_ref: ReferenceSchema.nullable(),
  observed_identity: InvocationObservedIdentity.nullable(),
  exit_code: z.number().int().nullable(),
  stdout_ref: ReferenceSchema.nullable(),
  stderr_ref: ReferenceSchema.nullable(),
  terminal_artifact_ref: ReferenceSchema.nullable(),
  reason: NonEmpty.optional(),
  validation_issues: z.array(NonEmpty).default([]),
  supplementary_diagnostics: z.array(NonEmpty).default([]),
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
export type RecipeInvocationResult = z.output<typeof RecipeInvocationResult>;
export type RecipeInvocationResultInput = z.input<typeof RecipeInvocationResult>;

export const WorkerInvocationEnvelope = z.object({
  schema_version: z.literal('tecnotron-recipe-invocation-worker-envelope/v0'),
  request: RecipeInvocationRequest,
  attempt_ref: NonEmpty,
  environment: RecipeInvocationEnvironment,
  selected_surface: InvocationSurface,
}).strict();
export type WorkerInvocationEnvelope = z.output<typeof WorkerInvocationEnvelope>;
export type WorkerInvocationEnvelopeInput = z.input<typeof WorkerInvocationEnvelope>;
