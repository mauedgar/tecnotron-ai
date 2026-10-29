'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { GitHubAdapter, observeNativeActionsRunEvidence } = require('../../src/adapters/github');

// Genuine provider identity frozen in ULC-OP03-TASK.md / OP03_CONTEXT_DECLARATION.txt (issue #34):
// GitHub Actions run 40082522885 attempt 1 job 120838820954, event pull_request, completed/success,
// checkout commit 2169c2144ee05116d735743df66eec01e6e57bf4 tree a44b9dedbed04d16437bad94085f29e6bc38c0d0.
// The workflow label is unfrozen provider metadata: the fixture uses a neutral value and NO test
// infers Product Operation/ExecutionAttempt/owner/authority identity from any provider field.
const GENUINE = {
  repository: 'mauedgar/tecnotron-ai',
  url: 'https://github.com/mauedgar/tecnotron-ai/actions/runs/40082522885',
  run_id: 40082522885,
  run_attempt: 1,
  job_id: 120838820954,
  workflow: 'ACTIONS-EVIDENCE-FIXTURE',
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  checkout_commit: '2169c2144ee05116d735743df66eec01e6e57bf4',
  checkout_tree: 'a44b9dedbed04d16437bad94085f29e6bc38c0d0',
  observed_at: '2026-10-24T00:00:00Z',
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
  assert.equal(r.normalized.run_id, 40082522885);
  assert.equal(r.normalized.run_attempt, 1);
  assert.equal(r.normalized.job_id, 120838820954);
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
  const r = observe([record({ status: 'in_progress', conclusion: null })], expect());
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
