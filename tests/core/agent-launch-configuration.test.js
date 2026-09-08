'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  buildProjectedConfiguration,
  compareEffectiveConfiguration,
  proveEffectiveConfiguration,
} = require('../../src/agent-launch/configuration');

function permissions(overrides = {}) {
  return {
    default: 'deny',
    repository_read: { mode: 'declared_scope', scope: ['src/**'] },
    filesystem_write: { mode: 'denied', scope: [] },
    command_execution: 'denied',
    native_actor_shell: 'denied',
    web: 'denied',
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
    ...overrides,
  };
}

function identity() {
  return {
    resolved_model_ref: 'alpha',
    resolved_provider_ref: 'local',
    resolved_runtime_ref: 'runtime-alpha',
    model_resolution_ref: `sha256:${'a'.repeat(64)}`,
  };
}

function projected(permissionOverrides = {}) {
  return buildProjectedConfiguration({
    profileId: 'spec_analyst',
    permissions: permissions(permissionOverrides),
    identity: identity(),
    environment: { inherit: false, names: ['LANG', 'PATH'] },
  });
}

function evidence() {
  return {
    source_categories: [
      { source: 'global', state: 'excluded' },
      { source: 'personal', state: 'excluded' },
      { source: 'project', state: 'projected' },
    ],
    capabilities: ['repository_read'],
  };
}

test('projected config deterministically separates profile, identity, permissions, and environment', () => {
  const first = projected();
  const second = projected();
  assert.deepStrictEqual(first, second);
  assert.strictEqual(first.config.profile_id, 'spec_analyst');
  assert.deepStrictEqual(first.config.identity, identity());
  assert.strictEqual(first.config.environment.inherit, false);
  assert.match(first.projected_config_digest, /^sha256:[a-f0-9]{64}$/);
  assert.notStrictEqual(first.projected_config_digest, first.effective_permission_digest);
});

