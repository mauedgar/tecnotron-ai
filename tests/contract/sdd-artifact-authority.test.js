'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseSddArtifact,
  validateSddArtifactSet,
} = require('../../src/contracts/sdd-artifacts');

const revision = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const candidateCommit = '1'.repeat(40);
const candidateTree = '2'.repeat(40);
const candidateParent = '3'.repeat(40);

function ref(documentId, selectedRevision = revision) {
  return { ref: documentId, revision: selectedRevision };
}

function requirementRef(id, source = ref('SPEC-001')) {
  return { source, id };
}

function base(kind, id) {
  return {
    contract_version: 'tecnotron-sdd-artifacts/v1',
    document_id: id,
    artifact_kind: kind,
    owner: 'tecnotron-ai',
    scope: `scope:${id}`,
    revision,
    authority_refs: [ref('AUTH-DEVELOPER-001')],
  };
}

function validGraph() {
  const requirements = Array.from({ length: 7 }, (_, offset) => ({
    id: `RF-${201 + offset}`,
    statement: `Accepted requirement RF-${201 + offset}`,
  }));
  const allRequirementRefs = requirements.map(({ id }) => requirementRef(id));

  return [
    {
      ...base('SPEC', 'SPEC-001'),
      requirements,
    },
    {
      ...base('WP_PLAN', 'WP-PLAN-001'),
      coverage: { kind: 'approved_spec', spec_ref: ref('SPEC-001') },
      requirement_refs: allRequirementRefs,
      relations: [{ relation: 'derives_from', target: ref('SPEC-001') }],
    },
    {
      ...base('TASK', 'TASK-001'),
      coverage: { kind: 'approved_spec', spec_ref: ref('SPEC-001') },
      requirement_refs: [requirementRef('RF-201'), requirementRef('RF-205')],
      assignment_authority_ref: ref('AUTH-DEVELOPER-001'),
      write_scope: ['src/contracts/sdd-artifacts.js'],
      acceptance_criteria: ['Focused contract tests pass'],
      relations: [
        { relation: 'assigns_from', target: ref('SPEC-001') },
        { relation: 'follows', target: ref('WP-PLAN-001') },
      ],
      scope_fit: 'FIT',
      state_dimensions: { task_contract: 'READY' },
    },
    {
      ...base('TASK_PLAN', 'TASK-PLAN-001'),
      relations: [{ relation: 'executes', target: ref('TASK-001') }],
    },
    {
      ...base('RESULT', 'RESULT-001'),
      subject_ref: ref('CANDIDATE-001'),
      evidence_refs: [ref('EVIDENCE-001')],
      observations: [{
        observation_id: 'OBS-001',
        outcome: 'PASS',
        evidence_refs: [ref('EVIDENCE-001')],
      }],
      relations: [{ relation: 'records', target: ref('TASK-001') }],
    },
    {
      ...base('REVIEW', 'REVIEW-001'),
      candidate: { identity_ref: ref('CANDIDATE-001') },
      validation_evidence_refs: [ref('RESULT-001')],
      assessment_ref: ref('ASSESSMENT-001'),
      relations: [{ relation: 'uses_evidence', target: ref('RESULT-001') }],
    },
  ];
}

function externalReferences() {
  return [
    {
      ...ref('AUTH-DEVELOPER-001'),
      kind: 'authority',
      decision: {
        state: 'accepted',
        subject_ref: ref('SPEC-001'),
        applicable_scope: 'scope:SPEC-001',
      },
    },
    { ...ref('EVIDENCE-001'), kind: 'evidence', subject_ref: ref('CANDIDATE-001') },
    {
      ...ref('CANDIDATE-001'),
      kind: 'git_candidate',
      repository: 'mauedgar/tecnotron-ai',
      commit: candidateCommit,
      tree: candidateTree,
      parents: [candidateParent],
    },
    { ...ref('ASSESSMENT-001'), kind: 'assessment' },
  ];
}

function validate(artifacts, external = externalReferences()) {
  return validateSddArtifactSet(artifacts, { external_references: external });
}

