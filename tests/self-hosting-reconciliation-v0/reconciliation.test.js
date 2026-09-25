'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  reconcilePostTaskCycle,
  reconcilePostMilestone,
} = require('../../src/self-hosting-reconciliation-v0');

const observation = (sourceRef, observed) => ({ source_ref: sourceRef, observed });

const TASKCYCLE_EVIDENCE_KINDS = Object.freeze({
  candidate_identity: 'CANDIDATE_IDENTITY',
  terminal_results: 'TERMINAL_RESULTS',
  independent_review: 'INDEPENDENT_REVIEW_RESULT',
  developer_acceptance: 'DEVELOPER_ACCEPTANCE',
  canonical_integration: 'CANONICAL_INTEGRATION',
  remote_publication: 'REMOTE_PUBLICATION',
  canonical_state_delta: 'CANONICAL_STATE_DELTA',
});

const MILESTONE_EVIDENCE_KINDS = Object.freeze({
  planned_responsibilities: 'PLANNED_RESPONSIBILITIES',
  completed_responsibilities: 'COMPLETED_RESPONSIBILITIES',
  deferred_or_cancelled_responsibilities: 'DEFERRED_OR_CANCELLED_RESPONSIBILITIES',
  open_findings: 'OPEN_FINDINGS',
  accepted_architectural_changes: 'ACCEPTED_ARCHITECTURAL_CHANGES',
  actual_repository_state: 'ACTUAL_REPOSITORY_STATE',
});

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function authorityCompetenceFor(field, authorityRef = 'authority:developer-001') {
  const kinds = {
    independent_review: 'INDEPENDENT_REVIEW',
    developer_acceptance: 'DEVELOPER',
    canonical_integration: 'EFFECT_AUTHORITY',
    remote_publication: 'EFFECT_AUTHORITY',
    deferred_or_cancelled_responsibilities: 'DEVELOPER',
    accepted_architectural_changes: 'DEVELOPER',
  };
  if (!kinds[field]) return null;
  return {
    status: 'ESTABLISHED',
    kind: kinds[field],
    authority_ref: authorityRef,
    basis_ref: `basis:${field}`,
  };
}

function verifiedEvidence({
  ref,
  kind,
  subjectKind,
  subjectId,
  field,
  observed,
  authorityCompetence = authorityCompetenceFor(field),
}) {
  const artifact = {
    schema_version: 'tecnotron-reconciliation-evidence/v0',
    kind,
    subject: { kind: subjectKind, id: subjectId, field },
    observed,
    verification: {
      status: 'VERIFIED',
      verification_ref: `verification:${ref}`,
      verifier_ref: 'verifier:fixture',
      authority_competence: authorityCompetence,
    },
  };
  const artifactJson = JSON.stringify(artifact);
  return { ref, sha256: sha256(artifactJson), artifact_json: artifactJson };
}

function evidenceForObservations({ observations, subjectKind, subjectId, kinds }) {
  return Object.entries(observations).flatMap(([field, entries]) =>
    entries.map(entry => verifiedEvidence({
      ref: entry.source_ref,
      kind: kinds[field],
      subjectKind,
      subjectId,
      field,
      observed: entry.observed,
    })));
}

function taskCycle(overrides = {}) {
  return {
    schema_version: 'tecnotron-state-kernel/v0',
    kind: 'TaskCycle',
    id: 'TC-001',
    revision: 7,
    state: 'PENDING_ACCEPTANCE',
    obligations: [
      { id: 'IMPLEMENTATION', status: 'SATISFIED', authority_ref: null },
      { id: 'VALIDATION', status: 'SATISFIED', authority_ref: null },
      { id: 'INDEPENDENT_REVIEW', status: 'PENDING', authority_ref: null },
      { id: 'DEVELOPER_ACCEPTANCE', status: 'PENDING', authority_ref: null },
    ],
    ...overrides,
  };
}

