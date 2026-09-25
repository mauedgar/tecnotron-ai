'use strict';

const YAML = require('yaml');
const { z } = require('zod');

const CONTRACT_VERSION = 'tecnotron-sdd-artifacts/v1';
const ARTIFACT_KINDS = Object.freeze([
  'SPEC',
  'WP_PLAN',
  'TASK',
  'TASK_PLAN',
  'RESULT',
  'REVIEW',
]);
const VALIDATION_OUTCOMES = Object.freeze(['PASS', 'FAIL', 'NOT_RUN', 'UNAVAILABLE']);

const ALLOWED_RELATIONS = Object.freeze([
  Object.freeze({ from: 'WP_PLAN', relation: 'derives_from', to: 'SPEC' }),
  Object.freeze({ from: 'TASK', relation: 'assigns_from', to: 'SPEC' }),
  Object.freeze({ from: 'TASK', relation: 'follows', to: 'WP_PLAN' }),
  Object.freeze({ from: 'TASK_PLAN', relation: 'executes', to: 'TASK' }),
  Object.freeze({ from: 'RESULT', relation: 'records', to: 'TASK' }),
  Object.freeze({ from: 'REVIEW', relation: 'uses_evidence', to: 'RESULT' }),
]);

const NON_EMPTY_STRING = z.string().trim().min(1);
const REQUIREMENT_ID = z.string().regex(/^(?:RF|RNF)-\S+$/);
const IMMUTABLE_GIT_ID = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/i;

const Reference = z.object({
  ref: NON_EMPTY_STRING,
  revision: NON_EMPTY_STRING,
}).strict();

const RequirementReference = z.object({
  source: Reference,
  id: REQUIREMENT_ID,
}).strict();

const Requirement = z.object({
  id: REQUIREMENT_ID,
  statement: NON_EMPTY_STRING,
  status: z.enum(['active', 'superseded', 'retired']).optional(),
  replacement_ref: RequirementReference.optional(),
  disposition: NON_EMPTY_STRING.optional(),
}).strict().superRefine((value, context) => {
  if (['superseded', 'retired'].includes(value.status)
      && !value.replacement_ref
      && !value.disposition) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'superseded or retired requirements require explicit provenance',
    });
  }
});

const Relation = z.object({
  relation: NON_EMPTY_STRING,
  target: Reference,
}).strict();

const ApprovedSpecCoverage = z.object({
  kind: z.literal('approved_spec'),
  spec_ref: Reference,
}).strict();

const CompetentExceptionCoverage = z.object({
  kind: z.literal('competent_exception'),
  exception_ref: Reference,
}).strict();

const Coverage = z.discriminatedUnion('kind', [
  ApprovedSpecCoverage,
  CompetentExceptionCoverage,
]);

const StateDimensions = z.object({
  task_contract: NON_EMPTY_STRING.optional(),
  materialization: NON_EMPTY_STRING.optional(),
  implementation: NON_EMPTY_STRING.optional(),
  validation: NON_EMPTY_STRING.optional(),
  review: NON_EMPTY_STRING.optional(),
  review_handoff: NON_EMPTY_STRING.optional(),
  developer_acceptance: NON_EMPTY_STRING.optional(),
  integration: NON_EMPTY_STRING.optional(),
  publication: NON_EMPTY_STRING.optional(),
  closure: NON_EMPTY_STRING.optional(),
}).strict();

const Scope = z.union([
  NON_EMPTY_STRING,
  z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: 'scope object must not be empty',
  }),
]);

const CommonShape = {
  contract_version: z.literal(CONTRACT_VERSION),
  document_id: NON_EMPTY_STRING,
  artifact_kind: z.enum(ARTIFACT_KINDS),
  owner: NON_EMPTY_STRING,
  scope: Scope,
  revision: NON_EMPTY_STRING,
  authority_refs: z.array(Reference).min(1),
  scope_fit: z.enum(['FIT', 'split_required']).optional(),
  state_dimensions: StateDimensions.optional(),
};

