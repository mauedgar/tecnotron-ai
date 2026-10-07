'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  createTaskCycleInitializationCapability,
} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-initialization');
const {
  createTaskCycleEffectReconciliationCapability,
  consumeTaskCycleEffectReconciliation,
} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-effect-reconciliation');

function initializationRequest() {
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
    authority_refs: ['DEVELOPER-AUTHORIZE-TC-INITIALIZATION'],
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

function subject() {
  return {
    repository: 'mauedgar/tecnotron-ai',
    branch: 'task/tecnotron-repo-first-current-state-reconciliation-001',
    commit: '8cac265a378c86e1b32523c45dae531b024cb82f',
    tree: '8d57c8e396ef46a816c1e68e92b52c35efc32ed4',
    parent: '2e4bceb3277187395e4444e1bb83a8a9ea2256af',
    changed_paths: ['docs/current-state.md', 'docs/implementation-roadmap.md'],
  };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-effect-reconcile-'));
  const initializationRoot = path.join(root, 'initialization');
  const reconciliationRoot = path.join(root, 'reconciliation');
  fs.mkdirSync(initializationRoot);
  fs.mkdirSync(reconciliationRoot);
  const r = initializationRequest();
  const initialized = createTaskCycleInitializationCapability({ root: initializationRoot })
    .initializeTaskCycle({
      request: r,
      observed: { Product_baseline: { ...r.Product_baseline }, TASK_carrier: { ...r.TASK_carrier } },
    });
  assert.equal(initialized.status, 'PASS');
  return {
    root,
    reconciliationRoot,
    initialized,
    request: {
      taskcycle: { ...r.taskcycle },
      initialization: {
        location_or_ref: initialized.portable_projection.location_or_ref,
        identity_sha256: initialized.portable_projection.identity_sha256,
      },
      obligation: {
        id: 'implementation',
        semantic_status: 'COMPLETED_BEFORE_LIFECYCLE_INITIALIZATION',
      },
      subject: subject(),
      authority_refs: ['DEVELOPER-AUTHORIZE-PHASE1-EFFECT-RECONCILIATION'],
      evidence_refs: ['GIT:8cac265a378c86e1b32523c45dae531b024cb82f'],
      next_gate: 'PROMOTION_GRADE_VALIDATION',
    },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test('reconciles one exact prior Phase 1 effect without replay or State Kernel ownership', () => {
  const f = fixture();
  try {
    const result = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot })
      .reconcileCompletedObligation({ request: f.request, observed: { subject: subject() } });
    assert.equal(result.status, 'PASS');
    assert.equal(result.effect_state, 'CONFIRMED');
    assert.equal(result.obligation, 'implementation');
    assert.equal(result.replayed, false);
    assert.equal(result.State_Kernel_direct_calls, 0);
    assert.equal(result.current_gate, 'PROMOTION_GRADE_VALIDATION');
    assert.equal(result.pending_obligations.length, 8);

    const consumed = consumeTaskCycleEffectReconciliation({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: result.portable_projection.identity_sha256,
    });
    const implementation = consumed.projection.obligations.find((entry) => entry.id === 'implementation');
    assert.equal(implementation.status, 'SATISFIED');
    assert.equal(consumed.projection.reconciled_effect.subject.commit, subject().commit);
    assert.equal(consumed.projection.reconciled_effect.mutation_during_reconciliation, 'NONE');
  } finally { f.cleanup(); }
});

test('exact duplicate is idempotent and conflicting same identity fails closed', () => {
  const f = fixture();
  try {
    const cap = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot });
    assert.equal(cap.reconcileCompletedObligation({
      request: f.request,
      observed: { subject: subject() },
    }).status, 'PASS');

    const same = cap.reconcileCompletedObligation({
      request: f.request,
      observed: { subject: subject() },
    });
    assert.equal(same.status, 'PASS');
    assert.equal(same.already_reconciled, true);
    assert.equal(same.reason, 'ALREADY_RECONCILED_EXACT');

    const conflict = structuredClone(f.request);
    conflict.evidence_refs = ['GIT:DIFFERENT'];
    const blocked = cap.reconcileCompletedObligation({
      request: conflict,
      observed: { subject: subject() },
    });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.effect_state, 'NONE');
    assert.equal(blocked.reason, 'TASKCYCLE_EFFECT_RECONCILIATION_IDENTITY_CONFLICT');
  } finally { f.cleanup(); }
});