function completeTaskCycleObservations() {
  return {
    candidate_identity: [observation('candidate-identity.json', {
      commit: 'a'.repeat(40),
      tree: 'b'.repeat(40),
      parent: 'c'.repeat(40),
      changed_paths: ['tests/reconciliation.test.js', 'src/reconciliation.js'],
    })],
    terminal_results: [observation('result:operation-001', [
      { reference: 'result:operation-001', subject_id: 'ATTEMPT-001', status: 'PASS' },
    ])],
    independent_review: [observation('review:001', {
      reference: 'review:001',
      disposition: 'PASS',
    })],
    developer_acceptance: [observation('authority:developer-001', {
      reference: 'authority:developer-001',
      disposition: 'ACCEPTED',
    })],
    canonical_integration: [observation('git:integration-001', {
      reference: 'git:integration-001',
      status: 'INTEGRATED',
    })],
    remote_publication: [observation('git:refs/heads/tools', {
      reference: 'git:refs/heads/tools',
      status: 'PUBLISHED',
    })],
    canonical_state_delta: [observation('state-delta:151-158', {
      from: { reference: 'state:151', revision: 151, sha256: 'd'.repeat(64) },
      to: { reference: 'state:158', revision: 158, sha256: 'e'.repeat(64) },
      changed_aggregates: [
        { kind: 'TaskCycle', id: 'TC-001', before_revision: 7, after_revision: 8 },
      ],
    })],
  };
}

function milestoneObservations() {
  return {
    planned_responsibilities: [observation('plan:milestone-001', [
      { id: 'RESP-002', description: 'Deferred responsibility' },
      { id: 'RESP-001', description: 'Completed responsibility' },
    ])],
    completed_responsibilities: [observation('results:milestone-001', [
      { id: 'RESP-001', result_ref: 'result:resp-001' },
    ])],
    deferred_or_cancelled_responsibilities: [observation('ruling:milestone-001', [
      { id: 'RESP-002', disposition: 'DEFERRED', authority_ref: 'authority:developer-001' },
      { id: 'RESP-003', disposition: 'CANCELLED', authority_ref: 'authority:developer-001' },
    ])],
    open_findings: [observation('findings:milestone-001', [
      { id: 'FINDING-001', summary: 'Cross-surface qualification remains open', evidence_ref: 'evidence:finding-001' },
    ])],
    accepted_architectural_changes: [observation('adr-index:milestone-001', [
      { id: 'ADR-001', decision_ref: 'adr:001', authority_ref: 'authority:developer-001' },
    ])],
    actual_repository_state: [observation('git:milestone-001', {
      branch: 'tools',
      commit: 'f'.repeat(40),
      tree: '0'.repeat(40),
      clean: true,
    })],
  };
}

function completeTaskCycleRequest() {
  const subject = taskCycle();
  const observations = completeTaskCycleObservations();
  return {
    taskcycle: subject,
    observations,
    evidence: evidenceForObservations({
      observations,
      subjectKind: 'TaskCycle',
      subjectId: subject.id,
      kinds: TASKCYCLE_EVIDENCE_KINDS,
    }),
  };
}

function completeMilestoneRequest() {
  const milestone = { id: 'MILESTONE-001', title: 'Operational bootstrap', state: 'ACTIVE' };
  const observations = milestoneObservations();
  return {
    milestone,
    observations,
    evidence: evidenceForObservations({
      observations,
      subjectKind: 'Milestone',
      subjectId: milestone.id,
      kinds: MILESTONE_EVIDENCE_KINDS,
    }),
  };
}

function validationFixtureProductMilestoneRequest(overrides = {}) {
  const milestone = {
    id: 'REAL-PRODUCT-MILESTONE-001',
    title: 'Real Product milestone',
    state: 'ACTIVE',
    ...overrides,
  };
  const observations = milestoneObservations();
  const fixtureAuthority = 'authority:not-a-developer';
  observations.deferred_or_cancelled_responsibilities[0].observed = [
    { id: 'RESP-002', disposition: 'DEFERRED', authority_ref: fixtureAuthority },
  ];
  observations.accepted_architectural_changes[0].observed = [
    { id: 'ADR-001', decision_ref: 'adr:001', authority_ref: fixtureAuthority },
  ];
  const fixtureCompetence = {
    status: 'ESTABLISHED',
    kind: 'VALIDATION_FIXTURE',
    authority_ref: fixtureAuthority,
    basis_ref: 'validation-fixture:self-declared',
  };
  const authorityFields = new Set([
    'deferred_or_cancelled_responsibilities',
    'accepted_architectural_changes',
  ]);
  const evidence = Object.entries(observations).flatMap(([field, entries]) =>
    entries.map(entry => verifiedEvidence({
      ref: entry.source_ref,
      kind: MILESTONE_EVIDENCE_KINDS[field],
      subjectKind: 'Milestone',
      subjectId: milestone.id,
      field,
      observed: entry.observed,
      authorityCompetence: authorityFields.has(field) ? fixtureCompetence : null,
    })));
  return { milestone, observations, evidence };
}

