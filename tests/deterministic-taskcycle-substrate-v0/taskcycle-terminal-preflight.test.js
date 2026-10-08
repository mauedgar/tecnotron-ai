'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LEGACY_IDS, CONSUMERS, preflightTaskCycleTerminalPath } = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-terminal-preflight');

const SHA = '1'.repeat(40);
const five = ['implementation', 'exact_candidate', 'independent_review', 'Developer_acceptance', 'logical_close'];
function request(ids = five) {
  return {
    taskcycle: { id: 'TASKCYCLE-PREFLIGHT-PROOF-001', responsibility: 'QUALIFY_TERMINAL_PREFLIGHT' },
    Product_baseline: { repository: 'mauedgar/tecnotron-ai', integration_branch: 'tools', commit: SHA, tree: SHA },
    TASK_carrier: { branch: 'candidate/preflight', path: 'docs/tasks/preflight/TASK.md', commit: SHA, tree: SHA },
    write_scope: ['src/deterministic-taskcycle-substrate-v0/taskcycle-terminal-preflight.js'],
    authority_refs: ['COMPETENT_SELECTION'],
    evidence_refs: ['EXACT_OBLIGATION_SET'],
    obligations: ids.map(id => ({ id, authority_ref: null })),
    current_gate: 'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE',
  };
}
function inputs(kind, ids) {
  const profile = CONSUMERS[kind];
  return {
    initialization_request: request(ids),
    terminal_consumer: { kind, source_path: profile.source_path, source_blob: profile.source_blob, obligation_refs: [...ids] },
    observed_binding: { source_path: profile.source_path, source_blob: profile.source_blob, evidence_ref: 'OBSERVED_PINNED_GIT_BLOB' },
  };
}

test('legacy nine exact set is compatible and effect-free', () => {
  const r = preflightTaskCycleTerminalPath(inputs('LEGACY_FIXED_NINE', LEGACY_IDS));
  assert.equal(r.status, 'PASS'); assert.equal(r.effect_state, 'NONE');
  assert.deepEqual(r.original_obligation_ids, LEGACY_IDS);
  assert.equal(r.State_Kernel_direct_calls, 0);
  assert.equal(r.durable_effects, 0);
});

test('exact original five-ID set with qualified compatibility consumer is compatible', () => {
  const r = preflightTaskCycleTerminalPath(inputs('EXACT_ORIGINAL_OBLIGATIONS', five));
  assert.equal(r.status, 'PASS');
  assert.deepEqual(r.original_obligation_ids, five);
});

test('five-ID set against fixed-nine-only consumer blocks before an effect', () => {
  const r = preflightTaskCycleTerminalPath(inputs('LEGACY_FIXED_NINE', five));
  assert.equal(r.status, 'BLOCKED');
  assert.equal(r.reason, 'LEGACY_FIXED_NINE_INCOMPATIBLE_WITH_ORIGINAL_SET');
  assert.equal(r.durable_effects, 0);
});

test('duplicate original obligation IDs fail closed', () => {
  const r = preflightTaskCycleTerminalPath(inputs('EXACT_ORIGINAL_OBLIGATIONS', [...five, five[0]]));
  assert.equal(r.status, 'BLOCKED');
  assert.match(r.reason, /INITIALIZATION_CONTRACT_INVALID/);
});

test('missing terminal-consumer obligation reference fails closed', () => {
  const i = inputs('EXACT_ORIGINAL_OBLIGATIONS', five);
  i.terminal_consumer.obligation_refs.pop();
  assert.equal(preflightTaskCycleTerminalPath(i).reason, 'TERMINAL_CONSUMER_OBLIGATION_REFS_MISMATCH');
});

test('unknown terminal-consumer obligation reference fails closed', () => {
  const i = inputs('EXACT_ORIGINAL_OBLIGATIONS', five);
  i.terminal_consumer.obligation_refs[0] = 'UNKNOWN_OBLIGATION';
  assert.equal(preflightTaskCycleTerminalPath(i).status, 'BLOCKED');
});

test('wrong blob, absent evidence and unknown consumer fail closed', () => {
  const i = inputs('EXACT_ORIGINAL_OBLIGATIONS', five);
  i.observed_binding.source_blob = SHA;
  assert.equal(preflightTaskCycleTerminalPath(i).reason, 'TERMINAL_CONSUMER_BINDING_UNVERIFIED');
  i.observed_binding = null;
  assert.equal(preflightTaskCycleTerminalPath(i).status, 'BLOCKED');
  i.terminal_consumer.kind = 'INVENTED';
  assert.equal(preflightTaskCycleTerminalPath(i).reason, 'TERMINAL_CONSUMER_UNQUALIFIED');
});

test('preflight is deterministic, pure and does not mutate caller arrays', () => {
  const i = inputs('EXACT_ORIGINAL_OBLIGATIONS', five);
  const before = JSON.stringify(i);
  assert.deepEqual(preflightTaskCycleTerminalPath(i), preflightTaskCycleTerminalPath(i));
  assert.equal(JSON.stringify(i), before);
});
