'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateResponsibility,
  validateCheckpoint,
  validateResponsibilityCheckpointPair,
  EXACT,
} = require('../../src/deterministic-taskcycle-substrate-v0/contracts');

function responsibility() {
  return {
    id: 'PROVE_PORTABLE_DETERMINISTIC_CONTINUATION_001',
    objective: 'Resume one bounded responsibility across execution surfaces.',
    authority_basis: 'DEVELOPER_AUTHORIZED_LOCAL_CANDIDATE_ONLY',
    permitted_effects: ['READ_ONLY_OBSERVATION'],
    forbidden_effects: ['repository_mutation', 'remote_mutation', 'lifecycle_transition'],
    mechanical_postconditions: [{ id: 'REPOSITORY_IDENTITY', operator: EXACT, expected: 'abc123' }],
  };
}

function checkpoint() {
  return {
    checkpoint_id: 'CHECKPOINT-C1',
    predecessor_checkpoint_id: null,
    responsibility_id: responsibility().id,
    authority_basis: responsibility().authority_basis,
    context_cutoff: 'CONTEXT-CUTOFF-001',
    exact_state: { repository_ref: 'abc123' },
    evidence: [{ id: 'REPO_STATE', path: 'evidence/repo-state.txt', sha256: `sha256:${'a'.repeat(64)}` }],
    postconditions: [{ id: 'REPOSITORY_IDENTITY', expected: 'abc123', observed: 'abc123', correspondence: 'EXACT', evidence_refs: ['REPO_STATE'] }],
    disposition: { continuation_eligible: true, reason: 'MECHANICAL_POSTCONDITIONS_EXACT' },
  };
}

test('Responsibility requires an explicit authority basis', () => {
  const value = responsibility();
  value.authority_basis = '';
  assert.throws(() => validateResponsibility(value), /INVALID_CONTRACT/);
});

test('Checkpoint preserves responsibility, authority, context cutoff and exact postconditions', () => {
  const value = checkpoint();
  assert.deepEqual(validateCheckpoint(value), value);
});

test('cross-contract validator rejects continuation-eligible checkpoint with missing declared postconditions', () => {
  const value = checkpoint();
  value.postconditions = [];
  assert.throws(() => validateResponsibilityCheckpointPair(responsibility(), value), /POSTCONDITION_COVERAGE_MISMATCH/);
});

test('cross-contract validator rejects duplicate postcondition ids and dangling evidence refs', () => {
  const r = responsibility();
  r.mechanical_postconditions.push({ ...r.mechanical_postconditions[0] });
  assert.throws(() => validateResponsibilityCheckpointPair(r, checkpoint()), /DUPLICATE_CONTRACT_ID/);

  const c = checkpoint();
  c.postconditions[0].evidence_refs = ['MISSING'];
  assert.throws(() => validateResponsibilityCheckpointPair(responsibility(), c), /DANGLING_EVIDENCE_REF/);
});

test('cross-contract validator mechanically derives EXACT/NOT_EXACT and keeps unsupported operators UNRESOLVED', () => {
  const c1 = checkpoint();
  c1.postconditions[0].observed = 'different';
  c1.postconditions[0].correspondence = 'EXACT';
  assert.throws(() => validateResponsibilityCheckpointPair(responsibility(), c1), /POSTCONDITION_CORRESPONDENCE_INVALID/);

  const r2 = responsibility();
  r2.mechanical_postconditions[0].operator = 'SEMANTICALLY_COMPLETE';
  const c2 = checkpoint();
  c2.postconditions[0].correspondence = 'EXACT';
  assert.throws(() => validateResponsibilityCheckpointPair(r2, c2), /POSTCONDITION_CORRESPONDENCE_INVALID/);

  c2.postconditions[0].correspondence = 'UNRESOLVED';
  c2.disposition.continuation_eligible = true;
  assert.throws(() => validateResponsibilityCheckpointPair(r2, c2), /CONTINUATION_ELIGIBILITY_INVALID/);
});


test('mechanical operands are required as own defined values while explicit null remains valid', () => {
  const missingResponsibilityExpected = responsibility();
  delete missingResponsibilityExpected.mechanical_postconditions[0].expected;
  assert.throws(() => validateResponsibility(missingResponsibilityExpected), /INVALID_CONTRACT/);

  const undefinedResponsibilityExpected = responsibility();
  undefinedResponsibilityExpected.mechanical_postconditions[0].expected = undefined;
  assert.throws(() => validateResponsibility(undefinedResponsibilityExpected), /INVALID_CONTRACT/);

  const missingCheckpointExpected = checkpoint();
  delete missingCheckpointExpected.postconditions[0].expected;
  assert.throws(() => validateCheckpoint(missingCheckpointExpected), /INVALID_CONTRACT/);

  const missingCheckpointObserved = checkpoint();
  delete missingCheckpointObserved.postconditions[0].observed;
  assert.throws(() => validateCheckpoint(missingCheckpointObserved), /INVALID_CONTRACT/);

  const undefinedCheckpointExpected = checkpoint();
  undefinedCheckpointExpected.postconditions[0].expected = undefined;
  assert.throws(() => validateCheckpoint(undefinedCheckpointExpected), /INVALID_CONTRACT/);

  const undefinedCheckpointObserved = checkpoint();
  undefinedCheckpointObserved.postconditions[0].observed = undefined;
  assert.throws(() => validateCheckpoint(undefinedCheckpointObserved), /INVALID_CONTRACT/);

  const nullResponsibility = responsibility();
  nullResponsibility.mechanical_postconditions[0].expected = null;
  const nullCheckpoint = checkpoint();
  nullCheckpoint.postconditions[0].expected = null;
  nullCheckpoint.postconditions[0].observed = null;
  assert.equal(validateResponsibilityCheckpointPair(nullResponsibility, nullCheckpoint).all_mechanical_postconditions_satisfied, true);
});

test('mechanical evaluator fails closed instead of deriving EXACT from missing or undefined operands', () => {
  const { evaluateMechanicalPostcondition } = require('../../src/deterministic-taskcycle-substrate-v0/contracts');
  assert.throws(() => evaluateMechanicalPostcondition({ id: 'P', operator: EXACT }), /INVALID_CONTRACT/);
  assert.throws(() => evaluateMechanicalPostcondition({ id: 'P', operator: EXACT, expected: undefined, observed: undefined }), /INVALID_CONTRACT/);
  assert.equal(evaluateMechanicalPostcondition({ id: 'P', operator: EXACT, expected: null, observed: null }).correspondence, 'EXACT');
});
