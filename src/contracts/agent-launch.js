'use strict';

const { z } = require('zod');

const AGENT_LAUNCH_SCHEMA_VERSION = 'tecnotron-agent-launch/v1';
const PROFILE_IDS = [
  'spec_analyst',
  'planner',
  'architect',
  'explorer',
  'implementer',
  'doc_curator',
  'reviewer',
  'researcher',
  'auditor',
];
const AUTHORITY_KINDS = [
  'READ_ONLY_ANALYSIS',
  'TASK_OWNED_WRITE',
  'AUTHORIZED_RESEARCH',
  'CHANGE_REVIEW',
  'CONFORMANCE_AUDIT',
];

const REASON_CODES = Object.freeze({
  COMPLETED: ['LAUNCH_OPERATION_COMPLETED'],
  BLOCKED: [
    'REQUEST_INVALID',
    'AUTHORITY_RESOLUTION_FAILED',
    'AUTHORITY_KIND_UNSUPPORTED',
    'AUTHORITY_INSUFFICIENT',
    'AUTHORITY_INPUT_MISMATCH',
    'WORKTREE_AUTHORITY_MISMATCH',
    'SCOPE_AUTHORITY_MISMATCH',
    'CONTEXT_AUTHORITY_MISMATCH',
    'PROFILE_UNKNOWN',
    'PROFILE_CONTRACT_INVALID',
    'CONDITIONAL_AUTHORIZATION_MISSING',
    'PROJECT_RESOLUTION_REJECTED',
    'REPOSITORY_REF_MISMATCH',
    'CWD_OUTSIDE_REPOSITORY',
    'WORKTREE_REQUIRED',
    'WORKTREE_MISMATCH',
    'SCOPE_INVALID',
    'CONTEXT_NOT_READY',
    'MODEL_REQUEST_UNSUPPORTED',
    'MODEL_INELIGIBLE',
    'PROVIDER_INELIGIBLE',
    'MODEL_SELECTION_UNRESOLVED',
    'PERMISSION_PROJECTION_DENIED',
    'PERMISSION_PROJECTION_UNPROVABLE',
    'EFFECTIVE_CONFIG_UNPROVABLE',
    'EFFECTIVE_CONFIG_MISMATCH',
    'EFFECTIVE_PERMISSION_BROADENING',
    'NATIVE_SHELL_DENIED',
    'WEB_AUTHORIZATION_MISSING',
    'DELEGATION_DENIED',
    'PAID_API_DISABLED',
    'GLOBAL_CONFIG_MUTATION_DENIED',
    'PROFILE_MODEL_BINDING_DENIED',
  ],
  FAILED: [
    'ADAPTER_INVOCATION_FAILED',
    'ADAPTER_TIMEOUT',
    'ADAPTER_ABORTED',
    'MALFORMED_ADAPTER_OUTPUT',
    'OBSERVED_IDENTITY_MISMATCH',
    'RUNTIME_PERMISSION_VIOLATION',
    'OUTPUT_CONTRACT_VIOLATION',
    'EVIDENCE_SANITIZATION_FAILED',
  ],
  UNAVAILABLE: [
    'OPENCODE_NOT_FOUND',
    'OPENCODE_VERSION_UNSUPPORTED',
    'OPENCODE_CONFORMANCE_UNAVAILABLE',
    'CONTEXT_PROVIDER_UNAVAILABLE',
    'MODEL_RESOLUTION_UNAVAILABLE',
    'PROVIDER_RUNTIME_UNAVAILABLE',
  ],
});

const Reference = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/@#-]*$/)
  .refine((value) => !/(?:api[_-]?key|password|passwd|secret|bearer|token=)/i.test(value), 'secret-like values are not references');
const PathValue = z.string().min(1).max(4096).refine((value) => !value.includes('\0'), 'path contains NUL');
const Digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const NullableReference = Reference.nullable();
const Scope = z.object({
  read_scope: z.array(PathValue).min(1),
  write_scope: z.array(PathValue),
}).strict();
const Authorization = z.object({
  task_authorization_ref: NullableReference,
  research_authorization_ref: NullableReference,
  change_snapshot_ref: NullableReference,
  validation_evidence_ref: NullableReference,
  evidence_snapshot_ref: NullableReference,
  evidence_matrix_ref: NullableReference,
}).strict();
const ContextCoordinates = z.object({
  context_ref: NullableReference,
  evidence_requirements_ref: NullableReference,
  context_budget_ref: Reference,
}).strict().superRefine((value, ctx) => {
  if ((value.context_ref === null) === (value.evidence_requirements_ref === null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['context_ref'], message: 'exactly one context source is required' });
  }
});

