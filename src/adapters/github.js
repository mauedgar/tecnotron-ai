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
}

module.exports = { GitHubAdapter, GitHubAdapterError, taskReference, issuePatch };
