'use strict';

const crypto = require('node:crypto');

const TASKCYCLE_FIELDS = Object.freeze([
  'candidate_identity',
  'terminal_results',
  'independent_review',
  'developer_acceptance',
  'canonical_integration',
  'remote_publication',
  'canonical_state_delta',
]);

const MILESTONE_FIELDS = Object.freeze([
  'planned_responsibilities',
  'completed_responsibilities',
  'deferred_or_cancelled_responsibilities',
  'open_findings',
  'accepted_architectural_changes',
  'actual_repository_state',
]);

const TASKCYCLE_EVIDENCE_SPECS = Object.freeze({
  candidate_identity: { kind: 'CANDIDATE_IDENTITY' },
  terminal_results: { kind: 'TERMINAL_RESULTS' },
  independent_review: { kind: 'INDEPENDENT_REVIEW_RESULT', authority_kinds: ['INDEPENDENT_REVIEW'] },
  developer_acceptance: { kind: 'DEVELOPER_ACCEPTANCE', authority_kinds: ['DEVELOPER'] },
  canonical_integration: { kind: 'CANONICAL_INTEGRATION', authority_kinds: ['EFFECT_AUTHORITY'] },
  remote_publication: { kind: 'REMOTE_PUBLICATION', authority_kinds: ['EFFECT_AUTHORITY'] },
  canonical_state_delta: { kind: 'CANONICAL_STATE_DELTA' },
});

const MILESTONE_EVIDENCE_SPECS = Object.freeze({
  planned_responsibilities: { kind: 'PLANNED_RESPONSIBILITIES' },
  completed_responsibilities: { kind: 'COMPLETED_RESPONSIBILITIES' },
  deferred_or_cancelled_responsibilities: {
    kind: 'DEFERRED_OR_CANCELLED_RESPONSIBILITIES',
    authority_kinds: ['DEVELOPER'],
    authority_refs_from_observed: true,
  },
  open_findings: { kind: 'OPEN_FINDINGS' },
  accepted_architectural_changes: {
    kind: 'ACCEPTED_ARCHITECTURAL_CHANGES',
    authority_kinds: ['DEVELOPER'],
    authority_refs_from_observed: true,
  },
  actual_repository_state: { kind: 'ACTUAL_REPOSITORY_STATE' },
});

class ReconciliationContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReconciliationContractError';
    this.code = 'INVALID_RECONCILIATION_REQUEST';
  }
}

function fail(message) {
  throw new ReconciliationContractError(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isObject(value)) fail(`${label} must be an object`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
}

function requireInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} must be a non-negative integer`);
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(requireObject(value, label)).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} must contain exactly: ${wanted.join(', ')}`);
  }
  return value;
}

function exactKeysWithOptionalEvidence(value, required, label) {
  const actual = Object.keys(requireObject(value, label)).sort();
  const withoutEvidence = [...required].sort();
  const withEvidence = [...required, 'evidence'].sort();
  const matches = wanted => actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  if (!matches(withoutEvidence) && !matches(withEvidence)) {
    fail(`${label} must contain exactly: ${withoutEvidence.join(', ')}; optionally with evidence`);
  }
  return value;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) fail(`${label} must be one of: ${allowed.join(', ')}`);
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
  );
}

function stableStringify(value, space = 2) {
  return JSON.stringify(canonicalize(value), null, space);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableSort(values) {
  return [...values].sort((left, right) => compareText(
    stableStringify(left, 0),
    stableStringify(right, 0),
  ));
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values)) fail(`${label} must be an array`);
  const result = values.map((value, index) => requireString(value, `${label}[${index}]`));
  if (new Set(result).size !== result.length) fail(`${label} must not contain duplicates`);
  return result;
}

function normalizeGitOid(value, label) {
  const oid = requireString(value, label).toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(oid)) fail(`${label} must be a 40-character Git object id`);
  return oid;
}

