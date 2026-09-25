'use strict';

const assert = require('node:assert/strict');
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

test('post-TaskCycle reconciliation resolves sufficient coincident evidence and reports remaining obligations', () => {
  const request = { taskcycle: taskCycle(), observations: completeTaskCycleObservations() };
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
  const result = reconcilePostTaskCycle({ taskcycle: taskCycle(), observations: {} });

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

  const result = reconcilePostTaskCycle({ taskcycle: taskCycle(), observations });

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

  const result = reconcilePostTaskCycle({ taskcycle: acceptedInKernel, observations });

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

  const result = reconcilePostTaskCycle({ taskcycle: taskCycle(), observations });

  assert.deepEqual(
    result.observed_facts.terminal_results.map(item => item.status),
    ['UNKNOWN', 'BLOCKED', 'FAILED', 'UNAVAILABLE'],
  );
});

test('post-milestone reconciliation preserves deferred work and findings while keeping the next responsibility external', () => {
  const result = reconcilePostMilestone({
    milestone: { id: 'MILESTONE-001', title: 'Operational bootstrap', state: 'ACTIVE' },
    observations: milestoneObservations(),
  });

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

test('CLI produces identical output in separate fresh processes', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-reconciliation-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const requestPath = path.join(temporary, 'request.json');
  fs.writeFileSync(requestPath, JSON.stringify({
    taskcycle: taskCycle(),
    observations: completeTaskCycleObservations(),
  }));
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
