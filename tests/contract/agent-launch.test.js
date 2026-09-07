'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  AGENT_LAUNCH_SCHEMA_VERSION,
  AgentLaunchRequest,
  AgentLaunchResult,
  ResolvedAuthority,
} = require('../../src/contracts/agent-launch');

const authorization = {
  task_authorization_ref: null,
  research_authorization_ref: null,
  change_snapshot_ref: null,
  validation_evidence_ref: null,
  evidence_snapshot_ref: null,
  evidence_matrix_ref: null,
};

function request(overrides = {}) {
  return {
    schema_version: AGENT_LAUNCH_SCHEMA_VERSION,
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    project: {
      project_profile_ref: 'project-profile:001@abc',
      repository_ref: 'fitflow-ai',
      cwd: 'C:/work/project',
      worktree_ref: null,
    },
    scope: { read_scope: ['src/**'], write_scope: [] },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    authorization: { ...authorization },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: null,
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
    ...overrides,
  };
}

function authority(overrides = {}) {
  return {
    authority_kind: 'READ_ONLY_ANALYSIS',
    authority_id: 'authority-001',
    operation_id: 'operation-001',
    profile_id: 'spec_analyst',
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: 'project-profile:001@abc',
      repository_root: 'C:/work/project',
    },
    repository: {
      repository_identity: 'fitflow-ai',
      worktree_path: null,
      cwd: 'C:/work/project',
      branch: 'task-branch',
      head_or_baseline: 'a'.repeat(40),
    },
    authorization: { ...authorization },
    scope: { read_scope: ['src/**'], write_scope: [] },
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    profile_inputs: {
      problem: 'evidence:problem@abc',
      accepted_authorities: 'evidence:authorities@abc',
      constraints: 'evidence:constraints@abc',
      gaps: 'evidence:gaps@abc',
    },
    provenance: { accepted_authority_ref: 'authority:001@abc' },
    ...overrides,
  };
}

function result(overrides = {}) {
  return {
    schema_version: AGENT_LAUNCH_SCHEMA_VERSION,
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: 'spec_analyst',
    status: 'BLOCKED',
    reason_code: 'SCOPE_INVALID',
    phase: 'PREFLIGHT',
    resolved: {
      project_profile_ref: 'project-profile:001@abc',
      repository_ref: 'fitflow-ai',
      worktree_ref: null,
      cwd: 'C:/work/project',
    },
    authority: {
      authority_kind: 'READ_ONLY_ANALYSIS',
      authority_id: 'authority-001',
      envelope_digest: `sha256:${'a'.repeat(64)}`,
      congruence_status: 'ASSERTED_AND_EQUAL',
    },
    identity: {
      request_state: 'EXPLICIT_CONSTRAINTS',
      requested_model_ref: 'model:free@v1',
      requested_provider_ref: null,
      model_request_ref: 'model-request:001@abc',
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
      request_digest: `sha256:${'b'.repeat(64)}`,
      profile_digest: null,
      permission_projection_digest: null,
      conformance_evidence_ref: null,
      output_refs: [],
    },
    process: {
      exit_code: null,
      started_at: null,
      finished_at: null,
    },
    details: 'Scope validation failed.',
    ...overrides,
  };
}

test('request accepts the explicit strict v1 shape', () => {
  const parsed = AgentLaunchRequest.safeParse(request());
  assert.strictEqual(parsed.success, true, JSON.stringify(parsed.error?.issues));
});

test('request rejects unknown, missing, malformed, and compatibility-alias fields', () => {
  const cases = [
    { ...request(), unknown: true },
    (() => { const value = request(); delete value.operation_id; return value; })(),
    { ...request(), execution: { adapter_id: 'opencode-cli', timeout_ms: 0 } },
    { ...request(), profile_id: 'coder_a' },
    { ...request(), project: { ...request().project, repository: 'legacy-alias' } },
    { ...request(), environment: { inherit: 'false', task_scoped_inputs_ref: null } },
  ];
  for (const value of cases) assert.strictEqual(AgentLaunchRequest.safeParse(value).success, false);
});

