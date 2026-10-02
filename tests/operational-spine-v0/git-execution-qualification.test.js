'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  FilesystemStateStore,
  create,
  transition,
  inspect,
} = require('../../src/state-kernel-v0');
const {
  createGitCliAdapter,
  qualifyGitExecutionSurface,
  qualificationSpecForRecipe,
} = require('../../src/operational-spine-v0/git-execution-qualification');
const {
  runWorkerInvocation,
} = require('../../src/operational-spine-v0/recipe-invocation-worker');

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return (result.stdout || '').trim();
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-git-qualification-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repository = path.join(root, 'repository');
  fs.mkdirSync(repository);
  git(repository, ['init']);
  git(repository, ['config', 'user.email', 'qualification@example.invalid']);
  git(repository, ['config', 'user.name', 'Qualification Fixture']);
  fs.writeFileSync(path.join(repository, 'fixture.txt'), 'fixture\n');
  git(repository, ['add', 'fixture.txt']);
  git(repository, ['commit', '-m', 'fixture']);
  git(repository, ['branch', '-M', 'main']);
  return {
    root,
    repository,
    expected_ref: 'refs/heads/main',
    expected_commit: git(repository, ['rev-parse', 'HEAD']),
  };
}

function requestFor(fx, overrides = {}) {
  return {
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: {
      identity: 'fixture/repository',
      location: fx.repository,
    },
    expected_ref: fx.expected_ref,
    expected_commit: fx.expected_commit,
    remote_timeout_ms: 1000,
    ...overrides,
  };
}

function ok(stdout) {
  return {
    exit_code: 0,
    signal: null,
    error_code: null,
    timed_out: false,
    stdout,
    stderr: '',
  };
}

function localFakeGit(commit, remoteResult) {
  return {
    run(repositoryPath, args) {
      if (args.includes('--is-inside-work-tree')) return ok('true\n');
      if (args.includes('symbolic-ref')) return ok('refs/heads/main\n');
      if (args.includes('rev-parse')) return ok(commit + '\n');
      if (args.includes('ls-remote')) return remoteResult;
      throw new Error('unexpected command: ' + args.join(' '));
    },
  };
}

function spawnResult(stdout = '', overrides = {}) {
  return {
    status: 0,
    signal: null,
    error: null,
    stdout,
    stderr: '',
    ...overrides,
  };
}

test('competent exact repository/ref qualifies READY and local Git state remains unchanged', t => {
  const fx = fixture(t);
  const before = {
    ref: git(fx.repository, ['symbolic-ref', '--quiet', 'HEAD']),
    commit: git(fx.repository, ['rev-parse', 'HEAD']),
    status: git(fx.repository, ['status', '--porcelain=v1', '--untracked-files=all']),
  };

  const result = qualifyGitExecutionSurface(requestFor(fx));

  assert.equal(result.status, 'READY');
  assert.equal(result.evidence.repository.observed_ref, fx.expected_ref);
  assert.equal(result.evidence.repository.observed_commit, fx.expected_commit);
  assert.equal(result.evidence.surface.qualification_method, 'DIRECT');
  assert.deepEqual(result.evidence.mutations, {
    repository: 'NONE',
    remote: 'NONE',
    persistent_global_git_config: 'NONE',
  });

  const after = {
    ref: git(fx.repository, ['symbolic-ref', '--quiet', 'HEAD']),
    commit: git(fx.repository, ['rev-parse', 'HEAD']),
    status: git(fx.repository, ['status', '--porcelain=v1', '--untracked-files=all']),
  };
  assert.deepEqual(after, before);
});

test('wrong expected ref or commit fails closed', t => {
  const fx = fixture(t);
  const wrongRef = qualifyGitExecutionSurface(requestFor(fx, {
    expected_ref: 'refs/heads/not-main',
  }));
  assert.equal(wrongRef.status, 'BLOCKED');

  const wrongCommit = qualifyGitExecutionSurface(requestFor(fx, {
    expected_commit: 'f'.repeat(40),
  }));
  assert.equal(wrongCommit.status, 'BLOCKED');
  assert.equal(wrongCommit.reason, 'EXPECTED_COMMIT_MISMATCH');
});