function findingCodes(result) {
  return result.findings.map(({ code }) => code);
}

test('parses strict object, YAML and Markdown frontmatter without mutating input', () => {
  const artifact = validGraph()[0];
  const before = structuredClone(artifact);
  const objectResult = parseSddArtifact(artifact);

  assert.equal(objectResult.outcome, 'PASS');
  assert.deepEqual(artifact, before);

  const yaml = [
    'contract_version: tecnotron-sdd-artifacts/v1',
    'document_id: SPEC-002',
    'artifact_kind: SPEC',
    'owner: tecnotron-ai',
    'scope: scope:SPEC-002',
    `revision: ${revision}`,
    'authority_refs:',
    '  - ref: AUTH-DEVELOPER-001',
    `    revision: ${revision}`,
    'requirements:',
    '  - id: RF-201',
    '    statement: Accepted requirement',
  ].join('\n');

  assert.equal(parseSddArtifact(yaml).outcome, 'PASS');
  assert.equal(parseSddArtifact(`---\n${yaml}\n---\n# SPEC`).outcome, 'PASS');
});

test('accepts the complete declared SPEC to REVIEW graph', () => {
  const result = validate(validGraph());
  assert.equal(result.outcome, 'PASS', JSON.stringify(result.findings, null, 2));
  assert.equal(result.artifacts.length, 6);
});

test('fails closed for missing metadata and unknown kinds without adding defaults', () => {
  const missingOwner = validGraph()[0];
  delete missingOwner.owner;
  const missingResult = parseSddArtifact(missingOwner);
  assert.equal(missingResult.outcome, 'FAIL');
  assert.ok(findingCodes(missingResult).includes('REQUIRED_METADATA_MISSING'));
  assert.equal(Object.hasOwn(missingOwner, 'owner'), false);

  const unknown = { ...validGraph()[0], artifact_kind: 'DESIGN' };
  const unknownResult = parseSddArtifact(unknown);
  assert.equal(unknownResult.outcome, 'FAIL');
  assert.ok(findingCodes(unknownResult).includes('UNKNOWN_ARTIFACT_KIND'));
});

test('rejects unsupported, missing and broken relations', () => {
  const unsupported = validGraph();
  unsupported[1].relations[0].relation = 'accepts';
  assert.ok(findingCodes(validate(unsupported)).includes('UNSUPPORTED_RELATION'));

  const broken = validGraph();
  broken[2].relations[1].target = ref('WP-PLAN-MISSING');
  assert.ok(findingCodes(validate(broken)).includes('UNRESOLVED_REFERENCE'));

  const missing = validGraph();
  missing[3].relations = [];
  assert.ok(findingCodes(validate(missing)).includes('REQUIRED_RELATION_MISSING'));
});

test('rejects missing and structurally ambiguous authority references', () => {
  const unresolved = validGraph();
  unresolved[2].authority_refs = [ref('AUTH-MISSING')];
  assert.ok(findingCodes(validate(unresolved)).includes('UNRESOLVED_AUTHORITY_REFERENCE'));

  const ambiguous = validGraph();
  ambiguous[2].authority_refs = [
    ref('AUTH-DEVELOPER-001'),
    ref('AUTH-DEVELOPER-001', 'sha256:' + '9'.repeat(64)),
  ];
  assert.ok(findingCodes(validate(ambiguous)).includes('AMBIGUOUS_AUTHORITY_REFERENCE'));
});

test('rejects resolved artifacts, evidence and provider records as authority', () => {
  const cases = [
    { name: 'artifact', authorityRef: ref('SPEC-001') },
    { name: 'evidence', authorityRef: ref('EVIDENCE-001') },
    { name: 'assessment', authorityRef: ref('ASSESSMENT-001') },
    {
      name: 'provider record',
      authorityRef: ref('PROVIDER-001'),
      extra: { ...ref('PROVIDER-001'), kind: 'provider_record', provider: 'workspace' },
    },
  ];

  for (const { name, authorityRef, extra } of cases) {
    const graph = validGraph();
    graph[3].authority_refs = [authorityRef];
    const external = externalReferences();
    if (extra) external.push(extra);
    assert.ok(
      findingCodes(validate(graph, external)).includes('INVALID_AUTHORITY_REFERENCE'),
      `${name} identity must not satisfy authority_refs`,
    );
  }
});