const ProfileInputValue = z.union([Reference, z.array(PathValue).min(1)]);
const ProfileInputs = z.record(z.string().min(1), ProfileInputValue);

const ModelRequest = z.object({
  state: z.enum(['EXPLICIT_CONSTRAINTS', 'AUTHORIZED_DETERMINISTIC_SELECTION']),
  request_ref: NullableReference,
  model_ref: NullableReference,
  provider_ref: NullableReference,
  runtime_constraints_ref: NullableReference,
}).strict().superRefine((value, ctx) => {
  const constraints = [value.model_ref, value.provider_ref, value.runtime_constraints_ref];
  if (value.state === 'EXPLICIT_CONSTRAINTS') {
    if (value.request_ref === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['request_ref'], message: 'explicit constraints require request_ref' });
    }
    if (constraints.every((constraint) => constraint === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['model_ref'], message: 'at least one explicit constraint is required' });
    }
  } else if (value.request_ref !== null || constraints.some((constraint) => constraint !== null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['request_ref'], message: 'authorized deterministic selection forbids explicit request coordinates' });
  }
});

const AgentLaunchRequest = z.object({
  schema_version: z.literal(AGENT_LAUNCH_SCHEMA_VERSION),
  operation_id: Reference,
  accepted_authority_ref: Reference,
  profile_id: z.enum(PROFILE_IDS),
  project: z.object({
    project_profile_ref: Reference,
    repository_ref: Reference,
    cwd: PathValue,
    worktree_ref: NullableReference,
  }).strict(),
  scope: Scope,
  profile_inputs: ProfileInputs,
  authorization: Authorization,
  context: ContextCoordinates,
  model: z.object({
    request: ModelRequest,
    routing_decision_ref: NullableReference,
    resolution_ref: NullableReference,
  }).strict(),
  environment: z.object({
    inherit: z.literal(false),
    task_scoped_inputs_ref: NullableReference,
  }).strict(),
  execution: z.object({
    adapter_id: z.literal('opencode-cli'),
    timeout_ms: z.number().int().positive(),
  }).strict(),
}).strict();

const KIND_PROFILES = Object.freeze({
  READ_ONLY_ANALYSIS: ['spec_analyst', 'planner', 'architect', 'explorer'],
  TASK_OWNED_WRITE: ['implementer', 'doc_curator'],
  AUTHORIZED_RESEARCH: ['researcher'],
  CHANGE_REVIEW: ['reviewer'],
  CONFORMANCE_AUDIT: ['auditor'],
});

const ResolvedAuthority = z.object({
  authority_kind: z.enum(AUTHORITY_KINDS),
  authority_id: Reference,
  operation_id: Reference,
  profile_id: z.enum(PROFILE_IDS),
  project: z.object({
    project_id: Reference,
    project_profile_ref: Reference,
    repository_root: PathValue,
  }).strict(),
  repository: z.object({
    repository_identity: Reference,
    worktree_path: PathValue.nullable(),
    cwd: PathValue,
    branch: Reference,
    head_or_baseline: z.string().regex(/^[a-fA-F0-9]{40,64}$/),
  }).strict(),
  authorization: Authorization,
  scope: Scope,
  context: ContextCoordinates,
  profile_inputs: ProfileInputs,
  provenance: z.object({ accepted_authority_ref: Reference }).strict(),
}).strict().superRefine((value, ctx) => {
  if (!KIND_PROFILES[value.authority_kind].includes(value.profile_id)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['profile_id'], message: 'authority kind does not admit profile' });
  }
  const auth = value.authorization;
  const forbidden = (names) => names.forEach((name) => {
    if (auth[name] !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['authorization', name], message: 'forbidden authority reference' });
  });
  const required = (names) => names.forEach((name) => {
    if (auth[name] === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['authorization', name], message: 'required authority reference' });
  });
  if (value.authority_kind === 'TASK_OWNED_WRITE') {
    required(['task_authorization_ref']);
    forbidden(['research_authorization_ref', 'change_snapshot_ref', 'validation_evidence_ref', 'evidence_snapshot_ref', 'evidence_matrix_ref']);
    if (value.repository.worktree_path === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['repository', 'worktree_path'], message: 'writer requires worktree' });
    if (value.scope.write_scope.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scope', 'write_scope'], message: 'writer requires write scope' });
  } else {
    if (value.scope.write_scope.length !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scope', 'write_scope'], message: 'read-only authority forbids write scope' });
    if (value.authority_kind === 'READ_ONLY_ANALYSIS') forbidden(Object.keys(auth));
    if (value.authority_kind === 'AUTHORIZED_RESEARCH') {
      required(['research_authorization_ref']);
      forbidden(['task_authorization_ref', 'change_snapshot_ref', 'validation_evidence_ref', 'evidence_snapshot_ref', 'evidence_matrix_ref']);
    }
    if (value.authority_kind === 'CHANGE_REVIEW') {
      required(['change_snapshot_ref', 'validation_evidence_ref']);
      forbidden(['task_authorization_ref', 'research_authorization_ref', 'evidence_snapshot_ref', 'evidence_matrix_ref']);
    }
    if (value.authority_kind === 'CONFORMANCE_AUDIT') {
      required(['evidence_snapshot_ref', 'evidence_matrix_ref']);
      forbidden(['task_authorization_ref', 'research_authorization_ref', 'change_snapshot_ref', 'validation_evidence_ref']);
    }
  }
});

