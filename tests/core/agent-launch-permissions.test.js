'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadAgentProfiles } = require('../../src/registries/agent-profiles');
const { projectPermissions } = require('../../src/agent-launch/permission-projection');
const { buildChildEnvironment } = require('../../src/agent-launch/environment');

const profiles = loadAgentProfiles().profiles;

function authority(profileId, overrides = {}) {
  const writer = ['implementer', 'doc_curator'].includes(profileId);
  const kinds = {
    researcher: 'AUTHORIZED_RESEARCH',
    reviewer: 'CHANGE_REVIEW',
    auditor: 'CONFORMANCE_AUDIT',
  };
  return {
    authority_kind: writer ? 'TASK_OWNED_WRITE' : kinds[profileId] || 'READ_ONLY_ANALYSIS',
    profile_id: profileId,
    authorization: {
      task_authorization_ref: writer ? 'task:001@abc' : null,
      research_authorization_ref: profileId === 'researcher' ? 'research:001@abc' : null,
    },
    scope: {
      read_scope: ['src/**'],
      write_scope: writer ? ['src/agent-launch/**'] : [],
    },
    ...overrides,
  };
}

function capabilities(overrides = {}) {
  return {
    repository_read: true,
    filesystem_write: true,
    web: true,
    enforcement: {
      scope_containment: true,
      native_actor_shell_denied: true,
      delegation_denied: true,
      subagents_denied: true,
      task_spawning_denied: true,
      paid_api_denied: true,
      additional_tools_denied: true,
      additional_skills_denied: true,
      mcp_denied: true,
      plugins_denied: true,
      indirect_capability_routes_denied: true,
      unauthorized_web_denied: true,
      external_filesystem_denied: true,
    },
    ...overrides,
  };
}

function projection(profileId, capabilityOverrides = {}, authorityOverrides = {}) {
  return projectPermissions({
    profile: profiles[profileId],
    resolvedAuthority: authority(profileId, authorityOverrides),
    adapterCapabilities: capabilities(capabilityOverrides),
  });
}

test('permission projection keeps readers read-only and writers inside task-owned scope', () => {
  const reader = projection('reviewer', {}, {
    authority_kind: 'CHANGE_REVIEW',
    authorization: { task_authorization_ref: null, research_authorization_ref: null },
  });
  assert.deepStrictEqual(reader.permissions.repository_read, { mode: 'declared_scope', scope: ['src/**'] });
  assert.deepStrictEqual(reader.permissions.filesystem_write, { mode: 'denied', scope: [] });

  const writer = projection('implementer');
  assert.deepStrictEqual(writer.permissions.filesystem_write, {
    mode: 'task_owned_source',
    scope: ['src/agent-launch/**'],
  });
  assert.notStrictEqual(writer.permission_projection_digest, writer.effective_permission_digest);
});

test('all nine profiles project the accepted write and web ceilings', () => {
  const expected = {
    spec_analyst: ['denied', 'denied'],
    planner: ['denied', 'denied'],
    architect: ['denied', 'denied'],
    explorer: ['denied', 'denied'],
    implementer: ['task_owned_source', 'denied'],
    doc_curator: ['task_owned_docs', 'denied'],
    reviewer: ['denied', 'denied'],
    researcher: ['denied', 'authorized_research_task_only'],
    auditor: ['denied', 'denied'],
  };
  for (const [profileId, [write, web]] of Object.entries(expected)) {
    const result = projection(profileId);
    assert.strictEqual(result.permissions.filesystem_write.mode, write, profileId);
    assert.strictEqual(result.permissions.web, web, profileId);
    assert.match(result.permission_projection_digest, /^sha256:[a-f0-9]{64}$/);
  }
});

test('permission projection explicitly denies every indirect or additional capability route', () => {
  const { permissions } = projection('implementer');
  assert.deepStrictEqual({
    command_execution: permissions.command_execution,
    native_actor_shell: permissions.native_actor_shell,
    delegation: permissions.delegation,
    subagents: permissions.subagents,
    task_spawning: permissions.task_spawning,
    paid_api: permissions.paid_api,
    tools: permissions.tools,
    skills: permissions.skills,
    mcp: permissions.mcp,
    plugins: permissions.plugins,
    indirect_capability_routes: permissions.indirect_capability_routes,
    external_filesystem_access: permissions.external_filesystem_access,
    subagent_depth: permissions.subagent_depth,
  }, {
    command_execution: 'denied',
    native_actor_shell: 'denied',
    delegation: 'denied',
    subagents: 'denied',
    task_spawning: 'denied',
    paid_api: 'denied',
    tools: [],
    skills: [],
    mcp: [],
    plugins: [],
    indirect_capability_routes: 'denied',
    external_filesystem_access: 'denied',
    subagent_depth: 0,
  });
});

test('web is enabled only for a researcher with competent research authorization', () => {
  assert.strictEqual(projection('researcher').permissions.web, 'authorized_research_task_only');
  assert.strictEqual(projection('spec_analyst').permissions.web, 'denied');
  assert.throws(
    () => projection('researcher', {}, {
      authorization: { task_authorization_ref: null, research_authorization_ref: null },
    }),
    (error) => error.reasonCode === 'WEB_AUTHORIZATION_MISSING',
  );
});