const ArtifactSchemas = Object.freeze({
  SPEC: z.object({
    ...CommonShape,
    artifact_kind: z.literal('SPEC'),
    requirements: z.array(Requirement).min(1),
  }).strict(),
  WP_PLAN: z.object({
    ...CommonShape,
    artifact_kind: z.literal('WP_PLAN'),
    coverage: Coverage,
    requirement_refs: z.array(RequirementReference).min(1),
    relations: z.array(Relation),
  }).strict(),
  TASK: z.object({
    ...CommonShape,
    artifact_kind: z.literal('TASK'),
    coverage: Coverage,
    requirement_refs: z.array(RequirementReference).min(1),
    assignment_authority_ref: Reference,
    write_scope: z.array(NON_EMPTY_STRING).min(1),
    acceptance_criteria: z.array(NON_EMPTY_STRING).min(1),
    relations: z.array(Relation),
  }).strict(),
  TASK_PLAN: z.object({
    ...CommonShape,
    artifact_kind: z.literal('TASK_PLAN'),
    relations: z.array(Relation),
  }).strict(),
  RESULT: z.object({
    ...CommonShape,
    artifact_kind: z.literal('RESULT'),
    subject_ref: Reference,
    evidence_refs: z.array(Reference).min(1),
    observations: z.array(z.object({
      observation_id: NON_EMPTY_STRING,
      outcome: z.enum(VALIDATION_OUTCOMES),
      evidence_refs: z.array(Reference).min(1),
    }).strict()).min(1),
    relations: z.array(Relation),
  }).strict(),
  REVIEW: z.object({
    ...CommonShape,
    artifact_kind: z.literal('REVIEW'),
    candidate: z.object({ identity_ref: Reference }).strict(),
    validation_evidence_refs: z.array(Reference).min(1),
    assessment_ref: Reference,
    relations: z.array(Relation).optional(),
  }).strict(),
});

const FORBIDDEN_AUTHORITY_FIELDS = new Set([
  'acceptance',
  'approval',
  'authoritative_default',
  'auto_accept',
  'developer_acceptance',
  'inferred_authority',
  'integration_authority',
  'permission',
  'provider_acceptance',
  'provider_authority',
  'publication_authority',
]);

function finding(code, message, details = {}) {
  return { code, message, ...details };
}

function findingKey(entry) {
  return JSON.stringify([entry.code, entry.document_id, entry.path, entry.ref, entry.message]);
}

