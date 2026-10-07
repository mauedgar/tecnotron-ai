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
} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-effect-reconciliation');
const {
  createTaskCyclePostPhase1LifecycleCapability,
  consumeTaskCyclePostPhase1Lifecycle,
} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-post-phase1-lifecycle');

const S = {
  baseline: '0'.repeat(40),
  task: '1'.repeat(40),
  phase1: '2'.repeat(40),
  candidate: '3'.repeat(40),
  tree: '4'.repeat(40),
};

function initializationRequest() {
  return {
    taskcycle: { id: 'TC-1', responsibility: 'RESP-1' },
    Product_baseline: {
      repository: 'mauedgar/tecnotron-ai',
      integration_branch: 'tools',
      commit: S.baseline,
      tree: '5'.repeat(40),
    },
    TASK_carrier: {
      branch: 'task/tc-1',
      commit: S.task,
      tree: '6'.repeat(40),
      path: 'docs/tasks/TC-1/TASK.md',
    },
    write_scope: ['docs/current-state.md', 'docs/implementation-roadmap.md'],
    authority_refs: ['AUTH-INIT'],
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
    evidence_refs: ['TASK:TC-1'],
  };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-post-phase1-'));
  const initRoot = path.join(root, 'init');
  const phase1Root = path.join(root, 'phase1');
  const closeRoot = path.join(root, 'close');
  fs.mkdirSync(initRoot);
  fs.mkdirSync(phase1Root);
  fs.mkdirSync(closeRoot);
  const initReq = initializationRequest();
  const initialized = createTaskCycleInitializationCapability({ root: initRoot }).initializeTaskCycle({
    request: initReq,
    observed: { Product_baseline: initReq.Product_baseline, TASK_carrier: initReq.TASK_carrier },
  });
  assert.equal(initialized.status, 'PASS');

  const subject = {
    repository: initReq.Product_baseline.repository,
    branch: initReq.TASK_carrier.branch,
    commit: S.phase1,
    tree: '7'.repeat(40),
    parent: S.task,
    changed_paths: [...initReq.write_scope],
  };
  const reconciled = createTaskCycleEffectReconciliationCapability({ root: phase1Root }).reconcileCompletedObligation({
    request: {
      taskcycle: initReq.taskcycle,
      initialization: {
        location_or_ref: initialized.portable_projection.location_or_ref,
        identity_sha256: initialized.portable_projection.identity_sha256,
      },
      obligation: {
        id: 'implementation',
        semantic_status: 'COMPLETED_BEFORE_LIFECYCLE_INITIALIZATION',
      },
      subject,
      authority_refs: ['AUTH-PHASE1-RECON'],
      evidence_refs: ['GIT:' + S.phase1],
      next_gate: 'PROMOTION_GRADE_VALIDATION',
    },
    observed: { subject },
  });
  assert.equal(reconciled.status, 'PASS');

  const candidate = {
    repository: initReq.Product_baseline.repository,
    branch: 'composition/tc-1',
    commit: S.candidate,
    tree: S.tree,
    parent: S.baseline,
    changed_paths: ['docs/current-state.md', 'docs/implementation-roadmap.md', 'docs/tasks/TC-1/TASK.md'],
    provenance: { phase1_subject: subject },
  };
  const request = {
    taskcycle: initReq.taskcycle,
    source_reconciliation: {
      location_or_ref: reconciled.portable_projection.location_or_ref,
      identity_sha256: reconciled.portable_projection.identity_sha256,
    },
    candidate,
    promotion_grade_validation: {
      provider: 'github-actions',
      run_id: '100',
      job_id: '200',
      status: 'PASS',
      exact_candidate_commit: candidate.commit,
      exact_candidate_tree: candidate.tree,
      full_tests: { total: 10, passed: 9, failed: 0, skipped: 1 },
      contracts_check: 'PASS',
      post_validation_git_guard: 'PASS',
    },
    frozen_review_interface: {
      id: 'FROZEN-1',
      prompt_sha256: 'sha256:' + '8'.repeat(64),
      subject_commit: candidate.commit,
      subject_tree: candidate.tree,
    },
    independent_review: {
      id: 'IR-1',
      verdict: 'PASS',
      subject_commit: candidate.commit,
      subject_tree: candidate.tree,
      result_sha256: 'sha256:' + '9'.repeat(64),
      blocking_findings: [],
    },
    Developer_acceptance: {
      status: 'GRANTED',
      authority_ref: 'DEVELOPER-GRANTED-AFTER-IR-PASS',
      subject_commit: candidate.commit,
      subject_tree: candidate.tree,
    },
    Phase_2: {
      status: 'PASS',
      pre_tools: candidate.parent,
      post_tools: candidate.commit,
      post_tree: candidate.tree,
      force: false,
      remote_correspondence: 'EXACT',
    },
    effect_reconciliation: {
      status: 'PASS',
      canonical_commit: candidate.commit,
      canonical_tree: candidate.tree,
      unresolved_UNKNOWN_effects: [],
    },
    logical_close: {
      terminal_disposition_ref: 'CLOSED_PASS',
      authority_ref: 'DEVELOPER-AUTHORIZE-CLOSE',
    },
    authority_refs: ['DEVELOPER-GRANTED-AFTER-IR-PASS', 'DEVELOPER-AUTHORIZE-CLOSE'],
    evidence_refs: ['RUN:100', 'IR:IR-1', 'GIT:' + candidate.commit],
  };
  const observed = {
    candidate: request.candidate,
    promotion_grade_validation: request.promotion_grade_validation,
    frozen_review_interface: request.frozen_review_interface,
    independent_review: request.independent_review,
    Developer_acceptance: request.Developer_acceptance,
    Phase_2: request.Phase_2,
    effect_reconciliation: request.effect_reconciliation,
    logical_close: request.logical_close,
  };
  return { root, closeRoot, request, observed, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('substrate index exports the post-Phase1 lifecycle capability', () => {
  const substrate = require('../../src/deterministic-taskcycle-substrate-v0');
  assert.equal(
    typeof substrate.taskcyclePostPhase1Lifecycle.createTaskCyclePostPhase1LifecycleCapability,
    'function',
  );
  assert.equal(
    typeof substrate.taskcyclePostPhase1Lifecycle.consumeTaskCyclePostPhase1Lifecycle,
    'function',
  );
});

test('closes exact resolved post-Phase1 lifecycle with all nine obligations satisfied', () => {
  const f = fixture();
  try {
    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'PASS');
    assert.equal(result.effect_state, 'CONFIRMED');
    assert.equal(result.TaskCycle.state, 'CLOSED');
    assert.equal(result.terminal_disposition_ref, 'CLOSED_PASS');
    assert.deepEqual(result.pending_obligations, []);
    assert.equal(result.State_Kernel_direct_calls, 0);

    const consumed = consumeTaskCyclePostPhase1Lifecycle({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: result.portable_projection.identity_sha256,
    });
    assert.ok(consumed.projection.obligations.every((x) => x.status === 'SATISFIED'));
    assert.equal(consumed.projection.exact_candidate.commit, S.candidate);
  } finally { f.cleanup(); }
});


test('accepted first-parent range closes with actual pre-tools distinct from reviewed tip parent', () => {
  const f = fixture();
  try {
    const actualPreTools = 'a'.repeat(40);
    f.request.Phase_2 = {
      ...f.request.Phase_2,
      pre_tools: actualPreTools,
      accepted_first_parent_range: {
        integration_range_base: actualPreTools,
        accepted_tip: f.request.candidate.commit,
        accepted_tip_parent: f.request.candidate.parent,
        accepted_tip_tree: f.request.candidate.tree,
        ordered_commit_range: [f.request.candidate.parent, f.request.candidate.commit],
        commit_count: 2,
        changed_paths: [...f.request.candidate.changed_paths],
      },
    };
    f.observed.Phase_2 = structuredClone(f.request.Phase_2);

    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'PASS');
    assert.equal(result.effect_state, 'CONFIRMED');

    const consumed = consumeTaskCyclePostPhase1Lifecycle({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: result.portable_projection.identity_sha256,
    });
    assert.deepEqual(
      consumed.projection.lifecycle_evidence.Phase_2.accepted_first_parent_range,
      f.request.Phase_2.accepted_first_parent_range,
    );
    assert.equal(consumed.projection.lifecycle_evidence.Phase_2.pre_tools, actualPreTools);
  } finally { f.cleanup(); }
});

