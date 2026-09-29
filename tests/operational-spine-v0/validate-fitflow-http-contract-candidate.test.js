'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  createValidateFitFlowHttpContractCandidateRecipe,
} = require('../../src/operational-spine-v0/recipes/validate-fitflow-http-contract-candidate');
const { RecipeRegistry } = require('../../src/operational-spine-v0/recipe-registry');

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

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-validate-fitflow-http-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['checkout', '-b', 'develop']);
  fs.writeFileSync(path.join(root, 'base.txt'), 'base\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  const parent = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', '-b', 'candidate']);
  fs.writeFileSync(path.join(root, 'contract.txt'), 'contract\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'candidate']);
  return {
    root,
    parent,
    commit: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
  };
}

function ok(stdout = '') {
  return {
    exit_code: 0,
    stdout,
    stderr: '',
    signal: null,
    error_code: null,
    error_message: null,
  };
}

function runner(overrides = {}) {
  const calls = [];
  const probes = [];
  return {
    calls,
    probes,
    probe(input) {
      probes.push(input);
      return overrides.probe?.(input) ?? ok('tool version\n');
    },
    run(input) {
      calls.push(input);
      return overrides.run?.(input) ?? ok(`${input.step_id} pass\n`);
    },
  };
}

function request(f, testRunner, overrides = {}) {
  const candidate = {
    repository_identity: 'fitflow',
    expected_ref: 'refs/heads/candidate',
    parent: f.parent,
    commit: f.commit,
    tree: f.tree,
    allowed_changed_paths: ['contract.txt'],
  };
  const runtime = {
    status: 'COMPETENT',
    source_recipe: {
      id: 'prepare_fitflow_test_runtime',
      version: 'v0',
      receipt_ref: 'recipe-receipt:runtime:prepare-fitflow-test-runtime',
    },
    repository_identity: 'fitflow',
    candidate_ref: candidate.expected_ref,
    candidate_commit: candidate.commit,
    candidate_tree: candidate.tree,
    compose_project: 'fitflow-test',
    backend_service: 'backend_test',
    database: 'fitflow_test',
    database_user: 'fitflow_test_user',
    development_database: 'fitflow_db',
    development_database_excluded: true,
    backend_root: f.root,
    tooling: {
      targeted_pytest: { executable: 'python', args_prefix: ['-m', 'pytest'], probe_args: ['--version'] },
      full_regression: { executable: 'python', args_prefix: ['-m', 'pytest'], probe_args: ['--version'] },
      ruff: { executable: 'ruff', args_prefix: ['check'], probe_args: ['--version'] },
      pyright: { executable: 'pyright', args_prefix: [], probe_args: ['--version'] },
    },
  };
  const profile = {
    targeted_pytest_selectors: [
      'backend/tests/api/test_auth.py::test_one',
      'backend/tests/api/test_auth.py::test_two',
    ],
    full_backend_regression: { requested: true, args: ['backend/tests'] },
    ruff: { requested: true, scope: ['backend/app', 'backend/tests/api/test_auth.py'] },
    pyright: { requested: true, scope: ['backend/app', 'backend/tests/api/test_auth.py'] },
    extra_probes: [],
  };
  const input = {
    responsibility: {
      taskcycle_id: 'TASKCYCLE-TEST-001',
      responsibility_id: 'FITFLOW_HTTP_CONTRACT_TEST',
      validation_attempt_id: 'VALIDATION-001',
    },
    candidate,
    runtime_correspondence: runtime,
    validation_profile: profile,
    ...(overrides.input || {}),
  };
  return {
    recipe: createValidateFitFlowHttpContractCandidateRecipe({ runner: testRunner }),
    raw: {
      recipe_id: 'validate_fitflow_http_contract_candidate',
      recipe_version: 'v0',
      operation_id: 'OP-001',
      execution_attempt_id: 'ATTEMPT-001',
      context: {
        schema_version: 'tecnotron-execution-context/v0',
        operation_id: 'OP-001',
        taskcycle_id: 'TASKCYCLE-TEST-001',
        repository: { identity: 'fitflow', location: f.root },
        worktree: { identity: 'candidate', location: f.root },
        git: { expected_ref: candidate.expected_ref, expected_commit: candidate.commit },
        runtime: { executor: 'test', platform: process.platform, runtime_identity: process.version },
        state_store: { reference: 'fixture-state' },
        authority_refs: [],
        evidence_refs: [],
      },
      authorization: {
        disposition: 'AUTHORIZED',
        authority_reference: 'DEV-TEST',
        effect_constraints: [],
      },
      evidence_refs: [],
      input,
    },
  };
}

