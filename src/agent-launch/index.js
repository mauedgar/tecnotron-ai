'use strict';

const {
  AgentLaunchRequest,
  AgentLaunchResult,
  Reference,
} = require('../contracts/agent-launch');
const {
  AgentLaunchPreflightError,
  resolveLaunchAuthority,
} = require('./authority');
const { preflightProject } = require('./project-preflight');
const { preflightContext } = require('./context-preflight');

const DETAILS = Object.freeze({
  REQUEST_INVALID: 'Request failed strict validation.',
  AUTHORITY_RESOLUTION_FAILED: 'Accepted authority could not be resolved.',
  AUTHORITY_KIND_UNSUPPORTED: 'Authority kind and profile are incompatible.',
  AUTHORITY_INSUFFICIENT: 'Resolved authority is incomplete or contradictory.',
  AUTHORITY_INPUT_MISMATCH: 'Authority input congruence failed.',
  WORKTREE_AUTHORITY_MISMATCH: 'Execution identity differs from authority.',
  SCOPE_AUTHORITY_MISMATCH: 'Requested scope differs from authority.',
  CONTEXT_AUTHORITY_MISMATCH: 'Context coordinates differ from authority.',
  PROFILE_UNKNOWN: 'Requested profile is not accepted.',
  PROFILE_CONTRACT_INVALID: 'Accepted profile contract is unavailable.',
  PROJECT_RESOLUTION_REJECTED: 'Project resolution was rejected.',
  REPOSITORY_REF_MISMATCH: 'Repository identity differs from resolution.',
  CWD_OUTSIDE_REPOSITORY: 'Working directory is outside the repository.',
  WORKTREE_REQUIRED: 'Writer authority requires a task worktree.',
  WORKTREE_MISMATCH: 'Observed worktree differs from authority.',
  SCOPE_INVALID: 'Scope is malformed or escapes its authorized root.',
  CONTEXT_NOT_READY: 'Context integrity, coverage, or budget preflight failed.',
  CONTEXT_PROVIDER_UNAVAILABLE: 'Context provider is unavailable.',
});

function normalizedFailure(error, rawRequest, authorityResult) {
  const parsedRequest = AgentLaunchRequest.safeParse(rawRequest);
  const request = parsedRequest.success ? parsedRequest.data : null;
  let operationId = request?.operation_id;
  let acceptedAuthorityRef = request?.accepted_authority_ref;
  if (!request) {
    const parsedOperationId = Reference.safeParse(rawRequest?.operation_id);
    const parsedAuthorityRef = Reference.safeParse(rawRequest?.accepted_authority_ref);
    if (!parsedOperationId.success || !parsedAuthorityRef.success) return null;
    operationId = parsedOperationId.data;
    acceptedAuthorityRef = parsedAuthorityRef.data;
  }
  const authority = authorityResult?.resolvedAuthority;
  const result = {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: operationId,
    accepted_authority_ref: acceptedAuthorityRef,
    profile_id: request?.profile_id || null,
    status: error.status,
    reason_code: error.reasonCode,
    phase: error.phase,
    resolved: {
      project_profile_ref: authority?.project.project_profile_ref || null,
      repository_ref: authority?.repository.repository_identity || null,
      worktree_ref: request?.project.worktree_ref || null,
      cwd: authority?.repository.cwd || null,
    },
    authority: {
      authority_kind: authority?.authority_kind || null,
      authority_id: authority?.authority_id || null,
      envelope_digest: authorityResult?.evidence.authority_envelope_digest || null,
      congruence_status: authorityResult?.congruence.overall || 'NOT_EVALUATED',
    },
    identity: {
      request_state: request?.model.request.state || null,
      requested_model_ref: request?.model.request.model_ref || null,
      requested_provider_ref: request?.model.request.provider_ref || null,
      model_request_ref: request?.model.request.request_ref || null,
      resolved_model_ref: null,
      resolved_provider_ref: null,
      resolved_runtime_ref: null,
      model_resolution_ref: null,
      observed_model_ref: null,
      observed_provider_ref: null,
      observed_runtime_ref: null,
      observed_runtime_version: null,
    },
    configuration: {
      projected_config_digest: null,
      effective_config_digest: null,
      effective_permission_digest: null,
      proof_mechanism: null,
      conformance_status: 'NOT_EVALUATED',
      capability_evidence_ref: null,
    },
    evidence: {
      request_digest: authorityResult?.evidence.request_digest || null,
      profile_digest: authorityResult?.evidence.profile_digest || null,
      permission_projection_digest: null,
      conformance_evidence_ref: null,
      output_refs: [],
    },
    process: { exit_code: null, started_at: null, finished_at: null },
    details: DETAILS[error.reasonCode] || 'Structural preflight failed.',
  };
  return AgentLaunchResult.parse(result);
}

function preflightAgentLaunch(request, dependencies = {}) {
  let authorityResult;
  try {
    authorityResult = resolveLaunchAuthority(request, dependencies);
    const project = preflightProject(authorityResult, dependencies);
    const context = preflightContext(authorityResult, dependencies);
    return Object.freeze({
      ok: true,
      schema_version: 'tecnotron-agent-launch/v1',
      request: authorityResult.request,
      authority: authorityResult.resolvedAuthority,
      profile: authorityResult.profile,
      congruence: authorityResult.congruence,
      execution_observation: project.execution_observation,
      scope: project.scope,
      context,
      evidence: authorityResult.evidence,
      actor_invoked: false,
    });
  } catch (error) {
    const preflightError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('PROJECT_RESOLUTION_REJECTED');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(preflightError, request, authorityResult),
      error: Object.freeze({
        status: preflightError.status,
        reason_code: preflightError.reasonCode,
        phase: preflightError.phase,
      }),
      actor_invoked: false,
    });
  }
}

module.exports = { preflightAgentLaunch };