test('post-TaskCycle reconciliation resolves sufficient coincident evidence and reports remaining obligations', () => {
  const request = completeTaskCycleRequest();
  const before = structuredClone(request);

  const result = reconcilePostTaskCycle(request);

  assert.equal(result.disposition, 'RESOLVED');
  assert.equal(result.observed_facts.candidate_identity.commit, 'a'.repeat(40));
  assert.deepEqual(result.observed_facts.candidate_identity.changed_paths, [
    'src/reconciliation.js',
    'tests/reconciliation.test.js',
  ]);
  assert.deepEqual(result.observed_facts.remaining_taskcycle_obligations, [
    { id: 'DEVELOPER_ACCEPTANCE', status: 'PENDING', authority_ref: null },
    { id: 'INDEPENDENT_REVIEW', status: 'PENDING', authority_ref: null },
  ]);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.authority_inference, 'NONE');
  assert.equal(result.silent_repair, 'NONE');
  assert.equal(result.canonical_state_write, 'NONE');
  assert.deepEqual(request, before);
});

test('post-TaskCycle reconciliation classifies missing evidence without fabricating facts', () => {
  const result = reconcilePostTaskCycle({ taskcycle: taskCycle(), observations: {}, evidence: [] });

  assert.equal(result.disposition, 'UNRESOLVED');
  assert.equal(result.classifications.candidate_identity.reason, 'MISSING_EVIDENCE');
  assert.equal(result.classifications.independent_review.reason, 'MISSING_EVIDENCE');
  assert.equal(result.classifications.developer_acceptance.reason, 'MISSING_EVIDENCE');
  assert.equal(result.observed_facts.candidate_identity, null);
  assert.equal(result.observed_facts.independent_review, null);
  assert.equal(result.observed_facts.developer_acceptance, null);
  assert.ok(result.unresolved.every(item => item.status === 'UNRESOLVED'));
});

test('post-TaskCycle reconciliation distinguishes contradictory and ambiguous evidence and does not repair either', () => {
  const observations = completeTaskCycleObservations();
  observations.candidate_identity.push(observation('candidate-other.json', {
    commit: '9'.repeat(40),
    tree: '8'.repeat(40),
    parent: 'c'.repeat(40),
    changed_paths: ['src/reconciliation.js'],
  }));
  observations.independent_review = [observation('review:incomplete', {
    reference: 'review:incomplete',
  })];

  const subject = taskCycle();
  const evidence = evidenceForObservations({
    observations,
    subjectKind: 'TaskCycle',
    subjectId: subject.id,
    kinds: TASKCYCLE_EVIDENCE_KINDS,
  });
  const result = reconcilePostTaskCycle({ taskcycle: subject, observations, evidence });

  assert.equal(result.classifications.candidate_identity.reason, 'CONTRADICTORY_EVIDENCE');
  assert.equal(result.classifications.independent_review.reason, 'AMBIGUOUS_EVIDENCE');
  assert.equal(result.observed_facts.candidate_identity, null);
  assert.equal(result.observed_facts.independent_review, null);
  assert.equal(result.silent_repair, 'NONE');
});