test('existing non-Git path fails closed rather than inferring competence from path existence', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-non-git-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: { identity: 'fixture/non-git', location: root },
    expected_ref: 'refs/heads/main',
    expected_commit: 'a'.repeat(40),
    remote_timeout_ms: 1000,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'GIT_REPOSITORY_NOT_COMPETENT');
});

test('dubious ownership recovers only with process-local safe.directory adaptation', () => {
  const commit = 'a'.repeat(40);
  const calls = [];
  const fakeGit = {
    run(repositoryPath, args, options) {
      calls.push({ repositoryPath, args, options });
      if (!options.safeDirectory) {
        return {
          exit_code: 128,
          signal: null,
          error_code: null,
          timed_out: false,
          stdout: '',
          stderr: 'fatal: detected dubious ownership in repository; add safe.directory',
        };
      }
      if (args.includes('--is-inside-work-tree')) return ok('true\n');
      if (args.includes('symbolic-ref')) return ok('refs/heads/main\n');
      if (args.includes('rev-parse')) return ok(commit + '\n');
      throw new Error('unexpected command');
    },
  };
  const result = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: { identity: 'fixture/repository', location: '/fixture/repository' },
    expected_ref: 'refs/heads/main',
    expected_commit: commit,
    remote_timeout_ms: 1000,
  }, { git: fakeGit, exists: () => true });

  assert.equal(result.status, 'READY');
  assert.equal(result.evidence.surface.qualification_method, 'PROCESS_LOCAL_SAFE_DIRECTORY');
  assert.equal(calls.some((call) => call.options.safeDirectory === true), true);
  assert.equal(calls.some((call) => call.args.includes('--global')), false);
});

test('declared local remote is observed read-only and remains unchanged', t => {
  const fx = fixture(t);
  const bare = path.join(fx.root, 'remote.git');
  fs.mkdirSync(bare);
  git(bare, ['init', '--bare']);
  git(fx.repository, ['remote', 'add', 'fixture-origin', bare]);
  git(fx.repository, ['push', 'fixture-origin', 'HEAD:refs/heads/main']);
  const beforeRemote = git(bare, ['rev-parse', 'refs/heads/main']);

  const result = qualifyGitExecutionSurface(requestFor(fx, {
    remote: {
      name: 'fixture-origin',
      target_ref: 'refs/heads/main',
      expected_commit: fx.expected_commit,
    },
  }));

  assert.equal(result.status, 'READY');
  assert.equal(result.evidence.remote.observation_status, 'READY');
  assert.equal(result.evidence.remote.observed_commit, fx.expected_commit);
  assert.equal(git(bare, ['rev-parse', 'refs/heads/main']), beforeRemote);
});

test('Git adapter enforces noninteractive bounded remote observation and has no write path', () => {
  const commit = 'b'.repeat(40);
  const calls = [];
  const fakeSpawn = (command, args, options) => {
    calls.push({ command, args, options });
    if (args.includes('--is-inside-work-tree')) return spawnResult('true\n');
    if (args.includes('symbolic-ref')) return spawnResult('refs/heads/main\n');
    if (args.includes('rev-parse')) return spawnResult(commit + '\n');
    if (args.includes('ls-remote')) return spawnResult(`${commit}\trefs/heads/main\n`);
    throw new Error('unexpected command');
  };
  const adapter = createGitCliAdapter({
    spawn: fakeSpawn,
    env: { HOME: '/fixture-home' },
  });
  const result = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: { identity: 'fixture/repository', location: '/fixture/repository' },
    expected_ref: 'refs/heads/main',
    expected_commit: commit,
    remote: {
      name: 'origin',
      target_ref: 'refs/heads/main',
      expected_commit: commit,
    },
    remote_timeout_ms: 37,
  }, { git: adapter, exists: () => true });

  assert.equal(result.status, 'READY');
  const remoteCall = calls.find((call) => call.args.includes('ls-remote'));
  assert.equal(remoteCall.options.timeout, 37);
  assert.equal(remoteCall.options.env.GIT_TERMINAL_PROMPT, '0');
  assert.equal(remoteCall.options.env.GCM_INTERACTIVE, 'Never');
  assert.equal(calls.some((call) => call.args.includes('push')), false);
  assert.equal(calls.some((call) => call.args.includes('--global')), false);
});

