'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { FilesystemStateStore, create, bootstrapTaskCycle, transition, satisfy, inspect, obligations, render } = require('../../src/state-kernel-v0');
const { validateAggregate, validateState } = require('../../src/state-kernel-v0/contracts');
const auth = [{ kind: 'AUTHORITY', id: 'DEV-001' }];
const evidence = [{ kind: 'EVIDENCE', id: 'OBS-001', location: 'evidence/obs.json', sha256: 'a'.repeat(64) }];
const bootstrapAuthority = [{ kind: 'AUTHORITY', id: 'DEV-BOOTSTRAP', location: 'evidence/developer-ruling.json', sha256: 'b'.repeat(64) }];
const bootstrapEvidence = [{ kind: 'EVIDENCE', id: 'WAVE1-ESTABLISHED', location: 'evidence/wave1-established.json', sha256: 'c'.repeat(64) }];
const bootstrapProvenance = {
  mode: 'IMPORTED_ESTABLISHED_STATE',
  cutover_at: '2026-09-24T10:00:00.000Z',
  historical_events_reconstructed: false,
  authority_refs: bootstrapAuthority,
  evidence_refs: bootstrapEvidence,
};
function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-kernel-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const store = new FilesystemStateStore(home); store.initialize(); return { home, store };
}
function task(store, obligation = { id: 'GATE', authority_ref: 'DEV-001' }) {
  return create(store, store.verify().revision, 'TaskCycle', 'TC-001', { responsibility: 'TEST_STATE_KERNEL', obligations: [obligation] }, auth);
}
function unchanged(store, action, code) {
  const before = store.read();
  assert.throws(action, error => error.code === code);
  const after = store.read();
  assert.deepEqual(after, before);
}
test('complete vertical: obligations, operation, attempt, projection, process restart and exact correspondence', t => {
  const { home, store } = fixture(t);
  task(store);
  assert.equal(inspect(store, 'TaskCycle', 'TC-001').aggregate.responsibility, 'TEST_STATE_KERNEL');
  let rev = store.verify().revision;
  create(store, rev++, 'Operation', 'OP-001', { taskcycle_id: 'TC-001', objective: 'validate' });
  assert.deepEqual(inspect(store, 'TaskCycle', 'TC-001').aggregate.related_ids, ['OP-001']);
  transition(store, rev++, 'Operation', 'OP-001', 'READY');
  transition(store, rev++, 'Operation', 'OP-001', 'RUNNING');
  create(store, rev++, 'ExecutionAttempt', 'AT-001', { operation_id: 'OP-001' }, auth);
  transition(store, rev++, 'ExecutionAttempt', 'AT-001', 'DISPATCHED');
  transition(store, rev++, 'ExecutionAttempt', 'AT-001', 'COMPLETED', { outcome: 'PASS', result_refs: evidence });
  transition(store, rev++, 'Operation', 'OP-001', 'COMPLETED', { result_ref: 'AT-001' });
  satisfy(store, rev++, 'TC-001', 'GATE', 'DEV-001');
  assert.deepEqual(obligations(store, 'TC-001').pending, []);
  assert.ok(obligations(store, 'TC-001').legal_next.includes('ACTIVE'));
  transition(store, rev++, 'TaskCycle', 'TC-001', 'ACTIVE');
  transition(store, rev++, 'TaskCycle', 'TC-001', 'PENDING_ACCEPTANCE');
  const projection = render(store);
  assert.equal(projection, render(store));
  const subprocess = spawnSync(process.execPath, [path.join(__dirname, '../../src/state-kernel-v0/cli.js'), '--home', home, '--command', 'StateVerify'], { encoding: 'utf8' });
  assert.equal(subprocess.status, 0, subprocess.stderr);
  assert.deepEqual(JSON.parse(subprocess.stdout), { valid: true, revision: rev, event_count: rev });
  const reloaded = new FilesystemStateStore(home);
  assert.deepEqual(reloaded.read(), store.read());
  assert.equal(render(reloaded), projection);
  assert.equal(store.read().events.length, rev);
});
test('illegal transition and rejected obligation gate do not mutate snapshot or events', t => {
  const { store } = fixture(t); task(store);
  unchanged(store, () => transition(store, 1, 'TaskCycle', 'TC-001', 'CLOSED', { authority_ref: 'DEV-001', disposition_ref: 'PASS' }), 'INVALID_TRANSITION');
  transition(store, 1, 'TaskCycle', 'TC-001', 'ACTIVE');
  unchanged(store, () => transition(store, 2, 'TaskCycle', 'TC-001', 'PENDING_ACCEPTANCE'), 'UNSATISFIED_OBLIGATION');
  unchanged(store, () => satisfy(store, 2, 'TC-001', 'GATE'), 'MISSING_REQUIRED_AUTHORITY');
});
test('stale CAS preserves winner and immutable event sequence', t => {
  const { store } = fixture(t); task(store);
  const stale = store.verify().revision;
  transition(store, stale, 'TaskCycle', 'TC-001', 'ACTIVE');
  unchanged(store, () => satisfy(store, stale, 'TC-001', 'GATE', 'DEV-001'), 'STALE_REVISION');
  assert.equal(store.verify().revision, stale + 1);
});
test('UNKNOWN effect remains distinct from failure, blocks retry, requires explicit reconciliation', t => {
  const { store } = fixture(t); task(store);
  create(store, 1, 'Operation', 'OP-001', { taskcycle_id: 'TC-001', objective: 'effect' });
  transition(store, 2, 'Operation', 'OP-001', 'READY');
  transition(store, 3, 'Operation', 'OP-001', 'RUNNING');
  create(store, 4, 'ExecutionAttempt', 'AT-001', { operation_id: 'OP-001' }, auth);
  transition(store, 5, 'ExecutionAttempt', 'AT-001', 'DISPATCHED');
  transition(store, 6, 'ExecutionAttempt', 'AT-001', 'UNKNOWN');
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-001').aggregate.reconciliation_required, true);
  unchanged(store, () => create(store, 7, 'ExecutionAttempt', 'AT-002', { operation_id: 'OP-001' }), 'UNKNOWN_EFFECT_REQUIRES_RECONCILIATION');
  unchanged(store, () => transition(store, 7, 'ExecutionAttempt', 'AT-001', 'COMPLETED', { outcome: 'PASS' }), 'MISSING_REQUIRED_AUTHORITY');
  transition(store, 7, 'ExecutionAttempt', 'AT-001', 'COMPLETED', { outcome: 'PASS', authority_ref: 'DEV-001', result_refs: evidence });
  assert.equal(inspect(store, 'ExecutionAttempt', 'AT-001').aggregate.reconciliation_required, false);
});
test('malformed snapshot or history fails closed and does not repair', t => {
  const { home, store } = fixture(t); task(store);
  const headPath = path.join(home, 'state/kernel-v0/HEAD.json');
  const head = JSON.parse(fs.readFileSync(headPath, 'utf8'));
  const statePath = path.join(home, 'state/kernel-v0', head.generation, 'state.json');
  fs.chmodSync(statePath, 0o644);
  fs.writeFileSync(statePath, '{ invalid');
  const bytes = fs.readFileSync(statePath);
  assert.throws(() => store.verify(), error => error.code === 'MALFORMED_STATE');
  assert.deepEqual(fs.readFileSync(statePath), bytes);
});
test('atomic staging failure leaves previous generation authoritative and no event', t => {
  const { home, store } = fixture(t); task(store);
  const before = store.read();
  const head = fs.readFileSync(path.join(home, 'state/kernel-v0/HEAD.json'));
  const failing = new FilesystemStateStore(home, { failpoint: 'BEFORE_HEAD_REPLACE' });
  assert.throws(() => transition(failing, 1, 'TaskCycle', 'TC-001', 'ACTIVE'), error => error.code === 'INJECTED_FAILURE');
  assert.deepEqual(store.read(), before);
  assert.deepEqual(fs.readFileSync(path.join(home, 'state/kernel-v0/HEAD.json')), head);
});
test('contract roundtrip, distinct state vocabularies and typed identity', t => {
  const { store } = fixture(t); task(store);
  const snapshot = JSON.parse(JSON.stringify(store.read().state));
  assert.doesNotThrow(() => validateState(snapshot));
  assert.doesNotThrow(() => validateAggregate(snapshot.aggregates.TaskCycle['TC-001']));
  snapshot.aggregates.TaskCycle['TC-001'].state = 'DISPATCHED';
  assert.throws(() => validateState(snapshot), error => error.code === 'INVALID_CONTRACT');
  assert.throws(() => create(store, 1, 'Milestone', 'M-001', { title: 'Milestone' }, [{ kind: 'GIT_OBJECT', id: 'oid', git_oid: 'bad' }]), error => error.code === 'INVALID_CONTRACT');
});
test('CLI mutation requires explicit revision and retains state across processes', t => {
  const { home, store } = fixture(t);
  const cli = path.join(__dirname, '../../src/state-kernel-v0/cli.js');
  const request = { expected_revision: 0, id: 'TC-CLI', responsibility: 'CLI', obligations: [], authority_refs: auth };
  const run = command => spawnSync(process.execPath, [cli, '--home', home, '--command', command, '--request', JSON.stringify(request)], { encoding: 'utf8' });
  assert.equal(run('TaskCycleCreate').status, 0);
  assert.equal(run('TaskCycleCreate').status, 1);
  assert.equal(inspect(store, 'TaskCycle', 'TC-CLI').aggregate.id, 'TC-CLI');
  assert.equal(store.verify().event_count, 1);
});
test('committed generations remain byte-stable and tampered event chain fails closed', t => {
  const { home, store } = fixture(t);
  const root = path.join(home, 'state/kernel-v0');
  const initial = JSON.parse(fs.readFileSync(path.join(root, 'HEAD.json'), 'utf8'));
  const initialBytes = fs.readFileSync(path.join(root, initial.generation, 'events.ndjson'));
  task(store);
  assert.deepEqual(fs.readFileSync(path.join(root, initial.generation, 'events.ndjson')), initialBytes);
  const current = JSON.parse(fs.readFileSync(path.join(root, 'HEAD.json'), 'utf8'));
  const eventPath = path.join(root, current.generation, 'events.ndjson');
  fs.chmodSync(eventPath, 0o644);
  const corrupted = fs.readFileSync(eventPath, 'utf8').replace('TEST_STATE_KERNEL', 'ALTERED_KERNEL');
  fs.writeFileSync(eventPath, corrupted);
  assert.throws(() => store.verify(), error => error.code === 'MALFORMED_STATE');
  assert.equal(fs.readFileSync(eventPath, 'utf8'), corrupted);
});
test('Milestone has bounded independent lifecycle and no workflow inference', t => {
  const { store } = fixture(t);
  create(store, 0, 'Milestone', 'M-001', { title: 'Wave 1' });
  transition(store, 1, 'Milestone', 'M-001', 'ACTIVE');
  assert.equal(inspect(store, 'Milestone', 'M-001').aggregate.state, 'ACTIVE');
  unchanged(store, () => transition(store, 2, 'Milestone', 'M-001', 'PLANNED'), 'INVALID_TRANSITION');
});
test('preexisting writer lock fails closed without mutation', t => {
  const { home, store } = fixture(t);
  fs.mkdirSync(path.join(home, 'state/kernel-v0/writer.lock'));
  const before = store.read();
  assert.throws(() => task(store), error => error.code === 'WRITER_LOCKED');
  assert.deepEqual(store.read(), before);
});
test('unsafe aggregate IDs and orphan initialization fail closed', t => {
  const { home, store } = fixture(t);
  unchanged(store, () => create(store, 0, 'TaskCycle', '__proto__', { responsibility: 'x', obligations: [] }, auth), 'INVALID_CONTRACT');
  unchanged(store, () => store.initialize(), 'INVALID_TRANSITION');
  const another = path.join(home, 'another');
  fs.mkdirSync(path.join(another, 'state/kernel-v0/orphan'), { recursive: true });
  assert.throws(() => new FilesystemStateStore(another).initialize(), error => error.code === 'INVALID_TRANSITION');
});
test('future authority reference is recorded in the obligation satisfaction event', t => {
  const { store } = fixture(t);
  create(store, 0, 'TaskCycle', 'TC-FUTURE', { responsibility: 'future acceptance', obligations: [{ id: 'ACCEPTANCE', authority_ref: 'FUTURE-RULING' }] }, auth);
  unchanged(store, () => satisfy(store, 1, 'TC-FUTURE', 'ACCEPTANCE', 'FUTURE-RULING'), 'MISSING_REQUIRED_AUTHORITY');
  satisfy(store, 1, 'TC-FUTURE', 'ACCEPTANCE', 'FUTURE-RULING', { kind: 'AUTHORITY', id: 'FUTURE-RULING', location: 'evidence/ruling.json', sha256: 'b'.repeat(64) });
  const item = inspect(store, 'TaskCycle', 'TC-FUTURE').aggregate;
  assert.equal(item.obligations[0].status, 'SATISFIED');
  assert.equal(item.authority_refs.at(-1).id, 'FUTURE-RULING');
  assert.equal(store.verify().event_count, 2);
});

