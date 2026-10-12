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
  return { root, closeRoot, request, observed, initialization: initialized,
    reconciliation: reconciled, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
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
      mutate: (r) => {
        r.Phase_2.pre_tools = 'a'.repeat(40);
        delete r.Phase_2.accepted_first_parent_range;
      },
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

function mergeFixture() {
  const f = fixture();
  const c = f.request.candidate;
  c.parent = S.phase1;
  c.changed_paths = [...initializationRequest().write_scope];
  c.provenance.task_carrier_commit = S.task;
  c.provenance.task_carrier_path = 'docs/tasks/TC-1/TASK.md';
  const mergeCommit = 'a'.repeat(40);
  const mergedTree = 'b'.repeat(40);
  const before = 'c'.repeat(40);
  const merge = {
    commit: mergeCommit, tree: mergedTree,
    parents: [before, c.commit], candidate_tree: c.tree,
    validated_combined_tree: mergedTree,
    candidate_lineage: [S.phase1, c.commit],
    changed_paths: [...c.changed_paths, c.provenance.task_carrier_path],
    git_observation_ref: 'GIT:MERGE-A',
    preflight_ref: 'NATIVE:MERGE-TREE-PASS',
    lineage_verification_ref: 'GIT:REVIEWED-LINEAGE',
    remote_effect: 'CONFIRMED', unknown_effects: 0,
  };
  f.request.Phase_2 = {
    status: 'PASS', integration_mode: 'MERGE_COMMIT',
    pre_tools: before, post_tools: mergeCommit, post_tree: mergedTree,
    force: false, remote_correspondence: 'EXACT', merge,
  };
  f.request.effect_reconciliation = {
    status: 'PASS', canonical_commit: mergeCommit,
    canonical_tree: mergedTree, unresolved_UNKNOWN_effects: [],
  };
  f.observed.candidate = structuredClone(c);
  f.observed.Phase_2 = structuredClone(f.request.Phase_2);
  f.observed.effect_reconciliation = structuredClone(f.request.effect_reconciliation);
  f.request.source_initialization = {
    location_or_ref: f.initialization.portable_projection.location_or_ref,
    identity_sha256: f.initialization.portable_projection.identity_sha256,
  };
  f.observed.canonical_tools = {
    branch: 'tools', head_commit: mergeCommit, head_tree: mergedTree,
    merge_parents: [before, c.commit],
    verification_ref: merge.git_observation_ref,
    preflight_ref: merge.preflight_ref,
    lineage_verification_ref: merge.lineage_verification_ref,
    remote_effect: 'CONFIRMED', unresolved_UNKNOWN_effects: 0,
  };
  return f;
}

test('synthetic merge claims do not qualify as externally verified Git proof', () => {
  const f=mergeFixture();
  try {
    const result=createTaskCyclePostPhase1LifecycleCapability({root:f.closeRoot})
      .closeFromResolvedLifecycle({request:f.request,observed:f.observed});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'COMPETENT_PRODUCT_CONTROL_RESOLUTION_REQUIRED');
    assert.equal(result.effect_state,'NONE');
    assert.ok(!fs.existsSync(path.join(f.closeRoot,'TC-1','closed-pass')));
  } finally {f.cleanup();}
});

