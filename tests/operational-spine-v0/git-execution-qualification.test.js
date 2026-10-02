'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const {
  FilesystemStateStore,
  create,
  transition,
  inspect,
} = require('../../src/state-kernel-v0');
const {
  boundedGitEnvironment,
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

function localFakeGit(commit, remoteResult, {
  worktree = '/fixture/repository',
  remoteUrl = 'https://example.invalid/repository.git',
} = {}) {
  return {
    run(repositoryPath, args) {
      if (args.includes('--is-inside-work-tree')) return ok('true\n');
      if (args.includes('--show-toplevel')) return ok(worktree + '\n');
      if (args.includes('symbolic-ref')) return ok('refs/heads/main\n');
      if (args[0] === 'remote' && args[1] === 'get-url') return ok(remoteUrl + '\n');
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

async function startCredentialServer(t, logFile) {
  const script = [
    "const fs=require('node:fs');",
    "const http=require('node:http');",
    "const log=process.env.REQUEST_LOG;",
    "const server=http.createServer((req,res)=>{",
    "fs.appendFileSync(log,req.method+' '+req.url+'\\n');",
    "res.statusCode=401;",
    "res.setHeader('WWW-Authenticate','Basic realm=\\\"qualification\\\"');",
    "res.end('authentication required');",
    "});",
    "server.listen(0,'127.0.0.1',()=>{",
    "process.stdout.write(String(server.address().port)+'\\n');",
    "});",
  ].join('');

  const child = spawn(process.execPath, ['-e', script], {
    env: { ...process.env, REQUEST_LOG: logFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (!child.killed) child.kill();
  });

  return await new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('credential fixture server did not become ready: ' + stderr));
    }, 3000);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      const newline = stdout.indexOf('\n');
      if (newline === -1) return;
      clearTimeout(timer);
      const port = Number(stdout.slice(0, newline).trim());
      if (!Number.isInteger(port) || port <= 0) {
        reject(new Error('invalid credential fixture port: ' + stdout));
        return;
      }
      resolve({
        child,
        url: `http://user@127.0.0.1:${port}/repository.git`,
      });
    });
    child.once('exit', code => {
      if (!stdout.includes('\n')) {
        clearTimeout(timer);
        reject(new Error('credential fixture server exited early: ' + code + ' ' + stderr));
      }
    });
  });
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
  assert.equal(path.resolve(result.evidence.repository.observed_worktree), path.resolve(fx.repository));
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

test('effective Git worktree must exactly correspond to the declared repository location', t => {
  const fx = fixture(t);
  const nested = path.join(fx.repository, 'nested');
  fs.mkdirSync(nested);

  const result = qualifyGitExecutionSurface(requestFor(fx, {
    repository: {
      identity: 'fixture/nested',
      location: nested,
    },
  }));

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'EFFECTIVE_WORKTREE_MISMATCH');
  assert.equal(path.resolve(result.evidence.repository.observed_worktree), path.resolve(fx.repository));
});

test('valid linked worktree qualifies by its Git-observed top level without assuming .git is a directory', t => {
  const fx = fixture(t);
  const linked = path.join(fx.root, 'linked-worktree');
  git(fx.repository, ['worktree', 'add', '-b', 'linked', linked]);
  const expectedCommit = git(linked, ['rev-parse', 'HEAD']);

  assert.equal(fs.statSync(path.join(linked, '.git')).isFile(), true);

  const result = qualifyGitExecutionSurface({
    schema_version: 'tecnotron-git-execution-qualification-request/v0',
    surface_id: 'fixture-surface',
    repository: { identity: 'fixture/linked', location: linked },
    expected_ref: 'refs/heads/linked',
    expected_commit: expectedCommit,
    remote_timeout_ms: 1000,
  });

  assert.equal(result.status, 'READY');
  assert.equal(path.resolve(result.evidence.repository.observed_worktree), path.resolve(linked));
});

