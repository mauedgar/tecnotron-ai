'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { StateMachine, InvalidTransitionError, createStateMachineFromOrchestrator } = require('../../src/core/state-machine');
const { RunStore, SqliteProjection, RunStoreError } = require('../../src/core/run-store');
function testOrchestrator() {
  return {
    schema_version: 'fitflow-orchestrator/v2',
    baseline: 'test',
    runtime: { port: 'AgentRuntimePort', preferred_adapter: 'none', adapter_status: 'disabled' },
    control: {
      planner: 'developer',
      terminal_agent_state: 'PENDING_ACCEPTANCE',
      final_state: 'DONE',
      final_actor: 'developer',
      commits_by_agents: false,
      dependency_changes_by_agents: false,
    },
    states: ['BACKLOG', 'READY', 'PLANNING', 'ROUTING', 'EXPLORING', 'REVIEWING', 'PENDING_ACCEPTANCE', 'DONE'],
    transitions: {
      BACKLOG: ['READY'],
      READY: ['PLANNING'],
      PLANNING: ['ROUTING'],
      ROUTING: ['EXPLORING', 'PENDING_ACCEPTANCE'],
      EXPLORING: ['PENDING_ACCEPTANCE'],
      REVIEWING: ['PENDING_ACCEPTANCE'],
      PENDING_ACCEPTANCE: ['DONE'],
      DONE: [],
    },
    limits: { context_expansions: 1, implementation_attempts: 1, review_attempts: 1 },
    parallelism: { enabled: false, require_disjoint_ownership_keys: true, single_writer_per_key: true },
    artifacts: { task_root: '.ai/tasks', run_root: '.ai/runs', local_root: '.ai/local', schema_root: '.ai/contracts/v2' },
  };
}

function testRunState() {
  return {
    artifact: 'RUN_STATE',
    schema_version: 'fitflow-run-state/v2',
    task_id: 'FF-AI-VNEXT-004',
    run_id: 'FF-AI-VNEXT-004-20260818',
    updated_at: '2026-08-18T18:00:00-03:00',
    baseline: {
      revision: '44952257482192c438cb38f80be623056fce2409',
      fingerprint_status: 'unavailable',
      working_tree_fingerprint: null,
      fingerprint_reason: 'no fingerprint captured',
    },
    workflow_id: 'development',
    current_state: 'PLANNING',
    next_state: 'ROUTING',
    sequence: 1,
    retry_counters: { context: 0, implementation: 0, review: 0 },
    context_deliveries: [],
    route_history: [],
    validation_history: [],
    review_history: [],
    blocked_by: [],
    last_error: null,
  };
}

function testRunEvent(seq, actor, from, to, type, reason) {
  return {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: `evt-${String(seq).padStart(3, '0')}`,
    sequence: seq,
    task_id: 'FF-AI-VNEXT-004',
    run_id: 'FF-AI-VNEXT-004-20260818',
    created_at: '2026-08-18T18:00:00-03:00',
    actor,
    event_type: type,
    state_from: from,
    state_to: to,
    reason_code: reason,
    inputs: [],
    outputs: [],
    usage_record_id: null,
    idempotency_key: `FF-AI-VNEXT-004-20260818-${seq}`,
  };
}

test('state machine builds from an orchestrator contract', () => {
  const sm = createStateMachineFromOrchestrator(testOrchestrator());
  assert.strictEqual(sm.finalState, 'DONE');
  assert.strictEqual(sm.finalActor, 'developer');
  assert.strictEqual(sm.terminalAgentState, 'PENDING_ACCEPTANCE');
  assert.ok(sm.states.has('BACKLOG'));
  assert.ok(sm.states.has('DONE'));
});

test('state machine follows configured transitions', () => {
  const sm = createStateMachineFromOrchestrator(testOrchestrator());
  assert.strictEqual(sm.canTransition('BACKLOG', 'READY'), true);
  assert.strictEqual(sm.canTransition('READY', 'PLANNING'), true);
  assert.strictEqual(sm.canTransition('PLANNING', 'ROUTING'), true);
  assert.strictEqual(sm.canTransition('BACKLOG', 'PLANNING'), false);
  assert.strictEqual(sm.canTransition('ROUTING', 'DONE'), false);
});