test('request enforces context one-of and both closed model request states', () => {
  const noContext = request({ context: {
    context_ref: null,
    evidence_requirements_ref: null,
    context_budget_ref: 'context-budget:large@v1',
  } });
  const doubleContext = request({ context: {
    context_ref: 'context:001@abc',
    evidence_requirements_ref: 'requirements:001@abc',
    context_budget_ref: 'context-budget:large@v1',
  } });
  assert.strictEqual(AgentLaunchRequest.safeParse(noContext).success, false);
  assert.strictEqual(AgentLaunchRequest.safeParse(doubleContext).success, false);

  const selection = request({ model: {
    request: {
      state: 'AUTHORIZED_DETERMINISTIC_SELECTION',
      request_ref: null,
      model_ref: null,
      provider_ref: null,
      runtime_constraints_ref: null,
    },
    routing_decision_ref: null,
    resolution_ref: null,
  } });
  assert.strictEqual(AgentLaunchRequest.safeParse(selection).success, true);
  selection.model.request.provider_ref = 'provider:unexpected@v1';
  assert.strictEqual(AgentLaunchRequest.safeParse(selection).success, false);

  const providerOnly = request();
  providerOnly.model.request.model_ref = null;
  providerOnly.model.request.provider_ref = 'provider:free@v1';
  assert.strictEqual(AgentLaunchRequest.safeParse(providerOnly).success, true);
  providerOnly.model.request.provider_ref = null;
  assert.strictEqual(AgentLaunchRequest.safeParse(providerOnly).success, false);
});

test('resolved authority accepts exactly the nine profile/kind combinations', () => {
  const cases = [
    ['READ_ONLY_ANALYSIS', 'spec_analyst'],
    ['READ_ONLY_ANALYSIS', 'planner'],
    ['READ_ONLY_ANALYSIS', 'architect'],
    ['READ_ONLY_ANALYSIS', 'explorer'],
    ['TASK_OWNED_WRITE', 'implementer'],
    ['TASK_OWNED_WRITE', 'doc_curator'],
    ['AUTHORIZED_RESEARCH', 'researcher'],
    ['CHANGE_REVIEW', 'reviewer'],
    ['CONFORMANCE_AUDIT', 'auditor'],
  ];
  for (const [authorityKind, profileId] of cases) {
    const value = authority({ authority_kind: authorityKind, profile_id: profileId });
    if (authorityKind === 'TASK_OWNED_WRITE') {
      value.repository.worktree_path = 'C:/work/project';
      value.scope.write_scope = ['src/**'];
      value.authorization.task_authorization_ref = 'task:001@abc';
    }
    if (authorityKind === 'AUTHORIZED_RESEARCH') value.authorization.research_authorization_ref = 'research:001@abc';
    if (authorityKind === 'CHANGE_REVIEW') {
      value.authorization.change_snapshot_ref = 'change:001@abc';
      value.authorization.validation_evidence_ref = 'validation:001@abc';
    }
    if (authorityKind === 'CONFORMANCE_AUDIT') {
      value.authorization.evidence_snapshot_ref = 'evidence:001@abc';
      value.authorization.evidence_matrix_ref = 'matrix:001@abc';
    }
    assert.strictEqual(ResolvedAuthority.safeParse(value).success, true, `${authorityKind}/${profileId}`);
  }
});

test('resolved authority rejects unknown, incompatible, missing, forbidden, and contradictory fields', () => {
  const unknownKind = authority({ authority_kind: 'DEVELOPER_OVERRIDE' });
  const incompatible = authority({ profile_id: 'reviewer' });
  const writerWithoutTask = authority({ authority_kind: 'TASK_OWNED_WRITE', profile_id: 'implementer' });
  const readOnlyWithWrite = authority({ scope: { read_scope: ['src/**'], write_scope: ['src/**'] } });
  const researchWithTask = authority({ authority_kind: 'AUTHORIZED_RESEARCH', profile_id: 'researcher' });
  researchWithTask.authorization.research_authorization_ref = 'research:001@abc';
  researchWithTask.authorization.task_authorization_ref = 'task:forbidden@abc';
  for (const value of [unknownKind, incompatible, writerWithoutTask, readOnlyWithWrite, researchWithTask]) {
    assert.strictEqual(ResolvedAuthority.safeParse(value).success, false);
  }
});

test('normalized result is strict and reason codes belong to exactly one status', () => {
  assert.strictEqual(AgentLaunchResult.safeParse(result()).success, true);
  assert.strictEqual(AgentLaunchResult.safeParse(result({ unknown: true })).success, false);
  assert.strictEqual(AgentLaunchResult.safeParse(result({ status: 'FAILED', reason_code: 'SCOPE_INVALID' })).success, false);
  assert.strictEqual(AgentLaunchResult.safeParse(result({ status: 'BLOCKED', reason_code: 'ADAPTER_TIMEOUT' })).success, false);
  assert.strictEqual(AgentLaunchResult.safeParse(result({ status: 'COMPLETED', reason_code: 'LAUNCH_OPERATION_COMPLETED', phase: 'COMPLETED' })).success, true);
  assert.strictEqual(AgentLaunchResult.safeParse(result({ details: 'password=hunter2' })).success, false);
});

module.exports = { authorization, request, authority, result };
