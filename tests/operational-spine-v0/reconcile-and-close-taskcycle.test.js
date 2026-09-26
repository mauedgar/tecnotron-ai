'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  createReconcileAndCloseTaskCycleRecipe,
} = require('../../src/operational-spine-v0/recipes/reconcile-and-close-taskcycle');

const observation = (sourceRef, observed) => ({ source_ref: sourceRef, observed });
const EVIDENCE_KINDS = Object.freeze({
  candidate_identity: 'CANDIDATE_IDENTITY',
  terminal_results: 'TERMINAL_RESULTS',
  independent_review: 'INDEPENDENT_REVIEW_RESULT',
  developer_acceptance: 'DEVELOPER_ACCEPTANCE',
  canonical_integration: 'CANONICAL_INTEGRATION',
  remote_publication: 'REMOTE_PUBLICATION',
  canonical_state_delta: 'CANONICAL_STATE_DELTA',
});
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const authorityReference = id => ({
  kind: 'AUTHORITY',
  id,
  location: `evidence/${id.replaceAll(':', '-')}.json`,
});

function competence(field) {
  const map = {
    independent_review: ['INDEPENDENT_REVIEW', 'authority:reviewer-001'],
    developer_acceptance: ['DEVELOPER', 'authority:developer-001'],
    canonical_integration: ['EFFECT_AUTHORITY', 'authority:effect-001'],
    remote_publication: ['EFFECT_AUTHORITY', 'authority:effect-001'],
  };
  if (!map[field]) return null;
  return { status: 'ESTABLISHED', kind: map[field][0], authority_ref: map[field][1], basis_ref: `basis:${field}` };
}

function verifiedEvidence({ ref, field, observed, subjectId = 'TC-001', authorityCompetence = competence(field) }) {
  const artifact = {
    schema_version: 'tecnotron-reconciliation-evidence/v0',
    kind: EVIDENCE_KINDS[field],
    subject: { kind: 'TaskCycle', id: subjectId, field },
    observed,
    verification: {
      status: 'VERIFIED',
      verification_ref: `verification:${ref}`,
      verifier_ref: 'verifier:fixture',
      authority_competence: authorityCompetence,
    },
  };
  const artifact_json = JSON.stringify(artifact);
  return { ref, sha256: sha256(artifact_json), artifact_json };
}

function observations() {
  return {
    candidate_identity: [observation('candidate:001', {
      commit: 'a'.repeat(40), tree: 'b'.repeat(40), parent: 'c'.repeat(40),
      changed_paths: ['src/recipe.js', 'tests/recipe.test.js'],
    })],
    terminal_results: [observation('terminal:001', [
      { reference: 'terminal:001', subject_id: 'AT-001', status: 'PASS' },
    ])],
    independent_review: [observation('review:001', { reference: 'review:001', disposition: 'PASS' })],
    developer_acceptance: [observation('authority:developer-001', { reference: 'authority:developer-001', disposition: 'ACCEPTED' })],
    canonical_integration: [observation('integration:001', { reference: 'integration:001', status: 'INTEGRATED' })],
    remote_publication: [observation('publication:001', { reference: 'publication:001', status: 'PUBLISHED' })],
    canonical_state_delta: [observation('state-delta:001', {
      from: { reference: 'state:40', revision: 40, sha256: 'd'.repeat(64) },
      to: { reference: 'state:50', revision: 50, sha256: 'e'.repeat(64) },
      changed_aggregates: [{ kind: 'TaskCycle', id: 'TC-001', before_revision: 6, after_revision: 7 }],
    })],
  };
}

function evidenceFor(obs) {
  return Object.entries(obs).flatMap(([field, entries]) => entries.map(entry => verifiedEvidence({
    ref: entry.source_ref, field, observed: entry.observed,
  })));
}

