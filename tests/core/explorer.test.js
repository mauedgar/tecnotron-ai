'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { decideContext } = require('../../src/explorer');

test('explorer: proceeds when context coverage is complete', () => {
  const decision = decideContext({
    status: 'COMPLETE',
    missing_evidence_ids: [],
  });

  assert.deepStrictEqual(decision, {
    action: 'PROCEED',
    reason_code: 'CONTEXT_COMPLETE',
    missing_evidence_ids: [],
  });
});

test('explorer: escalates missing evidence when context coverage is partial', () => {
  const decision = decideContext({
    status: 'PARTIAL',
    missing_evidence_ids: ['runtime-contract'],
  });

  assert.deepStrictEqual(decision, {
    action: 'ESCALATE',
    reason_code: 'CONTEXT_PARTIAL',
    missing_evidence_ids: ['runtime-contract'],
  });
});

test('explorer: blocks when no context evidence is available', () => {
  const decision = decideContext({
    status: 'EMPTY',
    missing_evidence_ids: ['task', 'runtime-contract'],
  });

  assert.deepStrictEqual(decision, {
    action: 'BLOCK',
    reason_code: 'CONTEXT_EMPTY',
    missing_evidence_ids: ['task', 'runtime-contract'],
  });
});

test('explorer: rejects an unknown context status instead of inventing a decision', () => {
  assert.throws(
    () => decideContext({ status: 'UNKNOWN', missing_evidence_ids: [] }),
    /Unsupported context status: UNKNOWN/,
  );
});
