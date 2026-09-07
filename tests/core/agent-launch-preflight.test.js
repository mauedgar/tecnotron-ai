'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ContextPackager } = require('../../src/core/context-packager');
const { AgentLaunchResult } = require('../../src/contracts/agent-launch');
const { resolveLaunchAuthority, AgentLaunchPreflightError } = require('../../src/agent-launch/authority');
const { preflightProject } = require('../../src/agent-launch/project-preflight');
const { preflightContext } = require('../../src/agent-launch/context-preflight');
const { preflightAgentLaunch } = require('../../src/agent-launch');

const PROFILE_CASES = {
  spec_analyst: ['READ_ONLY_ANALYSIS', ['problem', 'accepted_authorities', 'constraints', 'gaps']],
  planner: ['READ_ONLY_ANALYSIS', ['accepted_spec', 'milestone', 'dependencies', 'ownership']],
  architect: ['READ_ONLY_ANALYSIS', ['accepted_spec', 'existing_contracts', 'architecture', 'consumers']],
  explorer: ['READ_ONLY_ANALYSIS', ['evidence_requirements', 'project_profile']],
  implementer: ['TASK_OWNED_WRITE', ['authorized_task', 'task_plan', 'task_worktree', 'write_scope', 'context_reference']],
  doc_curator: ['TASK_OWNED_WRITE', ['authorized_documentation_task', 'accepted_authorities', 'documentation_write_scope']],
  reviewer: ['CHANGE_REVIEW', ['accepted_spec_or_task', 'change_snapshot', 'validation_result']],
  researcher: ['AUTHORIZED_RESEARCH', ['research_question', 'authorized_research_task', 'source_policy']],
  auditor: ['CONFORMANCE_AUDIT', ['contracts', 'audit_scope', 'evidence_matrix', 'artifacts']],
};

function slash(value) {
  return value.replaceAll('\\', '/');
}

function profileInputs(profileId, root = 'C:/work/project') {
  return Object.fromEntries(PROFILE_CASES[profileId][1].map((key) => {
    if (key === 'write_scope' || key === 'documentation_write_scope') return [key, ['src/**']];
    if (key === 'task_worktree') return [key, slash(root)];
    if (key === 'context_reference') return [key, 'context:001@abc'];
    return [key, `evidence:${key}@abc`];
  }));
}

function authorization(kind) {
  return {
    task_authorization_ref: kind === 'TASK_OWNED_WRITE' ? 'task:001@abc' : null,
    research_authorization_ref: kind === 'AUTHORIZED_RESEARCH' ? 'research:001@abc' : null,
    change_snapshot_ref: kind === 'CHANGE_REVIEW' ? 'change:001@abc' : null,
    validation_evidence_ref: kind === 'CHANGE_REVIEW' ? 'validation:001@abc' : null,
    evidence_snapshot_ref: kind === 'CONFORMANCE_AUDIT' ? 'evidence:001@abc' : null,
    evidence_matrix_ref: kind === 'CONFORMANCE_AUDIT' ? 'matrix:001@abc' : null,
  };
}

function launchPair(profileId = 'spec_analyst', root = 'C:/work/project') {
  const [kind] = PROFILE_CASES[profileId];
  const writer = kind === 'TASK_OWNED_WRITE';
  const inputs = profileInputs(profileId, root);
  const request = {
    schema_version: 'tecnotron-agent-launch/v1',
    operation_id: 'operation-001',
    accepted_authority_ref: 'authority:001@abc',
    profile_id: profileId,
    project: {
      project_profile_ref: 'project-profile:001@abc',
      repository_ref: 'fitflow-ai',
      cwd: slash(root),
      worktree_ref: writer ? slash(root) : null,
    },
    scope: { read_scope: ['src/**'], write_scope: writer ? ['src/**'] : [] },
    profile_inputs: inputs,
    authorization: authorization(kind),
    context: {
      context_ref: 'context:001@abc',
      evidence_requirements_ref: null,
      context_budget_ref: 'context-budget:large@v1',
    },
    model: {
      request: {
        state: 'EXPLICIT_CONSTRAINTS',
        request_ref: 'model-request:001@abc',
        model_ref: 'model:free@v1',
        provider_ref: null,
        runtime_constraints_ref: null,
      },
      routing_decision_ref: null,
      resolution_ref: null,
    },
    environment: { inherit: false, task_scoped_inputs_ref: null },
    execution: { adapter_id: 'opencode-cli', timeout_ms: 1000 },
  };
  const authority = {
    authority_kind: kind,
    authority_id: 'authority-001',
    operation_id: request.operation_id,
    profile_id: profileId,
    project: {
      project_id: 'tecnotron-ai',
      project_profile_ref: request.project.project_profile_ref,
      repository_root: root,
    },
    repository: {
      repository_identity: request.project.repository_ref,
      worktree_path: writer ? root : null,
      cwd: root,
      branch: 'task-branch',
      head_or_baseline: 'a'.repeat(40),
    },
    authorization: { ...request.authorization },
    scope: structuredClone(request.scope),
    context: { ...request.context },
    profile_inputs: structuredClone(inputs),
    provenance: { accepted_authority_ref: request.accepted_authority_ref },
  };
  return { request, authority };
}

