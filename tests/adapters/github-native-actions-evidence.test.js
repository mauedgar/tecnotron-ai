'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { GitHubAdapter, observeNativeActionsRunEvidence } = require('../../src/adapters/github');

// Genuine provider identity frozen in ULC-OP03-TASK.md / OP03_CONTEXT_DECLARATION.txt (issue #34):
// GitHub Actions run 40082522885 attempt 1 job 120838820954, event pull_request, completed/success,
// checkout commit 2169c2144ee05116d735743df66eec01e6e57bf4 tree a44b9dedbed04d16437bad94085f29e6bc38c0d0.
// Workflow and source-native timestamps match provider run 40082522885.
// All submitted observations still require external provider provenance verification.
const GENUINE = {
  repository: 'mauedgar/tecnotron-ai',
  url: 'https://github.com/mauedgar/tecnotron-ai/actions/runs/40082522885',
  run_id: 40082522885,
  run_attempt: 1,
  job_id: 120838820954,
  workflow: 'Tecnotron native Node validation',
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  checkout_commit: '2169c2144ee05116d735743df66eec01e6e57bf4',
  checkout_tree: 'a44b9dedbed04d16437bad94085f29e6bc38c0d0',
  run_started_at: '2026-10-24T09:34:56Z',
  native_updated_at: '2026-10-24T09:35:26Z',
  observed_at: '2026-10-24T09:35:26Z',
  stages: ['audit', 'typecheck', 'tests', 'contracts'].map((kind, index) => ({
    kind, name: [
      'Audit resolved dependencies (moderate severity and above)',
      'Typecheck', 'Run repository test suite', 'Validate portable contract package',
    ][index],
    status: 'completed', conclusion: 'success',
    source_url: 'https://github.com/mauedgar/tecnotron-ai/actions/runs/40082522885/job/120838820954',
  })),
  validation: {
    total: 659, pass: 653, skip: 6, fail: 0,
    source_url: 'https://github.com/mauedgar/tecnotron-ai/actions/runs/40082522885/job/120838820954',
  },
  reported_validation: '653 PASS, 6 SKIP, 0 FAIL; audit/typecheck/contracts PASS',
};
const BASE_EXPECTATION = {
  repository: GENUINE.repository,
  runId: 40082522885,
  runAttempt: 1,
  jobId: 120838820954,
  event: 'pull_request',
  checkoutCommit: '2169c2144ee05116d735743df66eec01e6e57bf4',
  checkoutTree: 'a44b9dedbed04d16437bad94085f29e6bc38c0d0',
  observationCutoff: '2026-10-29T00:00:00Z',
};
const record = (patch = {}) => ({ ...GENUINE, ...patch });
const expect = (patch = {}) => ({ ...BASE_EXPECTATION, ...patch });
const observe = (observations, expected) => observeNativeActionsRunEvidence(observations, expected);

test('genuine native observation normalizes terminal success without Product inference', () => {
  const r = observe([record()], expect());
  assert.equal(r.status, 'PASS');
  assert.equal(r.provider, 'GITHUB_ACTIONS');
  assert.equal(r.normalized.actions_run_url, GENUINE.url);
  assert.equal(r.normalized.run_id, '40082522885');
  assert.equal(r.normalized.run_attempt, '1');
  assert.equal(r.normalized.job_id, '120838820954');
  assert.equal(r.normalized.workflow, GENUINE.workflow);
  assert.equal(r.normalized.observed_at, GENUINE.observed_at);
  assert.deepEqual(r.normalized.stages, GENUINE.stages);
  assert.deepEqual(r.normalized.validation, GENUINE.validation);
  assert.equal(r.normalized.provenance, 'CALLER_ASSERTED_NOT_SELF_AUTHENTICATING');
  assert.equal(r.normalized.checkout_commit, GENUINE.checkout_commit);
  assert.equal(r.normalized.checkout_tree, GENUINE.checkout_tree);
  assert.equal(r.normalized.observation_cutoff, BASE_EXPECTATION.observationCutoff);
  assert.equal(r.provider_result.status, 'completed');
  assert.equal(r.provider_result.conclusion, 'success');
  assert.deepEqual(r.duplicates_seen, 1);
  assert.equal(r.product_effect, 'NOT_EVALUATED');
  assert.equal(r.observation_effect_state, 'NONE');
  assert.match(r.pass_semantics, /NOT_PRODUCT_ACCEPTANCE/);
});