function deduplicateFindings(findings) {
  const seen = new Set();
  return findings.filter((entry) => {
    const key = findingKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractMetadata(source) {
  if (typeof source !== 'string') return source;

  let yamlSource = source;
  if (source.startsWith('---')) {
    const lines = source.split(/\r?\n/);
    const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
    if (closingIndex < 0) throw new Error('Markdown frontmatter is not terminated');
    yamlSource = lines.slice(1, closingIndex + 1).join('\n');
  }

  return YAML.parse(yamlSource);
}

function mapSchemaIssue(issue, documentId) {
  const path = issue.path?.join('.') || '';
  if (issue.code === 'invalid_type' && issue.input === undefined) {
    return finding('REQUIRED_METADATA_MISSING', `Required metadata is missing at ${path}`, {
      document_id: documentId,
      path,
    });
  }
  if (issue.code === 'unrecognized_keys') {
    const keys = issue.keys || [];
    const forbidden = keys.find((key) => FORBIDDEN_AUTHORITY_FIELDS.has(key));
    return finding(
      forbidden ? 'FORBIDDEN_AUTHORITY_CLAIM' : 'UNKNOWN_METADATA_FIELD',
      forbidden
        ? `Unsupported field ${forbidden} attempts an authority claim`
        : `Unknown metadata fields: ${keys.join(', ')}`,
      { document_id: documentId, path, keys },
    );
  }
  return finding('INVALID_METADATA', issue.message, {
    document_id: documentId,
    path,
  });
}

function parseSddArtifact(source) {
  let metadata;
  try {
    metadata = extractMetadata(source);
  } catch (error) {
    return {
      outcome: 'FAIL',
      findings: [finding('PARSE_ERROR', error.message)],
      artifact: null,
    };
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      outcome: 'FAIL',
      findings: [finding('INVALID_DOCUMENT', 'Artifact metadata must be a mapping')],
      artifact: null,
    };
  }

  const documentId = typeof metadata.document_id === 'string'
    ? metadata.document_id
    : undefined;

  if (!ARTIFACT_KINDS.includes(metadata.artifact_kind)) {
    return {
      outcome: 'FAIL',
      findings: [finding('UNKNOWN_ARTIFACT_KIND', 'artifact_kind is missing or unsupported', {
        document_id: documentId,
        path: 'artifact_kind',
      })],
      artifact: null,
    };
  }

  const schema = ArtifactSchemas[metadata.artifact_kind];
  const parsed = schema.safeParse(metadata);
  if (!parsed.success) {
    return {
      outcome: 'FAIL',
      findings: deduplicateFindings(parsed.error.issues.map((issue) => mapSchemaIssue(issue, documentId))),
      artifact: null,
    };
  }

  return { outcome: 'PASS', findings: [], artifact: parsed.data };
}

function referenceKey(reference) {
  return `${reference.ref}\u0000${reference.revision}`;
}

function sameReference(left, right) {
  return left && right && left.ref === right.ref && left.revision === right.revision;
}

function requirementKey(requirementReference) {
  return `${referenceKey(requirementReference.source)}\u0000${requirementReference.id}`;
}

function buildIndex(artifacts, externalReferences, findings) {
  const index = new Map();
  const add = (key, entry, source) => {
    const values = index.get(key) || [];
    values.push({ entry, source });
    index.set(key, values);
  };

  for (const artifact of artifacts) {
    add(referenceKey({ ref: artifact.document_id, revision: artifact.revision }), artifact, 'artifact');
  }

  for (const entry of externalReferences) {
    const parsed = Reference.safeParse({ ref: entry?.ref, revision: entry?.revision });
    if (!parsed.success) {
      findings.push(finding('INVALID_EXTERNAL_REFERENCE', 'External reference lacks ref or revision'));
      continue;
    }
    add(referenceKey(parsed.data), entry, 'external');
  }

  for (const [key, values] of index.entries()) {
    if (values.length > 1) {
      findings.push(finding('AMBIGUOUS_REFERENCE', 'Reference resolves to multiple supplied identities', {
        ref: key.replace('\u0000', '@'),
      }));
    }
  }

  return index;
}

function resolveReference(index, reference) {
  const values = index.get(referenceKey(reference)) || [];
  return values.length === 1 ? values[0] : null;
}

function relationRule(from, relation) {
  return ALLOWED_RELATIONS.find((candidate) => (
    candidate.from === from && candidate.relation === relation
  ));
}

function requireRelation(artifact, relation, targetKind, findings) {
  const matching = artifact.relations.filter((edge) => edge.relation === relation);
  if (matching.length !== 1) {
    findings.push(finding('REQUIRED_RELATION_MISSING', `${artifact.artifact_kind} requires one ${relation} relation`, {
      document_id: artifact.document_id,
      relation,
      target_kind: targetKind,
    }));
  }
  return matching[0] || null;
}

function validateAuthorityReferences(artifact, index, findings) {
  const revisionsByRef = new Map();
  for (const authorityRef of artifact.authority_refs) {
    const revisions = revisionsByRef.get(authorityRef.ref) || new Set();
    revisions.add(authorityRef.revision);
    revisionsByRef.set(authorityRef.ref, revisions);

    if (!resolveReference(index, authorityRef)) {
      findings.push(finding('UNRESOLVED_AUTHORITY_REFERENCE', 'Authority reference does not resolve exactly once', {
        document_id: artifact.document_id,
        ref: referenceKey(authorityRef),
      }));
    }
  }

  for (const [ref, revisions] of revisionsByRef.entries()) {
    if (revisions.size > 1) {
      findings.push(finding('AMBIGUOUS_AUTHORITY_REFERENCE', 'One authority is cited at conflicting revisions', {
        document_id: artifact.document_id,
        ref,
      }));
    }
  }

  if (artifact.assignment_authority_ref && !resolveReference(index, artifact.assignment_authority_ref)) {
    findings.push(finding('UNRESOLVED_AUTHORITY_REFERENCE', 'Assignment authority does not resolve exactly once', {
      document_id: artifact.document_id,
      ref: referenceKey(artifact.assignment_authority_ref),
    }));
  }
}

function validateRequirementInventory(artifact, findings) {
  if (artifact.artifact_kind !== 'SPEC') return;
  const inventory = new Map();
  for (const requirement of artifact.requirements) {
    const previous = inventory.get(requirement.id);
    if (previous) {
      findings.push(finding(
        previous.statement === requirement.statement
          ? 'DUPLICATE_REQUIREMENT_ID'
          : 'CONFLICTING_REQUIREMENT_ID',
        'Requirement identity is duplicated within its source',
        { document_id: artifact.document_id, requirement_id: requirement.id },
      ));
    }
    inventory.set(requirement.id, requirement);
  }
}

function sourceRequirements(resolved) {
  const requirements = resolved?.entry?.requirements;
  return Array.isArray(requirements) ? requirements : [];
}

function validateRequirementReferences(artifact, index, findings) {
  if (!artifact.requirement_refs) return;
  const seen = new Set();
  for (const requirementReference of artifact.requirement_refs) {
    const key = requirementKey(requirementReference);
    if (seen.has(key)) {
      findings.push(finding('DUPLICATE_REQUIREMENT_REFERENCE', 'Requirement reference is duplicated', {
        document_id: artifact.document_id,
        requirement_id: requirementReference.id,
      }));
      continue;
    }
    seen.add(key);

    const source = resolveReference(index, requirementReference.source);
    if (!source) {
      findings.push(finding('UNRESOLVED_REQUIREMENT_SOURCE', 'Requirement source does not resolve exactly once', {
        document_id: artifact.document_id,
        requirement_id: requirementReference.id,
        ref: referenceKey(requirementReference.source),
      }));
      continue;
    }
    if (!sourceRequirements(source).some(({ id }) => id === requirementReference.id)) {
      findings.push(finding('UNKNOWN_REQUIREMENT_REFERENCE', 'Requirement ID is absent from the declared source', {
        document_id: artifact.document_id,
        requirement_id: requirementReference.id,
      }));
    }
  }
}

function validateCoverage(artifact, index, findings) {
  if (!artifact.coverage) return;
  const coverageRef = artifact.coverage.kind === 'approved_spec'
    ? artifact.coverage.spec_ref
    : artifact.coverage.exception_ref;
  const resolved = resolveReference(index, coverageRef);

  if (!resolved) {
    findings.push(finding('UNRESOLVED_COVERAGE_REFERENCE', 'Coverage reference does not resolve exactly once', {
      document_id: artifact.document_id,
      ref: referenceKey(coverageRef),
    }));
    return;
  }

  if (artifact.coverage.kind === 'approved_spec') {
    if (resolved.entry.artifact_kind !== 'SPEC') {
      findings.push(finding('INVALID_COVERAGE_SOURCE', 'approved_spec must resolve to a SPEC artifact', {
        document_id: artifact.document_id,
      }));
    }
    return;
  }

  const exception = resolved.entry;
  const validException = exception.kind === 'competent_exception'
    && Reference.safeParse(exception.authority_ref).success
    && Scope.safeParse(exception.scope).success
    && NON_EMPTY_STRING.safeParse(exception.rationale).success
    && z.array(Requirement).min(1).safeParse(exception.requirements).success;
  if (!validException) {
    findings.push(finding('INVALID_COMPETENT_EXCEPTION', 'Exception requires authority_ref, scope, rationale and requirements', {
      document_id: artifact.document_id,
      ref: referenceKey(coverageRef),
    }));
    return;
  }
  if (!resolveReference(index, exception.authority_ref)) {
    findings.push(finding('UNRESOLVED_AUTHORITY_REFERENCE', 'Exception authority does not resolve exactly once', {
      document_id: artifact.document_id,
      ref: referenceKey(exception.authority_ref),
    }));
  }
}

function validateRelations(artifact, index, findings) {
  const relations = artifact.relations || [];
  for (const edge of relations) {
    const rule = relationRule(artifact.artifact_kind, edge.relation);
    if (!rule) {
      findings.push(finding('UNSUPPORTED_RELATION', 'Relation is not allowed for this artifact kind', {
        document_id: artifact.document_id,
        relation: edge.relation,
      }));
      continue;
    }
    const target = resolveReference(index, edge.target);
    if (!target) {
      findings.push(finding('UNRESOLVED_REFERENCE', 'Relation target does not resolve exactly once', {
        document_id: artifact.document_id,
        relation: edge.relation,
        ref: referenceKey(edge.target),
      }));
      continue;
    }
    if (target.entry.artifact_kind !== rule.to) {
      findings.push(finding('RELATION_TARGET_KIND_MISMATCH', 'Relation target has the wrong artifact kind', {
        document_id: artifact.document_id,
        relation: edge.relation,
        expected_kind: rule.to,
      }));
    }
  }

  if (artifact.artifact_kind === 'WP_PLAN') {
    if (artifact.coverage.kind === 'approved_spec') {
      const edge = requireRelation(artifact, 'derives_from', 'SPEC', findings);
      if (edge && !sameReference(edge.target, artifact.coverage.spec_ref)) {
        findings.push(finding('COVERAGE_RELATION_MISMATCH', 'derives_from must target the approved SPEC identity', {
          document_id: artifact.document_id,
        }));
      }
    } else if (relations.some(({ relation }) => relation === 'derives_from')) {
      findings.push(finding('UNSUPPORTED_RELATION', 'Exception coverage must not fabricate a SPEC edge', {
        document_id: artifact.document_id,
        relation: 'derives_from',
      }));
    }
  }

  if (artifact.artifact_kind === 'TASK') {
    requireRelation(artifact, 'follows', 'WP_PLAN', findings);
    if (artifact.coverage.kind === 'approved_spec') {
      const edge = requireRelation(artifact, 'assigns_from', 'SPEC', findings);
      if (edge && !sameReference(edge.target, artifact.coverage.spec_ref)) {
        findings.push(finding('COVERAGE_RELATION_MISMATCH', 'assigns_from must target the approved SPEC identity', {
          document_id: artifact.document_id,
        }));
      }
    } else if (relations.some(({ relation }) => relation === 'assigns_from')) {
      findings.push(finding('UNSUPPORTED_RELATION', 'Exception coverage must not fabricate a SPEC edge', {
        document_id: artifact.document_id,
        relation: 'assigns_from',
      }));
    }
  }

  if (artifact.artifact_kind === 'TASK_PLAN') requireRelation(artifact, 'executes', 'TASK', findings);
  if (artifact.artifact_kind === 'RESULT') requireRelation(artifact, 'records', 'TASK', findings);
}

function validateTaskContainment(artifact, index, findings) {
  if (artifact.artifact_kind !== 'TASK') return;
  const follows = artifact.relations.find(({ relation }) => relation === 'follows');
  const plan = follows ? resolveReference(index, follows.target)?.entry : null;
  if (!plan || plan.artifact_kind !== 'WP_PLAN') return;

  const taskCoverageRef = artifact.coverage.kind === 'approved_spec'
    ? artifact.coverage.spec_ref
    : artifact.coverage.exception_ref;
  const planCoverageRef = plan.coverage.kind === 'approved_spec'
    ? plan.coverage.spec_ref
    : plan.coverage.exception_ref;
  if (artifact.coverage.kind !== plan.coverage.kind || !sameReference(taskCoverageRef, planCoverageRef)) {
    findings.push(finding('TASK_PLAN_COVERAGE_MISMATCH', 'TASK coverage must agree with its WP PLAN', {
      document_id: artifact.document_id,
    }));
  }

  const planRequirements = new Set(plan.requirement_refs.map(requirementKey));
  for (const requirementReference of artifact.requirement_refs) {
    if (!planRequirements.has(requirementKey(requirementReference))) {
      findings.push(finding('TASK_REQUIREMENT_OUTSIDE_PLAN', 'TASK requirement is not covered by its WP PLAN', {
        document_id: artifact.document_id,
        requirement_id: requirementReference.id,
      }));
    }
  }
}

function validateScopeState(artifact, findings) {
  if (artifact.scope_fit === 'split_required'
      && artifact.state_dimensions?.task_contract === 'READY') {
    findings.push(finding('SPLIT_REQUIRED_BLOCKS_READY', 'split_required is incompatible with READY', {
      document_id: artifact.document_id,
    }));
  }
}

function validateResult(artifact, findings) {
  if (artifact.artifact_kind !== 'RESULT') return;
  const observations = new Map();
  for (const observation of artifact.observations) {
    const previous = observations.get(observation.observation_id);
    if (previous && previous !== observation.outcome) {
      findings.push(finding('CONFLICTING_RESULT_OBSERVATION', 'One observation identity cannot be relabeled', {
        document_id: artifact.document_id,
        observation_id: observation.observation_id,
      }));
    }
    observations.set(observation.observation_id, observation.outcome);
  }
}

function validateReview(artifact, index, findings) {
  if (artifact.artifact_kind !== 'REVIEW') return;
  const candidate = resolveReference(index, artifact.candidate.identity_ref)?.entry;
  const validGitCandidate = candidate?.kind === 'git_candidate'
    && NON_EMPTY_STRING.safeParse(candidate.repository).success
    && IMMUTABLE_GIT_ID.test(candidate.commit || '')
    && IMMUTABLE_GIT_ID.test(candidate.tree || '')
    && Array.isArray(candidate.parents)
    && candidate.parents.length > 0
    && candidate.parents.every((parent) => IMMUTABLE_GIT_ID.test(parent));
  const validPortableCandidate = candidate?.kind === 'immutable_candidate'
    && NON_EMPTY_STRING.safeParse(candidate.owner).success
    && NON_EMPTY_STRING.safeParse(candidate.identity).success;
  if (!validGitCandidate && !validPortableCandidate) {
    findings.push(finding('INVALID_FROZEN_CANDIDATE', 'REVIEW requires a complete immutable candidate identity', {
      document_id: artifact.document_id,
      ref: referenceKey(artifact.candidate.identity_ref),
    }));
  }

  for (const evidenceRef of artifact.validation_evidence_refs) {
    const evidence = resolveReference(index, evidenceRef)?.entry;
    if (!evidence) {
      findings.push(finding('UNRESOLVED_REFERENCE', 'Review evidence does not resolve exactly once', {
        document_id: artifact.document_id,
        ref: referenceKey(evidenceRef),
      }));
      continue;
    }
    if (!sameReference(evidence.subject_ref, artifact.candidate.identity_ref)) {
      findings.push(finding('REVIEW_EVIDENCE_SUBJECT_MISMATCH', 'Review evidence subject must match the frozen candidate', {
        document_id: artifact.document_id,
        ref: referenceKey(evidenceRef),
      }));
    }
  }

  if (!resolveReference(index, artifact.assessment_ref)) {
    findings.push(finding('UNRESOLVED_REFERENCE', 'Assessment reference does not resolve exactly once', {
      document_id: artifact.document_id,
      ref: referenceKey(artifact.assessment_ref),
    }));
  }
}

function validateSddArtifactSet(sources, options = {}) {
  if (!Array.isArray(sources)) {
    return {
      outcome: 'FAIL',
      artifacts: [],
      findings: [finding('INVALID_INPUT', 'Artifact set must be an array')],
      limitations: [],
    };
  }

  const findings = [];
  const artifacts = [];
  for (const source of sources) {
    const parsed = parseSddArtifact(source);
    findings.push(...parsed.findings);
    if (parsed.artifact) artifacts.push(parsed.artifact);
  }

  const externalReferences = Array.isArray(options.external_references)
    ? options.external_references
    : [];
  const index = buildIndex(artifacts, externalReferences, findings);

  for (const artifact of artifacts) {
    validateAuthorityReferences(artifact, index, findings);
    validateRequirementInventory(artifact, findings);
    validateRequirementReferences(artifact, index, findings);
    validateCoverage(artifact, index, findings);
    validateRelations(artifact, index, findings);
    validateTaskContainment(artifact, index, findings);
    validateScopeState(artifact, findings);
    validateResult(artifact, findings);
    validateReview(artifact, index, findings);
  }

  const finalFindings = deduplicateFindings(findings);
  return {
    outcome: finalFindings.length === 0 ? 'PASS' : 'FAIL',
    artifacts,
    findings: finalFindings,
    limitations: [
      'SEMANTIC_SUFFICIENCY_NOT_DETERMINED',
      'REAL_WORLD_OWNER_COMPETENCE_NOT_DETERMINED',
      'DEVELOPER_ACCEPTANCE_NOT_DETERMINED',
      'TRUTHFULNESS_OF_OBSERVED_EVIDENCE_NOT_DETERMINED',
    ],
  };
}

module.exports = {
  CONTRACT_VERSION,
  ARTIFACT_KINDS,
  ALLOWED_RELATIONS,
  Reference,
  RequirementReference,
  ArtifactSchemas,
  parseSddArtifact,
  validateSddArtifactSet,
};