test('exact candidate and competent fitflow_test runtime produce a mechanical PASS with raw evidence', async t => {
  const f = fixture(t);
  const r = runner();
  const { recipe, raw } = request(f, r);
  assert.deepEqual(await recipe.preflight(raw), { status: 'READY' });
  const before = git(f.root, ['rev-parse', 'HEAD']);
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'NONE');
  assert.equal(receipt.output.observation.product_semantic_disposition, 'NOT_ADJUDICATED');
  assert.equal(receipt.output.runtime_correspondence.database, 'fitflow_test');
  assert.equal(receipt.output.runtime_correspondence.development_database, 'fitflow_db');
  assert.notEqual(receipt.output.runtime_correspondence.database, receipt.output.runtime_correspondence.development_database);
  assert.equal(receipt.output.command_records.length, 5);
  assert.equal(receipt.output.command_records.every(record => Number.isInteger(record.exit_code)), true);
  assert.equal(git(f.root, ['rev-parse', 'HEAD']), before);
  assert.equal(git(f.root, ['status', '--porcelain=v1', '--untracked-files=all']), '');
  assert.equal(Object.hasOwn(receipt.output, 'verdict'), false);
  assert.equal(Object.hasOwn(receipt.output, 'developer_acceptance'), false);
});

test('wrong ref, tree, and changed-path correspondence block before validation', async t => {
  const f = fixture(t);
  const r = runner();
  const a = request(f, r);
  a.raw.input.candidate.expected_ref = 'refs/heads/develop';
  a.raw.input.runtime_correspondence.candidate_ref = 'refs/heads/develop';
  a.raw.context.git.expected_ref = 'refs/heads/develop';
  assert.equal((await a.recipe.preflight(a.raw)).reason, 'CANDIDATE_REF_MISMATCH');

  const b = request(f, runner());
  b.raw.input.candidate.tree = 'f'.repeat(40);
  b.raw.input.runtime_correspondence.candidate_tree = 'f'.repeat(40);
  assert.equal((await b.recipe.preflight(b.raw)).reason, 'CANDIDATE_TREE_MISMATCH');

  const c = request(f, runner());
  c.raw.input.candidate.allowed_changed_paths = ['base.txt'];
  assert.equal((await c.recipe.preflight(c.raw)).reason, 'CANDIDATE_CHANGED_PATHS_MISMATCH');
});

test('caller-supplied targeted selectors and static scopes are preserved exactly rather than inferred', async t => {
  const f = fixture(t);
  const r = runner();
  const { recipe, raw } = request(f, r);
  const selectors = [...raw.input.validation_profile.targeted_pytest_selectors];
  const ruffScope = [...raw.input.validation_profile.ruff.scope];
  const pyrightScope = [...raw.input.validation_profile.pyright.scope];
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'PASS');
  assert.deepEqual(r.calls.find(call => call.step_id === 'targeted_pytest').args, selectors);
  assert.deepEqual(r.calls.find(call => call.step_id === 'ruff').args, ruffScope);
  assert.deepEqual(r.calls.find(call => call.step_id === 'pyright').args, pyrightScope);
});

test('runtime correspondence must prove fitflow_test is competent and development DB excluded', async t => {
  const f = fixture(t);
  const invalidDatabase = request(f, runner());
  invalidDatabase.raw.input.runtime_correspondence.database = 'fitflow_db';
  const dbResult = await invalidDatabase.recipe.preflight(invalidDatabase.raw);
  assert.equal(dbResult.status, 'BLOCKED');
  assert.match(dbResult.reason, /^INVALID_VALIDATION_INPUT:/);

  const notCompetent = request(f, runner());
  notCompetent.raw.input.runtime_correspondence.status = 'UNKNOWN';
  const competenceResult = await notCompetent.recipe.preflight(notCompetent.raw);
  assert.equal(competenceResult.status, 'BLOCKED');
  assert.match(competenceResult.reason, /^INVALID_VALIDATION_INPUT:/);
});

