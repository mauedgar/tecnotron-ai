'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  createTaskCycleInitializationCapability,
  consumeTaskCycleInitialization,
} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-initialization');

function request() {
  return {
    taskcycle: {
      id: 'TASKCYCLE-TECNOTRON-REPO-FIRST-CURRENT-STATE-RECONCILIATION-001',
      responsibility: 'RECONCILE_REPO_FIRST_PRODUCT_NAVIGATION_TO_CURRENT_CANONICAL_TOOLS_HEAD',
    },
    Product_baseline: {
      repository: 'mauedgar/tecnotron-ai',
      integration_branch: 'tools',
      commit: '03fe6fc2d8d80f415f32d0ba937308d138a48f64',
      tree: '5ce890e9d0cf0294466af79c2a987460a200065e',
    },
    TASK_carrier: {
      branch: 'task/tecnotron-repo-first-current-state-reconciliation-001',
      commit: '2e4bceb3277187395e4444e1bb83a8a9ea2256af',
      tree: 'f8a1d191f009fc4a5e0bc7be0a6730ef9e9e222b',
      path: 'docs/tasks/TEC-TC-REPO-FIRST-CURRENT-STATE-RECONCILIATION-001/TASK.md',
    },
    write_scope: ['docs/current-state.md', 'docs/implementation-roadmap.md'],
    authority_refs: ['DEVELOPER-AUTHORIZE-TC-INITIALIZATION-2026-10-06'],
    obligations: [
      { id: 'implementation', authority_ref: null },
      { id: 'promotion_grade_validation', authority_ref: null },
      { id: 'exact_candidate', authority_ref: null },
      { id: 'frozen_review_interface', authority_ref: null },
      { id: 'independent_review', authority_ref: null },
      { id: 'Developer_acceptance', authority_ref: null },
      { id: 'Phase_2', authority_ref: null },
      { id: 'effect_reconciliation', authority_ref: null },
      { id: 'logical_close', authority_ref: null },
    ],
    current_gate: 'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE',
    evidence_refs: ['TASK:TEC-TC-REPO-FIRST-CURRENT-STATE-RECONCILIATION-001'],
  };
}

function observedFor(r) {
  return {
    Product_baseline: { ...r.Product_baseline },
    TASK_carrier: { ...r.TASK_carrier },
  };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-init-'));
  return {
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test('initializes one exact kernel-free portable TaskCycle projection with all obligations pending', () => {
  const f = fixture();
  try {
    const r = request();
    const result = createTaskCycleInitializationCapability({ root: f.root })
      .initializeTaskCycle({ request: r, observed: observedFor(r) });
    assert.equal(result.status, 'PASS');
    assert.equal(result.effect_state, 'CONFIRMED');
    assert.equal(result.TaskCycle.state, 'ACTIVE');
    assert.equal(result.current_gate, 'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE');
    assert.equal(result.State_Kernel_direct_calls, 0);
    assert.equal(result.pending_obligations.length, r.obligations.length);
    assert.ok(result.pending_obligations.every((entry) => entry.status === 'PENDING'));
    assert.match(result.portable_projection.identity_sha256, /^sha256:[a-f0-9]{64}$/);
  } finally { f.cleanup(); }
});

test('same exact initialization is idempotent while conflicting same TaskCycle id fails closed', () => {
  const f = fixture();
  try {
    const r = request();
    const cap = createTaskCycleInitializationCapability({ root: f.root });
    assert.equal(cap.initializeTaskCycle({ request: r, observed: observedFor(r) }).status, 'PASS');
    const same = cap.initializeTaskCycle({ request: r, observed: observedFor(r) });
    assert.equal(same.status, 'PASS');
    assert.equal(same.already_initialized, true);
    assert.equal(same.reason, 'ALREADY_INITIALIZED_EXACT');

    const conflict = request();
    conflict.taskcycle.responsibility = 'DIFFERENT_RESPONSIBILITY';
    const blocked = cap.initializeTaskCycle({ request: conflict, observed: observedFor(conflict) });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.effect_state, 'NONE');
    assert.equal(blocked.reason, 'TASKCYCLE_INITIALIZATION_IDENTITY_CONFLICT');
  } finally { f.cleanup(); }
});

test('baseline and TASK carrier mismatches fail closed before materialization', () => {
  const f = fixture();
  try {
    const r = request();
    const cap = createTaskCycleInitializationCapability({ root: f.root });
    const baselineObserved = observedFor(r);
    baselineObserved.Product_baseline.commit = '1'.repeat(40);
    const baseline = cap.initializeTaskCycle({ request: r, observed: baselineObserved });
    assert.equal(baseline.status, 'BLOCKED');
    assert.equal(baseline.effect_state, 'NONE');
    assert.equal(baseline.reason, 'PRODUCT_BASELINE_MISMATCH');
    assert.deepEqual(fs.readdirSync(f.root), []);

    const carrierObserved = observedFor(r);
    carrierObserved.TASK_carrier.tree = '2'.repeat(40);
    const carrier = cap.initializeTaskCycle({ request: r, observed: carrierObserved });
    assert.equal(carrier.status, 'BLOCKED');
    assert.equal(carrier.effect_state, 'NONE');
    assert.equal(carrier.reason, 'TASK_CARRIER_MISMATCH');
    assert.deepEqual(fs.readdirSync(f.root), []);
  } finally { f.cleanup(); }
});

test('ambiguous pre-existing materialization reports UNKNOWN and is never overwritten', () => {
  const f = fixture();
  try {
    const r = request();
    const finalRoot = path.join(f.root, encodeURIComponent(r.taskcycle.id).replaceAll('%', '_'));
    fs.mkdirSync(finalRoot);
    fs.writeFileSync(path.join(finalRoot, 'partial.txt'), 'unknown\n', 'utf8');
    const result = createTaskCycleInitializationCapability({ root: f.root })
      .initializeTaskCycle({ request: r, observed: observedFor(r) });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.effect_state, 'UNKNOWN');
    assert.equal(fs.readFileSync(path.join(finalRoot, 'partial.txt'), 'utf8'), 'unknown\n');
  } finally { f.cleanup(); }
});

test('fresh process consumes the exact portable projection only with external manifest identity', () => {
  const f = fixture();
  try {
    const r = request();
    const result = createTaskCycleInitializationCapability({ root: f.root })
      .initializeTaskCycle({ request: r, observed: observedFor(r) });
    const direct = consumeTaskCycleInitialization({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: result.portable_projection.identity_sha256,
    });
    assert.equal(direct.projection.TaskCycle.id, r.taskcycle.id);

    const modulePath = path.resolve(__dirname, '../../src/deterministic-taskcycle-substrate-v0/taskcycle-initialization.js');
    const child = spawnSync(process.execPath, ['-e', `
      const { consumeTaskCycleInitialization } = require(${JSON.stringify(modulePath)});
      const v = consumeTaskCycleInitialization({
        location: ${JSON.stringify(result.portable_projection.location_or_ref)},
        expected_identity_sha256: ${JSON.stringify(result.portable_projection.identity_sha256)}
      });
      process.stdout.write(JSON.stringify({ id: v.projection.TaskCycle.id, state: v.projection.TaskCycle.state }));
    `], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), { id: r.taskcycle.id, state: 'ACTIVE' });

    assert.throws(() => consumeTaskCycleInitialization({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: `sha256:${'0'.repeat(64)}`,
    }), /INITIALIZATION_IDENTITY_MISMATCH/);
  } finally { f.cleanup(); }
});
