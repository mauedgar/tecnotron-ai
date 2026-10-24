'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const AGENTS = path.join(ROOT, '.opencode', 'agents');
const HISTORY = path.join(ROOT, 'docs', 'archive', 'opencode-agent-profiles-v1');
const CURRENT = ['ulc-implementer.md', 'ulc-reviewer.md'];
const HISTORICAL = {
  'architect.md': 'b02070079e79dc5413c2531434fec363a0107563',
  'auditor.md': 'df146b017c5394e465736a4137ba8efb3f3c0923',
  'doc_curator.md': 'b310e7d7bd52691df578547cd6df84d99d074c00',
  'explorer.md': '27c4e291e5c3775f168aa610059d825fd7e889ea',
  'implementer.md': '6760fe6d1ff732f5759b416b69f6a68061eaf29a',
  'planner.md': '65e55c3f623fa61a967b11c2cecdfdbb14b740d6',
  'researcher.md': 'ba76f80525b3d4a46dee4adb9523f3373c73ca8c',
  'reviewer.md': '18bba86e5c0e42c83ea9fb1fd0ba49406a23f1e9',
  'spec_analyst.md': 'beb4522adb74e13af57b21027abc32dbb6080c7a',
};
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'opencode.json'), 'utf8'));
const files = dir => fs.readdirSync(dir).filter(name => name.endsWith('.md')).sort();
const blobSha = content => createHash('sha1')
  .update('blob ' + Buffer.byteLength(content) + '\0' + content).digest('hex');
const match = (pattern, value) => new RegExp('^' + pattern.split('*')
  .map(part => part.replace(/[.*+?^\\$\{\}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(value);
const rules = agent => [...config.permissions, ...config.agents[agent].permissions];
function effect(agent, action, resource) {
  let result = 'ask';
  for (const rule of rules(agent)) {
    if (match(rule.action, action) && match(rule.resource, resource)) result = rule.effect;
  }
  return result;
}

test('legacy nine projections are archived intact, and no legacy ID is discoverable', () => {
  assert.deepEqual(files(AGENTS), CURRENT);
  assert.deepEqual(files(HISTORY), Object.keys(HISTORICAL).sort());
  for (const [name, sha] of Object.entries(HISTORICAL)) {
    assert.equal(blobSha(fs.readFileSync(path.join(HISTORY, name))), sha, name);
  }
});

test('V2-only configuration selects a single bounded primary; unused agents stay disabled', () => {
  assert.equal(config.default_agent, 'ulc-implementer');
  assert.deepEqual(config.permissions, [{ action: '*', resource: '*', effect: 'deny' }]);
  assert.deepEqual(Object.keys(config.agents).sort(),
    ['build', 'explore', 'general', 'plan', 'ulc-implementer', 'ulc-reviewer'].sort());
  for (const id of ['build', 'plan', 'general', 'explore', 'ulc-reviewer']) {
    assert.equal(config.agents[id].disabled, true, id);
  }
  assert.equal(config.agents['ulc-implementer'].mode, 'primary');
  assert.equal(config.agents['ulc-implementer'].disabled, undefined);
  assert.equal(config.agents['ulc-reviewer'].mode, 'primary');
  assert.equal(config.agent, undefined, 'legacy singular v1 config forbidden');
  assert.equal(config.permission, undefined);
  for (const [id, agent] of Object.entries(config.agents)) {
    for (const key of ['permission', 'tools', 'disable', 'prompt']) assert.equal(agent[key], undefined, id + ':' + key);
    for (const rule of (agent.permissions || [])) {
      assert.deepEqual(Object.keys(rule).sort(), ['action', 'effect', 'resource']);
      assert.ok(['deny', 'allow', 'ask'].includes(rule.effect));
    }
  }
  for (const [name, id] of [['ulc-implementer.md','ulc-implementer'],['ulc-reviewer.md','ulc-reviewer']]) {
    const content = fs.readFileSync(path.join(AGENTS, name), 'utf8');
    assert.match(content, new RegExp('^---\\n[\\s\\S]*?mode: primary\\n---'));
    assert.doesNotMatch(content, /^permission:|^tools:|^disable:/m);
    assert.ok(content.includes('Product Control'), id);
  }
});

test('V2 native actor effective permissions fail closed for unassigned effects', () => {
  const id = 'ulc-implementer';
  const approved = ['src/adapters/github.js', 'tests/adapters/github-native-actions-evidence.test.js'];
  for (const file of approved) assert.equal(effect(id, 'edit', file), 'allow');
  for (const denied of ['src/adapters/opencode-cli.js', 'tests/contract/opencode-v2-upper-lc-agents.test.js',
    'docs/SOURCE_OF_TRUTH.md', '.opencode/agents/ulc-implementer.md']) {
    assert.equal(effect(id, 'edit', denied), 'deny', denied);
  }
  assert.equal(effect(id, 'read', 'src/adapters/github.js'), 'allow');
  assert.equal(effect(id, 'read', '.env'), 'deny');
  assert.equal(effect(id, 'read', 'nested/.env.production'), 'deny');
  assert.equal(effect(id, 'shell', 'git status --short'), 'allow');
  assert.equal(effect(id, 'shell', 'node --check src/adapters/github.js'), 'allow');
  assert.equal(effect(id, 'shell', 'git push origin tools'), 'deny');
  assert.equal(effect(id, 'shell', 'npm install'), 'deny');
  assert.equal(effect(id, 'subagent', 'general'), 'deny');
  assert.equal(effect(id, 'execute', '*'), 'deny');
  assert.equal(effect(id, 'external_directory', '/tmp/outside'), 'deny');
  assert.equal(effect(id, 'webfetch', 'https://example.com'), 'deny');
});

test('inactive reviewer cannot mutate sources, authorize other agents or bypass review selection', () => {
  const id = 'ulc-reviewer';
  assert.equal(config.agents[id].disabled, true);
  assert.equal(effect(id, 'edit', 'src/adapters/github.js'), 'deny');
  assert.equal(effect(id, 'shell', 'git push origin tools'), 'deny');
  assert.equal(effect(id, 'subagent', 'ulc-implementer'), 'deny');
  assert.equal(effect(id, 'read', 'src/adapters/github.js'), 'allow');
  assert.equal(effect(id, 'websearch', 'test'), 'deny');
});