test('targeted and full regression command evidence preserves stdout stderr exit code and caller args', async t => {
  const f = fixture(t);
  const r = runner({
    run(input) {
      if (input.step_id === 'targeted_pytest') return { ...ok('2 passed\n'), stderr: 'targeted stderr\n' };
      if (input.step_id === 'full_regression') return ok('85 passed\n');
      return ok(`${input.step_id} pass\n`);
    },
  });
  const { recipe, raw } = request(f, r);
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'PASS');
  const targeted = receipt.output.command_records.find(record => record.step_id === 'targeted_pytest');
  const full = receipt.output.command_records.find(record => record.step_id === 'full_regression');
  assert.equal(targeted.stdout, '2 passed\n');
  assert.equal(targeted.stderr, 'targeted stderr\n');
  assert.equal(targeted.exit_code, 0);
  assert.deepEqual(full.argv.slice(-1), ['backend/tests']);
  assert.equal(full.stdout, '85 passed\n');
});

test('Ruff and Pyright are optional but requested scopes require competent bindings', async t => {
  const f = fixture(t);
  const offRunner = runner();
  const off = request(f, offRunner);
  off.raw.input.validation_profile.ruff = { requested: false, scope: [] };
  off.raw.input.validation_profile.pyright = { requested: false, scope: [] };
  const offReceipt = await off.recipe.execute(off.raw);
  assert.equal(offReceipt.status, 'PASS');
  assert.equal(offRunner.calls.some(call => call.step_id === 'ruff' || call.step_id === 'pyright'), false);

  const missing = request(f, runner());
  delete missing.raw.input.runtime_correspondence.tooling.ruff;
  const missingResult = await missing.recipe.preflight(missing.raw);
  assert.deepEqual(missingResult, { status: 'BLOCKED', reason: 'REQUIRED_TOOL_BINDING_MISSING:ruff' });
});

test('candidate mutation during validation fails closed and is not normalized to PASS', async t => {
  const f = fixture(t);
  const r = runner({
    run(input) {
      if (input.step_id === 'targeted_pytest') fs.writeFileSync(path.join(f.root, 'unexpected.txt'), 'drift\n');
      return ok();
    },
  });
  const { recipe, raw } = request(f, r);
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.match(receipt.reason, /^CANDIDATE_DRIFT_AFTER_STEP:targeted_pytest:/);
  assert.equal(receipt.output.candidate_mutation, 'OBSERVED_DRIFT');
});

test('unavailable tooling is distinguishable from deterministic validation nonpass', async t => {
  const f = fixture(t);
  const unavailableRunner = runner({
    probe(input) {
      if (input.step_id === 'ruff') {
        return { exit_code: null, stdout: '', stderr: '', signal: null, error_code: 'ENOENT', error_message: 'missing' };
      }
      return ok();
    },
  });
  const unavailable = request(f, unavailableRunner);
  assert.deepEqual(await unavailable.recipe.preflight(unavailable.raw), {
    status: 'UNAVAILABLE',
    reason: 'TOOL_UNAVAILABLE:ruff',
  });

  const nonpassRunner = runner({
    run(input) {
      if (input.step_id === 'targeted_pytest') {
        return { ...ok('1 failed\n'), exit_code: 1 };
      }
      return ok();
    },
  });
  const nonpass = request(f, nonpassRunner);
  const receipt = await nonpass.recipe.execute(nonpass.raw);
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.match(receipt.reason, /^TARGETED_HTTP_OBSERVATION_NONPASS:/);
  assert.equal(receipt.output.observation.product_semantic_disposition, 'NOT_ADJUDICATED');
});

test('tool loss after dispatch becomes deterministic FAIL with explicit unavailable observation', async t => {
  const f = fixture(t);
  let ran = false;
  const r = runner({
    run(input) {
      if (!ran && input.step_id === 'targeted_pytest') {
        ran = true;
        return { exit_code: null, stdout: '', stderr: '', signal: null, error_code: 'ENOENT', error_message: 'gone' };
      }
      return ok();
    },
  });
  const { recipe, raw } = request(f, r);
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.equal(receipt.output.observation.observed_status, 'UNAVAILABLE');
  assert.match(receipt.reason, /^EXECUTION_SUBSTRATE_UNAVAILABLE_AFTER_DISPATCH:/);
});

test('registry resolves the typed capability with an empty effect profile', t => {
  const f = fixture(t);
  const r = runner();
  const { recipe, raw } = request(f, r);
  const registry = new RecipeRegistry();
  registry.register(recipe);
  assert.deepEqual(registry.resolve(['fitflow.http_contract.validate']), {
    resolution: 'SELECTED',
    recipe: recipe.definition,
  });
  assert.deepEqual(registry.resolveEffects(recipe.definition.id, recipe.definition.version, raw.input), []);
});
