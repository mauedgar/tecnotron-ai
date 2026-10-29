'use strict';

class GitHubAdapterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GitHubAdapterError';
  }
}

function taskReference(task) {
  if (!task || !task.task_id) throw new GitHubAdapterError('TASK con task_id es requerido');
  return `<!-- fitflow-task:${task.task_id} -->`;
}

function issuePatch(task, issue) {
  const marker = taskReference(task);
  const body = issue.body || '';
  const desiredBody = body.includes(marker) ? body : `${body}${body ? '\n\n' : ''}${marker}`;
  const desiredTitle = task.title || issue.title;
  const patch = {};
  if (desiredTitle !== issue.title) patch.title = desiredTitle;
  if (desiredBody !== body) patch.body = desiredBody;
  return patch;
}

/** Adaptador mecanico: nunca escribe TASK, runs ni acepta/mergea cambios. */
class GitHubAdapter {
  constructor(client) {
    if (!client || typeof client.getIssue !== 'function') {
      throw new GitHubAdapterError('cliente GitHub con getIssue es requerido');
    }
    this.client = client;
  }

  async syncIssue(task) {
    if (!task.github_issue) return { status: 'UNAVAILABLE', reason: 'TASK_SIN_GITHUB_ISSUE' };
    const issue = await this.client.getIssue(task.github_issue);
    const patch = issuePatch(task, issue);
    if (!Object.keys(patch).length) return { status: 'PASS', changed: false, issue };
    if (typeof this.client.updateIssue !== 'function') throw new GitHubAdapterError('cliente no permite actualizar Issue');
    const updated = await this.client.updateIssue(task.github_issue, patch);
    return { status: 'PASS', changed: true, issue: updated };
  }

  async syncProjectMacrostate(projectItemId, macrostate) {
    if (!projectItemId || !macrostate) throw new GitHubAdapterError('projectItemId y macrostate son requeridos');
    if (typeof this.client.getProjectItem !== 'function') throw new GitHubAdapterError('cliente no permite leer Project');
    const item = await this.client.getProjectItem(projectItemId);
    if (item.macrostate === macrostate) return { status: 'PASS', changed: false, item };
    if (typeof this.client.updateProjectItem !== 'function') throw new GitHubAdapterError('cliente no permite actualizar Project');
    const updated = await this.client.updateProjectItem(projectItemId, { macrostate });
    return { status: 'PASS', changed: true, item: updated };
  }

  async pullRequestSummary(pullRequest) {
    if (typeof this.client.getPullRequest !== 'function') throw new GitHubAdapterError('cliente no permite leer Pull Request');
    const pr = await this.client.getPullRequest(pullRequest);
    return { status: 'PASS', number: pr.number, url: pr.url, state: pr.state, title: pr.title, headSha: pr.headSha || null };
  }