class SyntheticKernel {
  constructor({
    unknown = false,
    legalClose = true,
    failFinalVerify = false,
    allSatisfied = false,
    initialAuthorities = [],
    satisfyFault = null,
    transitionFault = null,
    reassessmentUnavailable = false,
  } = {}) {
    this.revision = 50;
    this.eventCount = 50;
    this.verifyCalls = 0;
    this.failFinalVerify = failFinalVerify;
    this.legalClose = legalClose;
    this.satisfyFault = satisfyFault;
    this.transitionFault = transitionFault;
    this.reassessmentUnavailable = reassessmentUnavailable;
    this.faultTriggered = false;
    this.satisfyCalls = 0;
    this.transitionCalls = 0;
    this.taskcycle = {
      schema_version: 'tecnotron-state-kernel/v0', kind: 'TaskCycle', id: 'TC-001', revision: 7,
      state: 'ACTIVE', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      authority_refs: structuredClone(initialAuthorities), related_ids: unknown ? ['OP-001'] : [], last_event_id: 'event-50',
      responsibility: 'TEST_CLOSE',
      obligations: [
        { id: 'INDEPENDENT_REVIEW', status: allSatisfied ? 'SATISFIED' : 'PENDING', authority_ref: allSatisfied ? 'authority:reviewer-001' : null },
        { id: 'DEVELOPER_ACCEPTANCE', status: allSatisfied ? 'SATISFIED' : 'PENDING', authority_ref: allSatisfied ? 'authority:developer-001' : null },
        { id: 'CANONICAL_INTEGRATION', status: allSatisfied ? 'SATISFIED' : 'PENDING', authority_ref: allSatisfied ? 'authority:effect-001' : null },
        { id: 'REMOTE_PUBLICATION', status: allSatisfied ? 'SATISFIED' : 'PENDING', authority_ref: allSatisfied ? 'authority:effect-001' : null },
        { id: 'LIFECYCLE_RECONCILIATION', status: allSatisfied ? 'SATISFIED' : 'PENDING', authority_ref: null },
      ], terminal_disposition_ref: null,
    };
    this.operation = { kind: 'Operation', id: 'OP-001', related_ids: unknown ? ['AT-UNKNOWN'] : [] };
    this.attempt = { kind: 'ExecutionAttempt', id: 'AT-UNKNOWN', state: 'UNKNOWN', reconciliation_required: true };
  }
  verify() {
    this.verifyCalls += 1;
    if (this.reassessmentUnavailable && this.faultTriggered) throw new Error('simulated reassessment unavailable');
    if (this.failFinalVerify && this.taskcycle.state === 'CLOSED' && this.verifyCalls > 1) throw new Error('simulated verify failure');
    return { valid: true, revision: this.revision, event_count: this.eventCount };
  }
  inspectTaskCycle(id) {
    assert.equal(id, this.taskcycle.id);
    const pending = this.taskcycle.obligations.some(o => o.status === 'PENDING');
    const legal_next = this.taskcycle.state === 'CLOSED' ? [] : (!pending && this.legalClose ? ['CLOSED'] : ['BLOCKED']);
    return { aggregate: structuredClone(this.taskcycle), store_revision: this.revision, legal_next };
  }
  inspectOperation(id) { assert.equal(id, 'OP-001'); return { aggregate: structuredClone(this.operation), store_revision: this.revision, legal_next: [] }; }
  inspectAttempt(id) { assert.equal(id, 'AT-UNKNOWN'); return { aggregate: structuredClone(this.attempt), store_revision: this.revision, legal_next: [] }; }
  obligations(id) {
    assert.equal(id, this.taskcycle.id);
    return {
      id, store_revision: this.revision,
      obligations: structuredClone(this.taskcycle.obligations),
      pending: this.taskcycle.obligations.filter(o => o.status === 'PENDING').map(o => o.id),
      legal_next: this.inspectTaskCycle(id).legal_next,
    };
  }
  satisfyObligation({ expectedRevision, taskcycleId, obligationId, authorityRef, authorityReference }) {
    this.satisfyCalls += 1;
    if (this.satisfyFault === 'throw_no_effect' && !this.faultTriggered) {
      this.faultTriggered = true;
      throw new Error('simulated satisfy rejection before effect');
    }
    if (expectedRevision !== this.revision) throw new Error(`STALE_REVISION:${expectedRevision}:${this.revision}`);
    assert.equal(taskcycleId, this.taskcycle.id);
    const obligation = this.taskcycle.obligations.find(o => o.id === obligationId);
    if (!obligation || obligation.status !== 'PENDING') throw new Error('INVALID_OBLIGATION');
    if (authorityRef !== undefined) {
      const existing = this.taskcycle.authority_refs.find(ref => ref.kind === 'AUTHORITY' && ref.id === authorityRef);
      if (!existing) {
        if (!authorityReference || authorityReference.kind !== 'AUTHORITY' || authorityReference.id !== authorityRef) throw new Error('MISSING_REQUIRED_AUTHORITY');
        this.taskcycle.authority_refs.push(structuredClone(authorityReference));
      }
      obligation.authority_ref = authorityRef;
    }
    obligation.status = 'SATISFIED';
    this.taskcycle.revision += 1; this.revision += 1; this.eventCount += 1;
    this.taskcycle.last_event_id = `event-${this.revision}`;
    if (this.satisfyFault === 'mutate_then_throw' && !this.faultTriggered) {
      this.faultTriggered = true;
      throw new Error('simulated satisfy transport loss after effect');
    }
    if (this.satisfyFault === 'mutate_then_malformed' && !this.faultTriggered) {
      this.faultTriggered = true;
      return { revision: 'unverifiable' };
    }
    const receipt = {
      revision: this.revision,
      event_id: this.taskcycle.last_event_id,
      aggregate_revision: this.taskcycle.revision,
      kind: 'TaskCycle',
      aggregate_id: this.taskcycle.id,
    };
    if (this.satisfyFault === 'wrong_event_id' && !this.faultTriggered) {
      this.faultTriggered = true;
      return { ...receipt, event_id: 'different-event' };
    }
    if (this.satisfyFault === 'wrong_aggregate_id' && !this.faultTriggered) {
      this.faultTriggered = true;
      return { ...receipt, aggregate_id: 'TC-DIFFERENT' };
    }
    if (this.satisfyFault === 'wrong_kind' && !this.faultTriggered) {
      this.faultTriggered = true;
      return { ...receipt, kind: 'Operation' };
    }
    return receipt;
  }
  transitionTaskCycle({ expectedRevision, taskcycleId, target, authorityRef, dispositionRef }) {
    this.transitionCalls += 1;
    if (this.transitionFault === 'throw_no_effect' && !this.faultTriggered) {
      this.faultTriggered = true;
      throw new Error('simulated closure rejection before effect');
    }
    if (expectedRevision !== this.revision) throw new Error(`STALE_REVISION:${expectedRevision}:${this.revision}`);
    assert.equal(taskcycleId, this.taskcycle.id); assert.equal(target, 'CLOSED');
    if (this.taskcycle.obligations.some(o => o.status === 'PENDING') || !this.legalClose) throw new Error('INVALID_TRANSITION');
    if (!this.taskcycle.authority_refs.some(ref => ref.kind === 'AUTHORITY' && ref.id === authorityRef)) throw new Error('MISSING_REQUIRED_AUTHORITY');
    this.taskcycle.state = 'CLOSED'; this.taskcycle.terminal_disposition_ref = dispositionRef;
    this.taskcycle.revision += 1; this.revision += 1; this.eventCount += 1;
    this.taskcycle.last_event_id = `event-${this.revision}`;
    if (this.transitionFault === 'mutate_then_throw' && !this.faultTriggered) {
      this.faultTriggered = true;
      throw new Error('simulated closure transport loss after effect');
    }
    if (this.transitionFault === 'mutate_then_malformed' && !this.faultTriggered) {
      this.faultTriggered = true;
      return { event_id: this.taskcycle.last_event_id };
    }
    return {
      revision: this.revision,
      event_id: this.taskcycle.last_event_id,
      aggregate_revision: this.taskcycle.revision,
      kind: 'TaskCycle',
      aggregate_id: this.taskcycle.id,
    };
  }
}

