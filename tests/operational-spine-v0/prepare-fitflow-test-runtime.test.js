'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');

const {
  createPrepareFitFlowTestRuntimeRecipe,
  effectsForInput,
} = require('../../src/operational-spine-v0/recipes/prepare-fitflow-test-runtime');

const HEAD = 'e4f5a6b7c8d9';

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function composeDocument({ database = 'fitflow_test', user = 'fitflow_test_user', hostPort } = {}) {
  return {
    name: 'fitflow-test',
    services: {
      postgres_test: {
        image: 'postgres:15-alpine',
        environment: { POSTGRES_DB: database, POSTGRES_USER: user, POSTGRES_PASSWORD: 'test-only' },
        ...(hostPort ? { ports: [{ target: 5432, published: String(hostPort) }] } : {}),
      },
      backend_test: {
        build: { context: '.', dockerfile: 'backend/Dockerfile.test' },
        environment: {
          DATABASE_URL: `postgresql://${user}:test-only@postgres_test:5432/${database}`,
          REDIS_URL: 'redis://redis_test:6379/0',
        },
      },
      redis_test: { image: 'redis:7-alpine' },
    },
  };
}

function fixture(t, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-fitflow-runtime-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'backend'), { recursive: true });
  const compose = composeDocument(options);
  fs.writeFileSync(path.join(root, 'docker-compose.test.yml'), YAML.stringify(compose));
  fs.writeFileSync(path.join(root, 'backend', 'marker.txt'), 'candidate bytes\n');
  if (options.canonicalVenv) {
    const directory = path.join(root, 'backend', '.venv', process.platform === 'win32' ? 'Scripts' : 'bin');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, process.platform === 'win32' ? 'python.exe' : 'python'), 'fixture');
  }
  if (options.retiredVenv) {
    const directory = path.join(root, 'backend', '.venv_backend', process.platform === 'win32' ? 'Scripts' : 'bin');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, process.platform === 'win32' ? 'python.exe' : 'python'), 'retired');
  }
  git(root, ['init']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['checkout', '-b', 'candidate']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'fixture']);
  return {
    root,
    compose,
    commit: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
  };
}

function ok(stdout = '', stderr = '') {
  return { exit_code: 0, signal: null, error: null, stdout, stderr };
}

function failed(stderr = 'simulated command failure') {
  return { exit_code: 1, signal: null, error: null, stdout: '', stderr };
}

function testRunner(f, override = () => null) {
  const calls = [];
  return {
    calls,
    run(spec) {
      calls.push(spec);
      const overridden = override(spec);
      if (overridden) return overridden;
      if (spec.executable === 'git') {
        const result = spawnSync('git', spec.args, { cwd: spec.cwd, encoding: 'utf8', shell: false });
        return {
          exit_code: result.status,
          signal: result.signal || null,
          error: result.error || null,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
        };
      }
      const joined = spec.args.join(' ');
      if (spec.executable === 'docker' && joined === '--version') return ok('Docker version 29.4.0\n');
      if (spec.executable === 'docker' && joined === 'compose version') return ok('Docker Compose version v5.1.0\n');
      if (joined.includes(' config --format json')) return ok(`${JSON.stringify(f.compose)}\n`);
      if (joined.includes(' ps --all --format json')) {
        return ok(`${JSON.stringify([
          { Service: 'backend_test', State: 'running', Health: '', ID: 'backend-runtime-id' },
          { Service: 'postgres_test', State: 'running', Health: 'healthy', ID: 'postgres-runtime-id' },
          { Service: 'redis_test', State: 'running', Health: 'healthy', ID: 'redis-runtime-id' },
        ])}\n`);
      }
      if (joined.includes('redis-cli PING')) return ok('PONG\n');
      if (joined.includes('python --version')) return ok('Python 3.13.7\n');
      if (joined.includes('importlib.metadata')) return ok('{"pytest":"9.2.1","pytest_asyncio":"1.4.0"}\n');
      if (joined.includes('SELECT current_database(), current_user;')) return ok('fitflow_test|fitflow_test_user\n');
      if (joined.endsWith('alembic heads')) return ok(`${HEAD} (head)\n`);
      if (joined.endsWith('alembic current')) return ok(`${HEAD} (head)\n`);
      throw new Error(`unexpected command: ${spec.executable} ${joined}`);
    },
  };
}