test('missing native run/attempt/job identity fails closed', () => {
  const noJob = record({ job_id: undefined });
  assert.equal(observe([noJob], expect()).reason, 'MISSING_REQUIRED_OBSERVATION_FIELD:job_id');
  assert.equal(observe([record({ run_id: undefined })], expect()).reason, 'MISSING_REQUIRED_OBSERVATION_FIELD:run_id');
  assert.equal(observe([record({ run_attempt: 0 })], expect()).reason, 'INVALID_NATIVE_IDENTITY:run_attempt');
  assert.equal(observe([record({ job_id: 'not-numeric' })], expect()).reason, 'INVALID_NATIVE_IDENTITY:job_id');
  // una clave con forma de expectativa dentro del registro del proveedor es campo no soportado
  assert.equal(observe([record({ jobId: undefined })], expect()).reason, 'UNSUPPORTED_PROVIDER_FIELD:jobId');
  assert.equal(observe([record()], expect({ runId: undefined })).reason, 'OBSERVER_EXPECTATION_MISSING:runId');
  assert.equal(observe([record()], expect({ jobId: undefined })).reason, 'OBSERVER_EXPECTATION_MISSING:jobId');
  assert.equal(observe([record()], expect({ runAttempt: 0 })).reason, 'INVALID_NATIVE_IDENTITY:expected.runAttempt');
});

test('unsupported provider fields, events, status or conclusion fail closed', () => {
  assert.equal(observe([record({ product_operation: 'hoped' })], expect()).reason, 'UNSUPPORTED_PROVIDER_FIELD:product_operation');
  assert.equal(observe([record({ event: 'push' })], expect()).reason, 'UNSUPPORTED_EVENT');
  assert.equal(observe([record({ status: 'queued' })], expect()).reason, 'UNSUPPORTED_PROVIDER_STATUS');
  assert.equal(observe([record({ conclusion: 'neutral' })], expect()).reason, 'UNSUPPORTED_PROVIDER_CONCLUSION');
  assert.equal(observe([record()], expect({ telemetry: 'forbidden' })).reason, 'UNSUPPORTED_OBSERVER_REQUEST_FIELD:telemetry');
});

test('mismatched checkout tree or commit cannot pass as native subject', () => {
  const other40 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const wrongTree = observe([record()], expect({ checkoutTree: other40 }));
  assert.equal(wrongTree.status, 'BLOCKED');
  assert.equal(wrongTree.reason, 'SOURCE_COMMIT_OR_TREE_MISMATCH');
  assert.equal(wrongTree.expected_field, 'checkout_tree');
  const wrongCommit = observe([record({ checkout_commit: other40 })], expect());
  assert.equal(wrongCommit.reason, 'SOURCE_COMMIT_OR_TREE_MISMATCH');
  assert.equal(wrongCommit.expected_field, 'checkout_commit');
  assert.equal(observe([record()], expect({ runId: 999999 })).reason, 'NATIVE_IDENTITY_MISMATCH');
});

test('duplicated identical observation is idempotent', () => {
  const r = observe([record(), record({}), record({})], expect());
  assert.equal(r.status, 'PASS');
  assert.equal(r.duplicates_seen, 3);
});

test('conflicting duplicates fail closed', () => {
  const divergent = observe([record(), record({ workflow: 'OTHER-WORKFLOW' })], expect());
  assert.equal(divergent.status, 'BLOCKED');
  assert.equal(divergent.reason, 'CONFLICTING_DUPLICATE_OBSERVATION');
  assert.equal(divergent.offending_record, 1);
  const incoherent = observe([record(), record({ job_id: 120838820955 })], expect());
  assert.equal(incoherent.status, 'BLOCKED');
  assert.equal(incoherent.reason, 'INCOHERENT_OBSERVATION_IDENTITY');
  assert.equal(incoherent.offending_record, 1);
});

test('null or malformed observation records return BLOCKED without throwing', () => {
  const nullRecord = observe([null], expect());
  assert.equal(nullRecord.status, 'BLOCKED');
  assert.equal(nullRecord.reason, 'MALFORMED_OBSERVATION_RECORD');
  const stringRecord = observe(['not-a-record'], expect());
  assert.equal(stringRecord.status, 'BLOCKED');
  const arrayRecord = observe([[GENUINE.repository]], expect());
  assert.equal(arrayRecord.status, 'BLOCKED');
  const sparse = observe([record({ url: undefined })], expect());
  assert.equal(sparse.reason, 'MISSING_REQUIRED_OBSERVATION_FIELD:url');
  const noCollection = observe(null, expect());
  assert.equal(noCollection.status, 'BLOCKED');
  assert.equal(noCollection.reason, 'OBSERVATION_COLLECTION_INVALID');
  const emptyCollection = observe([], expect());
  assert.equal(emptyCollection.reason, 'OBSERVATION_COLLECTION_INVALID');
  const noExpectation = observe([record()], null);
  assert.equal(noExpectation.status, 'BLOCKED');
  assert.equal(noExpectation.reason, 'OBSERVER_EXPECTATION_MISSING');
});