test('demonstrated 9e975 -> dcdd64 -> ff668 accepted range is representable without normalization', () => {
  const f = fixture();
  try {
    const actualPreTools = '9e975fd7c9c504fb7fd24d91231d0aa3c04c71be';
    const reviewedParent = 'dcdd64a7aa42173f7cd81216ebaf476206132122';
    const reviewedTip = 'ff668b3878f2cd89030306dbfd979da23acf33cb';
    const reviewedTree = '572f7445337f97fb77a7d0ce3fbe3af91eb11083';

    f.request.candidate.parent = reviewedParent;
    f.request.candidate.commit = reviewedTip;
    f.request.candidate.tree = reviewedTree;
    f.request.promotion_grade_validation.exact_candidate_commit = reviewedTip;
    f.request.promotion_grade_validation.exact_candidate_tree = reviewedTree;
    f.request.frozen_review_interface.subject_commit = reviewedTip;
    f.request.frozen_review_interface.subject_tree = reviewedTree;
    f.request.independent_review.subject_commit = reviewedTip;
    f.request.independent_review.subject_tree = reviewedTree;
    f.request.Developer_acceptance.subject_commit = reviewedTip;
    f.request.Developer_acceptance.subject_tree = reviewedTree;
    f.request.effect_reconciliation.canonical_commit = reviewedTip;
    f.request.effect_reconciliation.canonical_tree = reviewedTree;
    f.request.Phase_2 = {
      status: 'PASS',
      pre_tools: actualPreTools,
      accepted_first_parent_range: {
        integration_range_base: actualPreTools,
        accepted_tip: reviewedTip,
        accepted_tip_parent: reviewedParent,
        accepted_tip_tree: reviewedTree,
        ordered_commit_range: [reviewedParent, reviewedTip],
        commit_count: 2,
        changed_paths: [...f.request.candidate.changed_paths],
      },
      post_tools: reviewedTip,
      post_tree: reviewedTree,
      force: false,
      remote_correspondence: 'EXACT',
    };

    f.observed.candidate = structuredClone(f.request.candidate);
    f.observed.promotion_grade_validation = structuredClone(f.request.promotion_grade_validation);
    f.observed.frozen_review_interface = structuredClone(f.request.frozen_review_interface);
    f.observed.independent_review = structuredClone(f.request.independent_review);
    f.observed.Developer_acceptance = structuredClone(f.request.Developer_acceptance);
    f.observed.Phase_2 = structuredClone(f.request.Phase_2);
    f.observed.effect_reconciliation = structuredClone(f.request.effect_reconciliation);

    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'PASS');
    const consumed = consumeTaskCyclePostPhase1Lifecycle({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: result.portable_projection.identity_sha256,
    });
    assert.equal(consumed.projection.lifecycle_evidence.Phase_2.pre_tools, actualPreTools);
    assert.deepEqual(
      consumed.projection.lifecycle_evidence.Phase_2.accepted_first_parent_range.ordered_commit_range,
      [reviewedParent, reviewedTip],
    );
  } finally { f.cleanup(); }
});

