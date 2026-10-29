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

/* OP03 — normalized, bounded read-only GitHub Actions evidence.
   Caller-supplied provider observations are NOT self-authenticating.
   No Product Operation/ExecutionAttempt/owner/authority can be inferred here. */
const ACTIONS_EVENTS = ['pull_request'];
const ACTIONS_STATUSES = ['completed', 'in_progress'];
const ACTIONS_CONCLUSIONS = ['success', 'failure', 'cancelled'];
const SHA_RE = /^[0-9a-f]{40}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const STAGES = ['audit', 'typecheck', 'tests', 'contracts'];
const STAGE_FIELDS = ['kind', 'name', 'status', 'conclusion', 'source_url'];
const VALIDATION_FIELDS = ['total', 'pass', 'skip', 'fail', 'source_url'];
const PROVIDER_FIELDS = [
  'repository', 'url', 'run_id', 'run_attempt', 'job_id', 'workflow', 'event',
  'status', 'conclusion', 'checkout_commit', 'checkout_tree', 'observed_at',
  'run_started_at', 'native_updated_at', 'stages', 'validation', 'reported_validation',
];
const EXPECTED_FIELDS = [
  'repository', 'runId', 'runAttempt', 'jobId', 'event', 'checkoutCommit',
  'checkoutTree', 'observationCutoff', 'operationRef', 'executionAttemptRef',
  'ownerRef', 'authorityRef',
];

