'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { z } = require('zod');

const contracts = require('../../src/contracts/index.js');

test('common: valid state and actor accepted', () => {
  assert.strictEqual(contracts.common.State.safeParse('DONE').success, true);
  assert.strictEqual(contracts.common.State.safeParse('INVALID').success, false);
  assert.strictEqual(contracts.common.Actor.safeParse('developer').success, true);
  assert.strictEqual(contracts.common.Actor.safeParse('reviewer').success, true);
  assert.strictEqual(contracts.common.Actor.safeParse('copilot').success, false);
});

test('common: baseline captured requires fingerprint', () => {
  const ok = contracts.common.Baseline.safeParse({
    revision: 'abc',
    fingerprint_status: 'captured',
    working_tree_fingerprint: 'sha256:' + 'a'.repeat(64),
    fingerprint_reason: null,
  });
  assert.strictEqual(ok.success, true);

  const bad = contracts.common.Baseline.safeParse({
    revision: 'abc',
    fingerprint_status: 'captured',
    working_tree_fingerprint: null,
    fingerprint_reason: null,
  });
  assert.strictEqual(bad.success, false);
});

test('task: valid TASK instance accepted', () => {
  const instance = {
    artifact: 'TASK',
    schema_version: 'fitflow-task/v2',
    task_id: 'FF-AI-VNEXT-003',
    title: 'Implementar contracts y registries v2',
    status: 'READY',
    task_type: 'tooling',
    area: 'ai_tooling',
    scope: 'docs_tooling',
    lane: 'ai_orchestrated',
    risk: 'low',
    priority: 'P0',
    created_at: '2026-08-18T16:00:00-03:00',
    author_role: 'developer',
    baseline: {
      revision: 'abc',
      fingerprint_status: 'unavailable',
      working_tree_fingerprint: null,
      fingerprint_reason: 'no fingerprint captured',
    },
    github_issue: null,
    openspec_change: null,
    objective: 'Implementar contracts zod y registries loaders para AI Core.',
    in_scope: ['FitFlow-ai/src/contracts', 'FitFlow-ai/src/registries'],
    out_of_scope: ['state machine'],
    constraints: ['no installs beyond authorized zod/yaml'],
    acceptance_criteria: [{ id: 'AC-1', criterion: 'contracts v2 validan con zod' }],
    ownership_keys: ['path:FitFlow-ai/src/contracts'],
  };
  const parsed = contracts.task.Task.safeParse(instance);
  assert.strictEqual(parsed.success, true, JSON.stringify(parsed.error && parsed.error.issues));
});

test('task: rejects invented baseline fingerprint', () => {
  const base = contracts.task.Task;
  const parsed = base.safeParse({
    artifact: 'TASK',
    schema_version: 'fitflow-task/v2',
    task_id: 'FF-AI-VNEXT-003',
    title: 'Implementar contracts y registries v2',
    status: 'READY',
    task_type: 'tooling',
    area: 'ai_tooling',
    scope: 'docs_tooling',
    lane: 'ai_orchestrated',
    risk: 'low',
    priority: 'P0',
    created_at: '2026-08-18T16:00:00-03:00',
    author_role: 'developer',
    baseline: {
      revision: 'dirty-tree',
      fingerprint_status: 'captured',
      working_tree_fingerprint: 'sha256:not-a-hash',
      fingerprint_reason: null,
    },
    github_issue: null,
    openspec_change: null,
    objective: 'Implementar contracts zod y registries loaders para AI Core.',
    in_scope: ['FitFlow-ai/src/contracts'],
    out_of_scope: [],
    acceptance_criteria: [{ id: 'AC-1', criterion: 'contracts v2 validan' }],
    ownership_keys: ['path:FitFlow-ai/src/contracts'],
  });
  assert.strictEqual(parsed.success, false);
});

test('run-event: valid event accepted', () => {
  const event = {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: 'evt-001',
    sequence: 1,
    task_id: 'FF-AI-VNEXT-003',
    run_id: 'FF-AI-VNEXT-003-20260818',
    created_at: '2026-08-18T16:00:00-03:00',
    actor: 'developer',
    event_type: 'STATE_TRANSITION',
    state_from: 'READY',
    state_to: 'PLANNING',
    reason_code: 'PLAN_STARTED',
    inputs: [],
    outputs: [],
  };
  assert.strictEqual(contracts.runEvent.RunEvent.safeParse(event).success, true);
});

test('run-event: non-developer cannot emit DONE', () => {
  const event = {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: 'evt-001',
    sequence: 1,
    task_id: 'FF-AI-VNEXT-003',
    run_id: 'FF-AI-VNEXT-003-20260818',
    created_at: '2026-08-18T16:00:00-03:00',
    actor: 'reviewer',
    event_type: 'DEVELOPER_DECISION',
    state_from: 'PENDING_ACCEPTANCE',
    state_to: 'DONE',
    reason_code: 'BASELINE_ACCEPTED',
    inputs: [],
    outputs: [],
  };
  assert.strictEqual(contracts.runEvent.RunEvent.safeParse(event).success, false);
});

test('run-state: valid state accepted', () => {
  const state = {
    artifact: 'RUN_STATE',
    schema_version: 'fitflow-run-state/v2',
    task_id: 'FF-AI-VNEXT-003',
    run_id: 'FF-AI-VNEXT-003-20260818',
    updated_at: '2026-08-18T16:00:00-03:00',
    baseline: {
      revision: 'abc',
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
  assert.strictEqual(contracts.runState.RunState.safeParse(state).success, true);
});

test('validation: gate and results validate', () => {
  const gate = {
    gate_id: 'unit',
    command: 'node --test',
    cwd: 'FitFlow-ai',
    status: 'PASS',
    exit_code: 0,
    duration_ms: 10,
    summary: 'ok',
    output_artifact: null,
  };
  assert.strictEqual(contracts.validation.Gate.safeParse(gate).success, true);
  const badGate = Object.assign({}, gate, { status: 'COMPLETED' });
  assert.strictEqual(contracts.validation.Gate.safeParse(badGate).success, false);
});