test('post-TaskCycle reconciliation never infers Developer acceptance from a satisfied obligation', () => {
  const acceptedInKernel = taskCycle({
    obligations: [
      { id: 'DEVELOPER_ACCEPTANCE', status: 'SATISFIED', authority_ref: 'authority:developer-001' },
    ],
  });
  const observations = completeTaskCycleObservations();
  observations.developer_acceptance = [];
  const evidence = evidenceForObservations({
    observations,
    subjectKind: 'TaskCycle',
    subjectId: acceptedInKernel.id,
    kinds: TASKCYCLE_EVIDENCE_KINDS,
  });

  const result = reconcilePostTaskCycle({ taskcycle: acceptedInKernel, observations, evidence });

  assert.equal(result.classifications.developer_acceptance.reason, 'MISSING_EVIDENCE');
  assert.equal(result.observed_facts.developer_acceptance, null);
  assert.equal(result.authority_inference, 'NONE');
});

test('post-TaskCycle reconciliation preserves UNKNOWN, BLOCKED, FAILED and UNAVAILABLE terminal semantics', () => {
  const observations = completeTaskCycleObservations();
  observations.terminal_results = [observation('results:mixed', [
    { reference: 'result:1', subject_id: 'ATTEMPT-1', status: 'UNKNOWN' },
    { reference: 'result:2', subject_id: 'ATTEMPT-2', status: 'BLOCKED' },
    { reference: 'result:3', subject_id: 'ATTEMPT-3', status: 'FAILED' },
    { reference: 'result:4', subject_id: 'ATTEMPT-4', status: 'UNAVAILABLE' },
  ])];
  const subject = taskCycle();
  const evidence = evidenceForObservations({
    observations,
    subjectKind: 'TaskCycle',
    subjectId: subject.id,
    kinds: TASKCYCLE_EVIDENCE_KINDS,
  });

  const result = reconcilePostTaskCycle({ taskcycle: subject, observations, evidence });

  assert.deepEqual(
    result.observed_facts.terminal_results.map(item => item.status),
    ['UNKNOWN', 'BLOCKED', 'FAILED', 'UNAVAILABLE'],
  );
});

test('post-milestone reconciliation preserves deferred work and findings while keeping the next responsibility external', () => {
  const result = reconcilePostMilestone(completeMilestoneRequest());

  assert.equal(result.disposition, 'RESOLVED');
  assert.deepEqual(
    result.observed_facts.deferred_or_cancelled_responsibilities.map(item => item.disposition),
    ['DEFERRED', 'CANCELLED'],
  );
  assert.deepEqual(result.observed_facts.open_findings.map(item => item.id), ['FINDING-001']);
  assert.deepEqual(result.external_semantic_decisions_required, ['NEXT_PRODUCT_RESPONSIBILITY']);
  assert.equal(Object.hasOwn(result, 'next_responsibility'), false);
  assert.equal(result.automatic_roadmap_decision, 'NONE');
});

test('reviewer reproduction: validation fixture competence cannot resolve Product milestone authority facts', () => {
  const result = reconcilePostMilestone(validationFixtureProductMilestoneRequest());

  assert.equal(result.disposition, 'UNRESOLVED');
  assert.equal(result.observed_facts.deferred_or_cancelled_responsibilities, null);
  assert.equal(result.observed_facts.accepted_architectural_changes, null);
  assert.equal(result.classifications.deferred_or_cancelled_responsibilities.status, 'UNRESOLVED');
  assert.equal(result.classifications.accepted_architectural_changes.status, 'UNRESOLVED');
});

test('milestone id or title cannot opt Product reconciliation into fixture authority', () => {
  for (const milestone of [
    { id: 'VALIDATION-MILESTONE-LOOKALIKE', title: 'Real Product milestone' },
    { id: 'REAL-PRODUCT-MILESTONE-002', title: 'Synthetic validation fixture' },
  ]) {
    const result = reconcilePostMilestone(validationFixtureProductMilestoneRequest(milestone));

    assert.equal(result.observed_facts.deferred_or_cancelled_responsibilities, null);
    assert.equal(result.observed_facts.accepted_architectural_changes, null);
  }
});

test('caller-controlled fixture markers cannot establish a Product authority boundary', () => {
  for (const marker of [
    { validation_fixture: true },
    { context_kind: 'VALIDATION_FIXTURE' },
  ]) {
    const request = { ...validationFixtureProductMilestoneRequest(), ...marker };
    assert.throws(
      () => reconcilePostMilestone(request),
      error => error && error.code === 'INVALID_RECONCILIATION_REQUEST',
    );
  }
});

