'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  FilesystemStateStore,
  create,
  transition,
  satisfy,
  addObligations,
  inspect,
} = require('../../src/state-kernel-v0');

const baseAuthority = [{ kind: 'AUTHORITY', id: 'DEV-BASE' }];
const extensionAuthority = {
  kind: 'AUTHORITY',
  id: 'DEV-LATE-EXTENSION',
  location: 'evidence/late-extension-ruling.json',
  sha256: 'e'.repeat(64),
};

function fixture(t, suffix = '') {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), `tecnotron-late-obligation-${suffix}`));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const store = new FilesystemStateStore(home);
  store.initialize();
  return { home, store };
}

function unchanged(store, action, code) {
  const before = store.read();
  assert.throws(action, error => error.code === code);
  assert.deepEqual(store.read(), before);
}

function createTask(store, id, obligations = [], authorityRefs = baseAuthority) {
  create(store, store.verify().revision, 'TaskCycle', id, {
    responsibility: 'TEST_LATE_OBLIGATION_EXTENSION',
    obligations,
  }, authorityRefs);
}

test('authorized append is one monotonic event and survives a fresh read', t => {
  const { home, store } = fixture(t, 'happy-');
  createTask(store, 'TC-HAPPY', [{ id: 'EXISTING', authority_ref: null }]);
  transition(store, store.verify().revision, 'TaskCycle', 'TC-HAPPY', 'ACTIVE');
  create(store, store.verify().revision, 'Milestone', 'M-UNCHANGED', { title: 'Unrelated' });

  const before = store.read();
  const beforeTask = inspect(store, 'TaskCycle', 'TC-HAPPY').aggregate;
  const beforeMilestone = structuredClone(before.state.aggregates.Milestone['M-UNCHANGED']);
  const beforeRevision = store.verify().revision;

  addObligations(store, beforeRevision, 'TC-HAPPY', [
    { id: 'LATE-A', authority_ref: null },
    { id: 'LATE-B', authority_ref: 'FUTURE-SATISFACTION-AUTHORITY' },
  ], extensionAuthority.id, extensionAuthority);

  const after = store.read();
  const task = inspect(store, 'TaskCycle', 'TC-HAPPY').aggregate;
  assert.equal(task.id, beforeTask.id);
  assert.equal(task.state, 'ACTIVE');
  assert.deepEqual(task.obligations[0], beforeTask.obligations[0]);
  assert.deepEqual(task.obligations.slice(1), [
    { id: 'LATE-A', status: 'PENDING', authority_ref: null },
    { id: 'LATE-B', status: 'PENDING', authority_ref: 'FUTURE-SATISFACTION-AUTHORITY' },
  ]);
  assert.deepEqual(task.authority_refs.slice(0, beforeTask.authority_refs.length), beforeTask.authority_refs);
  assert.deepEqual(task.authority_refs.at(-1), extensionAuthority);
  assert.deepEqual(after.state.aggregates.Milestone['M-UNCHANGED'], beforeMilestone);
  assert.equal(after.state.revision, beforeRevision + 1);
  assert.equal(after.events.length, before.events.length + 1);
  assert.deepEqual(after.events.slice(0, before.events.length), before.events);
  assert.equal(after.events.at(-1).action, `ADD_OBLIGATIONS:${extensionAuthority.id}`);
  assert.equal(after.events.at(-1).aggregate_id, 'TC-HAPPY');
  assert.equal(after.events.at(-1).after.obligations.at(-2).status, 'PENDING');
  assert.equal(after.events.at(-1).after.obligations.at(-1).status, 'PENDING');

  const reloaded = new FilesystemStateStore(home);
  assert.deepEqual(reloaded.read(), after);
});