test('interactive credential failure and remote timeout fail closed without write fallback', () => {
  const commit = 'c'.repeat(40);
  const credentialFailure = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: { identity: 'fixture/repository', location: '/fixture/repository' },
    expected_ref: 'refs/heads/main',
    expected_commit: commit,
    remote: { name: 'origin', target_ref: 'refs/heads/main', expected_commit: commit },
    remote_timeout_ms: 25,
  }, {
    git: localFakeGit(commit, {
      exit_code: 128,
      signal: null,
      error_code: null,
      timed_out: false,
      stdout: '',
      stderr: 'fatal: could not read Username: terminal prompts disabled',
    }),
    exists: () => true,
  });
  assert.equal(credentialFailure.status, 'UNAVAILABLE');
  assert.equal(credentialFailure.reason, 'REMOTE_OBSERVATION_UNAVAILABLE');

  const timeout = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: { identity: 'fixture/repository', location: '/fixture/repository' },
    expected_ref: 'refs/heads/main',
    expected_commit: commit,
    remote: { name: 'origin', target_ref: 'refs/heads/main', expected_commit: commit },
    remote_timeout_ms: 25,
  }, {
    git: localFakeGit(commit, {
      exit_code: null,
      signal: 'SIGTERM',
      error_code: 'ETIMEDOUT',
      timed_out: true,
      stdout: '',
      stderr: '',
    }),
    exists: () => true,
  });
  assert.equal(timeout.status, 'UNAVAILABLE');
  assert.equal(timeout.reason, 'REMOTE_OBSERVATION_TIMEOUT');
});

test('integrate recipe declaration maps to generic qualification input without adapter semantics', () => {
  const base = 'a'.repeat(40);
  const candidate = 'b'.repeat(40);
  const spec = qualificationSpecForRecipe({
    id: 'integrate_accepted_candidate',
    version: 'v0',
  }, {
    target_ref: 'refs/heads/tools',
    expected_target_commit: base,
    candidate_commit: candidate,
    candidate_parent: base,
    remote: {
      remote: 'origin',
      target_ref: 'refs/heads/tools',
      expected_commit: base,
    },
  });

  assert.equal(spec.kind, 'REQUIRED');
  assert.equal(spec.expected_ref, 'refs/heads/tools');
  assert.equal(spec.expected_commit, base);
  assert.deepEqual(spec.remote, {
    name: 'origin',
    target_ref: 'refs/heads/tools',
    expected_commit: base,
  });
  assert.equal(Object.hasOwn(spec, 'adapter'), false);
});

test('worker blocks before ExecutionAttempt creation when selected surface lacks competent Git context', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-worker-git-qualification-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const repository = path.join(root, 'non-git');
  fs.mkdirSync(home);
  fs.mkdirSync(repository);
  const store = new FilesystemStateStore(home);
  store.initialize();
  create(store, 0, 'TaskCycle', 'TC-GIT-QUALIFY', {
    responsibility: 'TEST_GIT_EXECUTION_QUALIFICATION',
    obligations: [],
  }, [{ kind: 'AUTHORITY', id: 'DEV-GIT-QUALIFY' }]);
  transition(store, 1, 'TaskCycle', 'TC-GIT-QUALIFY', 'ACTIVE');
  create(store, 2, 'Operation', 'OP-GIT-QUALIFY', {
    taskcycle_id: 'TC-GIT-QUALIFY',
    objective: 'prove qualification blocks before dispatch',
  }, [{ kind: 'AUTHORITY', id: 'DEV-GIT-QUALIFY' }]);

  const oidA = 'a'.repeat(40);
  const result = await runWorkerInvocation({
    schema_version: 'tecnotron-recipe-invocation-worker-envelope/v0',
    request: {
      schema_version: 'tecnotron-recipe-invocation-request/v0',
      recipe: { id: 'integrate_accepted_candidate', version: 'v0' },
      operation_ref: 'OP-GIT-QUALIFY',
      responsibility_ref: 'TEST_GIT_EXECUTION_QUALIFICATION',
      authority_ref: 'DEV-GIT-QUALIFY',
      expected_effects: [{ effect: 'git.integration', scope: 'exact target ref only' }],
      evidence_refs: [],
      inputs: {
        target_ref: 'refs/heads/tools',
        expected_target_commit: oidA,
        candidate_commit: 'b'.repeat(40),
        candidate_parent: oidA,
      },
      execution_constraints: { require: [] },
    },
    attempt_ref: 'ATTEMPT-GIT-QUALIFY',
    environment: {
      schema_version: 'tecnotron-recipe-invocation-environment/v0',
      repository: { identity: 'fixture/non-git', location: repository },
      state_store: { reference: 'state:fixture', location: home },
      surfaces: [{
        id: 'native-test',
        adapter: 'NATIVE_NODE',
        capabilities: ['NODE_RUNTIME', 'CHILD_PROCESS', 'REPOSITORY_ACCESS'],
        conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native-test' },
      }],
    },
    selected_surface: {
      id: 'native-test',
      adapter: 'NATIVE_NODE',
      capabilities: ['NODE_RUNTIME', 'CHILD_PROCESS', 'REPOSITORY_ACCESS'],
      conformance: { disposition: 'CONFORMING', evidence_ref: 'evidence:native-test' },
    },
  });

  assert.equal(result.started, false);
  assert.equal(result.terminal_status, 'BLOCKED');
  assert.equal(result.git_execution_qualification.status, 'BLOCKED');
  assert.match(result.reason, /^GIT_EXECUTION_QUALIFICATION_BLOCKED:/);
  assert.throws(
    () => inspect(store, 'ExecutionAttempt', 'ATTEMPT-GIT-QUALIFY'),
    /missing ExecutionAttempt/,
  );
});

