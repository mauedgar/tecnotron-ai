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
      ) return blocked('GIT_LINEAGE_INVALID');
  // The frozen historical carrier is not rewritten when a new Product baseline
  // authorizes a corrective continuation of the *same* TaskCycle. This is an
  // explicitly Control-verified input, not a self-verifying trust claim.
  const cont = input.continuation;
  if (cont) {
    if (!cont.original_baseline || !cont.previous_candidate || !cont.control_observation
        || !sha(cont.original_baseline.commit) || !sha(cont.original_baseline.tree)
        || !sha(cont.previous_candidate.commit) || !sha(cont.previous_candidate.tree)
        || !sha(cont.previous_candidate.parent)
        || t.parent !== cont.original_baseline.commit
        || cont.previous_candidate.parent !== t.commit
        || c.parent !== b.commit
        || cont.taskcycle_id !== task || cont.current_baseline_commit !== b.commit
        || cont.current_baseline_tree !== b.tree
        || !nonEmpty(cont.prior_failed_review_ref)
        || cont.control_observation.status !== 'CONFIRMED'
        || cont.control_observation.verified_by !== 'COMPETENT_PRODUCT_CONTROL'
        || !nonEmpty(cont.control_observation.verifier_ref)
        || !nonEmpty(cont.control_observation.provenance_ref)
        || cont.control_observation.subject_taskcycle_id !== task
        || cont.control_observation.original_candidate_commit !== cont.previous_candidate.commit
        || cont.control_observation.current_baseline_commit !== b.commit) {
      return blocked('CONTINUATION_NOT_CONTROL_VERIFIED');
    }
  } else if (t.parent !== b.commit || c.parent !== t.commit) {
    return blocked('GIT_LINEAGE_INVALID');
  }

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
  if (v.status !== 'PASS' || v.repository !== c.repository
      || v.subject_commit !== c.commit || v.subject_tree !== c.tree
      || v.subject_parent !== c.parent
      || !nonEmpty(v.evidence_ref) || !nonEmpty(v.run_id)) return blocked('VALIDATION_NOT_CONFIRMED');
  if (!nonEmpty(f.review_id) || !digest(f.identity_sha256) || f.repository !== c.repository
      || f.subject_commit !== c.commit || f.subject_tree !== c.tree || f.subject_parent !== c.parent) {
    return blocked('FROZEN_REVIEW_MISMATCH');
  }
  if (r.verdict !== 'PASS' || r.review_id !== f.review_id || r.repository !== c.repository
      || r.subject_commit !== c.commit || r.subject_tree !== c.tree
      || r.subject_parent !== c.parent
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
  const obs = input.Developer_acceptance_observation;
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
  // A syntactically plausible inline receipt is NEVER sufficient. Product
  // Control must separately acquire and authenticate a provider-native,
  // immutable receipt and submit the observed identity/provenance. This pure
  // predicate checks correspondence; it cannot authenticate its caller.
  if (!obs || obs.status !== 'CONFIRMED'
      || obs.verified_by !== 'COMPETENT_PRODUCT_CONTROL'
      || !nonEmpty(obs.verifier_ref) || !nonEmpty(obs.provenance_ref)
      || !nonEmpty(obs.native_provider_ref)
      || obs.receipt_id !== receipt.receipt_id
      || obs.receipt_ref !== receipt.evidence_ref
      || !digest(receipt.identity_sha256)
      || obs.receipt_identity_sha256 !== receipt.identity_sha256
      || obs.issued_by !== receipt.issued_by
      || obs.developer_decision_ref !== receipt.developer_decision_ref
      || obs.subject_commit !== c.commit || obs.subject_tree !== c.tree
      || obs.subject_parent !== c.parent
      || obs.review_id !== input.independent_review.review_id
      || obs.taskcycle_id !== input.taskcycle_id) {
    return blocked('CONTROL_ACCEPTANCE_OBSERVATION_NOT_VERIFIED');
  }
  return Object.freeze({
    status: 'ELIGIBLE', effect_state: 'NONE',
    permitted_next_action: 'GUARDED_PHASE_2_EXECUTION',
    subject_commit: c.commit, subject_tree: c.tree,
    acceptance_receipt_ref: receipt.evidence_ref, creates_authority: false,
  });
}

module.exports = { qualifyConditionedAcceptance, qualifyConditionedPhase2 };