test('observation cutoff blocks later records', () => {
  const late = observe([record({ observed_at: '2026-10-30T00:00:00Z' })], expect({ observationCutoff: '2026-10-29T00:00:00Z' }));
  assert.equal(late.status, 'BLOCKED');
  assert.equal(late.reason, 'OBSERVATION_EXCEEDS_CUTOFF');
  assert.equal(observe([record({ observed_at: '2026-10-24 00:00:00' })], expect()).reason, 'OBSERVATION_TIMESTAMP_INVALID');
});

test('in-progress provider result yields UNKNOWN with no blind retry', () => {
  const r = observe([record({ status: 'in_progress', conclusion: null,
    native_updated_at: undefined, stages: undefined, validation: undefined,
    reported_validation: undefined })], expect());
  assert.equal(r.status, 'UNKNOWN');
  assert.equal(r.reason, 'PROVIDER_RESULT_NOT_TERMINAL_NO_BLIND_RETRY');
  assert.equal(r.retries_attempted, 0);
  assert.equal(r.provider_result.conclusion, null);
  assert.equal(r.product_effect, 'NOT_EVALUATED');
  assert.equal(r.observation_effect_state, 'NONE');
});

test('absent authentic Product bindings stay explicitly UNVERIFIED, never inferred', () => {
  const r = observe([record()], expect());
  assert.equal(r.product_bindings.operation, 'UNVERIFIED');
  assert.equal(r.product_bindings.execution_attempt, 'UNVERIFIED');
  assert.equal(r.product_bindings.owner, 'UNVERIFIED');
  assert.equal(r.product_bindings.authority, 'UNVERIFIED');
  const withRefs = observe([record()], expect({
    operationRef: 'PROVIDER-SUGGESTED-REF',
    executionAttemptRef: 'PROVIDER-SUGGESTED-ATTEMPT',
    ownerRef: 'PROVIDER-SUGGESTED-OWNER',
    authorityRef: 'PROVIDER-SUGGESTED-AUTHORITY',
  }));
  assert.deepEqual(withRefs.product_bindings.operation, { ref: 'PROVIDER-SUGGESTED-REF', verification: 'UNVERIFIED' });
  assert.deepEqual(withRefs.product_bindings.execution_attempt, { ref: 'PROVIDER-SUGGESTED-ATTEMPT', verification: 'UNVERIFIED' });
  assert.deepEqual(withRefs.product_bindings.owner, { ref: 'PROVIDER-SUGGESTED-OWNER', verification: 'UNVERIFIED' });
  assert.deepEqual(withRefs.product_bindings.authority, { ref: 'PROVIDER-SUGGESTED-AUTHORITY', verification: 'UNVERIFIED' });
  assert.equal(withRefs.product_effect, 'NOT_EVALUATED');
  assert.equal(withRefs.observation_effect_state, 'NONE');
  assert.equal(withRefs.status, 'PASS');
});

test('observation never touches the provider client and never writes', () => {
  let calls = 0;
  const adapter = new GitHubAdapter({
    getIssue: async () => { calls++; return { title: '', body: '' }; },
    updateIssue: async () => { calls++; return {}; },
    getProjectItem: async () => { calls++; return {}; },
    updateProjectItem: async () => { calls++; return {}; },
    getPullRequest: async () => { calls++; return {}; },
    getChecks: async () => { calls++; return []; },
  });
  const r = adapter.observeActionsRunEvidence([record()], expect());
  assert.equal(calls, 0);
  assert.equal(r.status, 'PASS');
  assert.equal(typeof r.then, 'undefined');
});

test('legacy adapter contracts remain exported and unchanged', () => {
  const mod = require('../../src/adapters/github');
  for (const name of ['GitHubAdapter', 'GitHubAdapterError', 'taskReference', 'issuePatch', 'observePromotedIssue', 'evaluateOperationalReady', 'observeNativeActionsRunEvidence']) {
    assert.equal(typeof mod[name], 'function');
  }
  assert.equal(new mod.GitHubAdapterError('x').name, 'GitHubAdapterError');
});


