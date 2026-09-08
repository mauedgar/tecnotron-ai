'use strict';

const { AgentLaunchPreflightError, digestValue } = require('./authority');

const REQUIRED_DENIAL_PROOFS = Object.freeze([
  'scope_containment',
  'delegation_denied',
  'subagents_denied',
  'task_spawning_denied',
  'paid_api_denied',
  'additional_tools_denied',
  'additional_skills_denied',
  'mcp_denied',
  'plugins_denied',
  'indirect_capability_routes_denied',
  'unauthorized_web_denied',
  'external_filesystem_denied',
]);
const ADAPTER_CAPABILITY_KEYS = Object.freeze(['repository_read', 'filesystem_write', 'web', 'enforcement']);
const ENFORCEMENT_KEYS = Object.freeze(['native_actor_shell_denied', ...REQUIRED_DENIAL_PROOFS]);

function immutable(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}

function projectPermissions({ profile, resolvedAuthority, adapterCapabilities }) {
  if (!profile || !resolvedAuthority || !adapterCapabilities || typeof adapterCapabilities !== 'object') {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_UNPROVABLE');
  }
  if (
    Object.keys(adapterCapabilities).length !== ADAPTER_CAPABILITY_KEYS.length
    || Object.keys(adapterCapabilities).some((key) => !ADAPTER_CAPABILITY_KEYS.includes(key))
    || ['repository_read', 'filesystem_write', 'web'].some((key) => typeof adapterCapabilities[key] !== 'boolean')
    || !adapterCapabilities.enforcement
    || Object.keys(adapterCapabilities.enforcement).length !== ENFORCEMENT_KEYS.length
    || Object.keys(adapterCapabilities.enforcement).some((key) => !ENFORCEMENT_KEYS.includes(key))
  ) {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_UNPROVABLE');
  }
  if (resolvedAuthority.profile_id === 'researcher' && !resolvedAuthority.authorization?.research_authorization_ref) {
    throw new AgentLaunchPreflightError('WEB_AUTHORIZATION_MISSING');
  }
  if (adapterCapabilities.enforcement?.native_actor_shell_denied !== true) {
    throw new AgentLaunchPreflightError('NATIVE_SHELL_DENIED');
  }
  if (REQUIRED_DENIAL_PROOFS.some((name) => adapterCapabilities.enforcement?.[name] !== true)) {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_UNPROVABLE');
  }
  if (adapterCapabilities.repository_read !== true) {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_DENIED');
  }

  const writeMode = profile.permissions?.filesystem_write;
  const writer = writeMode === 'task_owned_source' || writeMode === 'task_owned_docs';
  if (writer && (
    resolvedAuthority.authority_kind !== 'TASK_OWNED_WRITE'
    || !resolvedAuthority.authorization?.task_authorization_ref
    || !Array.isArray(resolvedAuthority.scope?.write_scope)
    || resolvedAuthority.scope.write_scope.length === 0
    || adapterCapabilities.filesystem_write !== true
  )) {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_DENIED');
  }
  if (!writer && resolvedAuthority.scope?.write_scope?.length) {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_DENIED');
  }

  const webAllowed = resolvedAuthority.profile_id === 'researcher'
    && profile.permissions?.web === 'authorized_research_task_only';
  if (webAllowed && adapterCapabilities.web !== true) {
    throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_UNPROVABLE');
  }

  const permissions = immutable({
    default: 'deny',
    repository_read: {
      mode: 'declared_scope',
      scope: [...resolvedAuthority.scope.read_scope],
    },
    filesystem_write: {
      mode: writer ? writeMode : 'denied',
      scope: writer ? [...resolvedAuthority.scope.write_scope] : [],
    },
    command_execution: 'denied',
    native_actor_shell: 'denied',
    web: webAllowed ? 'authorized_research_task_only' : 'denied',
    delegation: 'denied',
    subagents: 'denied',
    task_spawning: 'denied',
    subagent_depth: 0,
    tools: [],
    skills: [],
    mcp: [],
    plugins: [],
    git_mutation: 'denied',
    planning_provider_mutation: 'denied',
    workspace_lifecycle: 'denied',
    dependency_mutation: 'denied',
    secret_access: 'denied',
    paid_api: 'denied',
    indirect_capability_routes: 'denied',
    external_filesystem_access: 'denied',
  });
  const projectionEvidence = {
    profile_id: resolvedAuthority.profile_id,
    authority_kind: resolvedAuthority.authority_kind,
    authorization: {
      task: Boolean(resolvedAuthority.authorization?.task_authorization_ref),
      research: Boolean(resolvedAuthority.authorization?.research_authorization_ref),
    },
    scope: resolvedAuthority.scope,
    proven_adapter_capabilities: adapterCapabilities,
    effective_permissions: permissions,
  };

  return immutable({
    permissions,
    permission_projection_digest: digestValue({ kind: 'permission-projection', value: projectionEvidence }),
    effective_permission_digest: digestValue({ kind: 'effective-permissions', value: permissions }),
  });
}

module.exports = { projectPermissions };
