'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const registries = require('../../src/registries');
const { cases: invalidCases } = require('../fixtures/agent-profiles/invalid-cases');

const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/agent-profiles/valid.yaml');
const EXPECTED_PROFILE_IDS = [
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
const EXPECTED_RESPONSIBILITIES = {
  spec_analyst: 'specification',
  planner: 'execution_planning',
  architect: 'technical_architecture',
  explorer: 'evidence_exploration',
  implementer: 'source_implementation',
  doc_curator: 'documentation_materialization',
  reviewer: 'independent_review',
  researcher: 'authorized_research',
  auditor: 'conformance_audit',
};
const EXPECTED_OUTPUTS = {
  spec_analyst: ['spec_proposal'],
  planner: ['wp_plan_proposal', 'task_decomposition_proposal'],
  architect: ['architecture_proposal', 'adr_proposal'],
  explorer: ['context_report'],
  implementer: ['implementation_report'],
  doc_curator: ['documentation_report'],
  reviewer: ['external_review_report'],
  researcher: ['research_report'],
  auditor: ['audit_report'],
};
const DENIED_DIMENSIONS = [
  'delegation',
  'git_mutation',
  'planning_provider_mutation',
  'workspace_lifecycle',
  'dependency_mutation',
  'secret_access',
  'paid_api',
];

function readValidFixture() {
  return YAML.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

function getAtPath(value, parts) {
  return parts.reduce((current, part) => current[part], value);
}

function materializeInvalidFixture(definition) {
  const value = structuredClone(readValidFixture());
  const parent = getAtPath(value, definition.path.slice(0, -1));
  const key = definition.path.at(-1);
  if (definition.operation === 'delete') {
    delete parent[key];
  } else if (definition.operation === 'copy') {
    parent[key] = structuredClone(getAtPath(value, definition.from));
  } else {
    parent[key] = definition.value;
  }
  return value;
}

test('AC-PROFILE-001 and 017 expose a dedicated exact-version schema and loader', () => {
  assert.ok(registries.AgentProfileRegistry, 'AgentProfileRegistry export is missing');
  assert.strictEqual(typeof registries.loadAgentProfiles, 'function');
  const fixture = registries.loadAgentProfiles(FIXTURE_PATH);
  assert.strictEqual(fixture.schema_version, 'tecnotron-agent-profile/v1');
  assert.deepStrictEqual(registries.loadAgentProfiles(), fixture);
});

test('AC-PROFILE-002 and 011 accept exactly the nine approved IDs', () => {
  const parsed = registries.AgentProfileRegistry.parse(readValidFixture());
  assert.deepStrictEqual(Object.keys(parsed.profiles), EXPECTED_PROFILE_IDS);
  assert.strictEqual(Object.hasOwn(parsed.profiles, 'Validator'), false);
});

test('AC-PROFILE-003 binds each profile to its exclusive responsibility, inputs, and outputs', () => {
  const parsed = registries.AgentProfileRegistry.parse(readValidFixture());
  for (const id of EXPECTED_PROFILE_IDS) {
    assert.strictEqual(parsed.profiles[id].responsibility, EXPECTED_RESPONSIBILITIES[id]);
    assert.ok(parsed.profiles[id].required_inputs.length > 0, `${id} has no required inputs`);
    assert.deepStrictEqual(parsed.profiles[id].allowed_outputs, EXPECTED_OUTPUTS[id]);
    assert.strictEqual(new Set(parsed.profiles[id].required_inputs).size, parsed.profiles[id].required_inputs.length);
  }
});

test('AC-PROFILE-004 through 006 restrict writing to the two exclusive writers', () => {
  const profiles = registries.AgentProfileRegistry.parse(readValidFixture()).profiles;
  assert.strictEqual(profiles.implementer.permissions.filesystem_write, 'task_owned_source');
  assert.strictEqual(profiles.doc_curator.permissions.filesystem_write, 'task_owned_docs');
  for (const id of EXPECTED_PROFILE_IDS.filter((id) => !['implementer', 'doc_curator'].includes(id))) {
    assert.strictEqual(profiles[id].permissions.filesystem_write, 'denied');
  }
});

test('AC-PROFILE-007 through 009 declare complete deny-by-default permissions', () => {
  const profiles = registries.AgentProfileRegistry.parse(readValidFixture()).profiles;
  for (const id of EXPECTED_PROFILE_IDS) {
    const permissions = profiles[id].permissions;
    assert.strictEqual(permissions.default, 'deny');
    assert.strictEqual(permissions.repository_read, 'declared_scope');
    for (const dimension of DENIED_DIMENSIONS) assert.strictEqual(permissions[dimension], 'denied');
    const expectedCommand = ['implementer', 'doc_curator'].includes(id) ? 'task_validation' : 'read_only_deterministic';
    assert.strictEqual(permissions.command_execution, expectedCommand);
    const expectedWeb = id === 'researcher' ? 'authorized_research_task_only' : 'denied';
    assert.strictEqual(permissions.web, expectedWeb);
  }
});

test('D-WP001-05 requires every profile to explicitly disable subagents', () => {
  const profiles = registries.AgentProfileRegistry.parse(readValidFixture()).profiles;
  for (const id of EXPECTED_PROFILE_IDS) {
    assert.strictEqual(profiles[id].subagent_depth, 0, `${id} must explicitly set subagent_depth to 0`);
  }
});

test('AC-PROFILE-010 through 015 fail closed for every required negative fixture', () => {
  for (const definition of invalidCases) {
    const result = registries.AgentProfileRegistry.safeParse(materializeInvalidFixture(definition));
    assert.strictEqual(result.success, false, `${definition.name} was accepted`);
    if (definition.message) {
      assert.ok(result.error.issues.some((issue) => issue.message === definition.message), `${definition.name} lacks ${definition.message}`);
    }
  }
});

test('AC-PROFILE-014 canonical data contains no absolute path or product/runtime namespace', () => {
  const parsed = registries.AgentProfileRegistry.parse(readValidFixture());
  const serialized = JSON.stringify(parsed).toLowerCase();
  for (const forbidden of ['c:/', '/home/', '/users/', 'fitflow', 'opencode', 'launcher', 'global_config']) {
    assert.strictEqual(serialized.includes(forbidden), false, `found forbidden value: ${forbidden}`);
  }
});

test('AC-PROFILE-015 keeps every tool and skill allowlist empty and fail-closed when allow is absent', () => {
  const raw = readValidFixture();
  delete raw.profiles.planner.tools.allow;
  delete raw.profiles.planner.skills.allow;
  const parsed = registries.AgentProfileRegistry.parse(raw);
  for (const profile of Object.values(parsed.profiles)) {
    assert.deepStrictEqual(profile.tools.allow, []);
    assert.deepStrictEqual(profile.skills.allow, []);
  }
});

test('AC-PROFILE-016 keeps the portable registry outside the legacy active config registry', () => {
  assert.strictEqual(registries.REGISTRY_SCHEMAS['agent-profiles.yaml'], undefined);
  for (const legacy of ['roles.yaml', 'models.yaml', 'project-profile.yaml']) assert.ok(registries.REGISTRY_SCHEMAS[legacy]);
});

test('custom invariant issues have reproducible order and paths', () => {
  const input = readValidFixture();
  input.profiles.planner.permissions.filesystem_write = 'task_owned_source';
  input.profiles.auditor.permissions.web = 'authorized_research_task_only';
  const first = registries.AgentProfileRegistry.safeParse(input);
  const second = registries.AgentProfileRegistry.safeParse(input);
  assert.strictEqual(first.success, false);
  assert.strictEqual(second.success, false);
  assert.deepStrictEqual(first.error.issues, second.error.issues);
  assert.deepStrictEqual(first.error.issues.map(({ path: issuePath, message }) => [issuePath.join('.'), message]), [
    ['profiles.planner.permissions.filesystem_write', 'FILESYSTEM_WRITE_MISMATCH'],
    ['profiles.auditor.permissions.web', 'WEB_PERMISSION_MISMATCH'],
  ]);
});