test('provider-faithful terminal observation cannot predate run or native completion update', () => {
  assert.equal(GENUINE.workflow, 'Tecnotron native Node validation');
  assert.equal(GENUINE.run_started_at, '2026-10-24T09:34:56Z');
  assert.equal(GENUINE.native_updated_at, '2026-10-24T09:35:26Z');
  assert.equal(observe([record({ observed_at: '2026-10-24T09:34:55Z' })], expect()).reason,
    'OBSERVATION_BEFORE_RUN_START');
  assert.equal(observe([record({ observed_at: '2026-10-24T09:35:25Z' })], expect()).reason,
    'TERMINAL_OBSERVATION_BEFORE_NATIVE_UPDATE');
  assert.equal(observe([record({ native_updated_at: undefined })], expect()).reason,
    'TERMINAL_OBSERVATION_BEFORE_NATIVE_UPDATE');
});

test('native duplicate deduplication is insensitive to property and stage order or safe string IDs', () => {
  const reversed = Object.fromEntries(Object.entries(GENUINE).reverse());
  reversed.run_id = String(GENUINE.run_id);
  reversed.run_attempt = String(GENUINE.run_attempt);
  reversed.job_id = String(GENUINE.job_id);
  reversed.stages = [...GENUINE.stages].reverse().map((x) =>
    Object.fromEntries(Object.entries(x).reverse()));
  reversed.validation = Object.fromEntries(Object.entries(GENUINE.validation).reverse());
  const identical = observe([record(), reversed], expect());
  assert.equal(identical.status, 'PASS');
  assert.equal(identical.duplicates_seen, 2);
  assert.equal(observe([record(), { ...reversed, validation: { ...GENUINE.validation, fail: 1 } }], expect()).reason,
    'INVALID_VALIDATION_OUTCOME');
});

test('provider stage results and original validation proof are mandatory and bounded', () => {
  assert.equal(observe([record({ stages: undefined })], expect()).reason, 'STAGE_RESULTS_INCOMPLETE');
  assert.equal(observe([record({ stages: GENUINE.stages.slice(1) })], expect()).reason, 'STAGE_RESULTS_INCOMPLETE');
  assert.equal(observe([record({ stages: GENUINE.stages.map((s) => ({ ...s, source_url: 'https://other.invalid' })) })], expect()).reason,
    'INVALID_NATIVE_STAGE_RESULT');
  assert.equal(observe([record({ validation: undefined })], expect()).reason, 'VALIDATION_OUTCOME_INCOMPLETE');
  assert.equal(observe([record({ validation: { ...GENUINE.validation, total: 660 } })], expect()).reason,
    'INVALID_VALIDATION_OUTCOME');
  assert.equal(observe([record({ reported_validation: undefined })], expect()).reason,
    'VALIDATION_SUMMARY_MISMATCH');
  assert.equal(observe([record({ validation: { ...GENUINE.validation, source_url: 'unverified' } })], expect()).reason,
    'INVALID_VALIDATION_OUTCOME');
});

test('read-only BLOCKED never asserts a Product effect; future consumer cannot treat it as NONE', () => {
  const result = observe([record({ checkout_tree: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' })], expect());
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.product_effect, 'NOT_EVALUATED');
  assert.equal(result.observation_effect_state, 'NONE');
  assert.equal(Object.hasOwn(result, 'effect_state'), false);
});

test('invalid calendar dates and unsafe numeric native identities fail closed', () => {
  assert.equal(observe([record({ observed_at: '2026-99-99T99:99:99Z' })], expect()).reason,
    'OBSERVATION_TIMESTAMP_INVALID');
  assert.equal(observe([record({ observed_at: '2026-02-30T09:35:26Z' })], expect()).reason,
    'OBSERVATION_TIMESTAMP_INVALID');
  assert.equal(observe([record()], expect({ observationCutoff: '2026-02-30T00:00:00Z' })).reason,
    'OBSERVATION_CUTOFF_INVALID');
  assert.equal(observe([record({ run_id: Number.MAX_SAFE_INTEGER + 2 })], expect()).reason,
    'INVALID_NATIVE_IDENTITY:run_id');
  assert.equal(observe([record()], expect({ jobId: Number.MAX_SAFE_INTEGER + 2 })).reason,
    'INVALID_NATIVE_IDENTITY:expected.jobId');
});

test('negative terminal provider conclusion is normalized, never reported as Product acceptance', () => {
  const validation = { ...GENUINE.validation, pass: 652, fail: 1 };
  const stages = GENUINE.stages.map((s) => s.kind === 'tests' ? { ...s, conclusion: 'failure' } : { ...s });
  const result = observe([record({ conclusion: 'failure', validation, stages,
    reported_validation: '652 PASS, 6 SKIP, 1 FAIL; audit/typecheck/contracts PASS' })], expect());
  assert.equal(result.status, 'PASS');
  assert.equal(result.provider_result.conclusion, 'failure');
  assert.equal(result.product_effect, 'NOT_EVALUATED');
  assert.match(result.pass_semantics, /NOT_PRODUCT_ACCEPTANCE/);
});
