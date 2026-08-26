'use strict';

const test = require('node:test');
const assert = require('node:assert');
const YAML = require('yaml');

const { OpenSpecCliClient, OpenSpecCliError } = require('../../src/adapters/openspec-cli');
const { createCompositeMaterializer, createRepoPackagerMaterializer } = require('../../src/adapters/repo-packager');
const { TaskFileError, parseTaskSource } = require('../../src/adapters/task-file');

function taskFixture() {
  return {
    artifact: 'TASK',
    schema_version: 'fitflow-task/v2',
    task_id: 'FF-AI-OPS-TEST',
    title: 'Exercise the operational workflow',
    status: 'EXECUTING',
    task_type: 'tooling',
    area: 'ai_tooling',
    scope: 'mixed',
    lane: 'ai_orchestrated',
    risk: 'low',
    priority: 'P1',
    created_at: '2026-08-26T00:00:00Z',
    author_role: 'developer',
    baseline: { revision: 'abc123', fingerprint_status: 'unavailable', working_tree_fingerprint: null, fingerprint_reason: 'test baseline' },
    github_issue: null,
    openspec_change: 'operational-workflow-mvp',
    objective: 'Exercise the token bounded operational workflow in a deterministic test.',
    in_scope: ['runner'],
    out_of_scope: ['provider calls'],
    acceptance_criteria: [{ id: 'AC-1', criterion: 'The workflow produces durable evidence', evidence: 'test' }],
    ownership_keys: ['path:src/operational-runner/**'],
    required_docs: ['AGENTS.md'],
  };
}

test('task file adapter parses only strict fitflow-task/v2 frontmatter', () => {
  const source = `---\n${YAML.stringify(taskFixture()).trim()}\n---\n\n# Body\n`;
  assert.strictEqual(parseTaskSource(source).task_id, 'FF-AI-OPS-TEST');
  const invalid = taskFixture();
  invalid.unknown = true;
  assert.throws(() => parseTaskSource(`---\n${YAML.stringify(invalid)}---\n`), TaskFileError);
});

test('OpenSpec CLI client exposes only JSON read commands', () => {
  const calls = [];
  const spawn = (_command, args) => {
    calls.push(args);
    if (args[0] === 'list') return { status: 0, stdout: JSON.stringify({ changes: [{ name: 'change-a', status: 'active' }] }), stderr: '' };
    return { status: 0, stdout: JSON.stringify({ title: 'Change A', requirements: [] }), stderr: '' };
  };
  const client = new OpenSpecCliClient({ cwd: 'C:/repo', spawn, platform: 'linux' });
  assert.deepStrictEqual(client.listChanges(), [{ id: 'change-a', title: 'change-a', summary: null, status: 'active' }]);
  assert.strictEqual(client.readChange('change-a').id, 'change-a');
  assert.deepStrictEqual(calls, [
    ['list', '--changes', '--json'],
    ['show', 'change-a', '--json', '--type', 'change', '--no-interactive', '--deltas-only'],
  ]);
  assert.strictEqual(client.writeChange, undefined);
  assert.throws(() => client.readChange('--help'), OpenSpecCliError);
});

test('repo-packager adapter maps exact JSON evidence to requested ids', () => {
  const materializer = createRepoPackagerMaterializer({
    root: 'C:/repo',
    scriptPath: 'pack.py',
    spawn: (_command, args) => {
      assert.ok(args.includes('exact'));
      return { status: 0, stderr: '', stdout: JSON.stringify({
        provider: 'repo-packager',
        omitted_paths: [],
        evidence: [{ path: 'AGENTS.md', content: 'rules' }],
      }) };
    },
  });
  const output = materializer({
    budget_tokens: 100,
    requested_paths: ['AGENTS.md'],
    requested_evidence: [{ evidence_id: 'doc:agents', path: 'AGENTS.md', required: true }],
  });
  assert.deepStrictEqual(output.evidence, [{ evidence_id: 'doc:agents', path: 'AGENTS.md', content: 'rules' }]);
});

test('composite materializer preserves requested order and reports unavailable virtual evidence', () => {
  const repositoryMaterializer = () => ({
    provider: 'repo-packager',
    evidence: [{ evidence_id: 'path:AGENTS.md', path: 'AGENTS.md', content: 'rules' }],
    omitted_paths: [],
    quality_status: 'CURRENT',
  });
  const available = createCompositeMaterializer({
    repositoryMaterializer,
    virtualPaths: ['openspec:change-a'],
    virtualEvidence: [{ evidence_id: 'openspec:change-a', path: 'openspec:change-a', content: '{}' }],
  })({ requested_paths: ['openspec:change-a', 'AGENTS.md'], requested_evidence: [], budget_tokens: 100 });
  assert.deepStrictEqual(available.evidence.map((item) => item.path), ['openspec:change-a', 'AGENTS.md']);

  const unavailable = createCompositeMaterializer({ repositoryMaterializer, virtualPaths: ['openspec:missing'] })({
    requested_paths: ['openspec:missing', 'AGENTS.md'], requested_evidence: [], budget_tokens: 100,
  });
  assert.deepStrictEqual(unavailable.omitted_paths, ['openspec:missing']);
});
