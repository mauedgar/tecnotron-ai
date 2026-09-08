'use strict';

const { AgentLaunchPreflightError, canonicalJson, digestValue } = require('./authority');
const { sanitizeCapabilityEvidence } = require('./evidence-sanitizer');

const CONFIG_SCHEMA_VERSION = 'tecnotron-opencode-config-projection/v1';
const CONFIG_SOURCE_STATES = Object.freeze({
  remote: 'excluded',
  organizational: 'excluded',
  global: 'excluded',
  personal: 'excluded',
  custom: 'excluded',
  project: 'projected',
  managed: 'excluded',
  inline: 'excluded',
});
const DENIED_FIELDS = Object.freeze([
  'command_execution',
  'native_actor_shell',
  'delegation',
  'subagents',
  'task_spawning',
  'git_mutation',
  'planning_provider_mutation',
  'workspace_lifecycle',
  'dependency_mutation',
  'secret_access',
  'paid_api',
  'indirect_capability_routes',
  'external_filesystem_access',
]);
const ARRAY_FIELDS = Object.freeze(['tools', 'skills', 'mcp', 'plugins']);

function clone(value) {
  return structuredClone(value);
}

function immutable(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function validScopePermission(value, write = false) {
  if (!exactKeys(value, ['mode', 'scope']) || !Array.isArray(value.scope) || !value.scope.every((entry) => typeof entry === 'string')) return false;
  const modes = write ? ['denied', 'task_owned_source', 'task_owned_docs'] : ['declared_scope'];
  return modes.includes(value.mode) && (value.mode !== 'denied' || value.scope.length === 0);
}

function validConfig(config) {
  if (!exactKeys(config, ['schema_version', 'profile_id', 'identity', 'permissions', 'environment', 'config_sources', 'runtime'])) return false;
  if (config.schema_version !== CONFIG_SCHEMA_VERSION || typeof config.profile_id !== 'string' || !config.profile_id) return false;
  if (!exactKeys(config.identity, ['resolved_model_ref', 'resolved_provider_ref', 'resolved_runtime_ref', 'model_resolution_ref'])) return false;
  if (Object.values(config.identity).some((value) => typeof value !== 'string' || !value)) return false;
  const permissionKeys = ['default', 'repository_read', 'filesystem_write', 'web', 'subagent_depth', ...DENIED_FIELDS, ...ARRAY_FIELDS];
  if (!exactKeys(config.permissions, permissionKeys) || !['deny', 'allow'].includes(config.permissions.default)) return false;
  if (!validScopePermission(config.permissions.repository_read) || !validScopePermission(config.permissions.filesystem_write, true)) return false;
  if (!['denied', 'authorized_research_task_only'].includes(config.permissions.web) || config.permissions.subagent_depth !== 0) return false;
  if (DENIED_FIELDS.some((field) => !['denied', 'allowed'].includes(config.permissions[field]))) return false;
  if (ARRAY_FIELDS.some((field) => !Array.isArray(config.permissions[field]) || !config.permissions[field].every((entry) => typeof entry === 'string'))) return false;
  if (!exactKeys(config.environment, ['inherit', 'names']) || config.environment.inherit !== false) return false;
  if (!Array.isArray(config.environment.names) || !config.environment.names.every((name) => typeof name === 'string')) return false;
  if (!exactKeys(config.config_sources, Object.keys(CONFIG_SOURCE_STATES))) return false;
  if (Object.values(config.config_sources).some((state) => !['excluded', 'projected', 'applied', 'not_applicable'].includes(state))) return false;
  if (!exactKeys(config.runtime, ['sharing', 'autoupdate']) || !['denied', 'allowed'].includes(config.runtime.sharing) || !['denied', 'allowed'].includes(config.runtime.autoupdate)) return false;
  return true;
}

function buildProjectedConfiguration({ profileId, permissions, identity, environment }) {
  const config = {
    schema_version: CONFIG_SCHEMA_VERSION,
    profile_id: profileId,
    identity: clone(identity),
    permissions: clone(permissions),
    environment: { inherit: environment?.inherit, names: [...(environment?.names || [])].sort() },
    config_sources: { ...CONFIG_SOURCE_STATES },
    runtime: { sharing: 'denied', autoupdate: 'denied' },
  };
  if (
    !validConfig(config)
    || config.permissions.default !== 'deny'
    || DENIED_FIELDS.some((field) => config.permissions[field] !== 'denied')
    || ARRAY_FIELDS.some((field) => config.permissions[field].length !== 0)
  ) throw new AgentLaunchPreflightError('PERMISSION_PROJECTION_DENIED');
  immutable(config);
  return immutable({
    config,
    projected_config_digest: digestValue({ kind: 'projected-config', value: config }),
    effective_permission_digest: digestValue({ kind: 'projected-permissions', value: config.permissions }),
  });
}

function validScope(scope) {
  return typeof scope === 'string'
    && scope.length > 0
    && !scope.includes('\\')
    && !scope.includes('\0')
    && !scope.startsWith('/')
    && !/^[A-Za-z]:/.test(scope)
    && scope.split('/').every((segment) => segment && segment !== '.' && segment !== '..' && !/%2e/i.test(segment));
}

function scopeContained(candidate, allowed) {
  if (!validScope(candidate) || !validScope(allowed)) return false;
  if (candidate === allowed) return true;
  if (allowed === '**') return true;
  if (!allowed.endsWith('/**')) return false;
  const base = allowed.slice(0, -3);
  return candidate === base || candidate.startsWith(`${base}/`);
}

function setIsSubset(actual, ceiling, scopeAware = false) {
  return actual.every((value) => scopeAware
    ? ceiling.some((allowed) => scopeContained(value, allowed))
    : ceiling.includes(value));
}

function compareEffectiveConfiguration(projected, effective) {
  if (!validConfig(projected) || !validConfig(effective)) return 'UNPROVABLE';
  if (canonicalJson(projected) === canonicalJson(effective)) return 'CONFORMANT';
  if (
    projected.schema_version !== effective.schema_version
    || projected.profile_id !== effective.profile_id
    || canonicalJson(projected.identity) !== canonicalJson(effective.identity)
  ) return 'MISMATCH';

  const projectedPermissions = projected.permissions;
  const effectivePermissions = effective.permissions;
  let broader = false;
  if (effectivePermissions.default !== 'deny') broader = true;
  if (effectivePermissions.repository_read.mode !== projectedPermissions.repository_read.mode) broader = true;
  if (!setIsSubset(effectivePermissions.repository_read.scope, projectedPermissions.repository_read.scope, true)) broader = true;
  if (projectedPermissions.filesystem_write.mode === 'denied' && effectivePermissions.filesystem_write.mode !== 'denied') broader = true;
  if (
    projectedPermissions.filesystem_write.mode !== 'denied'
    && !['denied', projectedPermissions.filesystem_write.mode].includes(effectivePermissions.filesystem_write.mode)
  ) broader = true;
  if (!setIsSubset(effectivePermissions.filesystem_write.scope, projectedPermissions.filesystem_write.scope, true)) broader = true;
  if (projectedPermissions.web === 'denied' && effectivePermissions.web !== 'denied') broader = true;
  if (DENIED_FIELDS.some((field) => projectedPermissions[field] === 'denied' && effectivePermissions[field] !== 'denied')) broader = true;
  if (ARRAY_FIELDS.some((field) => !setIsSubset(effectivePermissions[field], projectedPermissions[field]))) broader = true;
  if (!setIsSubset(effective.environment.names, projected.environment.names)) broader = true;
  if (Object.keys(CONFIG_SOURCE_STATES).some((source) => (
    projected.config_sources[source] === 'excluded'
    && !['excluded', 'not_applicable'].includes(effective.config_sources[source])
  ))) broader = true;
  if (effective.runtime.sharing !== 'denied' || effective.runtime.autoupdate !== 'denied') broader = true;
  if (broader) return 'BROADER';
  return 'SAFELY_NARROWER';
}

function failedProof(projection, status, reasonCode, errorStatus = 'BLOCKED') {
  return immutable({
    ok: false,
    configuration: {
      projected_config_digest: projection?.projected_config_digest || null,
      effective_config_digest: null,
      effective_permission_digest: null,
      proof_mechanism: 'EFFECTIVE_CONFIG_PROBE',
      conformance_status: status,
      capability_evidence_ref: null,
    },
    error: { status: errorStatus, reason_code: reasonCode, phase: 'PREFLIGHT' },
    actor_invoked: false,
  });
}

function proveEffectiveConfiguration({ projection, effectiveConfigProbe, invocation = {}, environment, agentName } = {}) {
  if (!projection || !validConfig(projection.config) || typeof effectiveConfigProbe !== 'function') {
    return failedProof(projection, 'UNPROVABLE', 'EFFECTIVE_CONFIG_UNPROVABLE');
  }
  let probeResult;
  try {
    probeResult = effectiveConfigProbe({
      projected_config: clone(projection.config),
      invocation: clone(invocation),
      environment: clone(environment),
      agent_name: agentName,
    });
  } catch {
    return failedProof(projection, 'UNPROVABLE', 'EFFECTIVE_CONFIG_UNPROVABLE');
  }
  if (!exactKeys(probeResult, ['effective_config', 'capability_evidence'])) {
    return failedProof(projection, 'UNPROVABLE', 'EFFECTIVE_CONFIG_UNPROVABLE');
  }
  const status = compareEffectiveConfiguration(projection.config, probeResult.effective_config);
  if (status === 'UNPROVABLE') return failedProof(projection, status, 'EFFECTIVE_CONFIG_UNPROVABLE');

  let sanitized;
  try {
    sanitized = sanitizeCapabilityEvidence(probeResult.capability_evidence);
  } catch {
    return failedProof(projection, status, 'EVIDENCE_SANITIZATION_FAILED', 'FAILED');
  }
  const configuration = {
    projected_config_digest: projection.projected_config_digest,
    effective_config_digest: digestValue({ kind: 'effective-config', value: probeResult.effective_config }),
    effective_permission_digest: digestValue({ kind: 'effective-permissions', value: probeResult.effective_config.permissions }),
    proof_mechanism: 'EFFECTIVE_CONFIG_PROBE',
    conformance_status: status,
    capability_evidence_ref: sanitized.capability_evidence_ref,
  };
  if (status === 'MISMATCH') {
    return immutable({ ok: false, configuration, error: { status: 'BLOCKED', reason_code: 'EFFECTIVE_CONFIG_MISMATCH', phase: 'PREFLIGHT' }, actor_invoked: false });
  }
  if (status === 'BROADER') {
    return immutable({ ok: false, configuration, error: { status: 'BLOCKED', reason_code: 'EFFECTIVE_PERMISSION_BROADENING', phase: 'PREFLIGHT' }, actor_invoked: false });
  }
  return immutable({
    ok: true,
    configuration,
    capability_evidence: sanitized.evidence,
    actor_invoked: false,
  });
}

module.exports = {
  CONFIG_SCHEMA_VERSION,
  buildProjectedConfiguration,
  compareEffectiveConfiguration,
  proveEffectiveConfiguration,
};