  async checkStatus(ref) {
    if (typeof this.client.getChecks !== 'function') throw new GitHubAdapterError('cliente no permite leer Actions/checks');
    const checks = await this.client.getChecks(ref);
    return { status: 'PASS', ref, checks: checks.map((check) => ({ name: check.name, status: check.status, conclusion: check.conclusion || null, url: check.url || null })) };
  }
  /** Optional qualified provider port; does not change legacy syncProjectMacrostate semantics. */
  async reconcileOperationalMacrostate(request) {
    const blocked = (reason) => ({ status: 'BLOCKED', reason, effect_state: 'NONE' });
    if (!request || !request.operationId || !request.authorityRef || request.authorizationKind !== 'OPERATIONAL_PROJECTION' || request.writeAuthorized !== true) {
      return blocked('MISSING_COMPETENT_PROJECTION_AUTHORIZATION');
    }
    const { issueUrl, projectId, projectItemId, statusFieldId, statusOptions, desiredStatus } = request;
    if (!issueUrl || !projectId || !projectItemId || !statusFieldId || !statusOptions ||
        !['Backlog', 'Ready'].includes(desiredStatus) ||
        !statusOptions[desiredStatus] || typeof statusOptions[desiredStatus] !== 'string' ||
        request.mappingVerified !== true || !request.observationRef || !request.expectedCurrentOptionId) {
      return blocked('UNVERIFIED_PROJECT_FIELD_MAPPING');
    }
    if (desiredStatus === 'Ready' && (!request.readyEvaluation || request.readyEvaluation.status !== 'ELIGIBLE' || request.readyEvaluation.issueUrl !== issueUrl || request.readyEvaluation.authorityRef !== request.readyAuthorityRef || request.readyEvaluation.projectId !== projectId || request.readyEvaluation.projectItemId !== projectItemId || request.readyEvaluation.statusFieldId !== statusFieldId || request.readyEvaluation.statusOptionId !== request.expectedCurrentOptionId)) {
      return blocked('READY_ELIGIBILITY_NOT_PROVEN');
    }
    if (typeof this.client.getProjectItem !== 'function') return blocked('PROJECT_READ_CAPABILITY_UNAVAILABLE');
    let current;
    try { current = await this.client.getProjectItem(projectItemId); }
    catch (_) { return blocked('PROJECT_PREOBSERVATION_UNAVAILABLE'); }
    const corresponds = (item) => item && item.id === projectItemId && item.issueUrl === issueUrl && item.projectId === projectId && item.statusFieldId === statusFieldId;
    if (!corresponds(current)) return blocked('PROJECT_IDENTITY_OR_FIELD_DRIFT');
    const receipt = { operationId: request.operationId, projectItemId, desiredStatus, previousOptionId: current.statusOptionId, requestedOptionId: statusOptions[desiredStatus] };
    if (current.statusOptionId === statusOptions[desiredStatus]) {
      return { status: 'PASS', changed: false, effect_state: 'NONE', receipt };
    }
    if (current.statusOptionId !== request.expectedCurrentOptionId) return blocked('PROJECT_PRE_EFFECT_OPTION_DRIFT');
    if (typeof this.client.updateProjectItem !== 'function') return blocked('PROJECT_WRITE_CAPABILITY_UNAVAILABLE');
    try {
      await this.client.updateProjectItem(projectItemId, { statusFieldId, statusOptionId: statusOptions[desiredStatus] });
    } catch (_) {
      return { status: 'UNKNOWN', reason: 'PROJECT_WRITE_OUTCOME_UNKNOWN_NO_BLIND_RETRY', effect_state: 'UNKNOWN', receipt };
    }
    try {
      const after = await this.client.getProjectItem(projectItemId);
      if (corresponds(after) && after.statusOptionId === statusOptions[desiredStatus]) {
        return { status: 'PASS', changed: true, effect_state: 'CONFIRMED', receipt };
      }
    } catch (_) { /* a potentially committed write must be reconciled, never retried blindly */ }
    return { status: 'UNKNOWN', reason: 'POST_EFFECT_CORRESPONDENCE_UNVERIFIED', effect_state: 'UNKNOWN', receipt };
  }

  /** Observación nativa read-only del run de Actions; nunca usa el cliente ni escribe. */
  observeActionsRunEvidence(observations, expected) {
    return observeNativeActionsRunEvidence(observations, expected);
  }

}

/** Read-only correlation: Issue open is not a GitHub Projects Backlog observation. */
function observePromotedIssue(issue, expected) {
  if (!issue || !expected || !expected.issueUrl || !expected.promotionRef) {
    return { status: 'BLOCKED', reason: 'PROMOTION_IDENTITY_MISSING' };
  }
  if (issue.url !== expected.issueUrl || typeof issue.body !== 'string' || !issue.body.includes(expected.promotionRef)) {
    return { status: 'BLOCKED', reason: 'PROMOTION_CORRELATION_MISMATCH' };
  }
  return { status: 'PASS', issueUrl: issue.url, issueState: issue.state, promotionRef: expected.promotionRef, projectMacrostate: 'NOT_VERIFIED' };
}

