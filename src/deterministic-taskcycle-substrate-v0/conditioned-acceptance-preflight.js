'use strict';

// Caller-invoked, pure qualification guard. Never creates Developer authority,
// issues a Developer acceptance receipt, integrates a branch, or retries an effect.
const { isDeepStrictEqual } = require('node:util');
const SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^sha256:[0-9a-f]{64}$/i;
const nonEmpty = (x) => typeof x === 'string' && x.trim().length > 0;
const sha = (x) => typeof x === 'string' && SHA.test(x);
const digest = (x) => typeof x === 'string' && SHA256.test(x);
const array = (x) => Array.isArray(x) && x.every(nonEmpty) && new Set(x).size === x.length;
const same = (a, b) => isDeepStrictEqual(a, b);
const blocked = (reason) => Object.freeze({ status: 'BLOCKED', effect_state: 'NONE', reason, creates_authority: false });

function qualifyConditionedAcceptance(input) {
  if (!input || typeof input !== 'object') return blocked('INPUT_INVALID');
  const { taskcycle_id: task, candidate: c, task_carrier: t, baseline: b,
    prospective_grant: g, authority_observation: a, validation: v,
    frozen_review: f, independent_review: r, effect_observation: e,
    git_observation: o } = input;
  if (!nonEmpty(task) || !c || !t || !b || !g || !a || !v || !f || !r || !e || !o) {
    return blocked('EVIDENCE_INCOMPLETE');
  }
  if (!nonEmpty(c.repository) || !nonEmpty(c.integration_branch) || !sha(c.commit)
      || !sha(c.tree) || !sha(c.parent) || !array(c.changed_paths) || !c.changed_paths.length) {
    return blocked('CANDIDATE_IDENTITY_INVALID');
  }
  if (!sha(t.commit) || !sha(t.tree) || !sha(t.parent) || !nonEmpty(t.task_path)
      || !sha(b.commit) || !sha(b.tree)
      || t.parent !== b.commit || c.parent !== t.commit) return blocked('GIT_LINEAGE_INVALID');

  // Explicitly verified by competent Product Control against the real Developer
  // ruling; this predicate does NOT authenticate the observation itself.
  if (a.status !== 'CONFIRMED' || a.principal !== 'DEVELOPER'
      || !nonEmpty(a.provenance_ref) || !nonEmpty(a.verifier_ref)
      || a.authority_ref !== g.authority_ref
      || a.prospective_precedes_subject !== true) return blocked('DEVELOPER_GRANT_NOT_VERIFIED');
  if (!nonEmpty(g.authority_ref) || g.prospective !== true || g.taskcycle_id !== task
      || g.repository !== c.repository || g.integration_branch !== c.integration_branch
      || g.baseline_commit !== b.commit || g.baseline_tree !== b.tree
      || !array(g.allowed_write_paths) || !g.allowed_write_paths.length
      || !array(g.allowed_effects)
      || !g.allowed_effects.includes('DEVELOPER_ACCEPTANCE')
      || !g.allowed_effects.includes('PHASE_2')) return blocked('GRANT_CEILING_MISMATCH');
  if (!array(o.actual_changed_paths)
      || !c.changed_paths.every((p) => g.allowed_write_paths.includes(p))
      || !same([...c.changed_paths].sort(), [...o.actual_changed_paths].sort())) {
    return blocked('WRITE_SCOPE_MISMATCH');
  }
  if (v.status !== 'PASS' || v.subject_commit !== c.commit || v.subject_tree !== c.tree
      || !nonEmpty(v.evidence_ref) || !nonEmpty(v.run_id)) return blocked('VALIDATION_NOT_CONFIRMED');
  if (!nonEmpty(f.review_id) || !digest(f.identity_sha256) || f.subject_commit !== c.commit
      || f.subject_tree !== c.tree || f.subject_parent !== c.parent) {
    return blocked('FROZEN_REVIEW_MISMATCH');
  }
  if (r.verdict !== 'PASS' || r.review_id !== f.review_id
      || r.subject_commit !== c.commit || r.subject_tree !== c.tree
      || r.frozen_identity_sha256 !== f.identity_sha256
      || !nonEmpty(r.result_ref) || !nonEmpty(r.fresh_context_evidence_ref)
      || r.fresh_independent_context_verified !== true
      || !Array.isArray(r.blocking_findings) || r.blocking_findings.length !== 0) {
    return blocked('INDEPENDENT_REVIEW_NOT_QUALIFIED');
  }
  if (e.effect_state !== 'NONE' || !Array.isArray(e.unresolved_unknown_effects)
      || e.unresolved_unknown_effects.length !== 0) return blocked('EFFECT_HISTORY_UNRECONCILED');
  if (o.integration_branch !== c.integration_branch || o.live_head !== b.commit
      || o.correspondence !== 'EXACT' || o.material_drift !== false
      || o.additional_permissions !== false || !array(o.actual_changed_paths)) {
    return blocked('NATIVE_GIT_PREFLIGHT_UNQUALIFIED');
  }
  return Object.freeze({
    status: 'ELIGIBLE', effect_state: 'NONE',
    permitted_next_action: 'RECORD_SEPARATE_DEVELOPER_ACCEPTANCE',
    subject_commit: c.commit, subject_tree: c.tree,
    authority_ref: g.authority_ref, creates_authority: false,
  });
}

function qualifyConditionedPhase2(input) {
  const eligibility = qualifyConditionedAcceptance(input);
  if (eligibility.status !== 'ELIGIBLE') return eligibility;
  const receipt = input.Developer_acceptance_receipt;
  const c = input.candidate;
  const g = input.prospective_grant;
  if (!receipt || receipt.status !== 'GRANTED' || !nonEmpty(receipt.receipt_id)
      || !nonEmpty(receipt.evidence_ref) || !nonEmpty(receipt.developer_decision_ref)
      || receipt.developer_decision_ref !== g.authority_ref
      || receipt.subject_commit !== c.commit || receipt.subject_tree !== c.tree
      || receipt.subject_parent !== c.parent
      || receipt.review_id !== input.independent_review.review_id
      || receipt.issued_by !== 'COMPETENT_PRODUCT_CONTROL_UNDER_VERIFIED_DEVELOPER_GRANT') {
    return blocked('SEPARATE_DEVELOPER_ACCEPTANCE_NOT_CONFIRMED');
  }
  return Object.freeze({
    status: 'ELIGIBLE', effect_state: 'NONE',
    permitted_next_action: 'GUARDED_PHASE_2_EXECUTION',
    subject_commit: c.commit, subject_tree: c.tree,
    acceptance_receipt_ref: receipt.evidence_ref, creates_authority: false,
  });
}

module.exports = { qualifyConditionedAcceptance, qualifyConditionedPhase2 };