test('DONE requires PENDING_ACCEPTANCE and developer actor', () => {
  const sm = createStateMachineFromOrchestrator(testOrchestrator());
  assert.strictEqual(sm.canTransition('PENDING_ACCEPTANCE', 'DONE', 'developer'), true);
  assert.strictEqual(sm.canTransition('PENDING_ACCEPTANCE', 'DONE', 'reviewer'), false);
  assert.strictEqual(sm.canTransition('REVIEWING', 'DONE', 'developer'), false);
});

test('unknown states throw InvalidTransitionError', () => {
  const sm = createStateMachineFromOrchestrator(testOrchestrator());
  assert.throws(() => sm.canTransition('NOPE', 'READY'), InvalidTransitionError);
  assert.throws(() => sm.canTransition('READY', 'NOPE'), InvalidTransitionError);
});

test('configuration rejects unknown transition origins and targets', () => {
  const unknownOrigin = testOrchestrator();
  unknownOrigin.transitions.NOPE = ['READY'];
  assert.throws(() => new StateMachine(unknownOrigin), /transition origin not in states/);
  const unknownTarget = testOrchestrator();
  unknownTarget.transitions.READY = ['NOPE'];
  assert.throws(() => new StateMachine(unknownTarget));
});

test('configuration rejects an invalid routing transition', () => {
  const config = testOrchestrator();
  config.transitions.ROUTING = ['PENDING_ACCEPTANCE'];
  assert.throws(() => new StateMachine(config), /invalid routing transition/);
});

test('run store appends events and writes state to filesystem', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fitflow-runstore-'));
  const store = new RunStore({ root: tmp });

  const evt = testRunEvent(1, 'system', 'PLANNING', 'EXECUTING', 'EXECUTION_COMPLETED', 'IMPLEMENTED');
  const written = store.appendEvent(evt);
  assert.strictEqual(written.event_id, 'evt-001');

  const events = store.listEvents('FF-AI-VNEXT-004-20260818');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event_type, 'EXECUTION_COMPLETED');

  store.writeRunState(testRunState());
  const state = store.readRunState('FF-AI-VNEXT-004-20260818');
  assert.strictEqual(state.current_state, 'PLANNING');
  assert.strictEqual(state.sequence, 1);
});

test('run store rejects invalid events', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fitflow-runstore-'));
  const store = new RunStore({ root: tmp });
  assert.throws(() => store.appendEvent({ artifact: 'nope' }), RunStoreError);
});

test('sqlite projection persists runs and events', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fitflow-sqlite-'));
  const dbPath = path.join(tmp, 'run-state.sqlite');
  const projection = new SqliteProjection(dbPath);

  projection.upsertRunState(testRunState());
  projection.insertEvent(testRunEvent(1, 'system', 'PLANNING', 'EXECUTING', 'EXECUTION_COMPLETED', 'IMPLEMENTED'));
  projection.insertEvent(testRunEvent(2, 'validator', 'EXECUTING', 'VALIDATING', 'VALIDATION_COMPLETED', 'PASS'));

  const latest = projection.latestState('FF-AI-VNEXT-004-20260818');
  assert.strictEqual(latest.current_state, 'PLANNING');
  assert.strictEqual(latest.task_id, 'FF-AI-VNEXT-004');

  const events = projection.eventsFor('FF-AI-VNEXT-004-20260818');
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[1].actor, 'validator');

  projection.close();
  assert.ok(fs.existsSync(dbPath));
});

test('sqlite projection upsert overwrites run state', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fitflow-sqlite-'));
  const projection = new SqliteProjection(path.join(tmp, 'run-state.sqlite'));

  const s1 = testRunState();
  projection.upsertRunState(s1);
  const s2 = Object.assign({}, s1, { current_state: 'EXECUTING', next_state: 'VALIDATING', sequence: 3 });
  projection.upsertRunState(s2);

  const latest = projection.latestState('FF-AI-VNEXT-004-20260818');
  assert.strictEqual(latest.current_state, 'EXECUTING');
  assert.strictEqual(latest.sequence, 3);
  projection.close();
});