function rules() {
  return [
    {
      obligation_id: 'INDEPENDENT_REVIEW', source: 'independent_review',
      authority_ref: 'authority:reviewer-001', authority_reference: authorityReference('authority:reviewer-001'),
    },
    {
      obligation_id: 'DEVELOPER_ACCEPTANCE', source: 'developer_acceptance',
      authority_ref: 'authority:developer-001',
      authority_reference: authorityReference('authority:developer-001'),
    },
    {
      obligation_id: 'CANONICAL_INTEGRATION', source: 'canonical_integration',
      authority_ref: 'authority:effect-001', authority_reference: authorityReference('authority:effect-001'),
    },
    {
      obligation_id: 'REMOTE_PUBLICATION', source: 'remote_publication', remote_expected_status: 'PUBLISHED',
      authority_ref: 'authority:effect-001',
    },
    { obligation_id: 'LIFECYCLE_RECONCILIATION', source: 'reconciliation' },
  ];
}

function request(kernel, overrides = {}) {
  const obs = overrides.observations || observations();
  return {
    recipe_id: 'reconcile_and_close_taskcycle', recipe_version: 'v0', operation_id: 'OP-CLOSE', execution_attempt_id: 'AT-CLOSE',
    context: {
      schema_version: 'tecnotron-execution-context/v0', operation_id: 'OP-CLOSE', taskcycle_id: 'TC-001',
      repository: { identity: 'fixture', location: '/synthetic/no-repository-effect' },
      runtime: { executor: 'test', platform: 'synthetic', runtime_identity: 'node:test' },
      state_store: { reference: 'synthetic-state' }, authority_refs: [], evidence_refs: [],
    },
    authorization: { disposition: 'AUTHORIZED', authority_reference: 'DEV-CLOSE', effect_constraints: [{ effect: 'state.taskcycle.write', scope: 'exact taskcycle only' }] },
    evidence_refs: [],
    input: {
      expected_state_revision: overrides.expected_state_revision ?? kernel.revision,
      observations: obs,
      evidence: overrides.evidence || evidenceFor(obs),
      obligation_satisfactions: overrides.rules || rules(),
      closure: overrides.closure || { authority_ref: 'authority:developer-001', disposition_ref: 'result:closed' },
    },
  };
}