function sha256(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

function completeContextPackage(budgetTokens = 10) {
  const packager = new ContextPackager({
    materializer: () => ({
      provider: 'repo-packager',
      evidence: [{ evidence_id: 'task', path: 'TASK.md', content: 'task' }],
    }),
    tokenizer: { name: 'test-exact', exact: true, limitation: null, count: () => 1 },
  });
  return packager.package({
    budget_tokens: budgetTokens,
    requested_evidence: [{ evidence_id: 'task', path: 'TASK.md' }],
  });
}

function contextDependencies(packageResult = completeContextPackage()) {
  const serialized = JSON.stringify(packageResult);
  return {
    resolveContextBudget: () => ({
      context_budget_ref: 'context-budget:large@v1',
      budget_tokens: 10,
    }),
    resolveContext: () => ({
      context_ref: 'context:001@abc',
      digest: sha256(serialized),
      serialized,
    }),
  };
}

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-launch-'));
  fs.mkdirSync(path.join(root, '.ai', 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'index.js'), 'module.exports = true;\n');
  const profile = {
    schema_version: 'fitflow-project-profile/v1',
    project_id: 'tecnotron-ai',
    baseline: 'test',
    roots: { product: root, ai_core: root },
    authority: { source_of_truth: 'SOURCE.md', agents: 'AGENTS.md', canonical_docs: [] },
    product_architecture: { backend_dependency_direction: [], target: 'test' },
    operational: { task_store: 'docs/tasks', project_count: 'one', run_root: '.ai/runs', local_state: '.ai/local' },
    specification: { adapter: 'none', status: 'accepted' },
    features: { semantic_retrieval: false, mcp: false, temporal: false, orchestrator_workers: false },
    environment: { reusable_discovery_env: 'none', official_ai_core_env: null },
  };
  const profilePath = path.join(root, '.ai', 'config', 'project-profile.yaml');
  fs.writeFileSync(profilePath, JSON.stringify(profile));
  execFileSync('git', ['init', '-b', 'task-branch'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return { root, profilePath, head, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function repositoryPair(profileId = 'spec_analyst') {
  const fixture = createRepository();
  const pair = launchPair(profileId, fixture.root);
  pair.request.project.project_profile_ref = slash(fixture.profilePath);
  pair.request.project.repository_ref = 'fitflow';
  pair.request.project.cwd = slash(path.join(fixture.root, 'src'));
  pair.authority.project.project_profile_ref = slash(fixture.profilePath);
  pair.authority.project.repository_root = fixture.root;
  pair.authority.repository.repository_identity = 'fitflow';
  pair.authority.repository.cwd = path.join(fixture.root, 'src');
  pair.authority.repository.branch = 'task-branch';
  pair.authority.repository.head_or_baseline = fixture.head;
  if (pair.authority.authority_kind === 'TASK_OWNED_WRITE') {
    pair.request.project.worktree_ref = slash(fixture.root);
    pair.authority.repository.worktree_path = fixture.root;
    if (pair.request.profile_inputs.task_worktree) pair.request.profile_inputs.task_worktree = slash(fixture.root);
    if (pair.authority.profile_inputs.task_worktree) pair.authority.profile_inputs.task_worktree = slash(fixture.root);
  }
  return { ...fixture, ...pair };
}

function crossRepositoryPair(repositoryRef) {
  const product = createRepository();
  const aiCore = createRepository();
  const profile = JSON.parse(fs.readFileSync(product.profilePath, 'utf8'));
  profile.roots = { product: product.root, ai_core: aiCore.root };
  fs.writeFileSync(product.profilePath, JSON.stringify(profile));
  execFileSync('git', ['add', '.'], { cwd: product.root, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'split roots'], {
    cwd: product.root,
    stdio: 'ignore',
  });
  product.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: product.root, encoding: 'utf8' }).trim();

  const selected = repositoryRef === 'fitflow' ? product : aiCore;
  const pair = launchPair('spec_analyst', selected.root);
  pair.request.project.project_profile_ref = slash(product.profilePath);
  pair.request.project.repository_ref = repositoryRef;
  pair.request.project.cwd = slash(path.join(selected.root, 'src'));
  pair.authority.project.project_profile_ref = slash(product.profilePath);
  pair.authority.project.repository_root = selected.root;
  pair.authority.repository.repository_identity = repositoryRef;
  pair.authority.repository.cwd = path.join(selected.root, 'src');
  pair.authority.repository.branch = 'task-branch';
  pair.authority.repository.head_or_baseline = selected.head;
  return {
    ...pair,
    product,
    aiCore,
    cleanup: () => {
      product.cleanup();
      aiCore.cleanup();
    },
  };
}

test('authority resolver validates all nine profiles against the five closed kinds', () => {
  for (const profileId of Object.keys(PROFILE_CASES)) {
    const { request, authority } = launchPair(profileId);
    const result = resolveLaunchAuthority(request, { authorityResolver: () => authority });
    assert.strictEqual(result.resolvedAuthority.authority_kind, PROFILE_CASES[profileId][0]);
    assert.ok(['ASSERTED_AND_EQUAL', 'MIXED_CONGRUENT'].includes(result.congruence.overall));
    assert.strictEqual(result.congruence.coordinates.operation_id, 'ASSERTED_AND_EQUAL');
    assert.strictEqual(result.congruence.coordinates['project.worktree_ref'], request.project.worktree_ref === null ? 'DERIVED' : 'ASSERTED_AND_EQUAL');
  }
});

test('authority resolver rejects missing, extra, and mismatched profile-specific inputs', () => {
  const { request, authority } = launchPair('implementer');
  const missing = structuredClone(request);
  delete missing.profile_inputs.task_plan;
  const extra = structuredClone(request);
  extra.profile_inputs.compatibility_alias = 'evidence:alias@abc';
  const mismatchAuthority = structuredClone(authority);
  mismatchAuthority.profile_inputs.authorized_task = 'task:other@abc';
  for (const [value, resolved] of [[missing, authority], [extra, authority], [request, mismatchAuthority]]) {
    assert.throws(
      () => resolveLaunchAuthority(value, { authorityResolver: () => resolved }),
      (error) => error instanceof AgentLaunchPreflightError && error.reasonCode === 'AUTHORITY_INPUT_MISMATCH',
    );
  }
});

test('authority congruence classifies security mismatches with stable reason codes', () => {
  const cases = [
    ['AUTHORITY_INPUT_MISMATCH', (value) => { value.operation_id = 'operation-other'; }],
    ['WORKTREE_AUTHORITY_MISMATCH', (value) => { value.repository.repository_identity = 'other-repository'; }],
    ['SCOPE_AUTHORITY_MISMATCH', (value) => { value.scope.read_scope = ['docs/**']; }],
    ['CONTEXT_AUTHORITY_MISMATCH', (value) => { value.context.context_budget_ref = 'context-budget:small@v1'; }],
  ];
  for (const [reasonCode, mutate] of cases) {
    const { request, authority } = launchPair();
    mutate(authority);
    assert.throws(
      () => resolveLaunchAuthority(request, { authorityResolver: () => authority }),
      (error) => error instanceof AgentLaunchPreflightError && error.reasonCode === reasonCode,
    );
  }
});

test('authority resolution failures fail closed without exposing resolver diagnostics', () => {
  const { request } = launchPair();
  assert.throws(
    () => resolveLaunchAuthority(request, { authorityResolver: () => { throw new Error('token=top-secret'); } }),
    (error) => error.reasonCode === 'AUTHORITY_RESOLUTION_FAILED' && !error.message.includes('top-secret'),
  );
});

test('project preflight observes the real project, repository, cwd, branch, HEAD, and worktree', (t) => {
  const fixture = repositoryPair();
  t.after(fixture.cleanup);
  const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  const result = preflightProject(authorityResult);
  assert.strictEqual(result.execution_observation.project_root, fixture.root);
  assert.strictEqual(result.execution_observation.repository_root, fixture.root);
  assert.strictEqual(result.execution_observation.cwd, path.join(fixture.root, 'src'));
  assert.strictEqual(result.execution_observation.branch, 'task-branch');
  assert.strictEqual(result.execution_observation.head, fixture.head);
  assert.strictEqual(result.execution_observation.worktree, fixture.root);
  assert.deepStrictEqual(result.scope, { read_scope: ['src/**'], write_scope: [] });
});

test('project preflight resolves independently declared product and AI Core repository roots', (t) => {
  const stale = createRepository();
  const previousAiCoreRoot = process.env.FF_AI_CORE_ROOT;
  process.env.FF_AI_CORE_ROOT = stale.root;
  t.after(() => {
    if (previousAiCoreRoot === undefined) delete process.env.FF_AI_CORE_ROOT;
    else process.env.FF_AI_CORE_ROOT = previousAiCoreRoot;
  });
  t.after(stale.cleanup);

  for (const repositoryRef of ['fitflow', 'fitflow-ai']) {
    const fixture = crossRepositoryPair(repositoryRef);
    t.after(fixture.cleanup);
    const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
    const result = preflightProject(authorityResult);
    const expectedRoot = repositoryRef === 'fitflow' ? fixture.product.root : fixture.aiCore.root;
    assert.strictEqual(result.execution_observation.repository_root, expectedRoot);
  }
});

test('project preflight rejects an authoritative root that mismatches the selected repository', (t) => {
  const fixture = crossRepositoryPair('fitflow');
  t.after(fixture.cleanup);
  fixture.authority.project.repository_root = fixture.aiCore.root;
  const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  assert.throws(
    () => preflightProject(authorityResult),
    (error) => ['PROJECT_RESOLUTION_REJECTED', 'REPOSITORY_REF_MISMATCH'].includes(error.reasonCode),
  );
});

test('scope containment rejects traversal and preserves exact nested fixture globs', (t) => {
  const fixture = repositoryPair('implementer');
  t.after(fixture.cleanup);
  fixture.request.scope = {
    read_scope: ['tests/fixtures/agent-launch/**'],
    write_scope: ['tests/core/agent-launch-*.test.js', 'tests/fixtures/agent-launch/**'],
  };
  fixture.authority.scope = structuredClone(fixture.request.scope);
  fixture.request.profile_inputs.write_scope = structuredClone(fixture.request.scope.write_scope);
  fixture.authority.profile_inputs.write_scope = structuredClone(fixture.request.scope.write_scope);
  let authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  const valid = preflightProject(authorityResult);
  assert.deepStrictEqual(valid.scope.write_scope, ['tests/core/agent-launch-*.test.js', 'tests/fixtures/agent-launch/**']);

  fixture.request.scope.write_scope[0] = '../outside/**';
  fixture.authority.scope.write_scope[0] = '../outside/**';
  fixture.request.profile_inputs.write_scope[0] = '../outside/**';
  fixture.authority.profile_inputs.write_scope[0] = '../outside/**';
  authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  assert.throws(() => preflightProject(authorityResult), (error) => error.reasonCode === 'SCOPE_INVALID');
});

test('scope containment rejects a symlink escape from the authoritative worktree', (t) => {
  const fixture = repositoryPair();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-launch-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  t.after(fixture.cleanup);
  fs.symlinkSync(outside, path.join(fixture.root, 'escaped'), 'junction');
  fixture.request.scope.read_scope = ['escaped/**'];
  fixture.authority.scope.read_scope = ['escaped/**'];
  const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  assert.throws(() => preflightProject(authorityResult), (error) => error.reasonCode === 'SCOPE_INVALID');
});

test('scope containment rejects nested wildcard symlink escapes and permits contained links', (t) => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-launch-outside-'));
  const reader = repositoryPair();
  const writer = repositoryPair('implementer');
  const contained = repositoryPair();
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  t.after(reader.cleanup);
  t.after(writer.cleanup);
  t.after(contained.cleanup);

  fs.symlinkSync(outside, path.join(reader.root, 'src', 'link-to-outside'), 'junction');
  const readerAuthority = resolveLaunchAuthority(reader.request, { authorityResolver: () => reader.authority });
  assert.throws(() => preflightProject(readerAuthority), (error) => error.reasonCode === 'SCOPE_INVALID');

  fs.symlinkSync(outside, path.join(writer.root, 'src', 'link-to-outside'), 'junction');
  const writerAuthority = resolveLaunchAuthority(writer.request, { authorityResolver: () => writer.authority });
  assert.throws(() => preflightProject(writerAuthority), (error) => error.reasonCode === 'SCOPE_INVALID');

  fs.mkdirSync(path.join(contained.root, 'contained-target'));
  fs.symlinkSync(path.join(contained.root, 'contained-target'), path.join(contained.root, 'src', 'contained-link'), 'junction');
  const containedAuthority = resolveLaunchAuthority(contained.request, { authorityResolver: () => contained.authority });
  assert.doesNotThrow(() => preflightProject(containedAuthority));
});

test('project preflight rejects stale injected coordinates and alternate repository roots', (t) => {
  const fixture = repositoryPair();
  const alternate = createRepository();
  t.after(alternate.cleanup);
  t.after(fixture.cleanup);
  fixture.authority.project.repository_root = alternate.root;
  assert.throws(
    () => preflightProject(resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority })),
    (error) => ['PROJECT_RESOLUTION_REJECTED', 'REPOSITORY_REF_MISMATCH'].includes(error.reasonCode),
  );
});

