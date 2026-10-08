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
    if (desiredStatus === 'Ready' && (!request.readyEvaluation || request.readyEvaluation.status !== 'ELIGIBLE' || request.readyEvaluation.issueUrl !== issueUrl || request.readyEvaluation.authorityRef !== request.readyAuthorityRef)) {
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
  return { status: 'ELIGIBLE', issueUrl: issueObservation.issueUrl, authorityRef: decision.authorityRef, projectItemId: projectObservation.projectItemId };
}

module.exports = { GitHubAdapter, GitHubAdapterError, taskReference, issuePatch, observePromotedIssue, evaluateOperationalReady };
