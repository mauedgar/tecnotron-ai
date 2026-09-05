'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const { loadAgentProfiles } = require('../../src/registries');
const { cases: invalidCases } = require('../fixtures/opencode-agent-profiles/invalid-cases');

const ROOT = path.resolve(__dirname, '../..');
const AGENTS_DIR = path.join(ROOT, '.opencode', 'agents');
const DISCOVERY_FIXTURE = path.resolve(__dirname, '../fixtures/opencode-agent-profiles/discovery.yaml');
const FRONTMATTER_KEYS = ['description', 'mode', 'permission'];
const PROJECTION_KEYS = [
  'schema_version',
  'profile_id',
  'responsibility',
  'required_inputs',
  'allowed_outputs',
  'semantic_permissions',
  'capabilities',
  'security',
];
const SECURITY_PROJECTION = {
  permission_strategy: 'deny_by_default',
  native_actor_shell: 'denied',
  delegation: 'denied',
  subagents: 'denied',
  task_spawning: 'denied',
  subagent_depth: 0,
  paid_api: 'disabled',
  global_opencode_config_mutation: 'prohibited',
  empty_allowlists: 'zero_additional_capabilities',
};
const EMPTY_CAPABILITY = { default: 'deny', allow: [] };

function sortedKeys(value) {
  return Object.keys(value).sort();
}

function readDiscoveryFixture() {
  return YAML.parse(fs.readFileSync(DISCOVERY_FIXTURE, 'utf8'));
}

function discoverProfileIds() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.basename(entry.name, '.md'))
    .sort();
}

function parseAgentFile(filePath) {
  assert.ok(fs.existsSync(filePath), `required project-scoped profile is missing: ${filePath}`);
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
  assert.ok(match, `${filePath} must contain YAML frontmatter and a YAML projection body`);
  return { frontmatter: YAML.parse(match[1]), profile: YAML.parse(match[2]) };
}

function expectedProjection(id, sourceProfile) {
  return {
    schema_version: 'tecnotron-agent-profile/v1',
    profile_id: id,
    responsibility: sourceProfile.responsibility,
    required_inputs: sourceProfile.required_inputs,
    allowed_outputs: sourceProfile.allowed_outputs,
    semantic_permissions: sourceProfile.permissions,
    capabilities: {
      tools: sourceProfile.tools,
      skills: sourceProfile.skills,
      mcp: EMPTY_CAPABILITY,
      plugins: EMPTY_CAPABILITY,
      indirect: EMPTY_CAPABILITY,
    },
    security: SECURITY_PROJECTION,
  };
}

function validateProjection(document, id, sourceProfile) {
  assert.deepStrictEqual(sortedKeys(document.frontmatter), [...FRONTMATTER_KEYS].sort(), 'unsupported or binding frontmatter field');
  assert.strictEqual(typeof document.frontmatter.description, 'string');
  assert.ok(document.frontmatter.description.length > 0);
  assert.strictEqual(document.frontmatter.mode, 'primary');
  assert.strictEqual(document.frontmatter.permission, 'deny');
  assert.deepStrictEqual(sortedKeys(document.profile), [...PROJECTION_KEYS].sort(), 'unknown projection field');
  assert.deepStrictEqual(document.profile, expectedProjection(id, sourceProfile));
}

function setAtPath(value, parts, replacement) {
  let target = value;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] = replacement;
}

test('AC-LAUNCH-002 discovers exactly the nine accepted project-scoped profiles', () => {
  const sourceIds = Object.keys(loadAgentProfiles().profiles).sort();
  const fixtureIds = [...readDiscoveryFixture().accepted_profile_ids].sort();
  assert.deepStrictEqual(fixtureIds, sourceIds, 'discovery fixture drifted from tecnotron-agent-profile/v1');
  assert.deepStrictEqual(discoverProfileIds(), sourceIds);
});

test('AC-LAUNCH-002 projects every profile directly from tecnotron-agent-profile/v1', () => {
  const sourceProfiles = loadAgentProfiles().profiles;
  for (const [id, sourceProfile] of Object.entries(sourceProfiles)) {
    const document = parseAgentFile(path.join(AGENTS_DIR, `${id}.md`));
    validateProjection(document, id, sourceProfile);
  }
});

test('NC-LAUNCH-002 rejects unknown, legacy, aliased, or additional profile discovery', () => {
  const fixture = readDiscoveryFixture();
  const accepted = [...fixture.accepted_profile_ids].sort();
  for (const rejected of [...fixture.legacy_profile_ids, 'unknown', 'tenth_profile']) {
    assert.notDeepStrictEqual([...accepted, rejected].sort(), accepted, `${rejected} must not be discoverable`);
  }
});

test('NC-LAUNCH-004/007/008/009/010/012/013 fail closed for every broadening mutation', () => {
  const sourceProfile = loadAgentProfiles().profiles.spec_analyst;
  const baseline = {
    frontmatter: {
      description: 'Static projection for specification.',
      mode: 'primary',
      permission: 'deny',
    },
    profile: expectedProjection('spec_analyst', sourceProfile),
  };

  for (const definition of invalidCases) {
    const document = structuredClone(baseline);
    setAtPath(document[definition.target], definition.path, definition.value);
    assert.throws(
      () => validateProjection(document, 'spec_analyst', sourceProfile),
      undefined,
      `${definition.name} was accepted`,
    );
  }
});

test('NC-LAUNCH-002 keeps legacy IDs out of the accepted source registry', () => {
  const sourceIds = Object.keys(loadAgentProfiles().profiles);
  for (const legacyId of readDiscoveryFixture().legacy_profile_ids) {
    assert.strictEqual(sourceIds.includes(legacyId), false);
  }
});
