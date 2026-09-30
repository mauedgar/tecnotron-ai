'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  createValidateFitFlowHttpContractCandidateRecipe,
  createValidationGitAdapter,
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

function unavailable(code = 'EIO') {
  return {
    exit_code: null,
    stdout: '',
    stderr: '',
    signal: null,
    error_code: code,
    error_message: 'unavailable',
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

function runtimeEvidence() {
  return {
    kind: 'EVIDENCE',
    id: 'recipe-receipt:runtime:prepare-fitflow-test-runtime',
    location: 'evidence/runtime-receipt.json',
    sha256: 'a'.repeat(64),
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
  const receiptEvidence = runtimeEvidence();
  const runtime = {
    status: 'COMPETENT',
    source_recipe: {
      id: 'prepare_fitflow_test_runtime',
      version: 'v0',
      receipt_ref: receiptEvidence.id,
      evidence_ref: receiptEvidence,
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
  const recipe = createValidateFitFlowHttpContractCandidateRecipe({
    runner: testRunner,
    ...(overrides.git ? { git: overrides.git } : {}),
    ...(overrides.probeRegistry ? { probeRegistry: overrides.probeRegistry } : {}),
  });
  return {
    recipe,
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
        evidence_refs: [receiptEvidence],
      },
      authorization: {
        disposition: 'AUTHORIZED',
        authority_reference: 'DEV-TEST',
        effect_constraints: [],
      },
      evidence_refs: [receiptEvidence],
      input,
    },
  };
}

test('exact candidate and competent bound fitflow_test runtime produce mechanical PASS with auditable evidence', async t => {
  const f = fixture(t);
  const r = runner();
  const { recipe, raw } = request(f, r);
  assert.deepEqual(await recipe.preflight(raw), { status: 'READY' });
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'NONE');
  assert.equal(receipt.output.observation.product_semantic_disposition, 'NOT_ADJUDICATED');
  assert.equal(receipt.output.runtime_correspondence.database, 'fitflow_test');
  assert.equal(receipt.output.runtime_correspondence.development_database, 'fitflow_db');
  assert.equal(receipt.output.candidate_pre.target_ref_commit, f.commit);
  assert.equal(receipt.output.candidate_pre.parent, f.parent);
  assert.equal(receipt.output.candidate_pre.tree, f.tree);
  assert.deepEqual(receipt.output.candidate_pre.changed_paths, ['contract.txt']);
  assert.equal(receipt.output.candidate_pre.clean_status, 'CLEAN');
  assert.deepEqual(receipt.output.candidate_post.changed_paths, ['contract.txt']);
  assert.equal(receipt.output.candidate_post.clean_status, 'CLEAN');
  assert.ok(receipt.output.candidate_pre.raw_git.length >= 6);
  assert.equal(receipt.output.runtime_guard_evidence.matched_runtime_evidence_ref.id, raw.input.runtime_correspondence.source_recipe.receipt_ref);
  assert.equal(receipt.evidence_refs.some(ref => ref.id === raw.input.runtime_correspondence.source_recipe.receipt_ref), true);
  assert.equal(Object.hasOwn(receipt.output, 'verdict'), false);
  assert.equal(Object.hasOwn(receipt.output, 'developer_acceptance'), false);
});

test('wrong ref, tree and changed-path correspondence block before validation', async t => {
  const f = fixture(t);
  const a = request(f, runner());
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

test('caller-owned selectors and static scopes are preserved exactly rather than inferred', async t => {
  const f = fixture(t);
  const r = runner();
  const { recipe, raw } = request(f, r);
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'PASS');
  assert.deepEqual(r.calls.find(call => call.step_id === 'targeted_pytest').args, raw.input.validation_profile.targeted_pytest_selectors);
  assert.deepEqual(r.calls.find(call => call.step_id === 'full_regression').args, raw.input.validation_profile.full_backend_regression.args);
  assert.deepEqual(r.calls.find(call => call.step_id === 'ruff').args, raw.input.validation_profile.ruff.scope);
  assert.deepEqual(r.calls.find(call => call.step_id === 'pyright').args, raw.input.validation_profile.pyright.scope);
});

test('caller-owned changed paths, extra probes and requested full-regression args cannot be silently omitted', async t => {
  const f = fixture(t);

  const paths = request(f, runner());
  delete paths.raw.input.candidate.allowed_changed_paths;
  assert.match((await paths.recipe.preflight(paths.raw)).reason, /^INVALID_VALIDATION_INPUT:/);

  const regression = request(f, runner());
  regression.raw.input.validation_profile.full_backend_regression = { requested: true };
  assert.match((await regression.recipe.preflight(regression.raw)).reason, /^INVALID_VALIDATION_INPUT:/);

  const probes = request(f, runner());
  delete probes.raw.input.validation_profile.extra_probes;
  assert.match((await probes.recipe.preflight(probes.raw)).reason, /^INVALID_VALIDATION_INPUT:/);
});

test('runtime correspondence requires an exact prepare-runtime receipt evidence binding', async t => {
  const f = fixture(t);
  const missing = request(f, runner());
  missing.raw.evidence_refs = [];
  missing.raw.context.evidence_refs = [];
  assert.deepEqual(await missing.recipe.preflight(missing.raw), {
    status: 'BLOCKED',
    reason: 'RUNTIME_RECEIPT_EVIDENCE_BINDING_MISSING_OR_MISMATCHED',
  });

  const mismatched = request(f, runner());
  mismatched.raw.evidence_refs = [{ ...runtimeEvidence(), sha256: 'b'.repeat(64) }];
  mismatched.raw.context.evidence_refs = mismatched.raw.evidence_refs;
  assert.deepEqual(await mismatched.recipe.preflight(mismatched.raw), {
    status: 'BLOCKED',
    reason: 'RUNTIME_RECEIPT_EVIDENCE_BINDING_MISSING_OR_MISMATCHED',
  });
});

test('fitflow_test and fitflow_db remain distinct fail-closed invariants', async t => {
  const f = fixture(t);
  const invalidDatabase = request(f, runner());
  invalidDatabase.raw.input.runtime_correspondence.database = 'fitflow_db';
  assert.match((await invalidDatabase.recipe.preflight(invalidDatabase.raw)).reason, /^INVALID_VALIDATION_INPUT:/);

  const notCompetent = request(f, runner());
  notCompetent.raw.input.runtime_correspondence.status = 'UNKNOWN';
  assert.match((await notCompetent.recipe.preflight(notCompetent.raw)).reason, /^INVALID_VALIDATION_INPUT:/);
});

test('known registered no-effect extra probe executes without caller executable authority', async t => {
  const f = fixture(t);
  const r = runner();
  const known = {
    'db-current': {
      id: 'db-current',
      purpose: 'CORRESPONDENCE',
      effects: [],
      command: { executable: 'psql', args_prefix: ['-X'], probe_args: ['--version'] },
      args: ['-Atc', 'select current_database()'],
    },
  };
  const x = request(f, r, { probeRegistry: known });
  x.raw.input.validation_profile.extra_probes = [{ id: 'db-current' }];
  const receipt = await x.recipe.execute(x.raw);
  assert.equal(receipt.status, 'PASS');
  const probe = r.calls.find(call => call.step_id === 'extra_probe:db-current');
  assert.deepEqual(probe.args, ['-Atc', 'select current_database()']);
});

test('unknown or effectful extra probes fail closed', async t => {
  const f = fixture(t);
  const unknown = request(f, runner());
  unknown.raw.input.validation_profile.extra_probes = [{ id: 'not-registered' }];
  assert.deepEqual(await unknown.recipe.preflight(unknown.raw), {
    status: 'BLOCKED',
    reason: 'UNKNOWN_EXTRA_PROBE:not-registered',
  });

  const effectful = request(f, runner(), {
    probeRegistry: {
      mutate: {
        id: 'mutate',
        purpose: 'CORRESPONDENCE',
        effects: [{ effect: 'db.write', scope: 'test-db' }],
        command: { executable: 'tool', probe_args: ['--version'] },
        args: [],
      },
    },
  });
  effectful.raw.input.validation_profile.extra_probes = [{ id: 'mutate' }];
  assert.deepEqual(await effectful.recipe.preflight(effectful.raw), {
    status: 'BLOCKED',
    reason: 'EFFECTFUL_EXTRA_PROBE_REJECTED:mutate',
  });

  assert.throws(() => createValidateFitFlowHttpContractCandidateRecipe({
    probeRegistry: {
      missingProfile: {
        id: 'missingProfile',
        purpose: 'CORRESPONDENCE',
        command: { executable: 'tool', probe_args: ['--version'] },
        args: [],
      },
    },
  }), /effects/);
});

test('caller cannot inject an arbitrary executable through extra probe input', async t => {
  const f = fixture(t);
  const injected = request(f, runner());
  injected.raw.input.validation_profile.extra_probes = [{
    id: 'db-current',
    command: { executable: 'pwsh', args_prefix: ['-Command'], probe_args: ['whoami'] },
  }];
  assert.match((await injected.recipe.preflight(injected.raw)).reason, /^INVALID_VALIDATION_INPUT:/);
});

test('targeted and full regression evidence preserves stdout stderr exit code and exact caller args', async t => {
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
  const targeted = receipt.output.command_records.find(record => record.step_id === 'targeted_pytest');
  const full = receipt.output.command_records.find(record => record.step_id === 'full_regression');
  assert.equal(targeted.stdout, '2 passed\n');
  assert.equal(targeted.stderr, 'targeted stderr\n');
  assert.equal(targeted.exit_code, 0);
  assert.deepEqual(full.argv.slice(-1), ['backend/tests']);
});

test('Ruff and Pyright are optional but requested scopes require competent bindings', async t => {
  const f = fixture(t);
  const offRunner = runner();
  const off = request(f, offRunner);
  off.raw.input.validation_profile.ruff = { requested: false };
  off.raw.input.validation_profile.pyright = { requested: false };
  const offReceipt = await off.recipe.execute(off.raw);
  assert.equal(offReceipt.status, 'PASS');
  assert.equal(offRunner.calls.some(call => call.step_id === 'ruff' || call.step_id === 'pyright'), false);

  const missing = request(f, runner());
  delete missing.raw.input.runtime_correspondence.tooling.ruff;
  assert.deepEqual(await missing.recipe.preflight(missing.raw), {
    status: 'BLOCKED',
    reason: 'REQUIRED_TOOL_BINDING_MISSING:ruff',
  });
});

test('proven deterministic candidate drift returns FAIL with observed drift evidence', async t => {
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
  assert.equal(receipt.output.candidate_mutation, 'OBSERVED_DRIFT');
  assert.equal(receipt.output.candidate_post.clean_status, 'DIRTY');
  assert.match(receipt.reason, /^CANDIDATE_CORRESPONDENCE_MISMATCH:targeted_pytest:/);
});

test('post-dispatch candidate correspondence unavailable returns UNKNOWN and never claims observed drift', async t => {
  const f = fixture(t);
  const actual = createValidationGitAdapter();
  let statusReads = 0;
  const gitAdapter = {
    ...actual,
    status(repositoryPath) {
      statusReads += 1;
      return statusReads === 1 ? actual.status(repositoryPath) : unavailable();
    },
  };
  const x = request(f, runner(), { git: gitAdapter });
  const receipt = await x.recipe.execute(x.raw);
  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.effect_state, 'UNKNOWN');
  assert.equal(receipt.output.candidate_mutation, 'UNKNOWN');
  assert.notEqual(receipt.output.candidate_mutation, 'OBSERVED_DRIFT');
  assert.match(receipt.reason, /^POST_DISPATCH_CANDIDATE_CORRESPONDENCE_UNAVAILABLE:/);
});

test('UNKNOWN receipt survives registry execution without normalization to false FAIL or PASS', async t => {
  const f = fixture(t);
  const actual = createValidationGitAdapter();
  let statusReads = 0;
  const gitAdapter = {
    ...actual,
    status(repositoryPath) {
      statusReads += 1;
      return statusReads === 1 ? actual.status(repositoryPath) : unavailable();
    },
  };
  const x = request(f, runner(), { git: gitAdapter });
  const registry = new RecipeRegistry();
  registry.register(x.recipe);
  const receipt = await registry.execute(x.raw);
  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.effect_state, 'UNKNOWN');
});

test('unavailable tooling is distinguishable from deterministic validation nonpass', async t => {
  const f = fixture(t);
  const unavailableRunner = runner({
    probe(input) {
      return input.step_id === 'ruff' ? unavailable('ENOENT') : ok();
    },
  });
  const unavailableCase = request(f, unavailableRunner);
  assert.deepEqual(await unavailableCase.recipe.preflight(unavailableCase.raw), {
    status: 'UNAVAILABLE',
    reason: 'TOOL_UNAVAILABLE:ruff',
  });

  const nonpassRunner = runner({
    run(input) {
      return input.step_id === 'targeted_pytest' ? { ...ok('1 failed\n'), exit_code: 1 } : ok();
    },
  });
  const nonpass = request(f, nonpassRunner);
  const receipt = await nonpass.recipe.execute(nonpass.raw);
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.match(receipt.reason, /^TARGETED_HTTP_OBSERVATION_NONPASS:/);
  assert.equal(receipt.output.observation.product_semantic_disposition, 'NOT_ADJUDICATED');
});

test('tool loss after dispatch stays explicit FAIL only when candidate correspondence remains proven', async t => {
  const f = fixture(t);
  const r = runner({
    run(input) {
      return input.step_id === 'targeted_pytest' ? unavailable('ENOENT') : ok();
    },
  });
  const { recipe, raw } = request(f, r);
  const receipt = await recipe.execute(raw);
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.equal(receipt.output.observation.observed_status, 'UNAVAILABLE');
  assert.equal(receipt.output.candidate_post.clean_status, 'CLEAN');
  assert.match(receipt.reason, /^EXECUTION_SUBSTRATE_UNAVAILABLE_AFTER_DISPATCH:/);
});

test('registry resolves the typed capability with an empty effect profile', t => {
  const f = fixture(t);
  const { recipe, raw } = request(f, runner());
  const registry = new RecipeRegistry();
  registry.register(recipe);
  assert.deepEqual(registry.resolve(['fitflow.http_contract.validate']), {
    resolution: 'SELECTED',
    recipe: recipe.definition,
  });
  assert.deepEqual(registry.resolveEffects(recipe.definition.id, recipe.definition.version, raw.input), []);
});
