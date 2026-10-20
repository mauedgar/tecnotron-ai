'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { qualifyConditionedAcceptance: accept, qualifyConditionedPhase2: phase2 } =
  require('../../src/deterministic-taskcycle-substrate-v0/conditioned-acceptance-preflight');

const sha = (ch) => ch.repeat(40);
const digest = 'sha256:' + 'a'.repeat(64);
const paths = ['src/deterministic-taskcycle-substrate-v0/conditioned-acceptance-preflight.js',
  'src/deterministic-taskcycle-substrate-v0/index.js',
  'tests/deterministic-taskcycle-substrate-v0/conditioned-acceptance-preflight.test.js'];
function fixture() {
  const candidate = { repository: 'mauedgar/tecnotron-ai', integration_branch: 'tools',
    commit: sha('3'), tree: sha('4'), parent: sha('2'), changed_paths: [...paths] };
  const prospective_grant = { authority_ref: 'DEVELOPER-2026-10-10-001', prospective: true,
    taskcycle_id: 'TC-001', repository: candidate.repository, integration_branch: 'tools',
    baseline_commit: sha('1'), baseline_tree: sha('5'),
    allowed_write_paths: [...paths], allowed_effects: ['DEVELOPER_ACCEPTANCE', 'PHASE_2'] };
  return { taskcycle_id: 'TC-001', candidate,
    baseline: { commit: sha('1'), tree: sha('5') },
    task_carrier: { commit: sha('2'), tree: sha('6'), parent: sha('1'), task_path: 'docs/tasks/TASK.md' },
    prospective_grant,
    authority_observation: { status: 'CONFIRMED', principal: 'DEVELOPER',
      authority_ref: prospective_grant.authority_ref, provenance_ref: 'Developer request, 2026-10-10',
      verifier_ref: 'Product-Control-exact-provenance-check', prospective_precedes_subject: true },
    validation: { status: 'PASS', repository: candidate.repository,
      subject_commit: candidate.commit, subject_tree: candidate.tree,
      subject_parent: candidate.parent, evidence_ref: 'validation-run-receipt', run_id: 'run-1' },
    frozen_review: { review_id: 'IR-001', identity_sha256: digest,
      repository: candidate.repository, subject_commit: candidate.commit, subject_tree: candidate.tree, subject_parent: candidate.parent },
    independent_review: { verdict: 'PASS', review_id: 'IR-001', repository: candidate.repository,
      subject_commit: candidate.commit, subject_tree: candidate.tree,
      subject_parent: candidate.parent, frozen_identity_sha256: digest,
      result_ref: 'review-receipt', fresh_context_evidence_ref: 'fresh-context-native-session',
      fresh_independent_context_verified: true, blocking_findings: [] },
    effect_observation: { effect_state: 'NONE', unresolved_unknown_effects: [] },
    git_observation: { integration_branch: 'tools', live_head: sha('1'), correspondence: 'EXACT',
      material_drift: false, additional_permissions: false, actual_changed_paths: [...paths] } };
}