test('merge-mode invalid identities and stale effects fail closed with no lifecycle materialization', () => {
  const cases = [
    ['missing external observation', f => {delete f.observed.canonical_tools;}],
    ['reversed parents', f => {f.request.Phase_2.merge.parents.reverse();f.observed.Phase_2 = structuredClone(f.request.Phase_2);} ],
    ['wrong tested tree', f => {f.request.Phase_2.merge.validated_combined_tree = '9'.repeat(40);f.observed.Phase_2 = structuredClone(f.request.Phase_2);} ],
    ['bad scope', f => {f.request.Phase_2.merge.changed_paths.push('unrelated.txt');f.observed.Phase_2 = structuredClone(f.request.Phase_2);} ],
    ['candidate history changed', f => {f.request.Phase_2.merge.candidate_lineage[0]='8'.repeat(40);f.observed.Phase_2=structuredClone(f.request.Phase_2);} ],
    ['unknown published effect', f => {f.request.Phase_2.merge.unknown_effects=1;f.observed.Phase_2=structuredClone(f.request.Phase_2);} ],
    ['forced merge', f => {f.request.Phase_2.force=true;f.observed.Phase_2=structuredClone(f.request.Phase_2);} ],
    ['stale canonical observation', f => {f.observed.canonical_tools.head_commit='7'.repeat(40);} ],
    ['wrong canonical effect', f => {f.request.effect_reconciliation.canonical_commit=S.candidate;f.observed.effect_reconciliation=structuredClone(f.request.effect_reconciliation);} ],
  ];
  for (const [name,mutate] of cases) {
    const f=mergeFixture();
    try {
      mutate(f);
      const r=createTaskCyclePostPhase1LifecycleCapability({root:f.closeRoot})
        .closeFromResolvedLifecycle({request:f.request,observed:f.observed});
      assert.equal(r.status,'BLOCKED',name+':'+r.reason);
      assert.equal(r.effect_state,'NONE',name);
      assert.ok(!fs.existsSync(path.join(f.closeRoot,'TC-1','closed-pass')),name);
    } finally {f.cleanup();}
  }
});

test('original reviewer, Developer and preflight must be byte-verified before merge closure', () => {
  const f = mergeFixture();
  try {
    f.observed.trusted_git = { checkout: '/nonexistent/git', expected_repo_origin: 'https://github.com/mauedgar/tecnotron-ai.git', remote_ref:'refs/heads/tools' };
    f.observed.external_evidence = {
      original_review: {path:'/nonexistent/review',origin_ref:'LIBRARY:unverified',owner:'INDEPENDENT_REVIEW_ORIGINAL'},
      Developer_approval: {path:'/nonexistent/approval',origin_ref:'TRANSPORT:unverified',owner:'DEVELOPER_CONTROL_VERIFIED'},
      combined_tree_preflight: {path:'/nonexistent/preflight',origin_ref:'TRANSPORT:unverified',owner:'NATIVE_INTEGRATION_PREFLIGHT'}
    };
    const result = createTaskCyclePostPhase1LifecycleCapability({root:f.closeRoot})
      .closeFromResolvedLifecycle({request:f.request,observed:f.observed});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.effect_state,'NONE');
  } finally {f.cleanup();}
});

test('a qualified Git surface is independent of request/observed.trusted_git declarations', () => {
  const f=mergeFixture();
  try {
    f.observed.trusted_git={checkout:'/tmp/fake',status:'READY'};
    const r=createTaskCyclePostPhase1LifecycleCapability({root:f.closeRoot})
      .closeFromResolvedLifecycle({request:f.request,observed:f.observed});
    assert.equal(r.status,'BLOCKED');
    assert.equal(r.reason,'COMPETENT_PRODUCT_CONTROL_RESOLUTION_REQUIRED');
    assert.equal(r.effect_state,'NONE');
  } finally {f.cleanup();}
});


// Evidence verifier tests colocated with the accepted explicitly-classified operational suite.
const {parsePaths,qualifyMergeTopology}=require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-close-evidence-qualification');

test('NUL path parser preserves leading/trailing spaces and UTF-8 names',()=>{
  assert.deepEqual(parsePaths(' leading.test.js\0utf8/café.test.js\0'),[' leading.test.js','utf8/café.test.js']);
  assert.deepEqual(parsePaths(''),[]);
  assert.deepEqual(parsePaths('z.js\0a.js\0z.js\0'),['a.js','z.js']);
});
test('NUL path parser fails closed on malformed and dangerous paths',()=>{
  for(const s of [' a.js\n','file.js','../escape\0','/abs\0','file.js\0\0','a\\b\0','a/../b\0','\uFFFD.js\0']){
    assert.throws(()=>parsePaths(s),undefined,s);
  }
});

