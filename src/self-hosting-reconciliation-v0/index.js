'use strict';

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

function unresolvedClassification(reason, details = {}) {
  return {
    status: 'UNRESOLVED',
    reason,
    ...details,
  };
}

function resolveObservations(entries, normalize, field) {
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

  const groups = new Map();
  for (const item of valid) {
    const key = stableStringify(item.observed, 0);
    const group = groups.get(key) || { value: item.observed, source_refs: [] };
    group.source_refs.push(item.source_ref);
    groups.set(key, group);
  }

  if (groups.size !== 1) {
    const alternatives = stableSort([...groups.values()].map(group => ({
      source_refs: [...new Set(group.source_refs)].sort(),
      observed: group.value,
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
      reason: 'COINCIDENT_COMPETENT_EVIDENCE',
      source_refs: [...new Set(resolved.source_refs)].sort(),
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

function materializeResolution({ fields, observations, normalizers }) {
  const observedFacts = {};
  const classifications = {};
  const unresolved = [];

  for (const field of fields) {
    const resolution = resolveObservations(observations[field], normalizers[field], field);
    observedFacts[field] = resolution.fact;
    classifications[field] = resolution.classification;
    if (resolution.classification.status === 'UNRESOLVED') {
      unresolved.push({ field, ...resolution.classification });
    }
  }

  return { observedFacts, classifications, unresolved };
}

function reconcilePostTaskCycle(request) {
  exactKeys(request, ['taskcycle', 'observations'], 'post-TaskCycle request');
  const subject = validateTaskCycle(request.taskcycle);
  validateObservationKeys(request.observations, TASKCYCLE_FIELDS, 'post-TaskCycle observations');
  const resolution = materializeResolution({
    fields: TASKCYCLE_FIELDS,
    observations: request.observations,
    normalizers: TASKCYCLE_NORMALIZERS,
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
  exactKeys(request, ['milestone', 'observations'], 'post-milestone request');
  const subject = validateMilestone(request.milestone);
  validateObservationKeys(request.observations, MILESTONE_FIELDS, 'post-milestone observations');
  const resolution = materializeResolution({
    fields: MILESTONE_FIELDS,
    observations: request.observations,
    normalizers: MILESTONE_NORMALIZERS,
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