/** Eligibility for a separately authorized Ready projection; no side effects or auto-selection. */
function evaluateOperationalReady({ issueObservation, projectObservation, decision, dependencies } = {}) {
  const blocked = (reason) => ({ status: 'BLOCKED', reason });
  if (!issueObservation || issueObservation.status !== 'PASS') return blocked('PROMOTED_ISSUE_NOT_VERIFIED');
  if (issueObservation.issueState !== 'open') return blocked('ISSUE_NOT_OPEN');
  if (!projectObservation || projectObservation.verified !== true || projectObservation.provider !== 'GITHUB_PROJECTS' ||
      projectObservation.issueUrl !== issueObservation.issueUrl || !projectObservation.projectId ||
      !projectObservation.projectItemId || !projectObservation.statusFieldId || !projectObservation.statusOptionId ||
      !['Backlog', 'Ready'].includes(projectObservation.macrostate)) return blocked('PROJECT_BACKLOG_STATUS_NOT_VERIFIED');
  if (!decision || decision.kind !== 'READY_GRANTED' || !decision.authorityRef || decision.issueUrl !== issueObservation.issueUrl ||
      !Array.isArray(decision.dependencyIds)) return blocked('COMPETENT_READY_DECISION_ABSENT');
  if (!dependencies || dependencies.complete !== true || !Array.isArray(dependencies.items)) return blocked('DEPENDENCY_INVENTORY_INCOMPLETE');
  const declared = decision.dependencyIds;
  const actual = dependencies.items;
  if (declared.some((id) => typeof id !== 'string' || !id.trim()) ||
      actual.some((x) => !x || typeof x.id !== 'string' || !x.id.trim()) ||
      new Set(declared).size !== declared.length || new Set(actual.map((x) => x.id)).size !== actual.length ||
      declared.length !== actual.length || actual.some((x) => !declared.includes(x.id) || x.status !== 'SATISFIED')) {
    return blocked('DEPENDENCIES_NOT_PROVEN_SATISFIED');
  }
  return { status: 'ELIGIBLE', issueUrl: issueObservation.issueUrl, authorityRef: decision.authorityRef, projectId: projectObservation.projectId, projectItemId: projectObservation.projectItemId, statusFieldId: projectObservation.statusFieldId, statusOptionId: projectObservation.statusOptionId };
}

/* Cota cerrada (OP03): observación read-only de evidencia nativa de GitHub Actions.
   Nunca evalúa efecto de Producto, nunca escribe, nunca infiere identidad de
   Operation/ExecutionAttempt/owner a partir de evidencia del proveedor. */
const ACTIONS_EVENT_SUPPORTED = ['pull_request'];
const ACTIONS_STATUS_SUPPORTED = ['completed', 'in_progress'];
const ACTIONS_CONCLUSION_SUPPORTED = ['success', 'failure', 'cancelled'];
const SHA_RE = /^[0-9a-f]{40}$/;
const NATIVE_ID_RE = /^\d[0-9]*$/;
const ISO_Z_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const OBSERVATION_FIELDS = [
  'repository', 'url', 'run_id', 'run_attempt', 'job_id', 'workflow', 'event',
  'status', 'conclusion', 'checkout_commit', 'checkout_tree', 'observed_at',
  'reported_validation',
];
const OBSERVER_EXPECTATION_FIELDS = [
  'repository', 'runId', 'runAttempt', 'jobId', 'event', 'checkoutCommit',
  'checkoutTree', 'observationCutoff', 'operationRef', 'executionAttemptRef',
  'ownerRef', 'authorityRef',
];

function observationBlocked(reason, extra) {
  return { status: 'BLOCKED', reason, effect_state: 'NONE', ...extra };
}

function invalidObservationRecord(record, index, reason) {
  return { error: { record: index, reason } };
}