test('verified Developer authority still resolves Product milestone authority facts', () => {
  const result = reconcilePostMilestone(completeMilestoneRequest());

  assert.deepEqual(result.observed_facts.deferred_or_cancelled_responsibilities, [
    { id: 'RESP-002', disposition: 'DEFERRED', authority_ref: 'authority:developer-001' },
    { id: 'RESP-003', disposition: 'CANCELLED', authority_ref: 'authority:developer-001' },
  ]);
  assert.deepEqual(result.observed_facts.accepted_architectural_changes, [
    { id: 'ADR-001', decision_ref: 'adr:001', authority_ref: 'authority:developer-001' },
  ]);
});

test('synthetic evidence can exercise non-authority mechanics without granting Product authority', () => {
  const result = reconcilePostMilestone(validationFixtureProductMilestoneRequest({
    id: 'SYNTHETIC-MECHANICS-ONLY',
    title: 'Synthetic mechanics exercise',
  }));

  assert.deepEqual(result.observed_facts.planned_responsibilities, [
    { id: 'RESP-001', description: 'Completed responsibility' },
    { id: 'RESP-002', description: 'Deferred responsibility' },
  ]);
  assert.equal(result.observed_facts.deferred_or_cancelled_responsibilities, null);
  assert.equal(result.observed_facts.accepted_architectural_changes, null);
});

test('reviewer reproduction: arbitrary unverified references cannot establish authority-bearing facts', () => {
  const observations = completeTaskCycleObservations();
  observations.independent_review = [observation('unverified:any', {
    reference: 'review:any',
    disposition: 'PASS',
  })];
  observations.developer_acceptance = [observation('unverified:any', {
    reference: 'authority:any',
    disposition: 'ACCEPTED',
  })];
  observations.canonical_integration = [observation('unverified:any', {
    reference: 'git:any',
    status: 'INTEGRATED',
  })];
  observations.remote_publication = [observation('unverified:any', {
    reference: 'remote:any',
    status: 'PUBLISHED',
  })];

  const result = reconcilePostTaskCycle({ taskcycle: taskCycle(), observations });

  assert.equal(result.disposition, 'UNRESOLVED');
  for (const field of [
    'independent_review',
    'developer_acceptance',
    'canonical_integration',
    'remote_publication',
  ]) {
    assert.equal(result.observed_facts[field], null);
    assert.equal(result.classifications[field].status, 'UNRESOLVED');
  }
});

test('an arbitrary authority_ref cannot establish milestone authority competence', () => {
  const request = completeMilestoneRequest();
  const observed = [
    { id: 'RESP-002', disposition: 'DEFERRED', authority_ref: 'authority:any' },
  ];
  request.observations.deferred_or_cancelled_responsibilities = [
    observation('evidence:milestone-untrusted', observed),
  ];
  request.evidence = request.evidence.filter(record => record.ref !== 'ruling:milestone-001');
  request.evidence.push(verifiedEvidence({
    ref: 'evidence:milestone-untrusted',
    kind: MILESTONE_EVIDENCE_KINDS.deferred_or_cancelled_responsibilities,
    subjectKind: 'Milestone',
    subjectId: request.milestone.id,
    field: 'deferred_or_cancelled_responsibilities',
    observed,
    authorityCompetence: null,
  }));

  const result = reconcilePostMilestone(request);

  assert.equal(result.observed_facts.deferred_or_cancelled_responsibilities, null);
  assert.equal(result.classifications.deferred_or_cancelled_responsibilities.status, 'UNRESOLVED');
});

test('a missing referenced evidence artifact leaves the claim unresolved', () => {
  const request = completeTaskCycleRequest();
  request.evidence = request.evidence.filter(record => record.ref !== 'candidate-identity.json');

  const result = reconcilePostTaskCycle(request);

  assert.equal(result.observed_facts.candidate_identity, null);
  assert.equal(result.classifications.candidate_identity.status, 'UNRESOLVED');
});