function blockedNative(reason, extra = {}) {
  // These effects describe this pure, read-only observation, NEVER a Product effect.
  return { status: 'BLOCKED', reason, product_effect: 'NOT_EVALUATED',
    observation_effect_state: 'NONE', ...extra };
}
function nativeId(value) {
  // No implicit rounding of identifiers beyond Number.MAX_SAFE_INTEGER.
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) ? value : null;
}
function utcSecond(value) {
  return typeof value === 'string' && UTC_RE.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value.replace(/Z$/, '.000Z');
}
function nativeJobUrl(record) {
  return 'https://github.com/' + record.repository + '/actions/runs/' +
    nativeId(record.run_id) + '/job/' + nativeId(record.job_id);
}
function nativeStagesError(record) {
  const stages = record.stages;
  if (!Array.isArray(stages) || stages.length !== STAGES.length) return 'STAGE_RESULTS_INCOMPLETE';
  const names = new Set();
  for (const stage of stages) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage) ||
        Object.keys(stage).some((k) => !STAGE_FIELDS.includes(k)) ||
        STAGE_FIELDS.some((k) => !Object.hasOwn(stage, k))) return 'INVALID_NATIVE_STAGE';
    if (!STAGES.includes(stage.kind) || names.has(stage.kind)) return 'INVALID_NATIVE_STAGE_IDENTITY';
    names.add(stage.kind);
    if (typeof stage.name !== 'string' || !stage.name.trim() ||
        stage.status !== 'completed' ||
        !['success', 'failure', 'cancelled', 'skipped'].includes(stage.conclusion) ||
        stage.source_url !== nativeJobUrl(record)) return 'INVALID_NATIVE_STAGE_RESULT';
  }
  return STAGES.every((k) => names.has(k)) ? null : 'STAGE_RESULTS_INCOMPLETE';
}
function nativeValidationError(record) {
  const value = record.validation;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some((k) => !VALIDATION_FIELDS.includes(k)) ||
      VALIDATION_FIELDS.some((k) => !Object.hasOwn(value, k))) return 'VALIDATION_OUTCOME_INCOMPLETE';
  if (['total', 'pass', 'skip', 'fail'].some((k) => !Number.isSafeInteger(value[k]) || value[k] < 0) ||
      value.total !== value.pass + value.skip + value.fail ||
      value.source_url !== nativeJobUrl(record)) return 'INVALID_VALIDATION_OUTCOME';
  const prefix = value.pass + ' PASS, ' + value.skip + ' SKIP, ' + value.fail + ' FAIL;';
  return typeof record.reported_validation === 'string' &&
    record.reported_validation.startsWith(prefix) ? null : 'VALIDATION_SUMMARY_MISMATCH';
}
function validateNativeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'MALFORMED_OBSERVATION_RECORD';
  const unknown = Object.keys(record).find((key) => !PROVIDER_FIELDS.includes(key));
  if (unknown) return 'UNSUPPORTED_PROVIDER_FIELD:' + unknown;
  for (const key of PROVIDER_FIELDS.filter((k) =>
    !['conclusion', 'native_updated_at', 'stages', 'validation', 'reported_validation'].includes(k))) {
    if (!Object.hasOwn(record, key) || record[key] === undefined ||
        record[key] === null || record[key] === '') return 'MISSING_REQUIRED_OBSERVATION_FIELD:' + key;
  }
  for (const key of ['run_id', 'run_attempt', 'job_id']) {
    if (!nativeId(record[key])) return 'INVALID_NATIVE_IDENTITY:' + key;
  }
  if (record.url !== 'https://github.com/' + record.repository +
      '/actions/runs/' + nativeId(record.run_id)) return 'PROVIDER_URL_IDENTITY_MISMATCH';
  if (!ACTIONS_EVENTS.includes(record.event)) return 'UNSUPPORTED_EVENT';
  if (typeof record.workflow !== 'string' || !record.workflow.trim()) return 'MISSING_WORKFLOW_IDENTITY';
  if (!SHA_RE.test(String(record.checkout_commit)) || !SHA_RE.test(String(record.checkout_tree))) {
    return 'INVALID_SOURCE_CHECKOUT_SUBJECT';
  }
  if (!utcSecond(record.run_started_at) || !utcSecond(record.observed_at)) return 'OBSERVATION_TIMESTAMP_INVALID';
  if (record.observed_at < record.run_started_at) return 'OBSERVATION_BEFORE_RUN_START';
  if (!ACTIONS_STATUSES.includes(record.status)) return 'UNSUPPORTED_PROVIDER_STATUS';
  if (record.status === 'completed') {
    if (!utcSecond(record.native_updated_at) ||
        record.native_updated_at < record.run_started_at ||
        record.observed_at < record.native_updated_at) return 'TERMINAL_OBSERVATION_BEFORE_NATIVE_UPDATE';
    const stageError = nativeStagesError(record);
    if (stageError) return stageError;
    const validationError = nativeValidationError(record);
    if (validationError) return validationError;
    if (!ACTIONS_CONCLUSIONS.includes(record.conclusion)) return 'UNSUPPORTED_PROVIDER_CONCLUSION';
    if (record.conclusion === 'success' &&
        (record.stages.some((s) => s.conclusion !== 'success') || record.validation.fail !== 0)) {
      return 'PROVIDER_STAGE_CONCLUSION_CONFLICT';
    }
  } else if (record.conclusion != null) {
    return 'UNSUPPORTED_PROVIDER_CONCLUSION';
  } else if (record.native_updated_at != null || record.stages != null ||
             record.validation != null || record.reported_validation != null) {
    return 'NONTERMINAL_WITH_TERMINAL_PROOF';
  }
  return null;
}
function validateNativeExpectation(expected) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    return 'OBSERVER_EXPECTATION_MISSING';
  }
  const unknown = Object.keys(expected).find((key) => !EXPECTED_FIELDS.includes(key));
  if (unknown) return 'UNSUPPORTED_OBSERVER_REQUEST_FIELD:' + unknown;
  for (const key of ['repository', 'runId', 'runAttempt', 'jobId', 'event',
    'checkoutCommit', 'checkoutTree', 'observationCutoff']) {
    if (expected[key] == null || expected[key] === '') return 'OBSERVER_EXPECTATION_MISSING:' + key;
  }
  for (const key of ['runId', 'runAttempt', 'jobId']) {
    if (!nativeId(expected[key])) return 'INVALID_NATIVE_IDENTITY:expected.' + key;
  }
  if (!utcSecond(expected.observationCutoff)) return 'OBSERVATION_CUTOFF_INVALID';
  if (!SHA_RE.test(String(expected.checkoutCommit)) ||
      !SHA_RE.test(String(expected.checkoutTree))) return 'EXPECTED_SOURCE_SUBJECT_INVALID';
  return null;
}
function fingerprintNative(record) {
  // Fixed-field ordering, IDs normalized to canonical strings, stages unordered.
  return JSON.stringify(PROVIDER_FIELDS.map((field) => {
    const value = record[field];
    if (['run_id', 'run_attempt', 'job_id'].includes(field)) return nativeId(value);
    if (field === 'stages' && Array.isArray(value)) {
      return [...value].sort((a, b) => a.kind.localeCompare(b.kind))
        .map((stage) => STAGE_FIELDS.map((key) => stage[key]));
    }
    if (field === 'validation' && value) return VALIDATION_FIELDS.map((key) => value[key]);
    return value == null ? null : value;
  }));
}