function validateObservationRecord(record, index) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return invalidObservationRecord(record, index, 'MALFORMED_OBSERVATION_RECORD');
  }
  const unsupported = Object.keys(record).filter((key) => !OBSERVATION_FIELDS.includes(key));
  if (unsupported.length) return invalidObservationRecord(record, index, `UNSUPPORTED_PROVIDER_FIELD:${unsupported[0]}`);
  for (const key of OBSERVATION_FIELDS.filter((k) => k !== 'conclusion' && k !== 'reported_validation')) {
    if (!(key in record) || record[key] === null || record[key] === '' || record[key] === undefined) {
      return invalidObservationRecord(record, index, `MISSING_REQUIRED_OBSERVATION_FIELD:${key}`);
    }
  }
  for (const field of ['run_id', 'run_attempt', 'job_id']) {
    const value = record[field];
    if ((typeof value !== 'string' && typeof value !== 'number') || !NATIVE_ID_RE.test(String(value)) ||
        Number(value) < 1) {
      return invalidObservationRecord(record, index, `INVALID_NATIVE_IDENTITY:${field}`);
    }
  }
  if (Number(record.run_attempt) < 1) {
    return invalidObservationRecord(record, index, 'INVALID_NATIVE_IDENTITY:run_attempt');
  }
  const url = `https://github.com/${record.repository}/actions/runs/${record.run_id}`;
  if (record.url !== url) return invalidObservationRecord(record, index, 'PROVIDER_URL_IDENTITY_MISMATCH');
  if (!ACTIONS_EVENT_SUPPORTED.includes(record.event)) {
    return invalidObservationRecord(record, index, 'UNSUPPORTED_EVENT');
  }
  if (typeof record.workflow !== 'string' || !record.workflow.trim()) {
    return invalidObservationRecord(record, index, 'MISSING_WORKFLOW_IDENTITY');
  }
  if (!SHA_RE.test(String(record.checkout_commit)) || !SHA_RE.test(String(record.checkout_tree))) {
    return invalidObservationRecord(record, index, 'INVALID_SOURCE_CHECKOUT_SUBJECT');
  }
  if (!ISO_Z_RE.test(String(record.observed_at))) {
    return invalidObservationRecord(record, index, 'OBSERVATION_TIMESTAMP_INVALID');
  }
  if (!ACTIONS_STATUS_SUPPORTED.includes(record.status)) {
    return invalidObservationRecord(record, index, 'UNSUPPORTED_PROVIDER_STATUS');
  }
  if (record.status === 'completed') {
    const conclusion = record.conclusion;
    if (conclusion === undefined || conclusion === null) {
      return invalidObservationRecord(record, index, 'MISSING_PROVIDER_RESULT');
    }
    if (!ACTIONS_CONCLUSION_SUPPORTED.includes(conclusion)) {
      return invalidObservationRecord(record, index, 'UNSUPPORTED_PROVIDER_CONCLUSION');
    }
  } else if (!(record.conclusion === undefined || record.conclusion === null)) {
    return invalidObservationRecord(record, index, 'UNSUPPORTED_PROVIDER_CONCLUSION');
  }
  if ('reported_validation' in record &&
      (typeof record.reported_validation !== 'string' || !record.reported_validation.trim())) {
    return invalidObservationRecord(record, index, 'INVALID_REPORTED_VALIDATION');
  }
  return null;
}

function validateExpectation(expected) {
  const unsupported = Object.keys(expected).filter((key) => !OBSERVER_EXPECTATION_FIELDS.includes(key));
  if (unsupported.length) return `UNSUPPORTED_OBSERVER_REQUEST_FIELD:${unsupported[0]}`;
  for (const key of ['repository', 'runId', 'runAttempt', 'jobId', 'event', 'checkoutCommit', 'checkoutTree', 'observationCutoff']) {
    if (!(key in expected) || expected[key] === undefined) {
      return `OBSERVER_EXPECTATION_MISSING:${key}`;
    }
  }
  if (!ISO_Z_RE.test(String(expected.observationCutoff))) return 'OBSERVATION_CUTOFF_INVALID';
  if (!SHA_RE.test(String(expected.checkoutCommit)) || !SHA_RE.test(String(expected.checkoutTree))) {
    return 'EXPECTED_SOURCE_SUBJECT_INVALID';
  }
  for (const field of ['runId', 'jobId', 'runAttempt']) {
    const value = expected[field];
    if ((typeof value !== 'string' && typeof value !== 'number') || !NATIVE_ID_RE.test(String(value)) ||
        Number(value) < 1) {
      return `INVALID_NATIVE_IDENTITY:expected.${field}`;
    }
  }
  if (Number(expected.runAttempt) < 1) return 'INVALID_NATIVE_IDENTITY:expected.runAttempt';
  return null;
}