test('project preflight rejects a Project Profile whose declared roots differ from resolution', (t) => {
  const fixture = repositoryPair();
  const alternate = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-launch-profile-root-'));
  t.after(() => fs.rmSync(alternate, { recursive: true, force: true }));
  t.after(fixture.cleanup);
  const profile = JSON.parse(fs.readFileSync(fixture.profilePath, 'utf8'));
  profile.roots.product = alternate;
  fs.writeFileSync(fixture.profilePath, JSON.stringify(profile));
  const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  assert.throws(() => preflightProject(authorityResult), (error) => error.reasonCode === 'PROJECT_RESOLUTION_REJECTED');
});

test('project preflight always observes Git directly instead of trusting an injected observation', (t) => {
  const fixture = repositoryPair();
  t.after(fixture.cleanup);
  fixture.authority.repository.branch = 'injected-branch';
  const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
  assert.throws(
    () => preflightProject(authorityResult, {
      observeGit: () => ({
        repository_root: fixture.root,
        branch: 'injected-branch',
        head: fixture.head,
        worktree: fixture.root,
      }),
    }),
    (error) => error.reasonCode === 'WORKTREE_AUTHORITY_MISMATCH',
  );
});

test('project preflight rejects cwd, branch, revision, and writer worktree mismatches', (t) => {
  const mutators = [
    ['CWD_OUTSIDE_REPOSITORY', (fixture) => {
      fixture.request.project.cwd = slash(path.dirname(fixture.root));
      fixture.authority.repository.cwd = path.dirname(fixture.root);
    }],
    ['WORKTREE_AUTHORITY_MISMATCH', (fixture) => { fixture.authority.repository.branch = 'other-branch'; }],
    ['WORKTREE_AUTHORITY_MISMATCH', (fixture) => { fixture.authority.repository.head_or_baseline = 'b'.repeat(40); }],
    ['WORKTREE_MISMATCH', (fixture) => {
      fixture.request.project.worktree_ref = slash(path.dirname(fixture.root));
      fixture.authority.repository.worktree_path = path.dirname(fixture.root);
      fixture.request.profile_inputs.task_worktree = slash(path.dirname(fixture.root));
      fixture.authority.profile_inputs.task_worktree = slash(path.dirname(fixture.root));
    }],
  ];
  for (const [reasonCode, mutate] of mutators) {
    const fixture = repositoryPair(reasonCode === 'WORKTREE_MISMATCH' ? 'implementer' : 'spec_analyst');
    t.after(fixture.cleanup);
    mutate(fixture);
    const authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
    assert.throws(() => preflightProject(authorityResult), (error) => error.reasonCode === reasonCode, reasonCode);
  }
});