test('late-bound authority can be attached while satisfying an authority-free obligation', t => {
  const { store } = fixture(t);
  create(store, 0, 'TaskCycle', 'TC-LATE', { responsibility: 'late authority', obligations: [{ id: 'ACCEPTANCE', authority_ref: null }] }, auth);
  const authority = { kind: 'AUTHORITY', id: 'LATE-RULING', location: 'evidence/late-ruling.json', sha256: 'c'.repeat(64) };
  satisfy(store, 1, 'TC-LATE', 'ACCEPTANCE', 'LATE-RULING', authority);
  const item = inspect(store, 'TaskCycle', 'TC-LATE').aggregate;
  assert.equal(item.obligations[0].status, 'SATISFIED');
  assert.equal(item.obligations[0].authority_ref, 'LATE-RULING');
  assert.deepEqual(item.authority_refs.at(-1), authority);
});

test('late-bound authority fails closed on incomplete or mismatched authority input', t => {
  const { store } = fixture(t);
  create(store, 0, 'TaskCycle', 'TC-LATE-FAIL', { responsibility: 'late authority fail closed', obligations: [{ id: 'ACCEPTANCE', authority_ref: null }] }, auth);
  unchanged(store, () => satisfy(store, 1, 'TC-LATE-FAIL', 'ACCEPTANCE', undefined, { kind: 'AUTHORITY', id: 'LATE-RULING' }), 'MISSING_REQUIRED_AUTHORITY');
  unchanged(store, () => satisfy(store, 1, 'TC-LATE-FAIL', 'ACCEPTANCE', 'LATE-RULING'), 'MISSING_REQUIRED_AUTHORITY');
  unchanged(store, () => satisfy(store, 1, 'TC-LATE-FAIL', 'ACCEPTANCE', 'LATE-RULING', { kind: 'AUTHORITY', id: 'OTHER-RULING' }), 'MISSING_REQUIRED_AUTHORITY');
});