function baseInput(overrides = {}) {
  return {
    repository_identity: 'fitflow',
    required_alembic_head: HEAD,
    validation_surface: 'COMPOSE_BACKEND_TEST',
    authority: {
      may_start_services: false,
      may_build_services: false,
      may_recreate_services: false,
      may_reset_test_database: false,
      may_reset_redis: false,
      may_upgrade_test_database: false,
    },
    actions: {},
    ...overrides,
  };
}

function request(f, input = baseInput(), authorizationOverrides = {}) {
  return {
    recipe_id: 'prepare_fitflow_test_runtime',
    recipe_version: 'v0',
    operation_id: 'OP-FITFLOW-RUNTIME',
    execution_attempt_id: 'AT-FITFLOW-RUNTIME',
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: 'OP-FITFLOW-RUNTIME',
      taskcycle_id: 'TC-FITFLOW-RUNTIME',
      repository: { identity: 'fitflow', location: f.root },
      worktree: { identity: 'fitflow-candidate', location: f.root },
      git: { expected_ref: 'refs/heads/candidate', expected_commit: f.commit },
      runtime: { executor: 'OpenCode', platform: process.platform, runtime_identity: process.version },
      state_store: { reference: 'maturation-fixture' },
      authority_refs: [],
      evidence_refs: [],
    },
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: 'DEVLAB-RECIPE-MATURATION',
      effect_constraints: [{ effect: 'observation.only', scope: 'fitflow test runtime' }],
      ...authorizationOverrides,
    },
    evidence_refs: [{ kind: 'EVIDENCE', id: 'raw-fitflow-source' }],
    input,
  };
}

test('accepts valid isolated FitFlow Compose runtime and emits structured evidence', async t => {
  const f = fixture(t);
  const runner = testRunner(f);
  const recipe = createPrepareFitFlowTestRuntimeRecipe({ runner });
  const req = request(f, baseInput({ candidate_identity_optional: { commit: f.commit, tree: f.tree } }));
  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const result = await recipe.execute(req);
  assert.equal(result.status, 'PASS');
  assert.equal(result.effect_state, 'NONE');
  assert.equal(result.output.runtime_identity.compose_project, 'fitflow-test');
  assert.equal(result.output.runtime_identity.database, 'fitflow_test');
  assert.equal(result.output.runtime_identity.database_user, 'fitflow_test_user');
  assert.equal(result.output.runtime_identity.python, 'Python 3.13.7');
  assert.equal(result.output.runtime_identity.pytest, '9.2.1');
  assert.equal(result.output.runtime_identity.alembic_current, HEAD);
  assert.equal(result.output.postconditions.candidate_unchanged, true);
  assert.equal(result.output.postconditions.development_database_selected_or_modified, false);
  assert.ok(result.output.commands.length >= 15);
  assert.ok(result.output.commands.every(record => record.intent && record.effective_command && record.exit_code === 0));
  assert.deepEqual(result.evidence_refs, req.evidence_refs);
  assert.equal(git(f.root, ['status', '--porcelain=v1']), '');
  assert.equal(git(f.root, ['rev-parse', 'HEAD']), f.commit);
  assert.equal(git(f.root, ['rev-parse', 'HEAD^{tree}']), f.tree);
});

test('rejects configured fitflow_db before any runtime probe', async t => {
  const f = fixture(t, { database: 'fitflow_db', user: 'fitflow_admin' });
  const runner = testRunner(f);
  const recipe = createPrepareFitFlowTestRuntimeRecipe({ runner });
  const preflight = await recipe.preflight(request(f));
  assert.equal(preflight.status, 'BLOCKED');
  assert.match(preflight.reason, /^DATABASE_IDENTITY:/);
  assert.equal(runner.calls.some(call => call.args.join(' ').includes('SELECT current_database')), false);
});