test('real Git adapter neutralizes contaminated repository-selection and config environment', t => {
  const fx = fixture(t);
  const other = path.join(fx.root, 'other-repository');
  fs.mkdirSync(other);
  git(other, ['init']);
  git(other, ['config', 'user.email', 'other@example.invalid']);
  git(other, ['config', 'user.name', 'Other Fixture']);
  fs.writeFileSync(path.join(other, 'other.txt'), 'other\n');
  git(other, ['add', 'other.txt']);
  git(other, ['commit', '-m', 'other']);
  git(other, ['branch', '-M', 'main']);

  const contaminated = {
    ...process.env,
    GIT_DIR: path.join(other, '.git'),
    GIT_WORK_TREE: other,
    GIT_COMMON_DIR: path.join(other, '.git'),
    GIT_INDEX_FILE: path.join(other, '.git', 'index'),
    GIT_OBJECT_DIRECTORY: path.join(other, '.git', 'objects'),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(other, '.git', 'objects'),
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.bare',
    GIT_CONFIG_VALUE_0: 'true',
    GIT_CONFIG_SYSTEM: path.join(fx.root, 'system.gitconfig'),
    GIT_CONFIG_GLOBAL: path.join(fx.root, 'global.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '0',
  };

  const baseline = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: fx.repository,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    env: contaminated,
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.error?.message);
  assert.equal(path.resolve((baseline.stdout || '').trim()), path.resolve(other));

  const bounded = boundedGitEnvironment(contaminated);
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_COMMON_DIR',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_KEY_0',
    'GIT_CONFIG_VALUE_0',
    'GIT_CONFIG_SYSTEM',
  ]) {
    assert.equal(Object.hasOwn(bounded, key), false, key);
  }
  assert.equal(bounded.GIT_CONFIG_NOSYSTEM, '1');
  assert.equal(bounded.GIT_CONFIG_GLOBAL, process.platform === 'win32' ? 'NUL' : '/dev/null');

  const result = qualifyGitExecutionSurface(requestFor(fx), {
    git: createGitCliAdapter({ env: contaminated }),
  });
  assert.equal(result.status, 'READY');
  assert.equal(path.resolve(result.evidence.repository.observed_worktree), path.resolve(fx.repository));
  assert.equal(result.evidence.repository.observed_commit, fx.expected_commit);
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
      if (args.includes('--show-toplevel')) return ok('/fixture/repository\n');
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
    if (args.includes('--show-toplevel')) return spawnResult('/fixture/repository\n');
    if (args.includes('symbolic-ref')) return spawnResult('refs/heads/main\n');
    if (args[0] === 'remote' && args[1] === 'get-url') return spawnResult('https://example.invalid/repository.git\n');
    if (args.includes('rev-parse')) return spawnResult(commit + '\n');
    if (args.includes('ls-remote')) return spawnResult(commit + '\trefs/heads/main\n');
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
  assert.equal(remoteCall.options.env.GIT_CONFIG_NOSYSTEM, '1');
  assert.equal(result.evidence.remote.transport_class, 'HTTPS');
  assert.equal(result.evidence.remote.interaction_policy, 'BOUNDED_NONINTERACTIVE_V0');
  assert.equal(remoteCall.args.includes('credential.helper='), true);
  assert.equal(remoteCall.args.includes('core.askPass='), true);
  assert.equal(calls.some((call) => call.args.includes('push')), false);
  assert.equal(calls.some((call) => call.args.includes('--global')), false);
});


test('unsupported SSH transport fails closed before remote observation', t => {
  const fx = fixture(t);
  git(fx.repository, ['remote', 'add', 'ssh-origin', 'git@example.invalid:fixture/repository.git']);

  const result = qualifyGitExecutionSurface(requestFor(fx, {
    remote: {
      name: 'ssh-origin',
      target_ref: 'refs/heads/main',
      expected_commit: fx.expected_commit,
    },
  }));

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'UNSUPPORTED_REMOTE_TRANSPORT');
  assert.equal(result.evidence.remote.transport_class, 'SSH');
  assert.equal(result.evidence.remote.observation_status, 'BLOCKED');
});

test('real Git adapter disables askpass and injected credential helpers against an HTTP auth challenge', {
  skip: process.platform === 'win32',
}, async t => {
  const fx = fixture(t);
  const logFile = path.join(fx.root, 'http-requests.log');
  const marker = path.join(fx.root, 'askpass-invoked.log');
  const askpass = path.join(fx.root, 'askpass.sh');
  fs.writeFileSync(askpass, `#!/bin/sh\nprintf 'invoked\\n' >> "${marker}"\nprintf 'dummy\\n'\n`, { mode: 0o755 });

  const server = await startCredentialServer(t, logFile);
  const credentialProbe = spawnSync('git', ['credential', 'fill'], {
    cwd: fx.repository,
    encoding: 'utf8',
    shell: false,
    input: `protocol=http\nhost=${new URL(server.url).host}\nusername=user\n\n`,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '1',
      GIT_ASKPASS: askpass,
    },
    timeout: 1000,
  });
  assert.equal(credentialProbe.status, 0, credentialProbe.stderr || credentialProbe.error?.message);
  assert.equal(
    fs.existsSync(marker),
    true,
    'real Git credential resolution should invoke inherited askpass without the qualification boundary',
  );
  fs.rmSync(marker, { force: true });

  git(fx.repository, ['remote', 'add', 'credential-origin', server.url]);
  const contaminated = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '1',
    GIT_ASKPASS: askpass,
    SSH_ASKPASS: askpass,
    SSH_ASKPASS_REQUIRE: 'force',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'credential.helper',
    GIT_CONFIG_VALUE_0: `!${askpass}`,
  };
  const started = Date.now();
  const result = qualifyGitExecutionSurface(requestFor(fx, {
    remote: {
      name: 'credential-origin',
      target_ref: 'refs/heads/main',
      expected_commit: fx.expected_commit,
    },
    remote_timeout_ms: 500,
  }), {
    git: createGitCliAdapter({ env: contaminated }),
  });
  const elapsed = Date.now() - started;

  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.reason, 'REMOTE_OBSERVATION_UNAVAILABLE');
  assert.equal(result.evidence.remote.transport_class, 'HTTP');
  assert.equal(result.evidence.remote.interaction_policy, 'BOUNDED_NONINTERACTIVE_V0');
  assert.equal(fs.existsSync(marker), false, 'qualification must not invoke inherited askpass or credential helper');
  assert.ok(elapsed < 2500, `qualification exceeded bounded completion: ${elapsed}ms`);
  const requests = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
  assert.match(requests, /git-upload-pack/);
  assert.doesNotMatch(requests, /git-receive-pack/);
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