function recipe(kernel) { return createReconcileAndCloseTaskCycleRecipe({ stateKernel: kernel }); }

async function execute(kernel, overrides={}) { return recipe(kernel).execute(request(kernel, overrides)); }

test('all competent required evidence closes deterministically with structured ClosureReceipt output', async () => {
  const kernel = new SyntheticKernel();
  const before = kernel.revision;
  const result = await execute(kernel);
  assert.equal(result.status, 'PASS');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.equal(kernel.taskcycle.state, 'CLOSED');
  assert.equal(kernel.revision, before + 6);
  assert.equal(result.output.reconciliation.disposition, 'RESOLVED');
  assert.deepEqual(result.output.obligations.remaining, []);
  assert.equal(result.output.state_kernel.final_revision, kernel.revision);
});

test('missing Independent Review remains unresolved and causes no lifecycle mutation', async () => {
  const kernel = new SyntheticKernel(); const obs = observations(); obs.independent_review = [];
  const before=kernel.revision; const result=await execute(kernel,{observations:obs,evidence:evidenceFor(obs)});
  assert.equal(result.status,'FAIL'); assert.equal(result.effect_state,'NONE'); assert.equal(kernel.revision,before); assert.equal(kernel.taskcycle.state,'ACTIVE');
});

test('missing Developer acceptance remains unresolved and causes no lifecycle mutation', async () => {
  const kernel = new SyntheticKernel(); const obs=observations(); obs.developer_acceptance=[];
  const result=await execute(kernel,{observations:obs,evidence:evidenceFor(obs)});
  assert.equal(result.status,'FAIL'); assert.match(result.reason,/POST_TASKCYCLE_RECONCILIATION_UNRESOLVED/); assert.equal(kernel.revision,50);
});