test('read-only authorities enforce an explicit worktree against the observed Git worktree', (t) => {
  for (const profileId of ['spec_analyst', 'researcher', 'reviewer', 'auditor']) {
    const fixture = repositoryPair(profileId);
    t.after(fixture.cleanup);

    let authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
    assert.doesNotThrow(() => preflightProject(authorityResult), `${profileId} null worktree`);

    fixture.request.project.worktree_ref = slash(fixture.root);
    fixture.authority.repository.worktree_path = fixture.root;
    authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
    assert.doesNotThrow(() => preflightProject(authorityResult), `${profileId} matching worktree`);

    fixture.request.project.worktree_ref = slash(path.dirname(fixture.root));
    fixture.authority.repository.worktree_path = path.dirname(fixture.root);
    authorityResult = resolveLaunchAuthority(fixture.request, { authorityResolver: () => fixture.authority });
    assert.throws(
      () => preflightProject(authorityResult),
      (error) => error.reasonCode === 'WORKTREE_MISMATCH',
      `${profileId} observed mismatch`,
    );
  }
});

test('context preflight verifies package identity, integrity, COMPLETE state, and accepted budget', () => {
  const { request, authority } = launchPair();
  const authorityResult = resolveLaunchAuthority(request, { authorityResolver: () => authority });
  const result = preflightContext(authorityResult, contextDependencies());
  assert.deepStrictEqual(result, {
    context_ref: 'context:001@abc',
    evidence_requirements_ref: null,
    context_budget_ref: 'context-budget:large@v1',
    package_digest: result.package_digest,
    status: 'COMPLETE',
    coverage_status: 'COMPLETE',
    budget_tokens: 10,
    tokens_delivered: 1,
    retrieval_providers: ['repo-packager'],
    fallback: { used: false, provider: null, reason: null },
  });
  assert.match(result.package_digest, /^sha256:[a-f0-9]{64}$/);
});

