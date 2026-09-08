'use strict';

const {
  AgentLaunchRequest,
  AgentLaunchResult,
  Reference,
} = require('../contracts/agent-launch');
const {
  AgentLaunchPreflightError,
  digestValue,
  resolveLaunchAuthority,
} = require('./authority');
const { preflightProject } = require('./project-preflight');
const { preflightContext } = require('./context-preflight');
const { projectPermissions } = require('./permission-projection');
const { buildChildEnvironment } = require('./environment');
const { buildProjectedConfiguration, proveEffectiveConfiguration } = require('./configuration');
const { resolveLaunchModel } = require('./model-resolution');
const {
  OpenCodeCLIError,
  compareIdentity,
  createOpenCodeCLIAdapter,
  observeIdentity,
} = require('../adapters/opencode-cli');

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
  PERMISSION_PROJECTION_DENIED: 'Permission projection denied required capability.',
  PERMISSION_PROJECTION_UNPROVABLE: 'Permission projection could not be proven.',
  EFFECTIVE_CONFIG_UNPROVABLE: 'Effective configuration could not be proven.',
  EFFECTIVE_CONFIG_MISMATCH: 'Effective configuration mismatch.',
  EFFECTIVE_PERMISSION_BROADENING: 'Effective permissions broaden projected permissions.',
  NATIVE_SHELL_DENIED: 'Native shell is denied.',
  WEB_AUTHORIZATION_MISSING: 'Web authorization is missing.',
  DELEGATION_DENIED: 'Delegation is denied.',
  PAID_API_DISABLED: 'Paid API is disabled.',
  GLOBAL_CONFIG_MUTATION_DENIED: 'Global config mutation is denied.',
  PROFILE_MODEL_BINDING_DENIED: 'Profile model binding is denied.',
  MODEL_REQUEST_UNSUPPORTED: 'Model request is unsupported.',
  MODEL_INELIGIBLE: 'Model is ineligible.',
  PROVIDER_INELIGIBLE: 'Provider is ineligible.',
  MODEL_SELECTION_UNRESOLVED: 'Model selection is unresolved.',
  MODEL_RESOLUTION_UNAVAILABLE: 'Model resolution is unavailable.',
  PROVIDER_RUNTIME_UNAVAILABLE: 'Provider or runtime is unavailable.',
  CONDITIONAL_AUTHORIZATION_MISSING: 'Conditional authorization is missing.',
  OPENCODE_NOT_FOUND: 'OpenCode executable not found.',
  OPENCODE_VERSION_UNSUPPORTED: 'OpenCode version is unsupported.',
  OPENCODE_CONFORMANCE_UNAVAILABLE: 'OpenCode conformance is unavailable.',
  ADAPTER_INVOCATION_FAILED: 'Adapter invocation failed.',
  ADAPTER_TIMEOUT: 'Adapter invocation timed out.',
  ADAPTER_ABORTED: 'Adapter invocation was aborted.',
  MALFORMED_ADAPTER_OUTPUT: 'Adapter output is malformed.',
  OBSERVED_IDENTITY_MISMATCH: 'Observed identity does not match resolved identity.',
  RUNTIME_PERMISSION_VIOLATION: 'Runtime permission violation.',
  OUTPUT_CONTRACT_VIOLATION: 'Output contract violation.',
  EVIDENCE_SANITIZATION_FAILED: 'Evidence sanitization failed.',
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
      envelope_digest: authorityResult?.evidence?.authority_envelope_digest || authorityResult?.evidence?.authority_envelope_digest || null,
      congruence_status: authorityResult?.congruence?.overall || 'NOT_EVALUATED',
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
      request_digest: authorityResult?.evidence?.request_digest || null,
      profile_digest: authorityResult?.evidence?.profile_digest || null,
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