test('missing canonical integration remains unresolved and causes no closure', async () => {
  const kernel = new SyntheticKernel(); const obs=observations(); obs.canonical_integration=[];
  const result=await execute(kernel,{observations:obs,evidence:evidenceFor(obs)});
  assert.equal(result.status,'FAIL'); assert.equal(kernel.taskcycle.state,'ACTIVE');
});

test('required remote publication unresolved causes no closure', async () => {
  const kernel = new SyntheticKernel(); const obs=observations(); obs.remote_publication=[];
  const result=await execute(kernel,{observations:obs,evidence:evidenceFor(obs)});
  assert.equal(result.status,'FAIL'); assert.equal(kernel.revision,50);
});

test('contradictory evidence remains fail-closed', async () => {
  const kernel = new SyntheticKernel(); const obs=observations();
  const conflicting={reference:'review:002',disposition:'FAIL'};
  obs.independent_review.push(observation('review:002',conflicting));
  const evidence=evidenceFor(obs);
  const result=await execute(kernel,{observations:obs,evidence});
  assert.equal(result.status,'FAIL'); assert.equal(kernel.revision,50);
});

test('authority-incompetent evidence remains fail-closed', async () => {
  const kernel = new SyntheticKernel(); const obs=observations(); const evidence=evidenceFor(obs);
  const i=evidence.findIndex(x=>x.ref==='authority:developer-001');
  evidence[i]=verifiedEvidence({
    ref:'authority:developer-001',field:'developer_acceptance',observed:obs.developer_acceptance[0].observed,
    authorityCompetence:{status:'ESTABLISHED',kind:'VALIDATION_FIXTURE',authority_ref:'authority:developer-001',basis_ref:'fixture:self'},
  });
  const result=await execute(kernel,{observations:obs,evidence});
  assert.equal(result.status,'FAIL'); assert.equal(kernel.revision,50);
});

test('stale expected State Kernel revision fails closed before mutation', async () => {
  const kernel=new SyntheticKernel(); const result=await execute(kernel,{expected_state_revision:49});
  assert.equal(result.status,'FAIL'); assert.equal(result.effect_state,'NONE'); assert.match(result.reason,/STATE_KERNEL_REVISION_DRIFT/); assert.equal(kernel.revision,50);
});

test('pending UNKNOWN attempt prevents closure until separately reconciled', async () => {
  const kernel=new SyntheticKernel({unknown:true}); const result=await execute(kernel);
  assert.equal(result.status,'FAIL'); assert.match(result.reason,/UNKNOWN_EXECUTION_ATTEMPT_REQUIRES_RECONCILIATION/); assert.equal(kernel.revision,50);
});

test('illegal terminal transition remains fail-closed and does not claim closure PASS', async () => {
  const kernel=new SyntheticKernel({legalClose:false}); const result=await execute(kernel);
  assert.equal(result.status,'FAIL'); assert.equal(result.effect_state,'CONFIRMED'); assert.equal(kernel.taskcycle.state,'ACTIVE');
});

test('fresh post-transition verification failure becomes UNKNOWN and never false PASS', async () => {
  const kernel=new SyntheticKernel({failFinalVerify:true}); const result=await execute(kernel);
  assert.equal(result.status,'UNKNOWN'); assert.equal(result.effect_state,'UNKNOWN'); assert.equal(kernel.taskcycle.state,'CLOSED'); assert.match(result.reason,/STATE_KERNEL_MUTATION_REASSESSMENT_UNAVAILABLE/);
});

