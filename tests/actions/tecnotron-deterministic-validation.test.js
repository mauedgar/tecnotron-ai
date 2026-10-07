'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const {
  runTecnotronDeterministicValidation,
} = require('../../src/actions/tecnotron-deterministic-validation');

const subject = {
  repository: 'mauedgar/tecnotron-ai',
  commit: '0123456789abcdef0123456789abcdef01234567',
  tree: '89abcdef0123456789abcdef0123456789abcdef',
};

const execution = {
  provider: 'github-actions',
  run_id: '123',
  run_attempt: 1,
  workflow_ref: 'deterministic-ci.yml@refs/heads/tools',
  workflow_sha: 'fedcba9876543210fedcba9876543210fedcba98',
};

function request(overrides = {}) {
  return {
    schema_version: 'tecnotron-deterministic-validation-request/v0',
    subject,
    profile: { id: 'tecnotron-promotion', version: 'v0' },
    evidence_refs: [],
    ...overrides,
  };
}

test('PASS requires exact subject and all promotion checks', () => {
  const seen = [];
  const result = runTecnotronDeterministicValidation(
    request(),
    execution,
    process.cwd(),
    {
      observeSubject: () => subject,
      executeCommand: (spec) => {
        seen.push(spec.id);
        return { status: 'PASS', elapsed_ms: 1 };
      },
    },
  );

  assert.equal(result.exitCode, 0);
  assert.equal(result.receipt.conclusion, 'PASS');
  assert.equal(result.receipt.correspondence, 'EXACT');
  assert.equal(result.receipt.effect_state, 'NONE');
  assert.deepEqual(seen, [
    'dependency-scripts',
    'workspace-verify',
    'typecheck',
    'build',
    'tests',
    'contracts-check',
  ]);
});

test('subject mismatch fails before executing validation commands', () => {
  let executed = false;
  const result = runTecnotronDeterministicValidation(
    request(),
    execution,
    process.cwd(),
    {
      observeSubject: () => ({ ...subject, commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
      executeCommand: () => {
        executed = true;
        return { status: 'PASS', elapsed_ms: 1 };
      },
    },
  );

  assert.equal(result.exitCode, 1);
  assert.equal(result.receipt.conclusion, 'FAIL');
  assert.equal(result.receipt.correspondence, 'MISMATCH');
  assert.equal(executed, false);
});

test('profile execution is fail-closed and preserves terminal evidence', () => {
  const seen = [];
  const result = runTecnotronDeterministicValidation(
    request(),
    execution,
    process.cwd(),
    {
      observeSubject: () => subject,
      executeCommand: (spec) => {
        seen.push(spec.id);
        if (spec.id === 'typecheck') {
          return { status: 'FAIL', elapsed_ms: 3, reason: 'typecheck: exit code 2' };
        }
        return { status: 'PASS', elapsed_ms: 1 };
      },
    },
  );

  assert.equal(result.exitCode, 1);
  assert.equal(result.receipt.conclusion, 'FAIL');
  assert.equal(result.receipt.correspondence, 'EXACT');
  assert.match(result.receipt.reason, /typecheck/);
  assert.deepEqual(seen, ['dependency-scripts', 'workspace-verify', 'typecheck']);
});

test('workflow is read-only, manual, exact-subject, and receipt-oriented', () => {
  const workflowPath = path.resolve(__dirname, '../../.github/workflows/deterministic-ci.yml');
  const workflow = YAML.parse(fs.readFileSync(workflowPath, 'utf8'));

  assert.ok(workflow.on.workflow_dispatch);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const job = workflow.jobs.validate;
  assert.equal(job['runs-on'], 'ubuntu-latest');

  const checkout = job.steps.find((step) => step.uses === 'actions/checkout@v4');
  assert.equal(checkout.with.ref, '${{ inputs.subject_sha }}');
  assert.equal(checkout.with['persist-credentials'], false);

  const bootstrap = job.steps.find((step) => step.name === 'Install dependencies without lifecycle scripts');
  assert.match(bootstrap.run, /npm ci --ignore-scripts/);

  const validate = job.steps.find((step) => step.name === 'Run typed deterministic validation');
  assert.match(validate.run, /tecnotron-deterministic-validation\.js/);

  const upload = job.steps.find((step) => step.uses === 'actions/upload-artifact@v4');
  assert.equal(upload.if, 'always()');
});