test('requires assignment and competent-exception authority refs to be authority records', () => {
  const assignment = validGraph();
  assignment[2].assignment_authority_ref = ref('EVIDENCE-001');
  assert.ok(findingCodes(validate(assignment)).includes('INVALID_AUTHORITY_REFERENCE'));

  const exception = ref('EXCEPTION-INVALID-AUTHORITY');
  const wpPlan = {
    ...base('WP_PLAN', 'WP-PLAN-INVALID-AUTHORITY'),
    coverage: { kind: 'competent_exception', exception_ref: exception },
    requirement_refs: [requirementRef('RF-EX-1', exception)],
    relations: [],
  };
  const external = [
    ...externalReferences(),
    {
      ...exception,
      kind: 'competent_exception',
      authority_ref: ref('EVIDENCE-001'),
      scope: 'scope:exception',
      rationale: 'Explicit bounded exception',
      requirements: [{ id: 'RF-EX-1', statement: 'Bounded requirement' }],
    },
  ];
  assert.ok(findingCodes(validate([wpPlan], external)).includes('INVALID_AUTHORITY_REFERENCE'));
});

test('approved SPEC coverage requires resolved authority evidence on the source', () => {
  const graph = validGraph();
  graph[0].authority_refs = [ref('EVIDENCE-001')];

  const result = validate(graph);
  assert.ok(findingCodes(result).includes('INVALID_APPROVED_SPEC_SOURCE'));
});

test('approved SPEC coverage rejects a generic authority without an accepted-source decision', () => {
  const external = externalReferences();
  external[0] = { ...ref('AUTH-DEVELOPER-001'), kind: 'authority' };

  const result = validate(validGraph(), external);

  assert.equal(result.outcome, 'FAIL');
  assert.ok(findingCodes(result).includes('INVALID_APPROVED_SPEC_SOURCE'));
});

test('approved SPEC accepted-source decision requires exact state, subject revision and scope', () => {
  const invalidDecisions = [
    {
      state: 'proposed',
      subject_ref: ref('SPEC-001'),
      applicable_scope: 'scope:SPEC-001',
    },
    {
      state: 'accepted',
      subject_ref: ref('SPEC-001', 'sha256:' + '9'.repeat(64)),
      applicable_scope: 'scope:SPEC-001',
    },
    {
      state: 'accepted',
      subject_ref: ref('SPEC-001'),
      applicable_scope: 'scope:unrelated',
    },
  ];

  for (const decision of invalidDecisions) {
    const external = externalReferences();
    external[0].decision = decision;
    const result = validate(validGraph(), external);

    assert.equal(result.outcome, 'FAIL');
    assert.ok(findingCodes(result).includes('INVALID_APPROVED_SPEC_SOURCE'));
  }
});

test('checks requirement existence, source identity and bounded TASK subset', () => {
  const missingRequirement = validGraph();
  missingRequirement[2].requirement_refs.push(requirementRef('RF-999'));
  assert.ok(findingCodes(validate(missingRequirement)).includes('UNKNOWN_REQUIREMENT_REFERENCE'));

  const wrongSource = validGraph();
  wrongSource[2].requirement_refs[0].source = ref('SPEC-MISSING');
  assert.ok(findingCodes(validate(wrongSource)).includes('UNRESOLVED_REQUIREMENT_SOURCE'));

  const outsidePlan = validGraph();
  outsidePlan[1].requirement_refs = [requirementRef('RF-201')];
  assert.ok(findingCodes(validate(outsidePlan)).includes('TASK_REQUIREMENT_OUTSIDE_PLAN'));
});