test('accepted first-parent range coherence failures remain fail-closed', () => {
  const cases = [
    {
      name: 'missing accepted range when pre-tools differs from candidate parent',
      mutate: (r) => { r.Phase_2.pre_tools = 'a'.repeat(40); },
    },
    {
      name: 'integration range base differs from pre-tools',
      mutate: (r) => { r.Phase_2.accepted_first_parent_range.integration_range_base = 'b'.repeat(40); },
    },
    {
      name: 'accepted tip differs from candidate',
      mutate: (r) => { r.Phase_2.accepted_first_parent_range.accepted_tip = 'b'.repeat(40); },
    },
    {
      name: 'accepted tip parent differs from candidate parent',
      mutate: (r) => { r.Phase_2.accepted_first_parent_range.accepted_tip_parent = 'b'.repeat(40); },
    },
    {
      name: 'accepted tip tree differs from candidate tree',
      mutate: (r) => { r.Phase_2.accepted_first_parent_range.accepted_tip_tree = 'b'.repeat(40); },
    },
    {
      name: 'ordered range does not end at reviewed candidate',
      mutate: (r) => {
        r.Phase_2.accepted_first_parent_range.ordered_commit_range = [
          r.candidate.parent,
          'b'.repeat(40),
        ];
      },
    },
    {
      name: 'commit count disagrees with ordered range',
      mutate: (r) => { r.Phase_2.accepted_first_parent_range.commit_count = 3; },
    },
    {
      name: 'post tools differs from reviewed candidate',
      mutate: (r) => { r.Phase_2.post_tools = 'b'.repeat(40); },
    },
    {
      name: 'post tree differs from reviewed candidate',
      mutate: (r) => { r.Phase_2.post_tree = 'b'.repeat(40); },
    },
    {
      name: 'changed path is not normalized repository-relative',
      mutate: (r) => { r.Phase_2.accepted_first_parent_range.changed_paths = ['../escape']; },
    },
  ];

  for (const entry of cases) {
    const f = fixture();
    try {
      const actualPreTools = 'a'.repeat(40);
      f.request.Phase_2 = {
        ...f.request.Phase_2,
        pre_tools: actualPreTools,
        accepted_first_parent_range: {
          integration_range_base: actualPreTools,
          accepted_tip: f.request.candidate.commit,
          accepted_tip_parent: f.request.candidate.parent,
          accepted_tip_tree: f.request.candidate.tree,
          ordered_commit_range: [f.request.candidate.parent, f.request.candidate.commit],
          commit_count: 2,
          changed_paths: [...f.request.candidate.changed_paths],
        },
      };
      entry.mutate(f.request);
      f.observed.Phase_2 = structuredClone(f.request.Phase_2);

      const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
        .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
      assert.equal(result.status, 'BLOCKED', entry.name);
      assert.equal(result.effect_state, 'NONE', entry.name);
      assert.equal(result.reason, 'PHASE2_EVIDENCE_INVALID', entry.name);
      assert.deepEqual(fs.readdirSync(f.closeRoot), [], entry.name);
    } finally { f.cleanup(); }
  }
});