test('blocks when actual database identity cannot be proven despite valid configured name', async t => {
  const f = fixture(t);
  const runner = testRunner(f, spec => spec.args.join(' ').includes('SELECT current_database') ? ok('') : null);
  const recipe = createPrepareFitFlowTestRuntimeRecipe({ runner });
  assert.deepEqual(await recipe.preflight(request(f)), {
    status: 'BLOCKED',
    reason: 'COMMAND_CORRESPONDENCE:DATABASE_PROBE_OUTPUT_UNPROVEN',
  });
  const result = await recipe.execute(request(f));
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'COMMAND_CORRESPONDENCE:DATABASE_PROBE_OUTPUT_UNPROVEN');
  assert.equal(result.output.postconditions.configured_database_is_fitflow_test, true);
  assert.equal(result.output.postconditions.actual_database_is_fitflow_test, false);
});

test('rejects an actual development database even when Compose configuration says fitflow_test', async t => {
  const f = fixture(t);
  const runner = testRunner(f, spec => spec.args.join(' ').includes('SELECT current_database')
    ? ok('fitflow_db|fitflow_test_user\n')
    : null);
  const result = await createPrepareFitFlowTestRuntimeRecipe({ runner }).execute(request(f));
  assert.equal(result.status, 'FAIL');
  assert.equal(result.output.failure_class, 'DATABASE_IDENTITY');
  assert.match(result.reason, /ACTUAL_DATABASE_IDENTITY_MISMATCH:fitflow_db/);
  assert.equal(result.output.postconditions.development_database_selected_or_modified, true);
});

test('observes local host port and runtime versions rather than hardcoding historical values', async t => {
  const f = fixture(t, { canonicalVenv: true });
  const runner = testRunner(f, spec => {
    if (spec.executable === 'git') return null;
    const joined = spec.args.join(' ');
    if (joined === '--version') return ok('Python 3.12.11\n');
    if (joined.includes('importlib.metadata')) return ok('{"pytest":"8.4.9","pytest_asyncio":"1.2.7"}\n');
    if (joined.includes('create_engine')) return ok('{"database":"fitflow_test","user":"fitflow_test_user"}\n');
    if (joined.endsWith('-m alembic heads')) return ok(`${HEAD} (head)\n`);
    if (joined.endsWith('-m alembic current')) return ok(`${HEAD} (head)\n`);
    return null;
  });
  const input = baseInput({
    validation_surface: 'LOCAL_PROJECT_VENV',
    local_database_url: 'postgresql://fitflow_test_user:test-only@127.0.0.1:6547/fitflow_test',
  });
  const result = await createPrepareFitFlowTestRuntimeRecipe({ runner }).execute(request(f, input));
  assert.equal(result.status, 'PASS');
  assert.equal(result.output.runtime_identity.host_postgresql_port, 6547);
  assert.equal(result.output.runtime_identity.python, 'Python 3.12.11');
  assert.equal(result.output.runtime_identity.pytest, '8.4.9');
  assert.equal(result.output.runtime_identity.pytest_asyncio, '1.2.7');
  const databaseProbe = runner.calls.find(call => call.args.join(' ').includes('create_engine'));
  assert.equal(databaseProbe.env.DATABASE_URL.endsWith(':6547/fitflow_test'), true);
  const evidence = result.output.commands.find(record => record.intent === 'prove actual PostgreSQL database identity');
  assert.deepEqual(evidence.effective_command.environment_overrides, [
    'DATABASE_URL', 'ENV', 'PYTEST_ADDOPTS', 'PYTHONDONTWRITEBYTECODE', 'TESTING',
  ]);
  assert.equal(JSON.stringify(evidence).includes('test-only@'), false);
});

test('refuses destructive database reset without explicit input authority', async t => {
  const f = fixture(t);
  const input = baseInput({
    authority: {
      ...baseInput().authority,
      may_upgrade_test_database: true,
    },
    actions: { reset_test_database: true, upgrade_test_database: true },
  });
  assert.deepEqual(effectsForInput(input), [
    { effect: 'database.reset', scope: 'fitflow-test/fitflow_test' },
    { effect: 'database.migrate', scope: 'fitflow-test/fitflow_test' },
  ]);
  const recipe = createPrepareFitFlowTestRuntimeRecipe({ runner: testRunner(f) });
  const preflight = await recipe.preflight(request(f, input, {
    effect_constraints: [
      { effect: 'database.reset', scope: 'fitflow-test/fitflow_test' },
      { effect: 'database.migrate', scope: 'fitflow-test/fitflow_test' },
    ],
  }));
  assert.deepEqual(preflight, {
    status: 'BLOCKED',
    reason: 'AUTHORITY:INPUT_AUTHORITY_REQUIRED:may_reset_test_database',
  });
});