test('projected config rejects any permission input that is not deny-by-default', () => {
  assert.throws(
    () => projected({ native_actor_shell: 'allow' }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_DENIED',
  );
  assert.throws(
    () => projected({ tools: ['extra-tool'] }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_DENIED',
  );
});

test('effective config comparison distinguishes conformant and safely narrower outcomes', () => {
  const projection = projected({ web: 'authorized_research_task_only' });
  assert.strictEqual(compareEffectiveConfiguration(projection.config, structuredClone(projection.config)), 'CONFORMANT');

  const narrower = structuredClone(projection.config);
  narrower.permissions.web = 'denied';
  narrower.permissions.repository_read.scope = ['src/agent-launch/**'];
  narrower.environment.names = ['PATH'];
  assert.strictEqual(compareEffectiveConfiguration(projection.config, narrower), 'SAFELY_NARROWER');
});

test('effective config comparison separates mismatch, broader, and unprovable states', () => {
  const projection = projected();
  const mismatch = structuredClone(projection.config);
  mismatch.identity.resolved_model_ref = 'other-model';
  assert.strictEqual(compareEffectiveConfiguration(projection.config, mismatch), 'MISMATCH');

  const broader = structuredClone(projection.config);
  broader.permissions.web = 'authorized_research_task_only';
  assert.strictEqual(compareEffectiveConfiguration(projection.config, broader), 'BROADER');

  const broaderEnvironment = structuredClone(projection.config);
  broaderEnvironment.environment.names.push('HOME');
  assert.strictEqual(compareEffectiveConfiguration(projection.config, broaderEnvironment), 'BROADER');
  const unknownPermission = structuredClone(projection.config);
  unknownPermission.permissions.native_actor_shell = 'unknown';
  assert.strictEqual(compareEffectiveConfiguration(projection.config, unknownPermission), 'UNPROVABLE');
  assert.strictEqual(compareEffectiveConfiguration(projection.config, { unknown: true }), 'UNPROVABLE');
});

test('effective scope comparison never treats a sibling wildcard as safely narrower', () => {
  const projection = projected({ repository_read: { mode: 'declared_scope', scope: ['src/*.js'] } });
  const effective = structuredClone(projection.config);
  effective.permissions.repository_read.scope = ['src/private/**'];
  assert.strictEqual(compareEffectiveConfiguration(projection.config, effective), 'BROADER');
});

test('effective config probe returns separate deterministic digests and sanitized evidence', () => {
  const projection = projected();
  const proof = proveEffectiveConfiguration({
    projection,
    invocation: { cwd: '/task/worktree' },
    effectiveConfigProbe: ({ projected_config: projectedConfig }) => ({
      effective_config: structuredClone(projectedConfig),
      capability_evidence: evidence(),
    }),
  });
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.configuration.proof_mechanism, 'EFFECTIVE_CONFIG_PROBE');
  assert.strictEqual(proof.configuration.conformance_status, 'CONFORMANT');
  assert.match(proof.configuration.effective_config_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(proof.configuration.effective_permission_digest, /^sha256:[a-f0-9]{64}$/);
  assert.notStrictEqual(proof.configuration.projected_config_digest, proof.configuration.effective_config_digest);
  assert.match(proof.configuration.capability_evidence_ref, /^sha256:[a-f0-9]{64}$/);
  assert.strictEqual(proof.actor_invoked, false);
});

test('only conformant and safely narrower probe results enable later actor invocation', () => {
  const projection = projected({ web: 'authorized_research_task_only' });
  const narrower = structuredClone(projection.config);
  narrower.permissions.web = 'denied';
  const proof = proveEffectiveConfiguration({
    projection,
    effectiveConfigProbe: () => ({ effective_config: narrower, capability_evidence: evidence() }),
  });
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.configuration.conformance_status, 'SAFELY_NARROWER');

  const failures = [
    [null, 'UNPROVABLE', 'EFFECTIVE_CONFIG_UNPROVABLE'],
    [() => { throw new Error('credential=synthetic'); }, 'UNPROVABLE', 'EFFECTIVE_CONFIG_UNPROVABLE'],
    [() => ({ effective_config: { unknown: true }, capability_evidence: evidence() }), 'UNPROVABLE', 'EFFECTIVE_CONFIG_UNPROVABLE'],
    [() => {
      const config = structuredClone(projection.config);
      config.identity.resolved_model_ref = 'other-model';
      return { effective_config: config, capability_evidence: evidence() };
    }, 'MISMATCH', 'EFFECTIVE_CONFIG_MISMATCH'],
    [() => {
      const config = structuredClone(projection.config);
      config.permissions.filesystem_write = { mode: 'task_owned_source', scope: ['src/**'] };
      return { effective_config: config, capability_evidence: evidence() };
    }, 'BROADER', 'EFFECTIVE_PERMISSION_BROADENING'],
  ];
  for (const [effectiveConfigProbe, status, reasonCode] of failures) {
    const result = proveEffectiveConfiguration({ projection, effectiveConfigProbe });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.configuration.conformance_status, status);
    assert.strictEqual(result.error.reason_code, reasonCode);
    assert.strictEqual(result.actor_invoked, false);
  }
});

test('capability evidence rejects raw configuration and secret-like content', () => {
  const projection = projected();
  for (const capability_evidence of [
    { ...evidence(), raw_config: { permission: 'allow' } },
    { ...evidence(), diagnostics: 'Bearer synthetic-credential' },
  ]) {
    const proof = proveEffectiveConfiguration({
      projection,
      effectiveConfigProbe: () => ({ effective_config: structuredClone(projection.config), capability_evidence }),
    });
    assert.strictEqual(proof.ok, false);
    assert.deepStrictEqual(proof.error, {
      status: 'FAILED',
      reason_code: 'EVIDENCE_SANITIZATION_FAILED',
      phase: 'PREFLIGHT',
    });
  }
});