const ResultStatus = z.enum(Object.keys(REASON_CODES));
const ReasonCode = z.enum(Object.values(REASON_CODES).flat());
const AgentLaunchResult = z.object({
  schema_version: z.literal(AGENT_LAUNCH_SCHEMA_VERSION),
  operation_id: Reference,
  accepted_authority_ref: Reference,
  profile_id: z.enum(PROFILE_IDS).nullable(),
  status: ResultStatus,
  reason_code: ReasonCode,
  phase: z.enum(['REQUEST', 'PREFLIGHT', 'ADAPTER', 'OUTPUT_NORMALIZATION', 'COMPLETED']),
  resolved: z.object({
    project_profile_ref: NullableReference,
    repository_ref: NullableReference,
    worktree_ref: NullableReference,
    cwd: PathValue.nullable(),
  }).strict(),
  authority: z.object({
    authority_kind: z.enum(AUTHORITY_KINDS).nullable(),
    authority_id: Reference.nullable(),
    envelope_digest: Digest.nullable(),
    congruence_status: z.enum(['DERIVED', 'ASSERTED_AND_EQUAL', 'MIXED_CONGRUENT', 'MISMATCH', 'NOT_EVALUATED']),
  }).strict(),
  identity: z.object({
    request_state: z.enum(['EXPLICIT_CONSTRAINTS', 'AUTHORIZED_DETERMINISTIC_SELECTION']).nullable(),
    requested_model_ref: NullableReference,
    requested_provider_ref: NullableReference,
    model_request_ref: NullableReference,
    resolved_model_ref: NullableReference,
    resolved_provider_ref: NullableReference,
    resolved_runtime_ref: NullableReference,
    model_resolution_ref: NullableReference,
    observed_model_ref: NullableReference,
    observed_provider_ref: NullableReference,
    observed_runtime_ref: NullableReference,
    observed_runtime_version: z.string().min(1).max(128).nullable(),
  }).strict(),
  configuration: z.object({
    projected_config_digest: Digest.nullable(),
    effective_config_digest: Digest.nullable(),
    effective_permission_digest: Digest.nullable(),
    proof_mechanism: z.enum(['INVOCATION_ISOLATION', 'EFFECTIVE_CONFIG_PROBE', 'BOTH']).nullable(),
    conformance_status: z.enum(['CONFORMANT', 'SAFELY_NARROWER', 'UNPROVABLE', 'MISMATCH', 'BROADER', 'NOT_EVALUATED']),
    capability_evidence_ref: NullableReference,
  }).strict(),
  evidence: z.object({
    request_digest: Digest.nullable(),
    profile_digest: Digest.nullable(),
    permission_projection_digest: Digest.nullable(),
    conformance_evidence_ref: NullableReference,
    output_refs: z.array(Reference),
  }).strict(),
  process: z.object({
    exit_code: z.number().int().nullable(),
    started_at: z.iso.datetime({ offset: true }).nullable(),
    finished_at: z.iso.datetime({ offset: true }).nullable(),
  }).strict(),
  details: z.string().min(1).max(512).refine(
    (value) => !/(?:api[_ -]?key|password|passwd|credential|bearer|token\s*=|secret\s*=)/i.test(value),
    'details must be sanitized',
  ).nullable(),
}).strict().superRefine((value, ctx) => {
  if (!REASON_CODES[value.status].includes(value.reason_code)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason_code'], message: 'reason code does not belong to status' });
  }
  if (value.status === 'COMPLETED' && value.phase !== 'COMPLETED') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phase'], message: 'completed status requires completed phase' });
  }
});

module.exports = {
  AGENT_LAUNCH_SCHEMA_VERSION,
  PROFILE_IDS,
  AUTHORITY_KINDS,
  REASON_CODES,
  Reference,
  Digest,
  Authorization,
  Scope,
  ContextCoordinates,
  AgentLaunchRequest,
  ResolvedAuthority,
  AgentLaunchResult,
};