test('unknown adapter enforcement and missing required primitives fail closed', () => {
  const missingDenial = capabilities();
  delete missingDenial.enforcement.plugins_denied;
  assert.throws(
    () => projectPermissions({ profile: profiles.spec_analyst, resolvedAuthority: authority('spec_analyst'), adapterCapabilities: missingDenial }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_UNPROVABLE',
  );
  assert.throws(
    () => projection('implementer', { filesystem_write: false }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_DENIED',
  );
  assert.throws(
    () => projection('spec_analyst', { enforcement: { ...capabilities().enforcement, native_actor_shell_denied: false } }),
    (error) => error.reasonCode === 'NATIVE_SHELL_DENIED',
  );
  assert.throws(
    () => projection('spec_analyst', { unknown_capability: true }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_UNPROVABLE',
  );
  assert.throws(
    () => projection('spec_analyst', { enforcement: { ...capabilities().enforcement, unknown_denial: true } }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_UNPROVABLE',
  );
  const missingDimension = capabilities();
  delete missingDimension.web;
  assert.throws(
    () => projectPermissions({ profile: profiles.spec_analyst, resolvedAuthority: authority('spec_analyst'), adapterCapabilities: missingDimension }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_UNPROVABLE',
  );
});

test('child environment is rebuilt from fixed system names and approved task inputs', () => {
  const result = buildChildEnvironment({
    inherit: false,
    systemEnvironment: {
      PATH: '/bin',
      LANG: 'C.UTF-8',
      HOME: '/personal',
      RANDOM_UNAPPROVED: 'ignored',
    },
    taskScopedInputsRef: 'environment:001@abc',
    approvedTaskInputNames: ['TECNOTRON_OPERATION_ID'],
    resolveTaskScopedInputs: () => ({
      task_scoped_inputs_ref: 'environment:001@abc',
      variables: { TECNOTRON_OPERATION_ID: 'operation-001' },
    }),
  });
  assert.deepStrictEqual(result.environment, {
    PATH: '/bin',
    LANG: 'C.UTF-8',
    TECNOTRON_OPERATION_ID: 'operation-001',
  });
  assert.deepStrictEqual(result.evidence.names, ['LANG', 'PATH', 'TECNOTRON_OPERATION_ID']);
  assert.strictEqual(JSON.stringify(result.evidence).includes('operation-001'), false);
  assert.strictEqual(result.inherit, false);
});

test('child environment rejects inherited mode and unavailable task input resolution', () => {
  assert.throws(() => buildChildEnvironment({ inherit: true }), (error) => error.reasonCode === 'REQUEST_INVALID');
  assert.throws(
    () => buildChildEnvironment({ inherit: false, taskScopedInputsRef: 'environment:001@abc' }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_UNPROVABLE',
  );
});

test('child environment rejects sensitive, override, root-conflicting, and unapproved inputs without exposing values', () => {
  const cases = [
    ['API_TOKEN', 'synthetic-token', [], {}, 'PERMISSION_PROJECTION_DENIED'],
    ['OPENCODE_MODEL', 'synthetic-model', ['OPENCODE_MODEL'], {}, 'PROFILE_MODEL_BINDING_DENIED'],
    ['OPENCODE_CONFIG', 'synthetic-config', ['OPENCODE_CONFIG'], {}, 'GLOBAL_CONFIG_MUTATION_DENIED'],
    ['FF_PROJECT_ROOT', '/wrong/root', ['FF_PROJECT_ROOT'], { FF_PROJECT_ROOT: '/expected/root' }, 'PERMISSION_PROJECTION_DENIED'],
    ['UNAPPROVED_INPUT', 'synthetic-value', [], {}, 'PERMISSION_PROJECTION_DENIED'],
    ['APPROVED_INPUT', 'Bearer synthetic-credential', ['APPROVED_INPUT'], {}, 'PERMISSION_PROJECTION_DENIED'],
  ];
  for (const [name, value, approvedTaskInputNames, expectedRoots, reasonCode] of cases) {
    assert.throws(
      () => buildChildEnvironment({
        inherit: false,
        taskScopedInputsRef: 'environment:001@abc',
        approvedTaskInputNames,
        expectedRoots,
        resolveTaskScopedInputs: () => ({
          task_scoped_inputs_ref: 'environment:001@abc',
          variables: { [name]: value },
        }),
      }),
      (error) => error.reasonCode === reasonCode && !error.message.includes(value),
      name,
    );
  }
});

test('child environment rejects an approved root coordinate when no expected root proves it', () => {
  assert.throws(
    () => buildChildEnvironment({
      inherit: false,
      taskScopedInputsRef: 'environment:001@abc',
      approvedTaskInputNames: ['FF_PROJECT_ROOT'],
      resolveTaskScopedInputs: () => ({
        task_scoped_inputs_ref: 'environment:001@abc',
        variables: { FF_PROJECT_ROOT: '/unproven/root' },
      }),
    }),
    (error) => error.reasonCode === 'PERMISSION_PROJECTION_UNPROVABLE',
  );
});