test('context preflight rejects tampered, partial, empty, malformed, and over-budget packages', () => {
  const { request, authority } = launchPair();
  const authorityResult = resolveLaunchAuthority(request, { authorityResolver: () => authority });
  const partial = completeContextPackage();
  partial.status = 'PARTIAL';
  partial.coverage_status = 'PARTIAL';
  partial.telemetry.coverage_status = 'PARTIAL';
  partial.missing_evidence_ids = ['missing'];
  partial.telemetry.missing_evidence_ids = ['missing'];
  const empty = completeContextPackage();
  empty.status = 'EMPTY';
  empty.coverage_status = 'EMPTY';
  empty.telemetry.coverage_status = 'EMPTY';
  empty.included_evidence = [];
  empty.tokens_delivered = 0;
  empty.telemetry.tokens_delivered = 0;
  const malformed = contextDependencies();
  const parsed = JSON.parse(malformed.resolveContext().serialized);
  parsed.unknown = true;
  malformed.resolveContext = () => ({
    context_ref: 'context:001@abc',
    digest: sha256(JSON.stringify(parsed)),
    serialized: JSON.stringify(parsed),
  });
  const overBudget = completeContextPackage();
  overBudget.tokens_delivered = 11;
  overBudget.telemetry.tokens_delivered = 11;
  const cases = [
    (() => { const deps = contextDependencies(); const resolved = deps.resolveContext(); resolved.serialized += ' '; deps.resolveContext = () => resolved; return deps; })(),
    contextDependencies(partial),
    contextDependencies(empty),
    malformed,
    contextDependencies(overBudget),
  ];
  for (const dependencies of cases) {
    assert.throws(() => preflightContext(authorityResult, dependencies), (error) => error.reasonCode === 'CONTEXT_NOT_READY');
  }
});

