'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { ContextPackager } = require('../../src/core/context-packager');
const { ContextPackagerResult } = require('../../src/contracts/context-packager');

const requirements = [
  { evidence_id: 'task', path: 'TASK.md' },
  { evidence_id: 'contract', path: 'src/contracts/context.js' },
];

test('emits deterministic telemetry and bounds delivered content', () => {
  const packager = new ContextPackager({
    materializer: () => ({
      provider: 'repo-packager',
      evidence: [
        { evidence_id: 'task', path: 'TASK.md', content: 'abcd' },
        { evidence_id: 'contract', path: 'src/contracts/context.js', content: 'efghijkl' },
      ],
    }),
  });

  const result = packager.package({ budget_tokens: 2, requested_evidence: requirements });

  assert.strictEqual(result.status, 'PARTIAL');
  assert.strictEqual(result.tokens_delivered, 1);
  assert.deepStrictEqual(result.telemetry.included_evidence_ids, ['task']);
  assert.deepStrictEqual(result.telemetry.missing_evidence_ids, ['contract']);
  assert.deepStrictEqual(result.telemetry.omitted_paths, ['src/contracts/context.js']);
  assert.strictEqual(result.telemetry.tokenizer.name, 'characters_divided_by_4');
  assert.match(result.telemetry.tokenizer.limitation, /approximation/);
  assert.strictEqual(ContextPackagerResult.safeParse(result).success, true);
});

test('uses a primary fallback deterministically when evidence is missing', () => {
  const calls = [];
  const packager = new ContextPackager({
    materializer: (request) => {
      calls.push(request);
      return { provider: 'repo-packager', evidence: [{ evidence_id: 'task', path: 'TASK.md', content: 'a' }] };
    },
    fallbackMaterializer: (request) => {
      calls.push(request);
      return { provider: 'source-control', evidence: [{ evidence_id: 'contract', path: 'src/contracts/context.js', content: 'b' }] };
    },
    tokenizer: { name: 'test-exact', exact: true, count: (text) => text.length, limitation: null },
  });

  const result = packager.package({ budget_tokens: 2, requested_paths: ['README.md'], requested_evidence: requirements });

  assert.strictEqual(result.status, 'COMPLETE');
  assert.deepStrictEqual(result.retrieval_providers, ['repo-packager', 'source-control']);
  assert.deepStrictEqual(result.fallback, { used: true, provider: 'source-control', reason: 'MISSING_EVIDENCE' });
  assert.deepStrictEqual(calls[1].requested_evidence.map((evidence) => evidence.evidence_id), ['contract']);
  assert.strictEqual(result.telemetry.tokenizer.limitation, null);
});

test('returns EMPTY when no evidence fits the assigned budget', () => {
  const packager = new ContextPackager({
    materializer: () => ({ provider: 'repo-packager', evidence: [{ evidence_id: 'task', path: 'TASK.md', content: 'abcd' }] }),
  });

  const result = packager.package({ budget_tokens: 0, requested_evidence: [requirements[0]] });

  assert.strictEqual(result.status, 'EMPTY');
  assert.strictEqual(result.coverage_status, 'EMPTY');
  assert.deepStrictEqual(result.omitted_evidence.map((evidence) => evidence.evidence_id), ['task']);
  assert.strictEqual(result.telemetry.fallback_used, false);
});

test('replaces stale evidence with its fallback source', () => {
  const packager = new ContextPackager({
    materializer: () => ({ provider: 'cache', quality_status: 'STALE', evidence: [{ evidence_id: 'task', path: 'TASK.md', content: 'old' }] }),
    fallbackMaterializer: () => ({ provider: 'source-control', evidence: [{ evidence_id: 'task', path: 'TASK.md', content: 'new' }] }),
    tokenizer: { name: 'test-exact', exact: true, count: () => 1, limitation: null },
  });

  const result = packager.package({ budget_tokens: 1, requested_evidence: [requirements[0]] });

  assert.strictEqual(result.status, 'COMPLETE');
  assert.strictEqual(result.included_evidence[0].content, 'new');
  assert.strictEqual(result.fallback.reason, 'STALE_EVIDENCE');
});
