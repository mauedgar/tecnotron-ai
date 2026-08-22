'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GitHubAdapter } = require('../../src/adapters/github');
const { OpenSpecAdapter } = require('../../src/adapters/openspec');

test('GitHub sincroniza referencia de TASK de forma idempotente sin aceptar ni mergear', async () => {
  let updates = 0;
  const issue = { title: 'Implementar adapter', body: '' };
  const adapter = new GitHubAdapter({
    getIssue: async () => issue,
    updateIssue: async (_id, patch) => { updates++; Object.assign(issue, patch); return issue; },
  });
  const task = { task_id: 'FF-AI-VNEXT-005', title: 'Implementar adapter', github_issue: '42' };
  assert.equal((await adapter.syncIssue(task)).changed, true);
  assert.equal((await adapter.syncIssue(task)).changed, false);
  assert.equal(updates, 1);
  assert.match(issue.body, /fitflow-task:FF-AI-VNEXT-005/);
});

test('GitHub actualiza macrostate solo cuando cambia y resume PR/checks', async () => {
  let projectUpdates = 0;
  const adapter = new GitHubAdapter({
    getIssue: async () => ({ title: '', body: '' }),
    getProjectItem: async () => ({ macrostate: 'En curso' }),
    updateProjectItem: async (_id, patch) => { projectUpdates++; return patch; },
    getPullRequest: async () => ({ number: 7, url: 'https://example/pr/7', state: 'OPEN', title: 'Cambio', headSha: 'abc' }),
    getChecks: async () => [{ name: 'test', status: 'COMPLETED', conclusion: 'SUCCESS' }],
  });
  assert.equal((await adapter.syncProjectMacrostate('item-1', 'En curso')).changed, false);
  assert.equal((await adapter.syncProjectMacrostate('item-1', 'Revision')).changed, true);
  assert.equal(projectUpdates, 1);
  assert.equal((await adapter.pullRequestSummary(7)).number, 7);
  assert.equal((await adapter.checkStatus('abc')).checks[0].conclusion, 'SUCCESS');
});

test('OpenSpec solo devuelve evidencia de lectura', async () => {
  const adapter = new OpenSpecAdapter({
    listChanges: async () => [{ id: 'ff-ai-vnext-005', title: 'Roots portables', status: 'proposed' }],
    readChange: async (id) => ({ id, title: 'Roots portables', delta: 'sin mutaciones' }),
    writeChange: () => { throw new Error('no debe invocarse'); },
  });
  assert.equal((await adapter.listRelevant({ taskId: 'VNEXT-005' })).changes.length, 1);
  assert.equal((await adapter.read('ff-ai-vnext-005')).change.delta, 'sin mutaciones');
  assert.equal(typeof adapter.client.writeChange, 'undefined');
});