test('extension rejects stale, duplicate, empty, malformed, status injection and invalid authority with no effect', t => {
  const { store } = fixture(t, 'negative-');
  createTask(store, 'TC-NEG', [{ id: 'EXISTING', authority_ref: null }]);
  transition(store, store.verify().revision, 'TaskCycle', 'TC-NEG', 'ACTIVE');
  const current = store.verify().revision;

  unchanged(store, () => addObligations(store, current - 1, 'TC-NEG', [{ id: 'STALE' }], 'DEV-BASE'), 'STALE_REVISION');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{ id: 'EXISTING' }], 'DEV-BASE'), 'INVALID_CONTRACT');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{ id: 'DUP' }, { id: 'DUP' }], 'DEV-BASE'), 'INVALID_CONTRACT');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [], 'DEV-BASE'), 'INVALID_CONTRACT');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{}], 'DEV-BASE'), 'INVALID_CONTRACT');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{ id: 'SAT', status: 'SATISFIED' }], 'DEV-BASE'), 'INVALID_CONTRACT');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{ id: 'NO-AUTH' }], undefined), 'MISSING_REQUIRED_AUTHORITY');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{ id: 'MISMATCH' }], 'DEV-OTHER', {
    kind: 'AUTHORITY', id: 'DIFFERENT',
  }), 'MISSING_REQUIRED_AUTHORITY');
  unchanged(store, () => addObligations(store, current, 'TC-NEG', [{ id: 'MISSING-REF' }], 'DEV-OTHER'), 'MISSING_REQUIRED_AUTHORITY');
});

test('READY and BLOCKED allow extension while PENDING_ACCEPTANCE and terminal states fail closed', t => {
  const ready = fixture(t, 'ready-').store;
  createTask(ready, 'TC-READY', []);
  addObligations(ready, ready.verify().revision, 'TC-READY', [{ id: 'READY-LATE' }], 'DEV-BASE');
  assert.equal(inspect(ready, 'TaskCycle', 'TC-READY').aggregate.obligations[0].status, 'PENDING');

  const blocked = fixture(t, 'blocked-').store;
  createTask(blocked, 'TC-BLOCKED', []);
  transition(blocked, blocked.verify().revision, 'TaskCycle', 'TC-BLOCKED', 'BLOCKED');
  addObligations(blocked, blocked.verify().revision, 'TC-BLOCKED', [{ id: 'BLOCKED-LATE' }], 'DEV-BASE');
  assert.equal(inspect(blocked, 'TaskCycle', 'TC-BLOCKED').aggregate.obligations[0].status, 'PENDING');

  const pending = fixture(t, 'pending-').store;
  createTask(pending, 'TC-PENDING', []);
  transition(pending, pending.verify().revision, 'TaskCycle', 'TC-PENDING', 'ACTIVE');
  transition(pending, pending.verify().revision, 'TaskCycle', 'TC-PENDING', 'PENDING_ACCEPTANCE');
  unchanged(pending, () => addObligations(pending, pending.verify().revision, 'TC-PENDING', [{ id: 'NOPE' }], 'DEV-BASE'), 'INVALID_TRANSITION');

  const closed = fixture(t, 'closed-').store;
  createTask(closed, 'TC-CLOSED', []);
  transition(closed, closed.verify().revision, 'TaskCycle', 'TC-CLOSED', 'ACTIVE');
  transition(closed, closed.verify().revision, 'TaskCycle', 'TC-CLOSED', 'CLOSED', {
    authority_ref: 'DEV-BASE', disposition_ref: 'PASS',
  });
  unchanged(closed, () => addObligations(closed, closed.verify().revision, 'TC-CLOSED', [{ id: 'NOPE' }], 'DEV-BASE'), 'INVALID_TRANSITION');

  const cancelled = fixture(t, 'cancelled-').store;
  createTask(cancelled, 'TC-CANCELLED', []);
  transition(cancelled, cancelled.verify().revision, 'TaskCycle', 'TC-CANCELLED', 'CANCELLED');
  unchanged(cancelled, () => addObligations(cancelled, cancelled.verify().revision, 'TC-CANCELLED', [{ id: 'NOPE' }], 'DEV-BASE'), 'INVALID_TRANSITION');
});