test('context preflight reuses ContextPackager for evidence requirements without acquiring authority', () => {
  const { request, authority } = launchPair();
  request.context.context_ref = null;
  request.context.evidence_requirements_ref = 'requirements:001@abc';
  authority.context = { ...request.context };
  const requirements = [{ evidence_id: 'task', path: 'TASK.md' }];
  const serialized = JSON.stringify(requirements);
  const packager = new ContextPackager({
    materializer: () => ({ provider: 'repo-packager', evidence: [{ evidence_id: 'task', path: 'TASK.md', content: 'task' }] }),
    tokenizer: { name: 'test-exact', exact: true, limitation: null, count: () => 1 },
  });
  const authorityResult = resolveLaunchAuthority(request, { authorityResolver: () => authority });
  const result = preflightContext(authorityResult, {
    resolveContextBudget: () => ({ context_budget_ref: 'context-budget:large@v1', budget_tokens: 10 }),
    resolveEvidenceRequirements: () => ({
      evidence_requirements_ref: 'requirements:001@abc',
      digest: sha256(serialized),
      serialized,
    }),
    contextPackager: packager,
  });
  assert.strictEqual(result.status, 'COMPLETE');
  assert.strictEqual(result.evidence_requirements_ref, 'requirements:001@abc');
});

test('context provider failures normalize as unavailable without raw diagnostics', () => {
  const { request, authority } = launchPair();
  const authorityResult = resolveLaunchAuthority(request, { authorityResolver: () => authority });
  assert.throws(
    () => preflightContext(authorityResult, {
      resolveContextBudget: () => ({ context_budget_ref: 'context-budget:large@v1', budget_tokens: 10 }),
      resolveContext: () => { throw new Error('password=hunter2'); },
    }),
    (error) => error.status === 'UNAVAILABLE'
      && error.reasonCode === 'CONTEXT_PROVIDER_UNAVAILABLE'
      && !error.message.includes('hunter2'),
  );
});