test('real differing ownership uses only process-local safe.directory and preserves repository/global config', {
  skip: !process.env.TECNOTRON_OWNERSHIP_REPOSITORY,
}, () => {
  const repository = process.env.TECNOTRON_OWNERSHIP_REPOSITORY;
  const expectedRef = 'refs/heads/main';
  const noninteractiveEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'Never',
  };

  const baseline = spawnSync('git', ['-C', repository, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    shell: false,
    env: noninteractiveEnv,
  });
  assert.notEqual(baseline.status, 0);
  assert.match(`${baseline.stdout || ''}\n${baseline.stderr || ''}`, /dubious ownership|safe\.directory/i);

  function safeGit(args) {
    const result = spawnSync('git', [
      '-c', `safe.directory=${repository}`,
      '-C', repository,
      ...args,
    ], {
      encoding: 'utf8',
      shell: false,
      env: noninteractiveEnv,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    return (result.stdout || '').trim();
  }

  function digestOrAbsent(file) {
    if (!fs.existsSync(file)) return 'ABSENT';
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }

  const home = process.env.HOME;
  assert.ok(home);
  const globalConfig = path.join(home, '.gitconfig');
  const repositoryConfig = path.join(repository, '.git', 'config');
  const expectedCommit = safeGit(['rev-parse', 'HEAD']);
  const before = {
    ref: safeGit(['symbolic-ref', '--quiet', 'HEAD']),
    commit: expectedCommit,
    status: safeGit(['status', '--porcelain=v1', '--untracked-files=all']),
    repository_config: digestOrAbsent(repositoryConfig),
    global_config: digestOrAbsent(globalConfig),
  };

  const result = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'docker-node-different-owner',
    repository: { identity: 'fixture/root-owned', location: repository },
    expected_ref: expectedRef,
    expected_commit: expectedCommit,
    remote_timeout_ms: 1000,
  });

  assert.equal(result.status, 'READY');
  assert.equal(result.evidence.surface.qualification_method, 'PROCESS_LOCAL_SAFE_DIRECTORY');
  assert.deepEqual(result.evidence.mutations, {
    repository: 'NONE',
    remote: 'NONE',
    persistent_global_git_config: 'NONE',
  });

  const after = {
    ref: safeGit(['symbolic-ref', '--quiet', 'HEAD']),
    commit: safeGit(['rev-parse', 'HEAD']),
    status: safeGit(['status', '--porcelain=v1', '--untracked-files=all']),
    repository_config: digestOrAbsent(repositoryConfig),
    global_config: digestOrAbsent(globalConfig),
  };
  assert.deepEqual(after, before);
});