test('never falls back to retired backend/.venv_backend', async t => {
  const f = fixture(t, { retiredVenv: true });
  const input = baseInput({
    validation_surface: 'LOCAL_PROJECT_VENV',
    local_database_url: 'postgresql://fitflow_test_user:test-only@127.0.0.1:7654/fitflow_test',
  });
  const preflight = await createPrepareFitFlowTestRuntimeRecipe({ runner: testRunner(f) })
    .preflight(request(f, input));
  assert.deepEqual(preflight, { status: 'UNAVAILABLE', reason: 'CANONICAL_PROJECT_VENV_UNAVAILABLE_NO_FALLBACK' });
});

test('preserves exact repository and candidate identity in the receipt', async t => {
  const f = fixture(t);
  const input = baseInput({ candidate_identity_optional: { commit: f.commit, tree: f.tree } });
  const result = await createPrepareFitFlowTestRuntimeRecipe({ runner: testRunner(f) }).execute(request(f, input));
  assert.equal(result.status, 'PASS');
  assert.equal(result.output.repository_identity.commit, f.commit);
  assert.equal(result.output.repository_identity.tree, f.tree);
  assert.deepEqual(result.output.candidate_identity_if_any, { commit: f.commit, tree: f.tree });
});

test('distinguishes command failure from successful command without corresponding evidence', async t => {
  const commandFailureFixture = fixture(t);
  const commandFailureRunner = testRunner(commandFailureFixture, spec => (
    spec.args.join(' ').includes('SELECT current_database') ? failed('database unavailable') : null
  ));
  const commandFailure = await createPrepareFitFlowTestRuntimeRecipe({ runner: commandFailureRunner })
    .execute(request(commandFailureFixture));
  assert.equal(commandFailure.reason, 'DATABASE_IDENTITY:DATABASE_PROBE_COMMAND_FAILED');
  const failedRecord = commandFailure.output.commands.find(record => record.intent === 'prove actual PostgreSQL database identity');
  assert.equal(failedRecord.exit_code, 1);

  const correspondenceFixture = fixture(t);
  const correspondenceRunner = testRunner(correspondenceFixture, spec => (
    spec.args.join(' ').includes('SELECT current_database') ? ok('command completed but no identity\n') : null
  ));
  const correspondence = await createPrepareFitFlowTestRuntimeRecipe({ runner: correspondenceRunner })
    .execute(request(correspondenceFixture));
  assert.equal(correspondence.reason, 'COMMAND_CORRESPONDENCE:DATABASE_PROBE_OUTPUT_UNPROVEN');
  const correspondenceRecord = correspondence.output.commands.find(record => record.intent === 'prove actual PostgreSQL database identity');
  assert.equal(correspondenceRecord.exit_code, 0);
});

test('candidate mismatch fails closed before Docker or database access', async t => {
  const f = fixture(t);
  const runner = testRunner(f);
  const input = baseInput({ candidate_identity_optional: { commit: f.commit, tree: 'f'.repeat(40) } });
  const preflight = await createPrepareFitFlowTestRuntimeRecipe({ runner }).preflight(request(f, input));
  assert.equal(preflight.status, 'BLOCKED');
  assert.match(preflight.reason, /^REPOSITORY_IDENTITY:CANDIDATE_IDENTITY_MISMATCH/);
  assert.equal(runner.calls.some(call => call.executable === 'docker'), false);
});

test('Recipe is exposed through the established Operational Spine public surface', () => {
  const spine = require('../../src/operational-spine-v0');
  assert.equal(spine.createPrepareFitFlowTestRuntimeRecipe, createPrepareFitFlowTestRuntimeRecipe);
});