test('rejects duplicate or conflicting stable requirement identities', () => {
  const duplicate = validGraph();
  duplicate[0].requirements.push({
    id: 'RF-201',
    statement: 'Accepted requirement RF-201',
  });
  assert.ok(findingCodes(validate(duplicate)).includes('DUPLICATE_REQUIREMENT_ID'));

  const conflicting = validGraph();
  conflicting[0].requirements.push({
    id: 'RF-201',
    statement: 'Changed meaning',
  });
  assert.ok(findingCodes(validate(conflicting)).includes('CONFLICTING_REQUIREMENT_ID'));
});

test('resolves replacement requirement source and identity for superseded requirements', () => {
  const validReplacement = validGraph();
  validReplacement[0].requirements[0] = {
    ...validReplacement[0].requirements[0],
    status: 'superseded',
    replacement_ref: requirementRef('RF-202'),
  };
  assert.equal(validate(validReplacement).outcome, 'PASS');

  const missingSource = validGraph();
  missingSource[0].requirements[0] = {
    ...missingSource[0].requirements[0],
    status: 'superseded',
    replacement_ref: requirementRef('RF-202', ref('SPEC-MISSING')),
  };
  assert.ok(findingCodes(validate(missingSource)).includes('UNRESOLVED_REQUIREMENT_SOURCE'));

  const missingReplacement = validGraph();
  missingReplacement[0].requirements[0] = {
    ...missingReplacement[0].requirements[0],
    status: 'retired',
    replacement_ref: requirementRef('RF-999'),
  };
  assert.ok(findingCodes(validate(missingReplacement)).includes('UNKNOWN_REQUIREMENT_REFERENCE'));

  const invalidSource = validGraph();
  invalidSource[0].requirements[0] = {
    ...invalidSource[0].requirements[0],
    status: 'superseded',
    replacement_ref: requirementRef('RF-FAKE', ref('EVIDENCE-REQUIREMENTS')),
  };
  const external = externalReferences();
  external.push({
    ...ref('EVIDENCE-REQUIREMENTS'),
    kind: 'evidence',
    subject_ref: ref('CANDIDATE-001'),
    requirements: [{ id: 'RF-FAKE', statement: 'Not an authority-owned requirement' }],
  });
  assert.ok(findingCodes(validate(invalidSource, external)).includes('INVALID_REQUIREMENT_SOURCE'));
});

test('blocks split_required READY and rejects autonomous authority claims', () => {
  const splitReady = validGraph();
  splitReady[2].scope_fit = 'split_required';
  assert.ok(findingCodes(validate(splitReady)).includes('SPLIT_REQUIRED_BLOCKS_READY'));

  const forbiddenClaim = {
    ...validGraph()[2],
    provider_acceptance: 'ACCEPTED',
  };
  const result = parseSddArtifact(forbiddenClaim);
  assert.equal(result.outcome, 'FAIL');
  assert.ok(findingCodes(result).includes('FORBIDDEN_AUTHORITY_CLAIM'));
});

test('validates explicit competent-exception coverage without inventing a SPEC', () => {
  const exception = ref('EXCEPTION-001');
  const authority = ref('AUTH-DEVELOPER-001');
  const wpPlan = {
    ...base('WP_PLAN', 'WP-PLAN-EXCEPTION'),
    coverage: { kind: 'competent_exception', exception_ref: exception },
    requirement_refs: [requirementRef('RF-EX-1', exception)],
    relations: [],
  };
  const task = {
    ...base('TASK', 'TASK-EXCEPTION'),
    coverage: { kind: 'competent_exception', exception_ref: exception },
    requirement_refs: [requirementRef('RF-EX-1', exception)],
    assignment_authority_ref: authority,
    write_scope: ['src/mechanical.js'],
    acceptance_criteria: ['Bounded check passes'],
    relations: [{ relation: 'follows', target: ref('WP-PLAN-EXCEPTION') }],
  };
  const external = [
    { ...authority, kind: 'authority' },
    {
      ...exception,
      kind: 'competent_exception',
      authority_ref: authority,
      scope: 'scope:exception',
      rationale: 'Explicit bounded exception',
      requirements: [{ id: 'RF-EX-1', statement: 'Bounded requirement' }],
    },
  ];

  assert.equal(validate([wpPlan, task], external).outcome, 'PASS');

  delete external[1].rationale;
  assert.ok(findingCodes(validate([wpPlan, task], external)).includes('INVALID_COMPETENT_EXCEPTION'));
});

