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

test('generic V2 implementer is inert without an authorized exact execution binding', () => {
  const id = 'ulc-implementer';
  assert.deepEqual(config.agents[id].permissions, [{ action: '*', resource: '*', effect: 'deny' }]);
  for (const [action, resource] of [
    ['edit','src/adapters/github.js'],
    ['edit','tests/adapters/github-native-actions-evidence.test.js'],
    ['edit','src/foo.js'],
    ['read','docs/SOURCE_OF_TRUTH.md'],
    ['shell','node --test tests/adapters/github-native-actions-evidence.test.js'],
    ['shell','git push origin tools'],
    ['subagent','general'],
    ['external_directory','/tmp/outside'],
    ['webfetch','https://example.com'],
  ]) assert.equal(effect(id, action, resource), 'deny', action + ':' + resource);
  const body = fs.readFileSync(path.join(AGENTS,'ulc-implementer.md'),'utf8');
  for (const forbidden of ['#34', 'ULC-OP-03', '40082522885', 'src/adapters/github.js',
    'tests/adapters/github-native-actions-evidence.test.js']) {
    assert.equal(body.includes(forbidden), false, forbidden + ' leaked into reusable agent');
  }
  assert.match(body, /ContextPackager/);
  assert.match(body, /ExecutionAttempt/);
  assert.match(body, /BLOCKED_PRECONDITION/);
});

test('test-only example bindings demonstrate distinct per-task scopes; no runtime authorization inferred', () => {
  const canBind = r => !!(r && r.authority_ref && r.taskcycle_id && r.operation_id &&
    r.execution_attempt_id && r.owner && r.commit && r.tree && r.context_ref &&
    Array.isArray(r.write_scope) && r.write_scope.length > 0 &&
    r.write_scope.every(p => typeof p === 'string' && !p.includes('..')));
  const bind = (r) => {
    if (!canBind(r)) return null;
    return [...config.permissions, ...config.agents['ulc-implementer'].permissions,
      ...r.write_scope.map(p=>({action:'edit',resource:p,effect:'allow'}))];
  };
  const a={authority_ref:'product:authorization-A',taskcycle_id:'TC-A',operation_id:'OP-A',
    execution_attempt_id:'ATT-A',owner:'actor-A',commit:'a'.repeat(40),tree:'b'.repeat(40),
    context_ref:'context:A',write_scope:['src/adapters/github.js']};
  const b={...a,taskcycle_id:'TC-B',operation_id:'OP-B',execution_attempt_id:'ATT-B',
    context_ref:'context:B',write_scope:['src/other.js']};
  const project=(rules,action,resource)=>rules.reduce((state,rule)=>{
    return match(rule.action,action) && match(rule.resource,resource) ? rule.effect : state;
  },'ask');
  for (const t of [a,b]) {
    const rules=bind(t);
    assert.equal(project(rules,'edit',t.write_scope[0]),'allow');
    assert.equal(project(rules,'edit','docs/SOURCE_OF_TRUTH.md'),'deny');
    assert.equal(project(rules,'shell','git push origin tools'),'deny');
  }
  assert.equal(project(bind(a),'edit','src/other.js'),'deny');
  assert.equal(project(bind(b),'edit','src/adapters/github.js'),'deny');
  assert.equal(bind({...a,authority_ref:null}),null);
  assert.equal(bind({...a,write_scope:['../escape']}),null);
  // This mechanical fixture is not proof of V2 host config merge, auth, policy, or dispatch.
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