function normalizeSha256(value, label) {
  const digest = requireString(value, label).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) fail(`${label} must be a SHA-256 digest`);
  return digest;
}

function normalizeRelativePath(value, label) {
  const normalized = requireString(value, label).replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized) ||
    segments.some(segment => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    fail(`${label} must be a normalized repository-relative path`);
  }
  return normalized;
}

function normalizeCandidateIdentity(value) {
  exactKeys(value, ['commit', 'tree', 'parent', 'changed_paths'], 'candidate identity');
  return {
    commit: normalizeGitOid(value.commit, 'candidate commit'),
    tree: normalizeGitOid(value.tree, 'candidate tree'),
    parent: normalizeGitOid(value.parent, 'candidate parent'),
    changed_paths: uniqueStrings(
      value.changed_paths.map((item, index) => normalizeRelativePath(item, `changed_paths[${index}]`)),
      'changed_paths',
    ).sort(),
  };
}

function normalizeTerminalResults(value) {
  if (!Array.isArray(value) || value.length === 0) fail('terminal results must be a non-empty array');
  const normalized = value.map((item, index) => {
    exactKeys(item, ['reference', 'subject_id', 'status'], `terminal_results[${index}]`);
    return {
      reference: requireString(item.reference, `terminal_results[${index}].reference`),
      subject_id: requireString(item.subject_id, `terminal_results[${index}].subject_id`),
      status: oneOf(
        item.status,
        ['PASS', 'FAIL', 'FAILED', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN', 'CANCELLED'],
        `terminal_results[${index}].status`,
      ),
    };
  });
  const identities = normalized.map(item => `${item.subject_id}\u0000${item.reference}`);
  if (new Set(identities).size !== identities.length) fail('terminal results must not contain duplicate identities');
  return stableSort(normalized);
}

function normalizeReferenceDisposition(value, label, allowed) {
  exactKeys(value, ['reference', 'disposition'], label);
  return {
    reference: requireString(value.reference, `${label}.reference`),
    disposition: oneOf(value.disposition, allowed, `${label}.disposition`),
  };
}

function normalizeReferenceStatus(value, label, allowed) {
  exactKeys(value, ['reference', 'status'], label);
  return {
    reference: requireString(value.reference, `${label}.reference`),
    status: oneOf(value.status, allowed, `${label}.status`),
  };
}

function normalizeStatePoint(value, label) {
  exactKeys(value, ['reference', 'revision', 'sha256'], label);
  return {
    reference: requireString(value.reference, `${label}.reference`),
    revision: requireInteger(value.revision, `${label}.revision`),
    sha256: normalizeSha256(value.sha256, `${label}.sha256`),
  };
}

function normalizeCanonicalStateDelta(value) {
  exactKeys(value, ['from', 'to', 'changed_aggregates'], 'canonical state delta');
  const from = normalizeStatePoint(value.from, 'canonical state delta from');
  const to = normalizeStatePoint(value.to, 'canonical state delta to');
  if (to.revision < from.revision) fail('canonical state delta revision must not move backwards');
  if (!Array.isArray(value.changed_aggregates)) fail('changed_aggregates must be an array');
  const changed = value.changed_aggregates.map((item, index) => {
    exactKeys(item, ['kind', 'id', 'before_revision', 'after_revision'], `changed_aggregates[${index}]`);
    return {
      kind: requireString(item.kind, `changed_aggregates[${index}].kind`),
      id: requireString(item.id, `changed_aggregates[${index}].id`),
      before_revision: requireInteger(item.before_revision, `changed_aggregates[${index}].before_revision`),
      after_revision: requireInteger(item.after_revision, `changed_aggregates[${index}].after_revision`),
    };
  });
  const identities = changed.map(item => `${item.kind}\u0000${item.id}`);
  if (new Set(identities).size !== identities.length) fail('changed_aggregates must not contain duplicates');
  return { from, to, changed_aggregates: stableSort(changed) };
}

const TASKCYCLE_NORMALIZERS = Object.freeze({
  candidate_identity: normalizeCandidateIdentity,
  terminal_results: normalizeTerminalResults,
  independent_review: value => normalizeReferenceDisposition(
    value,
    'independent review',
    ['PASS', 'FAIL', 'FAILED', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN'],
  ),
  developer_acceptance: value => normalizeReferenceDisposition(
    value,
    'Developer acceptance',
    ['ACCEPTED', 'REJECTED', 'DEFERRED', 'BLOCKED', 'UNAVAILABLE', 'UNKNOWN'],
  ),
  canonical_integration: value => normalizeReferenceStatus(
    value,
    'canonical integration',
    ['INTEGRATED', 'NOT_INTEGRATED', 'BLOCKED', 'FAILED', 'UNAVAILABLE', 'UNKNOWN'],
  ),
  remote_publication: value => normalizeReferenceStatus(
    value,
    'remote publication',
    ['PUBLISHED', 'NOT_PUBLISHED', 'BLOCKED', 'FAILED', 'UNAVAILABLE', 'UNKNOWN'],
  ),
  canonical_state_delta: normalizeCanonicalStateDelta,
});

function normalizeRecordList(value, label, keys, normalizeRecord) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  const normalized = value.map((item, index) => {
    exactKeys(item, keys, `${label}[${index}]`);
    return normalizeRecord(item, index);
  });
  const ids = normalized.map(item => item.id);
  if (new Set(ids).size !== ids.length) fail(`${label} must not contain duplicate ids`);
  return normalized.sort((left, right) => compareText(left.id, right.id));
}

const MILESTONE_NORMALIZERS = Object.freeze({
  planned_responsibilities: value => normalizeRecordList(
    value,
    'planned responsibilities',
    ['id', 'description'],
    (item, index) => ({
      id: requireString(item.id, `planned responsibilities[${index}].id`),
      description: requireString(item.description, `planned responsibilities[${index}].description`),
    }),
  ),
  completed_responsibilities: value => normalizeRecordList(
    value,
    'completed responsibilities',
    ['id', 'result_ref'],
    (item, index) => ({
      id: requireString(item.id, `completed responsibilities[${index}].id`),
      result_ref: requireString(item.result_ref, `completed responsibilities[${index}].result_ref`),
    }),
  ),
  deferred_or_cancelled_responsibilities: value => normalizeRecordList(
    value,
    'deferred or cancelled responsibilities',
    ['id', 'disposition', 'authority_ref'],
    (item, index) => ({
      id: requireString(item.id, `deferred or cancelled responsibilities[${index}].id`),
      disposition: oneOf(
        item.disposition,
        ['DEFERRED', 'CANCELLED'],
        `deferred or cancelled responsibilities[${index}].disposition`,
      ),
      authority_ref: requireString(
        item.authority_ref,
        `deferred or cancelled responsibilities[${index}].authority_ref`,
      ),
    }),
  ),
  open_findings: value => normalizeRecordList(
    value,
    'open findings',
    ['id', 'summary', 'evidence_ref'],
    (item, index) => ({
      id: requireString(item.id, `open findings[${index}].id`),
      summary: requireString(item.summary, `open findings[${index}].summary`),
      evidence_ref: requireString(item.evidence_ref, `open findings[${index}].evidence_ref`),
    }),
  ),
  accepted_architectural_changes: value => normalizeRecordList(
    value,
    'accepted architectural changes',
    ['id', 'decision_ref', 'authority_ref'],
    (item, index) => ({
      id: requireString(item.id, `accepted architectural changes[${index}].id`),
      decision_ref: requireString(item.decision_ref, `accepted architectural changes[${index}].decision_ref`),
      authority_ref: requireString(item.authority_ref, `accepted architectural changes[${index}].authority_ref`),
    }),
  ),
  actual_repository_state: value => {
    exactKeys(value, ['branch', 'commit', 'tree', 'clean'], 'actual repository state');
    if (typeof value.clean !== 'boolean') fail('actual repository state clean must be boolean');
    return {
      branch: requireString(value.branch, 'actual repository state branch'),
      commit: normalizeGitOid(value.commit, 'actual repository state commit'),
      tree: normalizeGitOid(value.tree, 'actual repository state tree'),
      clean: value.clean,
    };
  },
});

function validateObservationEnvelope(value, label) {
  exactKeys(value, ['source_ref', 'observed'], label);
  return requireString(value.source_ref, `${label}.source_ref`);
}

function buildEvidenceRegistry(evidence) {
  if (evidence === undefined) return new Map();
  if (!Array.isArray(evidence)) fail('evidence must be an array');
  const registry = new Map();
  for (const record of evidence) {
    if (!isObject(record) || typeof record.ref !== 'string' || record.ref.length === 0) continue;
    const records = registry.get(record.ref) || [];
    records.push(record);
    registry.set(record.ref, records);
  }
  return registry;
}

function evidenceDiagnostic(code, sourceRef, message) {
  return { code, source_ref: sourceRef, message };
}

function authorityReferences(field, observed, spec) {
  if (field === 'developer_acceptance') return [observed.reference];
  if (!spec.authority_refs_from_observed) return [];
  return [...new Set(observed.map(item => item.authority_ref))].sort();
}

function verifyReferencedEvidence({ sourceRef, observed, normalize, field, spec, subjectKind, subjectId, registry }) {
  const records = registry.get(sourceRef) || [];
  if (records.length === 0) {
    return { ok: false, diagnostic: evidenceDiagnostic(
      'MISSING_REFERENCED_EVIDENCE', sourceRef, `no evidence artifact resolves ${sourceRef}`,
    ) };
  }
  if (records.length !== 1) {
    return { ok: false, diagnostic: evidenceDiagnostic(
      'AMBIGUOUS_REFERENCED_EVIDENCE', sourceRef, `multiple evidence artifacts resolve ${sourceRef}`,
    ) };
  }

  try {
    const record = exactKeys(records[0], ['ref', 'sha256', 'artifact_json'], `evidence ${sourceRef}`);
    requireString(record.ref, `evidence ${sourceRef}.ref`);
    const expectedDigest = normalizeSha256(record.sha256, `evidence ${sourceRef}.sha256`);
    const artifactJson = requireString(record.artifact_json, `evidence ${sourceRef}.artifact_json`);
    const actualDigest = crypto.createHash('sha256').update(artifactJson).digest('hex');
    if (actualDigest !== expectedDigest) {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'EVIDENCE_IDENTITY_MISMATCH', sourceRef, `SHA-256 mismatch for ${sourceRef}`,
      ) };
    }

    let artifact;
    try {
      artifact = JSON.parse(artifactJson);
    } catch {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'MALFORMED_REFERENCED_EVIDENCE', sourceRef, `artifact_json for ${sourceRef} is not valid JSON`,
      ) };
    }
    exactKeys(artifact, ['schema_version', 'kind', 'subject', 'observed', 'verification'], `artifact ${sourceRef}`);
    if (artifact.schema_version !== 'tecnotron-reconciliation-evidence/v0') {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'EVIDENCE_SCHEMA_MISMATCH', sourceRef, `unsupported evidence schema for ${sourceRef}`,
      ) };
    }
    if (artifact.kind !== spec.kind) {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'EVIDENCE_KIND_MISMATCH', sourceRef, `evidence kind for ${sourceRef} does not match ${field}`,
      ) };
    }

    exactKeys(artifact.subject, ['kind', 'id', 'field'], `artifact ${sourceRef}.subject`);
    if (
      artifact.subject.kind !== subjectKind ||
      artifact.subject.id !== subjectId ||
      artifact.subject.field !== field
    ) {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'EVIDENCE_CORRESPONDENCE_MISMATCH', sourceRef, `evidence subject for ${sourceRef} does not match the claim`,
      ) };
    }
    const artifactObserved = normalize(artifact.observed);
    if (stableStringify(artifactObserved, 0) !== stableStringify(observed, 0)) {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'EVIDENCE_CORRESPONDENCE_MISMATCH', sourceRef, `evidence value for ${sourceRef} does not match the claim`,
      ) };
    }

    exactKeys(
      artifact.verification,
      ['status', 'verification_ref', 'verifier_ref', 'authority_competence'],
      `artifact ${sourceRef}.verification`,
    );
    if (artifact.verification.status !== 'VERIFIED') {
      return { ok: false, diagnostic: evidenceDiagnostic(
        'EVIDENCE_NOT_VERIFIED', sourceRef, `evidence ${sourceRef} is not verified`,
      ) };
    }
    requireString(artifact.verification.verification_ref, `artifact ${sourceRef}.verification_ref`);
    requireString(artifact.verification.verifier_ref, `artifact ${sourceRef}.verifier_ref`);

    const competence = artifact.verification.authority_competence;
    if (spec.authority_kinds) {
      exactKeys(competence, ['status', 'kind', 'authority_ref', 'basis_ref'], `artifact ${sourceRef}.authority_competence`);
      if (competence.status !== 'ESTABLISHED' || !spec.authority_kinds.includes(competence.kind)) {
        return { ok: false, diagnostic: evidenceDiagnostic(
          'AUTHORITY_COMPETENCE_UNESTABLISHED', sourceRef, `authority competence for ${sourceRef} is not established`,
        ) };
      }
      requireString(competence.authority_ref, `artifact ${sourceRef}.authority_competence.authority_ref`);
      requireString(competence.basis_ref, `artifact ${sourceRef}.authority_competence.basis_ref`);
      const claimedAuthorityRefs = authorityReferences(field, observed, spec);
      if (claimedAuthorityRefs.some(ref => ref !== competence.authority_ref)) {
        return { ok: false, diagnostic: evidenceDiagnostic(
          'AUTHORITY_COMPETENCE_MISMATCH', sourceRef, `authority competence for ${sourceRef} does not match the claim`,
        ) };
      }
    } else if (competence !== null) {
      exactKeys(competence, ['status', 'kind', 'authority_ref', 'basis_ref'], `artifact ${sourceRef}.authority_competence`);
    }

    return {
      ok: true,
      evidence: {
        ref: sourceRef,
        sha256: actualDigest,
        kind: artifact.kind,
        verification_ref: artifact.verification.verification_ref,
        verifier_ref: artifact.verification.verifier_ref,
      },
    };
  } catch (error) {
    return { ok: false, diagnostic: evidenceDiagnostic(
      'MALFORMED_REFERENCED_EVIDENCE',
      sourceRef,
      error instanceof Error ? error.message : String(error),
    ) };
  }
}