function observedAcceptance(data) {
  const r = data.Developer_acceptance_receipt;
  return { status: 'CONFIRMED', verified_by: 'COMPETENT_PRODUCT_CONTROL',
    verifier_ref: 'verified-native-receipt', provenance_ref: 'competent-control',
    native_provider_ref: 'git-transport-immutable-receipt',
    receipt_id: r.receipt_id, receipt_ref: r.evidence_ref,
    receipt_identity_sha256: r.identity_sha256, issued_by: r.issued_by,
    developer_decision_ref: r.developer_decision_ref,
    taskcycle_id: data.taskcycle_id, subject_commit: data.candidate.commit,
    subject_tree: data.candidate.tree, subject_parent: data.candidate.parent,
    review_id: data.independent_review.review_id };
}
function continuedFixture() {
  const data = fixture();
  const oldBase = {...data.baseline};
  const prior = { commit: sha('c'), tree: sha('d'), parent: data.task_carrier.commit };
  data.baseline = { commit: sha('e'), tree: sha('f') };
  data.candidate.parent = data.baseline.commit;
  data.prospective_grant.baseline_commit = data.baseline.commit;
  data.prospective_grant.baseline_tree = data.baseline.tree;
  data.git_observation.live_head = data.baseline.commit;
  data.frozen_review.subject_parent = data.candidate.parent;
  data.validation.subject_parent = data.candidate.parent;
  data.independent_review.subject_parent = data.candidate.parent;
  data.continuation = { taskcycle_id: data.taskcycle_id,
    original_baseline: oldBase, previous_candidate: prior,
    current_baseline_commit: data.baseline.commit,
    current_baseline_tree: data.baseline.tree,
    prior_failed_review_ref: 'IR004-FAIL-F001',
    control_observation: { status: 'CONFIRMED', verified_by: 'COMPETENT_PRODUCT_CONTROL',
      verifier_ref: 'current-Product-Control-continuation-ruling',
      provenance_ref: 'prospective-Developer-instruction',
      subject_taskcycle_id: data.taskcycle_id,
      original_candidate_commit: prior.commit,
      current_baseline_commit: data.baseline.commit } };
  return data;
}
test('acceptance preflight is eligibility only, never Developer grant or effect', () => {
  const result = accept(fixture());
  assert.equal(result.status, 'ELIGIBLE');
  assert.equal(result.creates_authority, false);
  assert.equal(result.effect_state, 'NONE');
  assert.equal(result.permitted_next_action, 'RECORD_SEPARATE_DEVELOPER_ACCEPTANCE');
  assert.equal(result.Developer_acceptance, undefined);
});
test('Phase2 requires a separate, subject-bound competent acceptance receipt', () => {
  const data = fixture();
  assert.equal(phase2(data).reason, 'SEPARATE_DEVELOPER_ACCEPTANCE_NOT_CONFIRMED');
  data.Developer_acceptance_receipt = { status: 'GRANTED', receipt_id: 'acceptance-1',
    evidence_ref: 'developer-acceptance-receipt', developer_decision_ref: data.prospective_grant.authority_ref,
    subject_commit: data.candidate.commit, subject_tree: data.candidate.tree,
    subject_parent: data.candidate.parent, review_id: data.independent_review.review_id,
    issued_by: 'COMPETENT_PRODUCT_CONTROL_UNDER_VERIFIED_DEVELOPER_GRANT',
    identity_sha256: digest };
  // A forged inline receipt must remain BLOCKED until Control independently
  // observes and verifies the exact native receipt/provenance.
  assert.equal(phase2(data).reason, 'CONTROL_ACCEPTANCE_OBSERVATION_NOT_VERIFIED');
  data.Developer_acceptance_observation = observedAcceptance(data);
  assert.equal(phase2(data).permitted_next_action, 'GUARDED_PHASE_2_EXECUTION');
  data.Developer_acceptance_receipt.subject_tree = sha('9');
  assert.equal(phase2(data).reason, 'SEPARATE_DEVELOPER_ACCEPTANCE_NOT_CONFIRMED');
});
const negatives = [
  ['absent grant', d => { d.prospective_grant = null; }, 'EVIDENCE_INCOMPLETE'],
  ['unverified grant', d => { d.authority_observation.status = 'UNKNOWN'; }, 'DEVELOPER_GRANT_NOT_VERIFIED'],
  ['fake verifier', d => { d.authority_observation.verifier_ref = ''; }, 'DEVELOPER_GRANT_NOT_VERIFIED'],
  ['grant after candidate', d => { d.authority_observation.prospective_precedes_subject = false; }, 'DEVELOPER_GRANT_NOT_VERIFIED'],
  ['missing actual paths', d => { delete d.git_observation.actual_changed_paths; }, 'WRITE_SCOPE_MISMATCH'],
  ['wrong TC', d => { d.prospective_grant.taskcycle_id = 'TC-OTHER'; }, 'GRANT_CEILING_MISMATCH'],
  ['no phase2 scope', d => { d.prospective_grant.allowed_effects = ['DEVELOPER_ACCEPTANCE']; }, 'GRANT_CEILING_MISMATCH'],
  ['changed base', d => { d.prospective_grant.baseline_commit = sha('a'); }, 'GRANT_CEILING_MISMATCH'],
  ['unknown path', d => { d.candidate.changed_paths.push('src/unauthorized.js'); d.git_observation.actual_changed_paths.push('src/unauthorized.js'); }, 'WRITE_SCOPE_MISMATCH'],
  ['changed path report', d => { d.git_observation.actual_changed_paths.pop(); }, 'WRITE_SCOPE_MISMATCH'],
  ['wrong commit parent', d => { d.candidate.parent = sha('b'); }, 'GIT_LINEAGE_INVALID'],
  ['wrong carrier parent', d => { d.task_carrier.parent = sha('c'); }, 'GIT_LINEAGE_INVALID'],
  ['validation fail', d => { d.validation.status = 'FAIL'; }, 'VALIDATION_NOT_CONFIRMED'],
  ['validation wrong subject', d => { d.validation.subject_tree = sha('8'); }, 'VALIDATION_NOT_CONFIRMED'],
  ['validation missing repository', d => { delete d.validation.repository; }, 'VALIDATION_NOT_CONFIRMED'],
  ['validation wrong repository', d => { d.validation.repository = 'other/repo'; }, 'VALIDATION_NOT_CONFIRMED'],
  ['validation missing parent', d => { delete d.validation.subject_parent; }, 'VALIDATION_NOT_CONFIRMED'],
  ['validation wrong parent', d => { d.validation.subject_parent = sha('8'); }, 'VALIDATION_NOT_CONFIRMED'],
  ['frozen mismatched parent', d => { d.frozen_review.subject_parent = sha('9'); }, 'FROZEN_REVIEW_MISMATCH'],
  ['frozen missing repository', d => { delete d.frozen_review.repository; }, 'FROZEN_REVIEW_MISMATCH'],
  ['frozen wrong repository', d => { d.frozen_review.repository = 'other/repo'; }, 'FROZEN_REVIEW_MISMATCH'],
  ['review missing repository', d => { delete d.independent_review.repository; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review wrong repository', d => { d.independent_review.repository = 'other/repo'; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review missing parent', d => { delete d.independent_review.subject_parent; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review wrong parent', d => { d.independent_review.subject_parent = sha('8'); }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['blocked review', d => { d.independent_review.verdict = 'BLOCKED'; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review fail', d => { d.independent_review.verdict = 'FAIL'; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review not fresh', d => { d.independent_review.fresh_independent_context_verified = false; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review blocking finding', d => { d.independent_review.blocking_findings = ['F-001']; }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['review digest drift', d => { d.independent_review.frozen_identity_sha256 = 'sha256:' + 'b'.repeat(64); }, 'INDEPENDENT_REVIEW_NOT_QUALIFIED'],
  ['unknown effect', d => { d.effect_observation.effect_state = 'UNKNOWN'; }, 'EFFECT_HISTORY_UNRECONCILED'],
  ['pending UNKNOWN', d => { d.effect_observation.unresolved_unknown_effects = ['attempt-1']; }, 'EFFECT_HISTORY_UNRECONCILED'],
  ['tools drift', d => { d.git_observation.live_head = sha('7'); }, 'NATIVE_GIT_PREFLIGHT_UNQUALIFIED'],
  ['missing native correspondence', d => { d.git_observation.correspondence = 'UNKNOWN'; }, 'NATIVE_GIT_PREFLIGHT_UNQUALIFIED'],
  ['extra permissions', d => { d.git_observation.additional_permissions = true; }, 'NATIVE_GIT_PREFLIGHT_UNQUALIFIED'],
  ['material drift', d => { d.git_observation.material_drift = true; }, 'NATIVE_GIT_PREFLIGHT_UNQUALIFIED'],
];
for (const [name, change, expected] of negatives) {
  test('fail closed: ' + name, () => {
    const d = fixture(); change(d);
    const result = accept(d);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, expected);
    assert.equal(result.effect_state, 'NONE');
  });
}

test('current-baseline correction preserves the historical Task carrier and TaskCycle', () => {
  const d = continuedFixture();
  assert.equal(accept(d).status, 'ELIGIBLE');
  assert.notEqual(d.task_carrier.parent, d.baseline.commit);
});
const continuationNegatives = [
  ['absent Control observation', d => { delete d.continuation.control_observation; }],
  ['unverified Control observation', d => { d.continuation.control_observation.status = 'UNKNOWN'; }],
  ['wrong original parent', d => { d.continuation.original_baseline.commit = sha('9'); }],
  ['rewritten historical candidate link', d => { d.continuation.previous_candidate.parent = sha('9'); }],
  ['wrong prospective current baseline', d => { d.continuation.current_baseline_commit = sha('9'); }],
  ['missing failed review history', d => { delete d.continuation.prior_failed_review_ref; }],
  ['new candidate parent mismatch', d => { d.candidate.parent = sha('9'); }],
  ['wrong TaskCycle', d => { d.continuation.taskcycle_id = 'TC-OTHER'; }],
];
for (const [name, change] of continuationNegatives) {
  test('fail closed continuation: ' + name, () => {
    const d = continuedFixture(); change(d);
    assert.equal(accept(d).status, 'BLOCKED');
  });
}
test('old strict carrier-parent lineage remains mandatory absent a continuation', () => {
  const d = continuedFixture(); delete d.continuation;
  assert.equal(accept(d).reason, 'GIT_LINEAGE_INVALID');
});
const observedNegatives = [
  ['UNKNOWN', o => { o.status = 'UNKNOWN'; }],
  ['unverified origin', o => { o.native_provider_ref = ''; }],
  ['fake issuer', o => { o.issued_by = 'fake'; }],
  ['different receipt ID', o => { o.receipt_id = 'fake'; }],
  ['different immutable digest', o => { o.receipt_identity_sha256 = 'sha256:' + 'b'.repeat(64); }],
  ['different TaskCycle', o => { o.taskcycle_id = 'other'; }],
  ['different tree', o => { o.subject_tree = sha('9'); }],
  ['different review', o => { o.review_id = 'other'; }],
  ['missing verifier', o => { o.verifier_ref = ''; }],
];
for (const [name, change] of observedNegatives) {
  test('fail closed independently observed Developer acceptance: ' + name, () => {
    const d = fixture();
    d.Developer_acceptance_receipt = { status: 'GRANTED', receipt_id: 'acceptance-1',
      evidence_ref: 'developer-acceptance-receipt',
      developer_decision_ref: d.prospective_grant.authority_ref,
      subject_commit: d.candidate.commit, subject_tree: d.candidate.tree,
      subject_parent: d.candidate.parent, review_id: d.independent_review.review_id,
      issued_by: 'COMPETENT_PRODUCT_CONTROL_UNDER_VERIFIED_DEVELOPER_GRANT',
      identity_sha256: digest };
    d.Developer_acceptance_observation = observedAcceptance(d);
    change(d.Developer_acceptance_observation);
    assert.equal(phase2(d).reason, 'CONTROL_ACCEPTANCE_OBSERVATION_NOT_VERIFIED');
  });
}
test('receipt without digest is rejected even with purported independent observation', () => {
  const d = fixture();
  d.Developer_acceptance_receipt = { status: 'GRANTED', receipt_id: 'ok',
    evidence_ref: 'native', developer_decision_ref: d.prospective_grant.authority_ref,
    subject_commit: d.candidate.commit, subject_tree: d.candidate.tree,
    subject_parent: d.candidate.parent, review_id: d.independent_review.review_id,
    issued_by: 'COMPETENT_PRODUCT_CONTROL_UNDER_VERIFIED_DEVELOPER_GRANT' };
  d.Developer_acceptance_observation = observedAcceptance(d);
  assert.equal(phase2(d).reason, 'CONTROL_ACCEPTANCE_OBSERVATION_NOT_VERIFIED');
});