const phase1={commit:'d47dffd5b25da3f883f0f08d34ad9e8e0cb081ac',
tree:'d2cbc04162441f0bc0c10d49093fd41ed65075a5',
task_carrier:'b43ce9fc518510a0f5b41ab29df88bbefacca11f'};
const candidate='08e94d6d17b9a2071c36c920574683a969fb53ba';
const pre='58c9b68d468588d58c4d85d032a799f83846123d';
const merge='2a42a1bbda6e9fecccb28c42c9c2dd294b3b1c89';
const tree='04e57337ac129bd40774d48cf2cfee041f904cfa';
const writeScope=['docs/guides/testing-by-type.md','package.json','scripts/tests/run-by-type.js','scripts/tests/test-suites.test.js'];
const taskPath='docs/tasks/TEC-TC-TEST-SUITE-TYPE-CLASSIFICATION-001/TASK.md';
function params(root) {
  return { repositoryPath:root,phase1,originalTaskCycleId:'TASKCYCLE-TECNOTRON-TEST-SUITE-TYPE-CLASSIFICATION-001',
    expectedRemoteCommit:merge,remoteUrl:'https://github.com/mauedgar/tecnotron-ai.git',
    scope:{write_scope:writeScope,authorized_added_paths:[],task_path:taskPath,baseline_path_scope:[...writeScope,taskPath]},
    request:{taskcycle:{id:'TASKCYCLE-TECNOTRON-TEST-SUITE-TYPE-CLASSIFICATION-001'},
      candidate:{repository:'mauedgar/tecnotron-ai',commit:candidate,tree:'f8d8ba33dd7f3322b48d46f03998aa606afd3ce1',
        parent:phase1.commit},
      Phase_2:{integration_mode:'MERGE_COMMIT',status:'PASS',pre_tools:pre,post_tools:merge,post_tree:tree,
        force:false,remote_correspondence:'EXACT',
        merge:{commit:merge,tree,parents:[pre,candidate],validated_combined_tree:tree,
          candidate_lineage:[phase1.commit,candidate],
          changed_paths:[...writeScope,taskPath]}}}};
}
test('typed guards reject invalid mode, false remote binding and wrong TaskCycle before reading Git',()=>{
  const p=params('/nonexistent');
  p.request.Phase_2.integration_mode='SQUASH';
  assert.equal(qualifyMergeTopology(p).reason,'MERGE_CLOSURE_INPUT_INVALID');
  p.request.Phase_2.integration_mode='MERGE_COMMIT';
  p.remoteUrl='file:///fake';
  assert.equal(qualifyMergeTopology(p).reason,'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
  p.remoteUrl='https://github.com/mauedgar/tecnotron-ai.git';
  p.request.taskcycle.id='fake';
  assert.equal(qualifyMergeTopology(p).reason,'MERGE_CLOSURE_INPUT_INVALID');
});
test('missing independently qualified checkout cannot close via synthetic self-consistency',()=>{
  const r=qualifyMergeTopology(params('/path/that/does-not-exist'));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
});
test('real two-parent PR42 merge requires exact official GitHub HEAD, parents, tree and every repair edge', {
  ...(process.env.TS_PRODUCT_GIT_PROOF==='1' ? {} : {skip:'requires exact Product Git checkout'})
},()=>{
  const r=qualifyMergeTopology(params(path.resolve(process.cwd())));
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.verified.merge_commit,merge);
  assert.equal(r.verified.combined_tree_claim,tree);
  assert.equal(r.verified.remote_oid,merge);
  assert.deepEqual(r.verified.actual_changed_paths,[...writeScope,taskPath].sort());
});

test('merge closure rejects absent competent resolution even with asserted status strings', () => {
  const f=mergeFixture();
  try {
    const fabricated=(input)=>({status:'COMPETENTLY_RESOLVED',
      taskcycle_id:input.request.taskcycle.id,
      exact_candidate_commit:input.request.candidate.commit,
      exact_candidate_tree:input.request.candidate.tree,
      canonical_integration_commit:input.request.Phase_2.post_tools,
      canonical_integration_tree:input.request.Phase_2.post_tree,
      reviewer_verdict:'PASS',blocking_findings:0,Developer_acceptance:'GRANTED'});
    const result=createTaskCyclePostPhase1LifecycleCapability({
      root:f.closeRoot,resolveCompetentProductEvidence:fabricated
    }).closeFromResolvedLifecycle({request:f.request,observed:f.observed});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'COMPETENT_PRODUCT_CONTROL_RESOLUTION_INVALID');
    assert.equal(result.effect_state,'NONE');
  } finally {f.cleanup();}
});