test('a referenced evidence artifact with a hash mismatch leaves the claim unresolved', () => {
  const request = completeTaskCycleRequest();
  const record = request.evidence.find(item => item.ref === 'review:001');
  record.sha256 = '0'.repeat(64);

  const result = reconcilePostTaskCycle(request);

  assert.equal(result.observed_facts.independent_review, null);
  assert.equal(result.classifications.independent_review.status, 'UNRESOLVED');
});

test('a referenced evidence artifact of the wrong kind leaves the claim unresolved', () => {
  const request = completeTaskCycleRequest();
  request.evidence = request.evidence.filter(record => record.ref !== 'review:001');
  request.evidence.push(verifiedEvidence({
    ref: 'review:001',
    kind: 'REMOTE_PUBLICATION',
    subjectKind: 'TaskCycle',
    subjectId: request.taskcycle.id,
    field: 'independent_review',
    observed: request.observations.independent_review[0].observed,
  }));

  const result = reconcilePostTaskCycle(request);

  assert.equal(result.observed_facts.independent_review, null);
  assert.equal(result.classifications.independent_review.status, 'UNRESOLVED');
});

test('valid typed and hash-verified evidence resolves a claim', () => {
  const result = reconcilePostTaskCycle(completeTaskCycleRequest());

  assert.deepEqual(result.observed_facts.independent_review, {
    reference: 'review:001',
    disposition: 'PASS',
  });
  assert.equal(result.classifications.independent_review.status, 'RESOLVED');
});

test('coincident independently verified observations resolve to one fact', () => {
  const request = completeTaskCycleRequest();
  const observed = { reference: 'review:001', disposition: 'PASS' };
  request.observations.independent_review.push(observation('review:002', observed));
  request.evidence.push(verifiedEvidence({
    ref: 'review:002',
    kind: TASKCYCLE_EVIDENCE_KINDS.independent_review,
    subjectKind: 'TaskCycle',
    subjectId: request.taskcycle.id,
    field: 'independent_review',
    observed,
  }));

  const result = reconcilePostTaskCycle(request);

  assert.deepEqual(result.observed_facts.independent_review, observed);
  assert.deepEqual(result.classifications.independent_review.source_refs, ['review:001', 'review:002']);
});

test('contradictory independently verified observations remain unresolved', () => {
  const request = completeTaskCycleRequest();
  const observed = { reference: 'review:002', disposition: 'FAIL' };
  request.observations.independent_review.push(observation('review:002', observed));
  request.evidence.push(verifiedEvidence({
    ref: 'review:002',
    kind: TASKCYCLE_EVIDENCE_KINDS.independent_review,
    subjectKind: 'TaskCycle',
    subjectId: request.taskcycle.id,
    field: 'independent_review',
    observed,
  }));

  const result = reconcilePostTaskCycle(request);

  assert.equal(result.observed_facts.independent_review, null);
  assert.equal(result.classifications.independent_review.reason, 'CONTRADICTORY_EVIDENCE');
});

test('hash-valid evidence whose subject or value does not correspond to the observation is unresolved', () => {
  const request = completeTaskCycleRequest();
  request.evidence = request.evidence.filter(record => record.ref !== 'result:operation-001');
  request.evidence.push(verifiedEvidence({
    ref: 'result:operation-001',
    kind: TASKCYCLE_EVIDENCE_KINDS.terminal_results,
    subjectKind: 'TaskCycle',
    subjectId: 'TC-OTHER',
    field: 'terminal_results',
    observed: request.observations.terminal_results[0].observed,
  }));

  const result = reconcilePostTaskCycle(request);

  assert.equal(result.observed_facts.terminal_results, null);
  assert.equal(result.classifications.terminal_results.status, 'UNRESOLVED');
});

test('CLI produces identical output in separate fresh processes', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-reconciliation-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const requestPath = path.join(temporary, 'request.json');
  fs.writeFileSync(requestPath, JSON.stringify(completeTaskCycleRequest()));
  const cli = path.join(__dirname, '../../src/self-hosting-reconciliation-v0/cli.js');
  const invoke = () => spawnSync(process.execPath, [cli, 'post-taskcycle', requestPath], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });

  const first = invoke();
  const second = invoke();

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.equal(JSON.parse(first.stdout).disposition, 'RESOLVED');
});