test('closure result establishes repository/Git/remote effects NONE', async () => {
  const kernel=new SyntheticKernel(); const result=await execute(kernel);
  assert.equal(result.status,'PASS');
  assert.deepEqual({repository:result.output.repository_effect,git:result.output.git_effect,remote:result.output.remote_effect},{repository:'NONE',git:'NONE',remote:'NONE'});
});

for (const [obligationId, wrongSource] of [
  ['CANONICAL_INTEGRATION', 'independent_review'],
  ['INDEPENDENT_REVIEW', 'canonical_integration'],
  ['DEVELOPER_ACCEPTANCE', 'independent_review'],
  ['REMOTE_PUBLICATION', 'developer_acceptance'],
  ['LIFECYCLE_RECONCILIATION', 'independent_review'],
]) {
  test(`wrong evidence source cannot satisfy ${obligationId}`, async () => {
    const kernel = new SyntheticKernel();
    const changed = rules().map(rule => {
      if (rule.obligation_id !== obligationId) return rule;
      const replacement = { ...rule, source: wrongSource };
      if (wrongSource !== 'remote_publication') delete replacement.remote_expected_status;
      return replacement;
    });
    const result = await execute(kernel, { rules: changed });
    assert.equal(result.status, 'FAIL');
    assert.equal(result.effect_state, 'NONE');
    assert.match(result.reason, new RegExp(`OBLIGATION_SOURCE_NOT_COMPETENT:${obligationId}:`));
    assert.equal(kernel.revision, 50);
    assert.equal(kernel.satisfyCalls, 0);
  });
}

test('competent reconciled authority rejects a different caller-supplied AUTHORITY before mutation', async () => {
  const kernel = new SyntheticKernel();
  const changed = rules().map(rule => rule.obligation_id === 'DEVELOPER_ACCEPTANCE'
    ? {
        ...rule,
        authority_ref: 'authority:unbound-caller',
        authority_reference: authorityReference('authority:unbound-caller'),
      }
    : rule);
  const result = await execute(kernel, { rules: changed });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'NONE');
  assert.match(result.reason, /OBLIGATION_AUTHORITY_MISMATCH:DEVELOPER_ACCEPTANCE/);
  assert.equal(kernel.revision, 50);
  assert.equal(kernel.satisfyCalls, 0);
});