/** Normaliza/valida observaciones nativas de un run de Actions; siempre read-only. */
function observeNativeActionsRunEvidence(observations, expected) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    return observationBlocked('OBSERVER_EXPECTATION_MISSING');
  }
  const expectationError = validateExpectation(expected);
  if (expectationError) return observationBlocked(expectationError);
  if (!Array.isArray(observations) || observations.length === 0) {
    return observationBlocked('OBSERVATION_COLLECTION_INVALID');
  }
  const errors = observations.map((record, index) => validateObservationRecord(record, index)).filter(Boolean);
  if (errors.length) return observationBlocked(errors[0].error.reason, { offending_record: errors[0].error.record });
  const core = (record) => ({ ...record });
  const canonical = core(observations[0]);
  for (const [index, record] of observations.slice(1).entries()) {
    const same = ['run_id', 'run_attempt', 'job_id'].every((key) => String(record[key]) === String(canonical[key]));
    if (!same) return observationBlocked('INCOHERENT_OBSERVATION_IDENTITY', { offending_record: index + 1 });
    if (JSON.stringify(core(record)) !== JSON.stringify(canonical)) {
      return observationBlocked('CONFLICTING_DUPLICATE_OBSERVATION', { offending_record: index + 1 });
    }
  }
  const mismatchField = Object.entries({
    repository: [canonical.repository, expected.repository],
    run_id: [canonical.run_id, expected.runId],
    run_attempt: [canonical.run_attempt, expected.runAttempt],
    job_id: [canonical.job_id, expected.jobId],
    event: [canonical.event, expected.event],
    checkout_commit: [canonical.checkout_commit, expected.checkoutCommit],
    checkout_tree: [canonical.checkout_tree, expected.checkoutTree],
  }).find(([, [actual, wanted]]) => String(actual) !== String(wanted));
  if (mismatchField) {
    const reason = (mismatchField[0] === 'checkout_commit' || mismatchField[0] === 'checkout_tree')
      ? 'SOURCE_COMMIT_OR_TREE_MISMATCH'
      : 'NATIVE_IDENTITY_MISMATCH';
    return observationBlocked(reason, { expected_field: mismatchField[0] });
  }
  if (String(canonical.observed_at) > String(expected.observationCutoff)) {
    return observationBlocked('OBSERVATION_EXCEEDS_CUTOFF');
  }
  const product_bindings = {
    operation: expected.operationRef !== undefined ? { ref: expected.operationRef, verification: 'UNVERIFIED' } : 'UNVERIFIED',
    execution_attempt: expected.executionAttemptRef !== undefined ? { ref: expected.executionAttemptRef, verification: 'UNVERIFIED' } : 'UNVERIFIED',
    owner: expected.ownerRef !== undefined ? { ref: expected.ownerRef, verification: 'UNVERIFIED' } : 'UNVERIFIED',
    authority: expected.authorityRef !== undefined ? { ref: expected.authorityRef, verification: 'UNVERIFIED' } : 'UNVERIFIED',
  };
  const normalized = {
    repository: canonical.repository,
    actions_run_url: canonical.url,
    run_id: canonical.run_id,
    run_attempt: canonical.run_attempt,
    job_id: canonical.job_id,
    workflow: canonical.workflow,
    event: canonical.event,
    checkout_commit: canonical.checkout_commit,
    checkout_tree: canonical.checkout_tree,
    observation_cutoff: expected.observationCutoff,
  };
  const duplicateCount = observations.length;
  if (canonical.status !== 'completed') {
    return {
      status: 'UNKNOWN',
      reason: 'PROVIDER_RESULT_NOT_TERMINAL_NO_BLIND_RETRY',
      retries_attempted: 0,
      provider: 'GITHUB_ACTIONS',
      normalized,
      provider_result: { status: canonical.status, conclusion: null, reported_validation: canonical.reported_validation || null },
      duplicates_seen: duplicateCount,
      product_bindings,
      product_effect: 'NOT_EVALUATED',
      observation_effect_state: 'NONE',
    };
  }
  return {
    status: 'PASS',
    provider: 'GITHUB_ACTIONS',
    normalized,
    provider_result: {
      status: canonical.status,
      conclusion: canonical.conclusion,
      reported_validation: canonical.reported_validation || null,
    },
    duplicates_seen: duplicateCount,
    product_bindings,
    product_effect: 'NOT_EVALUATED',
    observation_effect_state: 'NONE',
    pass_semantics: 'EVIDENCE_NORMALIZATION_ONLY_NOT_PRODUCT_ACCEPTANCE',
  };
}

module.exports = { GitHubAdapter, GitHubAdapterError, taskReference, issuePatch, observePromotedIssue, evaluateOperationalReady, observeNativeActionsRunEvidence };