test('review, acceptance, Phase2 and effect reconciliation cannot be inferred or weakened', () => {
  const mutations = [
    (r) => { r.independent_review.verdict = 'FAIL'; },
    (r) => { r.Developer_acceptance.status = 'PENDING'; },
    (r) => { r.Phase_2.force = true; },
    (r) => { r.effect_reconciliation.unresolved_UNKNOWN_effects = ['UNKNOWN-1']; },
    (r) => { r.logical_close.terminal_disposition_ref = 'CLOSED_FAIL'; },
  ];
  for (const mutate of mutations) {
    const f = fixture();
    try {
      mutate(f.request);
      const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
        .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
      assert.equal(result.status, 'BLOCKED');
      assert.equal(result.effect_state, 'NONE');
      assert.deepEqual(fs.readdirSync(f.closeRoot), []);
    } finally { f.cleanup(); }
  }
});

test('candidate must preserve exact Phase1 subject provenance from source reconciliation', () => {
  const f = fixture();
  try {
    f.request.candidate.provenance.phase1_subject.commit = 'b'.repeat(40);
    f.observed.candidate = f.request.candidate;
    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.effect_state, 'NONE');
    assert.equal(result.reason, 'CANDIDATE_PHASE1_PROVENANCE_MISMATCH');
    assert.deepEqual(fs.readdirSync(f.closeRoot), []);
  } finally { f.cleanup(); }
});