test('blocked-consumer regression preserves four satisfied obligations, blocks closure, then closes normally', t => {
  const { store } = fixture(t, 'incident-');
  const initialIds = [
    'ACTIVE_CONSUMER_INVENTORY_RECONCILIATION',
    'NEGATIVE_EVIDENCE_COVERAGE',
    'PRODUCT_DOCUMENTATION_DELTA_DECISION',
    'PLAN_TRACE_AND_HARNESS_FEEDBACK',
  ];
  createTask(store, 'TASKCYCLE-SYNTHETIC-ACTIVE-CONSUMER', initialIds.map(id => ({ id, authority_ref: null })));
  transition(store, store.verify().revision, 'TaskCycle', 'TASKCYCLE-SYNTHETIC-ACTIVE-CONSUMER', 'ACTIVE');
  for (const id of initialIds) satisfy(store, store.verify().revision, 'TASKCYCLE-SYNTHETIC-ACTIVE-CONSUMER', id);

  const beforeExtension = store.read();
  addObligations(store, store.verify().revision, 'TASKCYCLE-SYNTHETIC-ACTIVE-CONSUMER', [
    { id: 'INDEPENDENT_REVIEW' },
    { id: 'DEVELOPER_ACCEPTANCE' },
    { id: 'PHASE_2_AUTHORIZATION' },
  ], extensionAuthority.id, extensionAuthority);

  let task = inspect(store, 'TaskCycle', 'TASKCYCLE-SYNTHETIC-ACTIVE-CONSUMER').aggregate;
  assert.equal(task.id, 'TASKCYCLE-SYNTHETIC-ACTIVE-CONSUMER');
  assert.deepEqual(task.obligations.slice(0, 4).map(({ id, status }) => [id, status]), initialIds.map(id => [id, 'SATISFIED']));
  assert.deepEqual(task.obligations.slice(4).map(({ id, status }) => [id, status]), [
    ['INDEPENDENT_REVIEW', 'PENDING'],
    ['DEVELOPER_ACCEPTANCE', 'PENDING'],
    ['PHASE_2_AUTHORIZATION', 'PENDING'],
  ]);
  assert.deepEqual(store.read().events.slice(0, beforeExtension.events.length), beforeExtension.events);
  assert.equal(store.read().events.some(event => event.action === 'BOOTSTRAP_IMPORT'), false);
  unchanged(store, () => transition(store, store.verify().revision, 'TaskCycle', task.id, 'CLOSED', {
    authority_ref: extensionAuthority.id, disposition_ref: 'SHOULD_NOT_CLOSE',
  }), 'UNSATISFIED_OBLIGATION');

  for (const id of ['INDEPENDENT_REVIEW', 'DEVELOPER_ACCEPTANCE', 'PHASE_2_AUTHORIZATION']) {
    satisfy(store, store.verify().revision, task.id, id);
  }
  task = inspect(store, 'TaskCycle', task.id).aggregate;
  assert.ok(task.obligations.every(obligation => obligation.status === 'SATISFIED'));
  assert.ok(inspect(store, 'TaskCycle', task.id).legal_next.includes('CLOSED'));
  transition(store, store.verify().revision, 'TaskCycle', task.id, 'CLOSED', {
    authority_ref: extensionAuthority.id,
    disposition_ref: 'SYNTHETIC_CLOSED_PASS',
  });
  task = inspect(store, 'TaskCycle', task.id).aggregate;
  assert.equal(task.state, 'CLOSED');
  assert.equal(task.terminal_disposition_ref, 'SYNTHETIC_CLOSED_PASS');
});

test('CLI exposes TaskCycleAddObligations through the minimum operational surface', t => {
  const { home, store } = fixture(t, 'cli-');
  createTask(store, 'TC-CLI-EXT', []);
  const cli = path.join(__dirname, '../../src/state-kernel-v0/cli.js');
  const request = {
    expected_revision: store.verify().revision,
    id: 'TC-CLI-EXT',
    obligations: [{ id: 'CLI-LATE' }],
    authority_ref: 'DEV-BASE',
  };
  const result = spawnSync(process.execPath, [
    cli, '--home', home, '--command', 'TaskCycleAddObligations', '--request', JSON.stringify(request),
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(inspect(store, 'TaskCycle', 'TC-CLI-EXT').aggregate.obligations[0].status, 'PENDING');
  assert.equal(store.read().events.at(-1).action, 'ADD_OBLIGATIONS:DEV-BASE');
});