test('unbound closure AUTHORITY cannot authorize the terminal transition', async () => {
  const kernel = new SyntheticKernel();
  const result = await execute(kernel, {
    closure: { authority_ref: 'authority:unbound-closure', disposition_ref: 'result:closed' },
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'NONE');
  assert.match(result.reason, /CLOSURE_AUTHORITY_MISMATCH/);
  assert.equal(kernel.revision, 50);
  assert.equal(kernel.satisfyCalls, 0);
  assert.equal(kernel.transitionCalls, 0);
});

test('first satisfyObligation mutation that applies then throws is confirmed, never NONE, and is not retried', async () => {
  const kernel = new SyntheticKernel({ satisfyFault: 'mutate_then_throw' });
  const result = await execute(kernel);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED/);
  assert.equal(kernel.revision, 51);
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

test('first satisfyObligation mutation with malformed return is confirmed, never NONE, and stops', async () => {
  const kernel = new SyntheticKernel({ satisfyFault: 'mutate_then_malformed' });
  const result = await execute(kernel);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED/);
  assert.equal(kernel.revision, 51);
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

test('authoritative reassessment proving rejected first mutation permits effect_state NONE', async () => {
  const kernel = new SyntheticKernel({ satisfyFault: 'throw_no_effect' });
  const result = await execute(kernel);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'NONE');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_REJECTED_NO_EFFECT/);
  assert.equal(kernel.revision, 50);
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

test('unavailable reassessment after dispatched mutation is UNKNOWN and forbids blind retry', async () => {
  const kernel = new SyntheticKernel({
    satisfyFault: 'mutate_then_throw',
    reassessmentUnavailable: true,
  });
  const result = await execute(kernel);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.effect_state, 'UNKNOWN');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_REASSESSMENT_UNAVAILABLE/);
  assert.equal(kernel.revision, 51);
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

function closureFirstKernel(options = {}) {
  return new SyntheticKernel({
    allSatisfied: true,
    initialAuthorities: [
      authorityReference('authority:reviewer-001'),
      authorityReference('authority:developer-001'),
      authorityReference('authority:effect-001'),
    ],
    ...options,
  });
}

test('terminal transition as first mutation that applies then throws is confirmed and never false PASS', async () => {
  const kernel = closureFirstKernel({ transitionFault: 'mutate_then_throw' });
  const result = await execute(kernel, { rules: [] });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED/);
  assert.equal(kernel.taskcycle.state, 'CLOSED');
  assert.equal(kernel.satisfyCalls, 0);
  assert.equal(kernel.transitionCalls, 1);
});

test('terminal transition as first mutation with malformed return is confirmed and never false PASS', async () => {
  const kernel = closureFirstKernel({ transitionFault: 'mutate_then_malformed' });
  const result = await execute(kernel, { rules: [] });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED/);
  assert.equal(kernel.taskcycle.state, 'CLOSED');
  assert.equal(kernel.satisfyCalls, 0);
  assert.equal(kernel.transitionCalls, 1);
});

test('terminal transition first mutation with unavailable reassessment is UNKNOWN and not retried', async () => {
  const kernel = closureFirstKernel({
    transitionFault: 'mutate_then_throw',
    reassessmentUnavailable: true,
  });
  const result = await execute(kernel, { rules: [] });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.effect_state, 'UNKNOWN');
  assert.equal(kernel.taskcycle.state, 'CLOSED');
  assert.equal(kernel.transitionCalls, 1);
  assert.equal(kernel.satisfyCalls, 0);
});

test('Recipe B constructor is exposed through the established Operational Spine public surface', () => {
  const exported = require('../../src/operational-spine-v0');
  assert.equal(exported.createReconcileAndCloseTaskCycleRecipe, createReconcileAndCloseTaskCycleRecipe);
});

test('review counterexample: wrong event_id with correct numeric revisions is exact-effect-unacknowledged and stops', async () => {
  const kernel = new SyntheticKernel({ satisfyFault: 'wrong_event_id' });
  const result = await execute(kernel);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED:RECEIPT_CORRESPONDENCE_MISMATCH/);
  assert.equal(kernel.revision, 51);
  assert.equal(kernel.taskcycle.revision, 8);
  assert.equal(kernel.taskcycle.last_event_id, 'event-51');
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

test('wrong aggregate_id with exact authoritative effect is not acknowledged', async () => {
  const kernel = new SyntheticKernel({ satisfyFault: 'wrong_aggregate_id' });
  const result = await execute(kernel);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED/);
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

test('wrong kind with exact authoritative effect is not acknowledged', async () => {
  const kernel = new SyntheticKernel({ satisfyFault: 'wrong_kind' });
  const result = await execute(kernel);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.match(result.reason, /STATE_KERNEL_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED/);
  assert.equal(kernel.satisfyCalls, 1);
  assert.equal(kernel.transitionCalls, 0);
});

test('correct event, revisions, kind and aggregate identity preserve clean acknowledged PASS path', async () => {
  const kernel = new SyntheticKernel();
  const result = await execute(kernel);
  assert.equal(result.status, 'PASS');
  assert.equal(result.effect_state, 'CONFIRMED');
  assert.equal(kernel.taskcycle.state, 'CLOSED');
});