test('cross-evidence candidate mismatches fail closed', () => {
  const f = fixture();
  try {
    f.request.Phase_2.post_tools = 'a'.repeat(40);
    f.observed.Phase_2 = f.request.Phase_2;
    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'PHASE2_EVIDENCE_INVALID');
  } finally { f.cleanup(); }
});

test('resolved lifecycle observation mismatch blocks before materialization', () => {
  const f = fixture();
  try {
    f.observed.independent_review = structuredClone(f.request.independent_review);
    f.observed.independent_review.id = 'DIFFERENT';
    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'RESOLVED_LIFECYCLE_OBSERVATION_MISMATCH');
    assert.deepEqual(fs.readdirSync(f.closeRoot), []);
  } finally { f.cleanup(); }
});

test('exact duplicate close is idempotent while conflicting lifecycle identity fails closed', () => {
  const f = fixture();
  try {
    const cap = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot });
    assert.equal(cap.closeFromResolvedLifecycle({ request: f.request, observed: f.observed }).status, 'PASS');
    const same = cap.closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(same.status, 'PASS');
    assert.equal(same.already_closed, true);

    const conflict = structuredClone(f.request);
    conflict.evidence_refs = [...conflict.evidence_refs, 'EXTRA'];
    const observed = structuredClone(f.observed);
    const blocked = cap.closeFromResolvedLifecycle({ request: conflict, observed });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.effect_state, 'NONE');
    assert.equal(blocked.reason, 'POST_PHASE1_LIFECYCLE_IDENTITY_CONFLICT');
  } finally { f.cleanup(); }
});

test('ambiguous pre-existing terminal projection is UNKNOWN and never overwritten', () => {
  const f = fixture();
  try {
    const finalRoot = path.join(f.closeRoot, f.request.taskcycle.id, 'closed-pass');
    fs.mkdirSync(finalRoot, { recursive: true });
    fs.writeFileSync(path.join(finalRoot, 'partial.txt'), 'unknown\n', 'utf8');
    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.effect_state, 'UNKNOWN');
    assert.equal(fs.readFileSync(path.join(finalRoot, 'partial.txt'), 'utf8'), 'unknown\n');
  } finally { f.cleanup(); }
});

test('fresh process consumes the closed projection only with exact external identity', () => {
  const f = fixture();
  try {
    const result = createTaskCyclePostPhase1LifecycleCapability({ root: f.closeRoot })
      .closeFromResolvedLifecycle({ request: f.request, observed: f.observed });
    assert.equal(result.status, 'PASS');

    const modulePath = path.resolve(__dirname, '../../src/deterministic-taskcycle-substrate-v0/taskcycle-post-phase1-lifecycle.js');
    const child = spawnSync(process.execPath, ['-e', `
      const { consumeTaskCyclePostPhase1Lifecycle } = require(${JSON.stringify(modulePath)});
      const v = consumeTaskCyclePostPhase1Lifecycle({
        location: ${JSON.stringify(result.portable_projection.location_or_ref)},
        expected_identity_sha256: ${JSON.stringify(result.portable_projection.identity_sha256)}
      });
      process.stdout.write(JSON.stringify({
        state: v.projection.TaskCycle.state,
        disposition: v.projection.terminal_disposition_ref,
        pending: v.projection.pending_obligations.length
      }));
    `], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {
      state: 'CLOSED',
      disposition: 'CLOSED_PASS',
      pending: 0,
    });

    assert.throws(() => consumeTaskCyclePostPhase1Lifecycle({
      location: result.portable_projection.location_or_ref,
      expected_identity_sha256: 'sha256:' + '0'.repeat(64),
    }), /POST_PHASE1_LIFECYCLE_IDENTITY_MISMATCH/);
  } finally { f.cleanup(); }
});