test('composed structural preflight short-circuits authority, project, and context failures before actor access', (t) => {
  const fixture = repositoryPair();
  t.after(fixture.cleanup);
  let projectCalls = 0;
  let contextCalls = 0;
  let actorCalls = 0;
  const actor = () => { actorCalls += 1; };

  const authorityFailure = preflightAgentLaunch(fixture.request, {
    authorityResolver: () => { throw new Error('no authority'); },
    resolveProject: () => { projectCalls += 1; },
    resolveContext: () => { contextCalls += 1; },
    actor,
  });
  assert.strictEqual(authorityFailure.result.reason_code, 'AUTHORITY_RESOLUTION_FAILED');
  assert.strictEqual(projectCalls, 0);
  assert.strictEqual(contextCalls, 0);

  fixture.authority.repository.branch = 'stale-branch';
  const projectFailure = preflightAgentLaunch(fixture.request, {
    authorityResolver: () => fixture.authority,
    resolveContextBudget: contextDependencies().resolveContextBudget,
    resolveContext: () => { contextCalls += 1; },
    actor,
  });
  assert.strictEqual(projectFailure.result.reason_code, 'WORKTREE_AUTHORITY_MISMATCH');
  assert.strictEqual(contextCalls, 0);
  assert.strictEqual(actorCalls, 0);
  assert.strictEqual(AgentLaunchResult.safeParse(projectFailure.result).success, true);

  fixture.authority.repository.branch = 'task-branch';
  const contextFailure = preflightAgentLaunch(fixture.request, {
    authorityResolver: () => fixture.authority,
    resolveContextBudget: contextDependencies().resolveContextBudget,
    resolveContext: () => { throw new Error('context unavailable'); },
    actor,
  });
  assert.strictEqual(contextFailure.result.reason_code, 'CONTEXT_PROVIDER_UNAVAILABLE');
  assert.strictEqual(contextFailure.result.status, 'UNAVAILABLE');
  assert.strictEqual(actorCalls, 0);
  assert.strictEqual(AgentLaunchResult.safeParse(contextFailure.result).success, true);
});

