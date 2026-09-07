'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const {
  AgentLaunchRequest,
  ResolvedAuthority,
} = require('../contracts/agent-launch');
const { loadAgentProfiles } = require('../registries/agent-profiles');
const { AgentProfileRegistry } = require('../registries/schemas/agent-profiles');

const CANONICAL_PROFILE_INPUTS = new Set([
  'accepted_authority_ref',
  'resolved_project_profile_ref',
  'resolved_repository_ref',
  'read_scope',
  'context_ref_or_evidence_requirements',
  'context_budget',
  'task_authorization_ref',
  'write_scope_if_writer',
  'research_authorization_ref',
  'change_snapshot_ref',
  'validation_evidence_ref',
  'evidence_snapshot_ref',
  'evidence_matrix_ref',
]);

const KIND_PROFILES = {
  READ_ONLY_ANALYSIS: ['spec_analyst', 'planner', 'architect', 'explorer'],
  TASK_OWNED_WRITE: ['implementer', 'doc_curator'],
  AUTHORIZED_RESEARCH: ['researcher'],
  CHANGE_REVIEW: ['reviewer'],
  CONFORMANCE_AUDIT: ['auditor'],
};

class AgentLaunchPreflightError extends Error {
  constructor(reasonCode, status = 'BLOCKED', phase = 'PREFLIGHT') {
    super(reasonCode);
    this.name = 'AgentLaunchPreflightError';
    this.reasonCode = reasonCode;
    this.status = status;
    this.phase = phase;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digestValue(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function equal(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function samePath(left, right) {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function requireEqual(actual, expected, reasonCode) {
  if (!equal(actual, expected)) throw new AgentLaunchPreflightError(reasonCode);
}

function validateProfileInputs(request, authority, profile) {
  const expectedKeys = profile.required_inputs.filter((key) => !CANONICAL_PROFILE_INPUTS.has(key));
  const actualKeys = Object.keys(request.profile_inputs);
  const authorityKeys = Object.keys(authority.profile_inputs);
  if (!equal(actualKeys.sort(), [...expectedKeys].sort()) || !equal(authorityKeys.sort(), [...expectedKeys].sort())) {
    throw new AgentLaunchPreflightError('AUTHORITY_INPUT_MISMATCH');
  }
  requireEqual(request.profile_inputs, authority.profile_inputs, 'AUTHORITY_INPUT_MISMATCH');

  const aliases = request.profile_inputs;
  if (aliases.task_worktree !== undefined) {
    if (authority.repository.worktree_path === null || !samePath(aliases.task_worktree, authority.repository.worktree_path)) {
      throw new AgentLaunchPreflightError('WORKTREE_AUTHORITY_MISMATCH');
    }
  }
  if (aliases.write_scope !== undefined) requireEqual(aliases.write_scope, authority.scope.write_scope, 'SCOPE_AUTHORITY_MISMATCH');
  if (aliases.documentation_write_scope !== undefined) requireEqual(aliases.documentation_write_scope, authority.scope.write_scope, 'SCOPE_AUTHORITY_MISMATCH');
  if (aliases.context_reference !== undefined) {
    const selectedContext = authority.context.context_ref || authority.context.evidence_requirements_ref;
    requireEqual(aliases.context_reference, selectedContext, 'CONTEXT_AUTHORITY_MISMATCH');
  }
}

function resolveLaunchAuthority(requestInput, { authorityResolver, profileRegistry } = {}) {
  const parsedRequest = AgentLaunchRequest.safeParse(requestInput);
  if (!parsedRequest.success) throw new AgentLaunchPreflightError('REQUEST_INVALID', 'BLOCKED', 'REQUEST');
  const request = parsedRequest.data;

  if (typeof authorityResolver !== 'function') throw new AgentLaunchPreflightError('AUTHORITY_RESOLUTION_FAILED');

  let unresolved;
  try {
    unresolved = authorityResolver(request.accepted_authority_ref);
  } catch {
    throw new AgentLaunchPreflightError('AUTHORITY_RESOLUTION_FAILED');
  }
  const parsedAuthority = ResolvedAuthority.safeParse(unresolved);
  if (!parsedAuthority.success) {
    const kind = unresolved?.authority_kind;
    const profileAllowed = KIND_PROFILES[kind]?.includes(unresolved?.profile_id);
    if (!KIND_PROFILES[kind] || profileAllowed === false) throw new AgentLaunchPreflightError('AUTHORITY_KIND_UNSUPPORTED');
    throw new AgentLaunchPreflightError('AUTHORITY_INSUFFICIENT');
  }
  const resolvedAuthority = parsedAuthority.data;

  requireEqual(resolvedAuthority.provenance.accepted_authority_ref, request.accepted_authority_ref, 'AUTHORITY_INPUT_MISMATCH');
  requireEqual(resolvedAuthority.operation_id, request.operation_id, 'AUTHORITY_INPUT_MISMATCH');
  requireEqual(resolvedAuthority.profile_id, request.profile_id, 'AUTHORITY_INPUT_MISMATCH');
  requireEqual(resolvedAuthority.authorization, request.authorization, 'AUTHORITY_INPUT_MISMATCH');
  requireEqual(resolvedAuthority.project.project_profile_ref, request.project.project_profile_ref, 'WORKTREE_AUTHORITY_MISMATCH');
  requireEqual(resolvedAuthority.repository.repository_identity, request.project.repository_ref, 'WORKTREE_AUTHORITY_MISMATCH');
  if (!samePath(resolvedAuthority.repository.cwd, request.project.cwd)) throw new AgentLaunchPreflightError('WORKTREE_AUTHORITY_MISMATCH');
  if (request.project.worktree_ref !== null) {
    if (resolvedAuthority.repository.worktree_path === null || !samePath(resolvedAuthority.repository.worktree_path, request.project.worktree_ref)) {
      throw new AgentLaunchPreflightError('WORKTREE_AUTHORITY_MISMATCH');
    }
  } else if (resolvedAuthority.repository.worktree_path !== null) {
    throw new AgentLaunchPreflightError('WORKTREE_AUTHORITY_MISMATCH');
  }
  requireEqual(resolvedAuthority.scope, request.scope, 'SCOPE_AUTHORITY_MISMATCH');
  requireEqual(resolvedAuthority.context, request.context, 'CONTEXT_AUTHORITY_MISMATCH');
  requireEqual(resolvedAuthority.profile_inputs, request.profile_inputs, 'AUTHORITY_INPUT_MISMATCH');

  let registry;
  try {
    registry = profileRegistry || loadAgentProfiles();
  } catch {
    throw new AgentLaunchPreflightError('PROFILE_CONTRACT_INVALID');
  }
  const profile = registry?.profiles?.[request.profile_id];
  if (!profile) throw new AgentLaunchPreflightError('PROFILE_UNKNOWN');
  if (profileRegistry && !AgentProfileRegistry.safeParse(registry).success) {
    throw new AgentLaunchPreflightError('PROFILE_CONTRACT_INVALID');
  }
  validateProfileInputs(request, resolvedAuthority, profile);

  const coordinates = {
    operation_id: 'ASSERTED_AND_EQUAL',
    accepted_authority_ref: 'ASSERTED_AND_EQUAL',
    profile_id: 'ASSERTED_AND_EQUAL',
    'project.project_profile_ref': 'ASSERTED_AND_EQUAL',
    'project.repository_ref': 'ASSERTED_AND_EQUAL',
    'project.cwd': 'ASSERTED_AND_EQUAL',
    'project.worktree_ref': request.project.worktree_ref === null ? 'DERIVED' : 'ASSERTED_AND_EQUAL',
    'scope.read_scope': 'ASSERTED_AND_EQUAL',
    'scope.write_scope': 'ASSERTED_AND_EQUAL',
    'context.context_ref': request.context.context_ref === null ? 'DERIVED' : 'ASSERTED_AND_EQUAL',
    'context.evidence_requirements_ref': request.context.evidence_requirements_ref === null ? 'DERIVED' : 'ASSERTED_AND_EQUAL',
    'context.context_budget_ref': 'ASSERTED_AND_EQUAL',
  };
  for (const [name, value] of Object.entries(request.authorization)) {
    coordinates[`authorization.${name}`] = value === null ? 'DERIVED' : 'ASSERTED_AND_EQUAL';
  }
  for (const name of Object.keys(request.profile_inputs)) coordinates[`profile_inputs.${name}`] = 'ASSERTED_AND_EQUAL';
  const coordinateStates = Object.values(coordinates);
  const derived = coordinateStates.includes('DERIVED');

  return Object.freeze({
    request,
    resolvedAuthority,
    profile,
    congruence: Object.freeze({
      overall: derived ? 'MIXED_CONGRUENT' : 'ASSERTED_AND_EQUAL',
      coordinates: Object.freeze(coordinates),
      asserted_count: coordinateStates.filter((state) => state === 'ASSERTED_AND_EQUAL').length,
      derived_present: derived,
    }),
    evidence: Object.freeze({
      request_digest: digestValue(request),
      authority_envelope_digest: digestValue(resolvedAuthority),
      profile_digest: digestValue(profile),
    }),
  });
}

module.exports = {
  AgentLaunchPreflightError,
  canonicalJson,
  digestValue,
  resolveLaunchAuthority,
};