test('qualified evidence requires explicit authenticated additive scope instead of editing historical init', () => {
  const f=mergeFixture();
  try {
    const invented=(input)=>({status:'COMPETENTLY_RESOLVED',
      taskcycle_id:input.request.taskcycle.id,
      original_taskcycle_id:input.request.taskcycle.id,
      original_initialization_sha256:input.request.source_initialization.identity_sha256,
      original_phase1_sha256:input.request.source_reconciliation.identity_sha256,
      exact_candidate_commit:input.request.candidate.commit,
      exact_candidate_tree:input.request.candidate.tree,
      canonical_integration_commit:input.request.Phase_2.post_tools,
      canonical_integration_tree:input.request.Phase_2.post_tree,
      reviewer_verdict:'PASS',blocking_findings:0,
      original_review_id:input.request.independent_review.id,
      original_review_sha256:input.request.independent_review.result_sha256,
      Developer_acceptance:'GRANTED',
      Developer_authority_source:input.request.Developer_acceptance.authority_ref,
      effect_state:'KNOWN',natively_tested_tree:input.request.Phase_2.post_tree,
      candidate_tested_commit:input.request.candidate.commit,
      candidate_tested_tree:input.request.candidate.tree,
      candidate_validation_sha256:'sha256:'+'1'.repeat(64),
      combined_validation_sha256:'sha256:'+'2'.repeat(64),
      git_surface_identity_sha256:'sha256:'+'3'.repeat(64),
      git_surface_receipt_ref:'GIT:SURFACE',
      original_review_ref:'LIBRARY:ORIGINAL',
      candidate_validation_ref:'NATIVE:CANDIDATE',
      combined_validation_ref:'NATIVE:COMBINED',
      Control_reconciliation_ref:'TRANSPORT:RECONCILIATION',
      qualified_evidence_provenance_ref:'GIT:IDENTITY',
      chronology_verified:true,
      scope_added_paths:['src/new-verifier.js'],
      scope_amendments:[], // Missing competent immutable amendment => BLOCK.
      effective_write_scope:[...initializationRequest().write_scope,'src/new-verifier.js'].sort()});
    const result=createTaskCyclePostPhase1LifecycleCapability({
      root:f.closeRoot,resolveCompetentProductEvidence:invented
    }).closeFromResolvedLifecycle({request:f.request,observed:f.observed});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'COMPETENT_PRODUCT_CONTROL_RESOLUTION_INVALID');
    assert.equal(result.effect_state,'NONE');
  } finally {f.cleanup();}
});

// IR005 F007 regression: parent and terminal directory symlink escapes
// must fail without writing even when a target directory exists elsewhere.
test('symlinked TaskCycle parent is rejected before any lifecycle publication', (t) => {
  const f = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-close-outside-'));
  try {
    try { fs.symlinkSync(outside, path.join(f.closeRoot, 'TC-1'), 'dir'); }
    catch (error) {
      if (['EPERM','EACCES','ENOSYS'].includes(error?.code)) return t.skip('symlinks unavailable');
      throw error;
    }
    const result = createTaskCyclePostPhase1LifecycleCapability({root:f.closeRoot})
      .closeFromResolvedLifecycle({request:f.request, observed:f.observed});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.effect_state,'UNKNOWN');
    assert.equal(result.reason,'POST_PHASE1_LIFECYCLE_PARENT_UNSAFE');
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally {f.cleanup(); fs.rmSync(outside,{recursive:true,force:true});}
});

test('symlinked terminal projection is not accepted as idempotent or overwritten', (t) => {
  const f = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-close-escape-'));
  try {
    const parent = path.join(f.closeRoot,'TC-1');
    fs.mkdirSync(parent);
    try { fs.symlinkSync(outside, path.join(parent,'closed-pass'), 'dir'); }
    catch (error) {
      if (['EPERM','EACCES','ENOSYS'].includes(error?.code)) return t.skip('symlinks unavailable');
      throw error;
    }
    const result = createTaskCyclePostPhase1LifecycleCapability({root:f.closeRoot})
      .closeFromResolvedLifecycle({request:f.request, observed:f.observed});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.effect_state,'UNKNOWN');
    assert.equal(result.reason,'POST_PHASE1_LIFECYCLE_TERMINAL_UNSAFE');
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally {f.cleanup(); fs.rmSync(outside,{recursive:true,force:true});}
});