function launchAgent(request, dependencies = {}) {
  const preflight = preflightAgentLaunch(request, dependencies);
  if (!preflight.ok) {
    return preflight;
  }

  const adapter = dependencies.adapter || createOpenCodeCLIAdapter();

  let adapterCapabilities;
  try {
    adapterCapabilities = adapter.getCapabilities();
  } catch (error) {
    const launchError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('OPENCODE_CONFORMANCE_UNAVAILABLE', 'UNAVAILABLE');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: false,
    });
  }

  let permissionResult;
  try {
    permissionResult = projectPermissions({
      profile: preflight.profile,
      resolvedAuthority: preflight.authority,
      adapterCapabilities,
    });
  } catch (error) {
    const launchError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('PERMISSION_PROJECTION_UNPROVABLE');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: false,
    });
  }

  let environmentResult;
  try {
    environmentResult = buildChildEnvironment({
      inherit: request.environment.inherit,
      systemEnvironment: dependencies.systemEnvironment || process.env,
      taskScopedInputsRef: request.environment.task_scoped_inputs_ref,
      resolveTaskScopedInputs: dependencies.resolveTaskScopedInputs,
      approvedTaskInputNames: dependencies.approvedTaskInputNames || [],
      expectedRoots: dependencies.expectedRoots || {},
    });
  } catch (error) {
    const launchError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('PERMISSION_PROJECTION_UNPROVABLE');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: false,
    });
  }

  let modelResult;
  try {
    modelResult = resolveLaunchModel({ request, resolvedAuthority: preflight.authority }, dependencies);
  } catch (error) {
    const launchError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('MODEL_RESOLUTION_UNAVAILABLE', 'UNAVAILABLE');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: false,
    });
  }

  let configurationResult;
  try {
    configurationResult = buildProjectedConfiguration({
      profileId: request.profile_id,
      permissions: permissionResult.permissions,
      identity: dependencies.resolvedIdentity || {
        resolved_model_ref: modelResult.identity.resolved_model_ref,
        resolved_provider_ref: modelResult.identity.resolved_provider_ref,
        resolved_runtime_ref: modelResult.identity.resolved_runtime_ref,
        model_resolution_ref: modelResult.identity.model_resolution_ref,
      },
      environment: { inherit: request.environment.inherit, ...environmentResult.evidence },
    });
  } catch (error) {
    const launchError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('PERMISSION_PROJECTION_DENIED');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: false,
    });
  }

  let configProof;
  try {
    configProof = proveEffectiveConfiguration({
      projection: configurationResult,
      effectiveConfigProbe: adapter.effectiveConfigProbe,
      invocation: {
        cwd: preflight.execution_observation.cwd,
        profile: request.profile_id,
      },
      environment: environmentResult.environment,
      agentName: request.profile_id,
    });
  } catch (error) {
    const launchError = error instanceof AgentLaunchPreflightError
      ? error
      : new AgentLaunchPreflightError('EFFECTIVE_CONFIG_UNPROVABLE');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: false,
    });
  }

  if (!configProof.ok) {
    return Object.freeze({
      ok: false,
      result: {
        schema_version: 'tecnotron-agent-launch/v1',
        operation_id: request.operation_id,
        accepted_authority_ref: request.accepted_authority_ref,
        profile_id: request.profile_id,
        status: configProof.error.status,
        reason_code: configProof.error.reason_code,
        phase: configProof.error.phase,
        resolved: {
          project_profile_ref: preflight.authority.project.project_profile_ref,
          repository_ref: preflight.authority.repository.repository_identity,
          worktree_ref: request.project.worktree_ref,
          cwd: preflight.execution_observation.cwd,
        },
        authority: {
          authority_kind: preflight.authority.authority_kind,
          authority_id: preflight.authority.authority_id,
          envelope_digest: preflight.evidence.authority_envelope_digest,
          congruence_status: preflight.congruence.overall,
        },
        identity: {
          request_state: request.model.request.state,
          requested_model_ref: request.model.request.model_ref,
          requested_provider_ref: request.model.request.provider_ref,
          model_request_ref: request.model.request.request_ref,
          resolved_model_ref: modelResult.identity.resolved_model_ref,
          resolved_provider_ref: modelResult.identity.resolved_provider_ref,
          resolved_runtime_ref: modelResult.identity.resolved_runtime_ref,
          model_resolution_ref: modelResult.identity.model_resolution_ref,
          observed_model_ref: null,
          observed_provider_ref: null,
          observed_runtime_ref: null,
          observed_runtime_version: null,
        },
        configuration: configProof.configuration,
        evidence: {
          request_digest: preflight.evidence.request_digest,
          profile_digest: preflight.evidence.profile_digest,
          permission_projection_digest: permissionResult.permission_projection_digest,
          conformance_evidence_ref: null,
          output_refs: [],
        },
        process: { exit_code: null, started_at: null, finished_at: null },
        details: DETAILS[configProof.error.reason_code] || 'Configuration proof failed.',
      },
      error: Object.freeze({
        status: configProof.error.status,
        reason_code: configProof.error.reason_code,
        phase: configProof.error.phase,
      }),
      actor_invoked: false,
    });
  }

  let invocationResult;
  try {
    invocationResult = adapter.invoke({
      cwd: preflight.execution_observation.cwd,
      agent: request.profile_id,
      model: modelResult.identity.resolved_model_ref,
      provider: modelResult.identity.resolved_provider_ref,
      runtime: modelResult.identity.resolved_runtime_ref,
      message: [request.context.context_ref || request.context.evidence_requirements_ref],
      format: 'json',
      timeout: request.execution.timeout_ms,
      environment: environmentResult.environment,
      projectedConfig: configurationResult.config,
    });
  } catch (error) {
    const launchError = error instanceof OpenCodeCLIError
      ? error
      : new OpenCodeCLIError('ADAPTER_INVOCATION_FAILED', 'FAILED');
    return Object.freeze({
      ok: false,
      result: normalizedFailure(launchError, request, { resolvedAuthority: preflight.authority, evidence: preflight.evidence }),
      error: Object.freeze({
        status: launchError.status,
        reason_code: launchError.reasonCode,
        phase: launchError.phase,
      }),
      actor_invoked: true,
    });
  }

  const observed = observeIdentity(invocationResult?.output, modelResult.identity);
  const identityComparison = compareIdentity(modelResult.identity, observed);
  const reasonCode = identityComparison.match ? 'LAUNCH_OPERATION_COMPLETED' : 'OBSERVED_IDENTITY_MISMATCH';
  const status = identityComparison.match ? 'COMPLETED' : 'FAILED';
  const phase = identityComparison.match ? 'COMPLETED' : 'OUTPUT_NORMALIZATION';
  const outputRef = invocationResult?.output
    ? digestValue({ kind: 'adapter-output', value: invocationResult.output })
    : null;
  const normalizedResult = AgentLaunchResult.parse({
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: request.operation_id,
    accepted_authority_ref: request.accepted_authority_ref,
    profile_id: request.profile_id,
    status,
    reason_code: reasonCode,
    phase,
    resolved: {
      project_profile_ref: preflight.authority.project.project_profile_ref,
      repository_ref: preflight.authority.repository.repository_identity,
      worktree_ref: request.project.worktree_ref,
      cwd: preflight.execution_observation.cwd,
    },
    authority: {
      authority_kind: preflight.authority.authority_kind,
      authority_id: preflight.authority.authority_id,
      envelope_digest: preflight.evidence.authority_envelope_digest,
      congruence_status: preflight.congruence.overall,
    },
    identity: {
      request_state: request.model.request.state,
      requested_model_ref: request.model.request.model_ref,
      requested_provider_ref: request.model.request.provider_ref,
      model_request_ref: request.model.request.request_ref,
      resolved_model_ref: modelResult.identity.resolved_model_ref,
      resolved_provider_ref: modelResult.identity.resolved_provider_ref,
      resolved_runtime_ref: modelResult.identity.resolved_runtime_ref,
      model_resolution_ref: modelResult.identity.model_resolution_ref,
      observed_model_ref: observed.model,
      observed_provider_ref: observed.provider,
      observed_runtime_ref: observed.runtime,
      observed_runtime_version: observed.version,
    },
    configuration: configProof.configuration,
    evidence: {
      request_digest: preflight.evidence.request_digest,
      profile_digest: preflight.evidence.profile_digest,
      permission_projection_digest: permissionResult.permission_projection_digest,
      conformance_evidence_ref: configProof.configuration.capability_evidence_ref,
      output_refs: outputRef ? [outputRef] : [],
    },
    process: {
      exit_code: Number.isInteger(invocationResult?.exitCode) ? invocationResult.exitCode : null,
      started_at: invocationResult?.startedAt || null,
      finished_at: invocationResult?.finishedAt || null,
    },
    details: DETAILS[reasonCode] || (identityComparison.match
      ? 'Agent launch completed.'
      : 'Observed identity does not match resolved identity.'),
  });

  return Object.freeze({
    ok: identityComparison.match,
    result: normalizedResult,
    error: identityComparison.match ? null : Object.freeze({
      status,
      reason_code: reasonCode,
      phase,
    }),
    adapter: Object.freeze({
      adapter_id: adapter.id,
      adapter_version: adapter.version,
      executable_version: invocationResult?.version || null,
    }),
    identity_comparison: Object.freeze(identityComparison),
    actor_invoked: true,
  });
}

module.exports = { preflightAgentLaunch, launchAgent };