test('subject observation mismatch blocks before materialization', () => {
  const f = fixture();
  try {
    const observed = subject();
    observed.commit = '1'.repeat(40);
    const result = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot })
      .reconcileCompletedObligation({ request: f.request, observed: { subject: observed } });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.effect_state, 'NONE');
    assert.equal(result.reason, 'SUBJECT_OBSERVATION_MISMATCH');
    assert.deepEqual(fs.readdirSync(f.reconciliationRoot), []);
  } finally { f.cleanup(); }
});

test('hidden changed paths or wrong parent fail closed before materialization', () => {
  const f = fixture();
  try {
    const wrongPaths = structuredClone(f.request);
    wrongPaths.subject.changed_paths.push('src/runtime.js');
    let result = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot })
      .reconcileCompletedObligation({ request: wrongPaths, observed: { subject: wrongPaths.subject } });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'SUBJECT_NOT_EXACT_PHASE1_DESCENDANT_OF_TASK_CARRIER');

    const wrongParent = structuredClone(f.request);
    wrongParent.subject.parent = '1'.repeat(40);
    result = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot })
      .reconcileCompletedObligation({ request: wrongParent, observed: { subject: wrongParent.subject } });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'SUBJECT_NOT_EXACT_PHASE1_DESCENDANT_OF_TASK_CARRIER');
  } finally { f.cleanup(); }
});

test('ambiguous pre-existing reconciliation projection reports UNKNOWN and is never overwritten', () => {
  const f = fixture();
  try {
    const finalRoot = path.join(
      f.reconciliationRoot,
      f.request.taskcycle.id,
      f.request.obligation.id,
    );
    fs.mkdirSync(finalRoot, { recursive: true });
    fs.writeFileSync(path.join(finalRoot, 'partial.txt'), 'unknown\n', 'utf8');
    const result = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot })
      .reconcileCompletedObligation({ request: f.request, observed: { subject: subject() } });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.effect_state, 'UNKNOWN');
    assert.equal(fs.readFileSync(path.join(finalRoot, 'partial.txt'), 'utf8'), 'unknown\n');
  } finally { f.cleanup(); }
});

test('fresh process consumes the exact reconciled projection only with external identity', () => {
  const f = fixture();
  try {
    const result = createTaskCycleEffectReconciliationCapability({ root: f.reconciliationRoot })
      .reconcileCompletedObligation({ request: f.request, observed: { subject: subject() } });
    assert.equal(result.status, 'PASS');

    const modulePath = path.resolve(__dirname, '../../src/deterministic-taskcycle-substrate-v0/taskcycle-effect-reconciliation.js');
    const child = spawnSync(process.execPath, ['-e', `
      const { consumeTaskCycleEffectReconciliation } = require(${JSON.stringify(modulePath)});
      const v = consumeTaskCycleEffectReconciliation({
        location: ${JSON.stringify(result.portable_projection.location_or_ref)},
        expected_identity_sha256: ${JSON.stringify(result.portable_projection.identity_sha256)}
      });
      process.stdout.write(JSON.stringify({
        id: v.projection.TaskCycle.id,
        status: v.projection.obligations.find(x => x.id === 'implementation').status,
        replayed: v.projection.reconciled_effect.replayed
      }));
    `], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {
      id: f.request.taskcycle.id,
      status: 'SATISFIED',
      replayed: false,
    });

    assert.throws(() => consumeTaskCycleEffectReconciliation({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: `sha256:${'0'.repeat(64)}`,
    }), /EFFECT_RECONCILIATION_IDENTITY_MISMATCH/);
  } finally { f.cleanup(); }
});