function unresolvedClassification(reason, details = {}) {
  return {
    status: 'UNRESOLVED',
    reason,
    ...details,
  };
}

function resolveObservations(entries, normalize, field, evidenceContext) {
  if (entries === undefined || (Array.isArray(entries) && entries.length === 0)) {
    return {
      fact: null,
      classification: unresolvedClassification('MISSING_EVIDENCE', { source_refs: [] }),
    };
  }
  if (!Array.isArray(entries)) {
    return {
      fact: null,
      classification: unresolvedClassification('AMBIGUOUS_EVIDENCE', {
        source_refs: [],
        diagnostics: [`${field} observations must be an array`],
      }),
    };
  }

  const valid = [];
  const diagnostics = [];
  for (const [index, entry] of entries.entries()) {
    try {
      const sourceRef = validateObservationEnvelope(entry, `${field}[${index}]`);
      valid.push({ source_ref: sourceRef, observed: normalize(entry.observed) });
    } catch (error) {
      diagnostics.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (diagnostics.length > 0) {
    return {
      fact: null,
      classification: unresolvedClassification('AMBIGUOUS_EVIDENCE', {
        source_refs: stableSort(valid.map(item => item.source_ref)),
        diagnostics,
      }),
    };
  }

  const verified = [];
  const evidenceDiagnostics = [];
  for (const item of valid) {
    const verification = verifyReferencedEvidence({
      sourceRef: item.source_ref,
      observed: item.observed,
      normalize,
      field,
      ...evidenceContext,
    });
    if (verification.ok) verified.push({ ...item, evidence: verification.evidence });
    else evidenceDiagnostics.push(verification.diagnostic);
  }
  if (evidenceDiagnostics.length > 0) {
    return {
      fact: null,
      classification: unresolvedClassification('UNVERIFIED_EVIDENCE', {
        source_refs: stableSort(valid.map(item => item.source_ref)),
        diagnostics: stableSort(evidenceDiagnostics),
      }),
    };
  }

  const groups = new Map();
  for (const item of verified) {
    const key = stableStringify(item.observed, 0);
    const group = groups.get(key) || { value: item.observed, source_refs: [], verified_evidence: [] };
    group.source_refs.push(item.source_ref);
    group.verified_evidence.push(item.evidence);
    groups.set(key, group);
  }

  if (groups.size !== 1) {
    const alternatives = stableSort([...groups.values()].map(group => ({
      source_refs: [...new Set(group.source_refs)].sort(),
      observed: group.value,
      verified_evidence: stableSort(group.verified_evidence),
    })));
    return {
      fact: null,
      classification: unresolvedClassification('CONTRADICTORY_EVIDENCE', { alternatives }),
    };
  }

  const [resolved] = groups.values();
  return {
    fact: resolved.value,
    classification: {
      status: 'RESOLVED',
      reason: 'COINCIDENT_VERIFIED_EVIDENCE',
      source_refs: [...new Set(resolved.source_refs)].sort(),
      verified_evidence: stableSort(resolved.verified_evidence),
    },
  };
}

function validateTaskCycle(taskcycle) {
  requireObject(taskcycle, 'taskcycle');
  if (taskcycle.kind !== 'TaskCycle') fail('taskcycle kind must be TaskCycle');
  requireString(taskcycle.id, 'taskcycle.id');
  requireString(taskcycle.state, 'taskcycle.state');
  if (!Array.isArray(taskcycle.obligations)) fail('taskcycle.obligations must be an array');
  const obligations = taskcycle.obligations.map((item, index) => {
    exactKeys(item, ['id', 'status', 'authority_ref'], `taskcycle.obligations[${index}]`);
    if (item.authority_ref !== null) requireString(item.authority_ref, `taskcycle.obligations[${index}].authority_ref`);
    return {
      id: requireString(item.id, `taskcycle.obligations[${index}].id`),
      status: oneOf(item.status, ['PENDING', 'SATISFIED'], `taskcycle.obligations[${index}].status`),
      authority_ref: item.authority_ref,
    };
  });
  const ids = obligations.map(item => item.id);
  if (new Set(ids).size !== ids.length) fail('taskcycle.obligations must not contain duplicate ids');
  return {
    id: taskcycle.id,
    revision: Number.isSafeInteger(taskcycle.revision) ? taskcycle.revision : null,
    state: taskcycle.state,
    obligations,
  };
}

function validateMilestone(milestone) {
  requireObject(milestone, 'milestone');
  return {
    id: requireString(milestone.id, 'milestone.id'),
    title: requireString(milestone.title, 'milestone.title'),
    state: requireString(milestone.state, 'milestone.state'),
  };
}

function validateObservationKeys(observations, allowed, label) {
  requireObject(observations, label);
  const unexpected = Object.keys(observations).filter(key => !allowed.includes(key));
  if (unexpected.length > 0) fail(`${label} contains unsupported fields: ${unexpected.sort().join(', ')}`);
}

function materializeResolution({ fields, observations, normalizers, evidence, evidenceSpecs, subjectKind, subjectId }) {
  const observedFacts = {};
  const classifications = {};
  const unresolved = [];

  for (const field of fields) {
    const resolution = resolveObservations(observations[field], normalizers[field], field, {
      registry: evidence,
      spec: evidenceSpecs[field],
      subjectKind,
      subjectId,
    });
    observedFacts[field] = resolution.fact;
    classifications[field] = resolution.classification;
    if (resolution.classification.status === 'UNRESOLVED') {
      unresolved.push({ field, ...resolution.classification });
    }
  }

  return { observedFacts, classifications, unresolved };
}

function reconcilePostTaskCycle(request) {
  exactKeysWithOptionalEvidence(request, ['taskcycle', 'observations'], 'post-TaskCycle request');
  const subject = validateTaskCycle(request.taskcycle);
  validateObservationKeys(request.observations, TASKCYCLE_FIELDS, 'post-TaskCycle observations');
  const evidence = buildEvidenceRegistry(request.evidence);
  const resolution = materializeResolution({
    fields: TASKCYCLE_FIELDS,
    observations: request.observations,
    normalizers: TASKCYCLE_NORMALIZERS,
    evidence,
    evidenceSpecs: TASKCYCLE_EVIDENCE_SPECS,
    subjectKind: 'TaskCycle',
    subjectId: subject.id,
  });

  const remaining = stableSort(subject.obligations.filter(item => item.status === 'PENDING'));
  return {
    schema_version: 'tecnotron-post-taskcycle-reconciliation/v0',
    kind: 'PostTaskCycleReconciliation',
    subject: {
      taskcycle_id: subject.id,
      taskcycle_revision: subject.revision,
      taskcycle_state: subject.state,
    },
    disposition: resolution.unresolved.length === 0 ? 'RESOLVED' : 'UNRESOLVED',
    observed_facts: {
      ...resolution.observedFacts,
      remaining_taskcycle_obligations: remaining,
    },
    classifications: {
      ...resolution.classifications,
      remaining_taskcycle_obligations: {
        status: 'RESOLVED',
        reason: 'OBSERVED_FROM_TASKCYCLE_STATE',
        source_refs: ['taskcycle.obligations'],
      },
    },
    unresolved: resolution.unresolved,
    external_semantic_decisions_required: [],
    authority_inference: 'NONE',
    silent_repair: 'NONE',
    canonical_state_write: 'NONE',
  };
}

function reconcilePostMilestone(request) {
  exactKeysWithOptionalEvidence(request, ['milestone', 'observations'], 'post-milestone request');
  const subject = validateMilestone(request.milestone);
  validateObservationKeys(request.observations, MILESTONE_FIELDS, 'post-milestone observations');
  const evidence = buildEvidenceRegistry(request.evidence);
  const resolution = materializeResolution({
    fields: MILESTONE_FIELDS,
    observations: request.observations,
    normalizers: MILESTONE_NORMALIZERS,
    evidence,
    evidenceSpecs: MILESTONE_EVIDENCE_SPECS,
    subjectKind: 'Milestone',
    subjectId: subject.id,
  });

  return {
    schema_version: 'tecnotron-post-milestone-reconciliation/v0',
    kind: 'PostMilestoneReconciliation',
    subject: {
      milestone_id: subject.id,
      milestone_title: subject.title,
      milestone_state: subject.state,
    },
    disposition: resolution.unresolved.length === 0 ? 'RESOLVED' : 'UNRESOLVED',
    observed_facts: resolution.observedFacts,
    classifications: resolution.classifications,
    unresolved: resolution.unresolved,
    external_semantic_decisions_required: ['NEXT_PRODUCT_RESPONSIBILITY'],
    automatic_roadmap_decision: 'NONE',
    authority_inference: 'NONE',
    silent_repair: 'NONE',
    canonical_state_write: 'NONE',
  };
}

module.exports = {
  ReconciliationContractError,
  reconcilePostTaskCycle,
  reconcilePostMilestone,
  stableStringify,
};