test('invalid requests normalize failures when universal correlation coordinates are recoverable', () => {
  const base = launchPair().request;
  const cases = [
    { ...structuredClone(base), unknown: true },
    (() => { const value = structuredClone(base); value.project.unknown = true; return value; })(),
    (() => { const value = structuredClone(base); delete value.profile_id; return value; })(),
    (() => { const value = structuredClone(base); value.execution.timeout_ms = 0; return value; })(),
  ];
  let authorityCalls = 0;
  let actorCalls = 0;
  for (const value of cases) {
    const outcome = preflightAgentLaunch(value, {
      authorityResolver: () => { authorityCalls += 1; },
      actor: () => { actorCalls += 1; },
    });
    assert.strictEqual(outcome.ok, false);
    assert.deepStrictEqual(outcome.error, { status: 'BLOCKED', reason_code: 'REQUEST_INVALID', phase: 'REQUEST' });
    assert.strictEqual(AgentLaunchResult.safeParse(outcome.result).success, true);
    assert.strictEqual(outcome.result.operation_id, base.operation_id);
    assert.strictEqual(outcome.result.accepted_authority_ref, base.accepted_authority_ref);
    assert.strictEqual(outcome.result.profile_id, null);
    assert.deepStrictEqual(outcome.result.resolved, {
      project_profile_ref: null,
      repository_ref: null,
      worktree_ref: null,
      cwd: null,
    });
    assert.strictEqual(outcome.result.authority.congruence_status, 'NOT_EVALUATED');
    assert.strictEqual(outcome.result.identity.request_state, null);
    assert.strictEqual(outcome.actor_invoked, false);
  }
  assert.strictEqual(authorityCalls, 0);
  assert.strictEqual(actorCalls, 0);
});

test('invalid requests without valid universal coordinates return a null result', () => {
  const base = launchPair().request;
  const cases = [
    (() => { const value = structuredClone(base); delete value.operation_id; return value; })(),
    { ...structuredClone(base), operation_id: '' },
    (() => { const value = structuredClone(base); delete value.accepted_authority_ref; return value; })(),
    { ...structuredClone(base), accepted_authority_ref: 'malformed reference' },
  ];
  for (const value of cases) {
    const outcome = preflightAgentLaunch(value);
    assert.strictEqual(outcome.result, null);
    assert.deepStrictEqual(outcome.error, { status: 'BLOCKED', reason_code: 'REQUEST_INVALID', phase: 'REQUEST' });
    assert.strictEqual(outcome.actor_invoked, false);
  }
});

test('authority resolution and envelope validation precede profile contract interpretation', () => {
  const pair = launchPair();
  let authorityCalls = 0;
  const authorityFailure = preflightAgentLaunch(pair.request, {
    profileRegistry: { profiles: {} },
    authorityResolver: () => {
      authorityCalls += 1;
      throw new Error('unavailable');
    },
  });
  assert.strictEqual(authorityFailure.error.reason_code, 'AUTHORITY_RESOLUTION_FAILED');
  assert.strictEqual(authorityCalls, 1);

  const invalidAuthority = structuredClone(pair.authority);
  delete invalidAuthority.authority_id;
  const envelopeFailure = preflightAgentLaunch(pair.request, {
    profileRegistry: { profiles: {} },
    authorityResolver: () => invalidAuthority,
  });
  assert.strictEqual(envelopeFailure.error.reason_code, 'AUTHORITY_INSUFFICIENT');

  const unknownProfile = preflightAgentLaunch(pair.request, {
    profileRegistry: { profiles: {} },
    authorityResolver: () => pair.authority,
  });
  assert.strictEqual(unknownProfile.error.reason_code, 'PROFILE_UNKNOWN');

  const invalidProfile = preflightAgentLaunch(pair.request, {
    profileRegistry: { profiles: { spec_analyst: { required_inputs: [] } } },
    authorityResolver: () => pair.authority,
  });
  assert.strictEqual(invalidProfile.error.reason_code, 'PROFILE_CONTRACT_INVALID');
});

test('successful structural preflight returns sanitized evidence and never invokes an actor', (t) => {
  const fixture = repositoryPair();
  t.after(fixture.cleanup);
  const result = preflightAgentLaunch(fixture.request, {
    authorityResolver: () => fixture.authority,
    ...contextDependencies(),
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.actor_invoked, false);
  assert.match(result.evidence.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.evidence.authority_envelope_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.context.package_digest, /^sha256:[a-f0-9]{64}$/);
  assert.strictEqual(JSON.stringify(result).includes('task\"'), false);
});

test('normalized writer failure preserves the asserted worktree reference', (t) => {
  const fixture = repositoryPair('implementer');
  t.after(fixture.cleanup);
  fixture.authority.repository.branch = 'stale-branch';
  const result = preflightAgentLaunch(fixture.request, {
    authorityResolver: () => fixture.authority,
    ...contextDependencies(),
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.result.resolved.worktree_ref, fixture.request.project.worktree_ref);
});