test('authority-free obligation satisfaction remains backward compatible', t => {
  const { store } = fixture(t);
  create(store, 0, 'TaskCycle', 'TC-NO-AUTH', { responsibility: 'no authority required', obligations: [{ id: 'VALIDATION', authority_ref: null }] }, auth);
  satisfy(store, 1, 'TC-NO-AUTH', 'VALIDATION');
  const item = inspect(store, 'TaskCycle', 'TC-NO-AUTH').aggregate;
  assert.equal(item.obligations[0].status, 'SATISFIED');
  assert.equal(item.obligations[0].authority_ref, null);
});

test('late-bound Developer authority supports real post-review closure shape', t => {
  const { store } = fixture(t);
  create(store, 0, 'TaskCycle', 'TC-LATE-CLOSE', { responsibility: 'post-review closure', obligations: [
    { id: 'implementation', authority_ref: null },
    { id: 'validation', authority_ref: null },
    { id: 'independent_review', authority_ref: null },
    { id: 'Developer_acceptance', authority_ref: null },
    { id: 'canonical_integration', authority_ref: null },
    { id: 'remote_publication', authority_ref: null },
    { id: 'lifecycle_reconciliation', authority_ref: null },
  ] }, auth);
  transition(store, 1, 'TaskCycle', 'TC-LATE-CLOSE', 'ACTIVE');
  satisfy(store, 2, 'TC-LATE-CLOSE', 'implementation');
  satisfy(store, 3, 'TC-LATE-CLOSE', 'validation');
  satisfy(store, 4, 'TC-LATE-CLOSE', 'independent_review');
  const authority = { kind: 'AUTHORITY', id: 'DEV-ACCEPT-LATE', location: 'evidence/dev-accept.json', sha256: 'd'.repeat(64) };
  satisfy(store, 5, 'TC-LATE-CLOSE', 'Developer_acceptance', 'DEV-ACCEPT-LATE', authority);
  satisfy(store, 6, 'TC-LATE-CLOSE', 'canonical_integration', 'DEV-ACCEPT-LATE');
  satisfy(store, 7, 'TC-LATE-CLOSE', 'remote_publication', 'DEV-ACCEPT-LATE');
  satisfy(store, 8, 'TC-LATE-CLOSE', 'lifecycle_reconciliation', 'DEV-ACCEPT-LATE');
  transition(store, 9, 'TaskCycle', 'TC-LATE-CLOSE', 'CLOSED', { authority_ref: 'DEV-ACCEPT-LATE', disposition_ref: 'result:closed' });
  const item = inspect(store, 'TaskCycle', 'TC-LATE-CLOSE').aggregate;
  assert.equal(item.state, 'CLOSED');
  assert.ok(item.obligations.every(obligation => obligation.status === 'SATISFIED'));
  assert.ok(item.obligations.slice(3).every(obligation => obligation.authority_ref === 'DEV-ACCEPT-LATE'));
  assert.equal(item.terminal_disposition_ref, 'result:closed');
});
test('bootstrap import records established state as one provenance event without fabricated lifecycle history', t => {
  const { store } = fixture(t);
  bootstrapTaskCycle(store, 0, {
    id: 'TC-IMPORT',
    responsibility: 'IMPORT_ESTABLISHED_WAVE',
    state: 'ACTIVE',
    obligations: [
      { id: 'implementation', status: 'SATISFIED', authority_ref: null },
      { id: 'Developer_acceptance', status: 'SATISFIED', authority_ref: 'DEV-BOOTSTRAP' },
      { id: 'lifecycle_reconciliation', status: 'PENDING', authority_ref: 'DEV-BOOTSTRAP' },
    ],
    bootstrap_provenance: bootstrapProvenance,
  });
  const { aggregate } = inspect(store, 'TaskCycle', 'TC-IMPORT');
  assert.equal(aggregate.state, 'ACTIVE');
  assert.deepEqual(aggregate.obligations.map(({ id, status }) => [id, status]), [
    ['implementation', 'SATISFIED'],
    ['Developer_acceptance', 'SATISFIED'],
    ['lifecycle_reconciliation', 'PENDING'],
  ]);
  const { events } = store.read();
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'BOOTSTRAP_IMPORT');
  assert.equal(events[0].bootstrap_provenance.historical_events_reconstructed, false);
  assert.deepEqual(events[0].bootstrap_provenance, bootstrapProvenance);
  assert.equal(events[0].after.created_at, bootstrapProvenance.cutover_at);
  assert.deepEqual(events[0].after.authority_refs, bootstrapProvenance.authority_refs);
  assert.equal(events.some(event => event.action === 'CREATE' || event.action.startsWith('SATISFY:') || event.action.startsWith('TRANSITION:')), false);
});
test('bootstrap import provenance survives replay and process/store reload', t => {
  const { home, store } = fixture(t);
  bootstrapTaskCycle(store, 0, {
    id: 'TC-RELOAD',
    responsibility: 'RELOAD_IMPORTED_STATE',
    state: 'ACTIVE',
    obligations: [{ id: 'remaining', status: 'PENDING', authority_ref: null }],
    bootstrap_provenance: bootstrapProvenance,
  });
  const reloaded = new FilesystemStateStore(home);
  assert.deepEqual(reloaded.read(), store.read());
  assert.deepEqual(reloaded.read().events[0].bootstrap_provenance, bootstrapProvenance);
  const cli = path.join(__dirname, '../../src/state-kernel-v0/cli.js');
  const verify = spawnSync(process.execPath, [cli, '--home', home, '--command', 'StateVerify'], { encoding: 'utf8' });
  assert.equal(verify.status, 0, verify.stderr);
  assert.deepEqual(JSON.parse(verify.stdout), { valid: true, revision: 1, event_count: 1 });
});
test('bootstrap import stale revision, malformed provenance, missing imported authority and duplicate identity fail closed', t => {
  const { store } = fixture(t);
  create(store, 0, 'Milestone', 'M-BOOT', { title: 'bootstrap guard' });
  unchanged(store, () => bootstrapTaskCycle(store, 0, {
    id: 'TC-STALE',
    responsibility: 'STALE',
    state: 'ACTIVE',
    obligations: [],
    bootstrap_provenance: bootstrapProvenance,
  }), 'STALE_REVISION');
  const badHistory = { ...bootstrapProvenance, historical_events_reconstructed: true };
  unchanged(store, () => bootstrapTaskCycle(store, 1, {
    id: 'TC-BAD',
    responsibility: 'BAD',
    state: 'ACTIVE',
    obligations: [],
    bootstrap_provenance: badHistory,
  }), 'INVALID_CONTRACT');
  unchanged(store, () => bootstrapTaskCycle(store, 1, {
    id: 'TC-MISSING-AUTH',
    responsibility: 'BAD AUTH',
    state: 'ACTIVE',
    obligations: [{ id: 'accepted', status: 'SATISFIED', authority_ref: 'OTHER-AUTHORITY' }],
    bootstrap_provenance: bootstrapProvenance,
  }), 'MISSING_REQUIRED_AUTHORITY');
  bootstrapTaskCycle(store, 1, {
    id: 'TC-ONCE',
    responsibility: 'ONCE',
    state: 'ACTIVE',
    obligations: [],
    bootstrap_provenance: bootstrapProvenance,
  });
  unchanged(store, () => bootstrapTaskCycle(store, 2, {
    id: 'TC-ONCE',
    responsibility: 'DUPLICATE',
    state: 'ACTIVE',
    obligations: [],
    bootstrap_provenance: bootstrapProvenance,
  }), 'INVALID_TRANSITION');
});
test('bootstrap import rejects terminal lifecycle and inconsistent pending-acceptance state', t => {
  const { store } = fixture(t);
  unchanged(store, () => bootstrapTaskCycle(store, 0, {
    id: 'TC-CLOSED',
    responsibility: 'NO TERMINAL IMPORT',
    state: 'CLOSED',
    obligations: [],
    bootstrap_provenance: bootstrapProvenance,
  }), 'INVALID_CONTRACT');
  unchanged(store, () => bootstrapTaskCycle(store, 0, {
    id: 'TC-PENDING',
    responsibility: 'PENDING',
    state: 'PENDING_ACCEPTANCE',
    obligations: [{ id: 'open', status: 'PENDING', authority_ref: null }],
    bootstrap_provenance: bootstrapProvenance,
  }), 'UNSATISFIED_OBLIGATION');
});
test('post-cutover satisfaction and closure are real kernel-observed events after bootstrap import', t => {
  const { store } = fixture(t);
  bootstrapTaskCycle(store, 0, {
    id: 'TC-CUTOVER',
    responsibility: 'CUTOVER',
    state: 'ACTIVE',
    obligations: [
      { id: 'implementation', status: 'SATISFIED', authority_ref: null },
      { id: 'lifecycle_reconciliation', status: 'PENDING', authority_ref: 'DEV-BOOTSTRAP' },
    ],
    bootstrap_provenance: bootstrapProvenance,
  });
  satisfy(store, 1, 'TC-CUTOVER', 'lifecycle_reconciliation', 'DEV-BOOTSTRAP');
  transition(store, 2, 'TaskCycle', 'TC-CUTOVER', 'CLOSED', { authority_ref: 'DEV-BOOTSTRAP', disposition_ref: 'TECNOTRON_STATE_KERNEL_V0_WAVE1_CLOSED_PASS' });
  const { state, events } = store.read();
  assert.equal(state.aggregates.TaskCycle['TC-CUTOVER'].state, 'CLOSED');
  assert.deepEqual(events.map(event => event.action), ['BOOTSTRAP_IMPORT', 'SATISFY:lifecycle_reconciliation', 'TRANSITION:CLOSED']);
  assert.equal(events[0].bootstrap_provenance.historical_events_reconstructed, false);
  assert.equal(events[1].bootstrap_provenance, undefined);
  assert.equal(events[2].bootstrap_provenance, undefined);
});
test('CLI exposes TaskCycleBootstrapImport without changing TaskCycleCreate semantics', t => {
  const { home, store } = fixture(t);
  const cli = path.join(__dirname, '../../src/state-kernel-v0/cli.js');
  const request = {
    expected_revision: 0,
    id: 'TC-CLI-IMPORT',
    responsibility: 'CLI IMPORT',
    state: 'ACTIVE',
    obligations: [{ id: 'remaining', status: 'PENDING', authority_ref: null }],
    bootstrap_provenance: bootstrapProvenance,
  };
  const imported = spawnSync(process.execPath, [cli, '--home', home, '--command', 'TaskCycleBootstrapImport', '--request', JSON.stringify(request)], { encoding: 'utf8' });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(inspect(store, 'TaskCycle', 'TC-CLI-IMPORT').aggregate.state, 'ACTIVE');
  const createRequest = { expected_revision: 1, id: 'TC-NORMAL', responsibility: 'NORMAL', obligations: [{ id: 'gate', status: 'SATISFIED', authority_ref: null }], authority_refs: [] };
  const created = spawnSync(process.execPath, [cli, '--home', home, '--command', 'TaskCycleCreate', '--request', JSON.stringify(createRequest)], { encoding: 'utf8' });
  assert.equal(created.status, 0, created.stderr);
  assert.equal(inspect(store, 'TaskCycle', 'TC-NORMAL').aggregate.obligations[0].status, 'PENDING');
});