/** Pure read-only normalization. All Product bindings remain UNVERIFIED. */
function observeNativeActionsRunEvidence(observations, expected) {
  const expectationError = validateNativeExpectation(expected);
  if (expectationError) return blockedNative(expectationError);
  if (!Array.isArray(observations) || observations.length === 0) {
    return blockedNative('OBSERVATION_COLLECTION_INVALID');
  }
  for (let i = 0; i < observations.length; i++) {
    const error = validateNativeRecord(observations[i]);
    if (error) return blockedNative(error, { offending_record: i });
  }
  const original = observations[0];
  const fingerprint = fingerprintNative(original);
  for (let i = 1; i < observations.length; i++) {
    const record = observations[i];
    if (['run_id', 'run_attempt', 'job_id'].some((key) =>
      nativeId(record[key]) !== nativeId(original[key]))) {
      return blockedNative('INCOHERENT_OBSERVATION_IDENTITY', { offending_record: i });
    }
    if (fingerprintNative(record) !== fingerprint) {
      return blockedNative('CONFLICTING_DUPLICATE_OBSERVATION', { offending_record: i });
    }
  }
  const identity = {
    repository: [original.repository, expected.repository],
    run_id: [nativeId(original.run_id), nativeId(expected.runId)],
    run_attempt: [nativeId(original.run_attempt), nativeId(expected.runAttempt)],
    job_id: [nativeId(original.job_id), nativeId(expected.jobId)],
    event: [original.event, expected.event],
    checkout_commit: [original.checkout_commit, expected.checkoutCommit],
    checkout_tree: [original.checkout_tree, expected.checkoutTree],
  };
  const mismatch = Object.entries(identity).find(([, values]) => values[0] !== values[1]);
  if (mismatch) return blockedNative(
    ['checkout_commit', 'checkout_tree'].includes(mismatch[0])
      ? 'SOURCE_COMMIT_OR_TREE_MISMATCH' : 'NATIVE_IDENTITY_MISMATCH',
    { expected_field: mismatch[0] }
  );
  if (original.observed_at > expected.observationCutoff) {
    return blockedNative('OBSERVATION_EXCEEDS_CUTOFF');
  }
  const product_bindings = {
    operation: expected.operationRef === undefined ? 'UNVERIFIED' :
      { ref: expected.operationRef, verification: 'UNVERIFIED' },
    execution_attempt: expected.executionAttemptRef === undefined ? 'UNVERIFIED' :
      { ref: expected.executionAttemptRef, verification: 'UNVERIFIED' },
    owner: expected.ownerRef === undefined ? 'UNVERIFIED' :
      { ref: expected.ownerRef, verification: 'UNVERIFIED' },
    authority: expected.authorityRef === undefined ? 'UNVERIFIED' :
      { ref: expected.authorityRef, verification: 'UNVERIFIED' },
  };
  const normalized = {
    repository: original.repository,
    actions_run_url: original.url,
    job_url: nativeJobUrl(original),
    run_id: nativeId(original.run_id),
    run_attempt: nativeId(original.run_attempt),
    job_id: nativeId(original.job_id),
    workflow: original.workflow,
    event: original.event,
    checkout_commit: original.checkout_commit,
    checkout_tree: original.checkout_tree,
    run_started_at: original.run_started_at,
    native_updated_at: original.native_updated_at || null,
    observed_at: original.observed_at,
    observation_cutoff: expected.observationCutoff,
    stages: original.stages ? original.stages.map((s) => ({ ...s })) : null,
    validation: original.validation ? { ...original.validation } : null,
    provenance: 'CALLER_ASSERTED_NOT_SELF_AUTHENTICATING',
  };
  const result = {
    provider: 'GITHUB_ACTIONS', normalized, duplicates_seen: observations.length,
    product_bindings, product_effect: 'NOT_EVALUATED',
    observation_effect_state: 'NONE',
    provider_result: {
      status: original.status, conclusion: original.conclusion || null,
      reported_validation: original.reported_validation || null,
    },
  };
  if (original.status !== 'completed') {
    return { ...result, status: 'UNKNOWN',
      reason: 'PROVIDER_RESULT_NOT_TERMINAL_NO_BLIND_RETRY', retries_attempted: 0 };
  }
  // PASS denotes evidence normalization ONLY. Provider conclusion may be failure/cancelled.
  return { ...result, status: 'PASS',
    pass_semantics: 'EVIDENCE_NORMALIZATION_ONLY_NOT_PRODUCT_ACCEPTANCE' };
}
module.exports = { GitHubAdapter, GitHubAdapterError, taskReference, issuePatch,
  observePromotedIssue, evaluateOperationalReady, observeNativeActionsRunEvidence };