test('requires exact frozen Git candidate identity and consistent review evidence', () => {
  const missingTree = externalReferences();
  delete missingTree.find((entry) => entry.ref === 'CANDIDATE-001').tree;
  assert.ok(findingCodes(validate(validGraph(), missingTree)).includes('INVALID_FROZEN_CANDIDATE'));

  const mismatch = validGraph();
  mismatch[5].validation_evidence_refs = [ref('EVIDENCE-001')];
  const mismatchedEvidence = externalReferences();
  mismatchedEvidence.find((entry) => entry.ref === 'EVIDENCE-001').subject_ref = ref('TASK-001');
  assert.ok(findingCodes(validate(mismatch, mismatchedEvidence)).includes('REVIEW_EVIDENCE_SUBJECT_MISMATCH'));
});

test('accepts an explicit non-Git immutable candidate identity without provider inference', () => {
  const graph = validGraph();
  const external = externalReferences();
  const candidateIndex = external.findIndex((entry) => entry.ref === 'CANDIDATE-001');
  external[candidateIndex] = {
    ...ref('CANDIDATE-001'),
    kind: 'immutable_candidate',
    owner: 'portable-owner',
    identity: 'content-addressed:candidate:001',
  };

  assert.equal(validate(graph, external).outcome, 'PASS');
});

test('preserves conflicting RESULT observations as a failure instead of normalizing them', () => {
  const graph = validGraph();
  graph[4].observations.push({
    observation_id: 'OBS-001',
    outcome: 'FAIL',
    evidence_refs: [ref('EVIDENCE-001')],
  });

  assert.ok(findingCodes(validate(graph)).includes('CONFLICTING_RESULT_OBSERVATION'));
});

test('requires RESULT subject and evidence references to resolve', () => {
  const missingSubject = validGraph();
  missingSubject[4].subject_ref = ref('CANDIDATE-MISSING');
  assert.ok(findingCodes(validate(missingSubject)).includes('UNRESOLVED_RESULT_SUBJECT'));

  const missingEvidence = validGraph();
  missingEvidence[4].evidence_refs = [ref('EVIDENCE-MISSING')];
  assert.ok(findingCodes(validate(missingEvidence)).includes('UNRESOLVED_RESULT_EVIDENCE'));

  const missingObservationEvidence = validGraph();
  missingObservationEvidence[4].observations[0].evidence_refs = [ref('EVIDENCE-MISSING')];
  assert.ok(findingCodes(validate(missingObservationEvidence)).includes('UNRESOLVED_RESULT_EVIDENCE'));
});

test('requires RESULT evidence identity and subject correspondence', () => {
  const wrongSubjectKind = validGraph();
  wrongSubjectKind[4].subject_ref = ref('ASSESSMENT-001');
  assert.ok(findingCodes(validate(wrongSubjectKind)).includes('INVALID_RESULT_SUBJECT'));

  const wrongKind = validGraph();
  wrongKind[4].evidence_refs = [ref('ASSESSMENT-001')];
  assert.ok(findingCodes(validate(wrongKind)).includes('INVALID_RESULT_EVIDENCE'));

  const mismatchedTopLevel = externalReferences();
  mismatchedTopLevel.find((entry) => entry.ref === 'EVIDENCE-001').subject_ref = ref('TASK-001');
  assert.ok(findingCodes(validate(validGraph(), mismatchedTopLevel)).includes('RESULT_EVIDENCE_SUBJECT_MISMATCH'));

  const mismatchedObservation = validGraph();
  mismatchedObservation[4].observations[0].evidence_refs = [ref('EVIDENCE-002')];
  const external = externalReferences();
  external.push({
    ...ref('EVIDENCE-002'),
    kind: 'evidence',
    subject_ref: ref('TASK-001'),
  });
  assert.ok(
    findingCodes(validate(mismatchedObservation, external)).includes('RESULT_EVIDENCE_SUBJECT_MISMATCH'),
  );
});