test('merge Control binding requires exact frozen review and logical-close authorization correlation', () => {
  const f = mergeFixture();
  try {
    const q = f.request;
    const resolution = {
      status:'COMPETENTLY_RESOLVED',
      taskcycle_id:q.taskcycle.id,
      original_taskcycle_id:q.taskcycle.id,
      original_initialization_sha256:q.source_initialization.identity_sha256,
      original_phase1_sha256:q.source_reconciliation.identity_sha256,
      exact_candidate_commit:q.candidate.commit,
      exact_candidate_tree:q.candidate.tree,
      canonical_integration_commit:q.Phase_2.post_tools,
      canonical_integration_tree:q.Phase_2.post_tree,
      reviewer_verdict:'PASS', blocking_findings:0,
      original_review_id:q.independent_review.id,
      original_review_sha256:q.independent_review.result_sha256,
      frozen_review_interface_id:q.frozen_review_interface.id,
      frozen_review_interface_prompt_sha256:q.frozen_review_interface.prompt_sha256,
      original_review_interface_prompt_sha256:q.frozen_review_interface.prompt_sha256,
      frozen_review_interface_ref:'IMMUTABLE:FROZEN-INTERFACE',
      logical_close_authority_ref:q.logical_close.authority_ref,
      logical_close_authorization_receipt_ref:'IMMUTABLE:LOGICAL-CLOSE-AUTHORIZATION',
      logical_close_authorization_receipt_sha256:'sha256:'+'a'.repeat(64),
      Developer_acceptance:'GRANTED',
      Developer_authority_source:q.Developer_acceptance.authority_ref,
      effect_state:'KNOWN', natively_tested_tree:q.Phase_2.post_tree,
      candidate_tested_commit:q.candidate.commit,
      candidate_tested_tree:q.candidate.tree,
      candidate_validation_sha256:'sha256:'+'1'.repeat(64),
      combined_validation_sha256:'sha256:'+'2'.repeat(64),
      git_surface_identity_sha256:'sha256:'+'3'.repeat(64),
      git_surface_receipt_ref:'IMMUTABLE:GIT-SURFACE',
      original_review_ref:'IMMUTABLE:ORIGINAL-IR',
      candidate_validation_ref:'IMMUTABLE:CANDIDATE-VALIDATION',
      combined_validation_ref:'IMMUTABLE:COMBINED-VALIDATION',
      Control_reconciliation_ref:'IMMUTABLE:CONTROL-RECONCILIATION',
      qualified_evidence_provenance_ref:'IMMUTABLE:QUALIFIED-ROOT',
      chronology_verified:true,
      scope_added_paths:[], scope_amendments:[],
      effective_write_scope:[...initializationRequest().write_scope].sort(),
    };
    const run = (proof) => createTaskCyclePostPhase1LifecycleCapability({
      root:f.closeRoot,resolveCompetentProductEvidence:()=>proof,
    }).closeFromResolvedLifecycle({request:q,observed:f.observed});
    // Passing this callback is not proof of competence: even a syntactically
    // complete self-claim stops before Git without separately qualified surface.
    assert.equal(run(resolution).reason,'QUALIFIED_GIT_SURFACE_REQUIRED');
    const cases = [
      ['logical close source substituted', {logical_close_authority_ref:'FAKE'}],
      ['logical close digest absent', {logical_close_authorization_receipt_sha256:null}],
      ['logical close receipt absent', {logical_close_authorization_receipt_ref:''}],
      ['review interface digest substituted', {original_review_interface_prompt_sha256:'sha256:'+'f'.repeat(64)}],
      ['review interface digest absent', {frozen_review_interface_prompt_sha256:null}],
      ['original review source absent', {frozen_review_interface_ref:''}],
    ];
    for (const [description,change] of cases) {
      const outcome=run({...resolution,...change});
      assert.equal(outcome.status,'BLOCKED',description);
      assert.equal(outcome.effect_state,'NONE',description);
      assert.equal(outcome.reason,'COMPETENT_PRODUCT_CONTROL_RESOLUTION_INVALID',description);
      assert.deepEqual(fs.readdirSync(f.closeRoot), [],description);
    }
  } finally { f.cleanup(); }
});
