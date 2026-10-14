'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ContextPackager } = require('../../src/core/context-packager');
const { loadAgentProfiles } = require('../../src/registries/agent-profiles');

const ROOT = path.resolve(__dirname, '../..');
const TASKCYCLE = 'TASKCYCLE-TECNOTRON-ULC-OP02-ACTOR-CONTEXT-CONSUMER-001';
const GRANT = 'DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11';
const REPOSITORY = 'mauedgar/tecnotron-ai@c875ef7c14ac95d8fa80f617cd36b86978290f99';
const SCOPE = [
  'docs/SOURCE_OF_TRUTH.md',
  'docs/context-strategy.md',
  'docs/tasks/TEC-TC-ULC-OP02-ACTOR-CONTEXT-CONSUMER-001/TASK.md',
];
const REQUIREMENTS = [
  { evidence_id: 'product-sot', path: SCOPE[0] },
  { evidence_id: 'context-policy', path: SCOPE[1] },
  { evidence_id: 'assigned-task', path: SCOPE[2] },
];

function caller(overrides = {}) {
  return {
    accepted_authority_ref: GRANT,
    resolved_project_profile_ref: 'tecnotron-ai:tools',
    resolved_repository_ref: REPOSITORY,
    read_scope: [...SCOPE],
    context_ref_or_evidence_requirements: 'ULC-OP02-MINIMUM-REQUIREMENTS',
    context_budget: 100000,
    evidence_requirements: REQUIREMENTS.map((item) => ({ ...item })),
    project_profile: 'tecnotron-agent-profile/v1:explorer',
    ...overrides,
  };
}

function consumeExplorer(input, materializer, fallbackMaterializer = null) {
  const explorer = loadAgentProfiles().profiles.explorer;
  for (const field of explorer.required_inputs) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      return { gate: 'BLOCKED', reason: 'MISSING_ACTOR_REQUIRED_INPUT:' + field };
    }
  }
  if (input.accepted_authority_ref !== GRANT
      || input.resolved_repository_ref !== REPOSITORY
      || input.project_profile !== 'tecnotron-agent-profile/v1:explorer') {
    return { gate: 'BLOCKED', reason: 'AUTHORITY_OR_SUBJECT_MISMATCH' };
  }
  if (explorer.responsibility !== 'evidence_exploration'
      || explorer.permissions.default !== 'deny'
      || explorer.permissions.filesystem_write !== 'denied'
      || explorer.permissions.git_mutation !== 'denied'
      || explorer.permissions.delegation !== 'denied'
      || explorer.permissions.planning_provider_mutation !== 'denied'
      || explorer.tools.allow.length !== 0 || explorer.skills.allow.length !== 0) {
    return { gate: 'BLOCKED', reason: 'ACTOR_PERMISSION_NOT_READ_ONLY' };
  }
  const declared = new Set(input.read_scope);
  if (input.evidence_requirements.some((item) => !declared.has(item.path))
      || input.read_scope.some((item) => !SCOPE.includes(item))
      || !Number.isInteger(input.context_budget) || input.context_budget < 0) {
    return { gate: 'BLOCKED', reason: 'INVALID_CONTEXT_SCOPE_OR_BUDGET' };
  }
  const packager = new ContextPackager({
    materializer,
    fallbackMaterializer,
    tokenizer: { name: 'exact-characters-fixture', exact: true, limitation: null, count: (text) => text.length },
  });
  const coverage = packager.package({
    budget_tokens: input.context_budget,
    requested_paths: input.read_scope,
    requested_evidence: input.evidence_requirements,
  });
  return {
    gate: coverage.status === 'COMPLETE' ? 'MECHANICAL_COVERAGE_COMPLETE' : 'BLOCKED',
    reason: coverage.status === 'COMPLETE' ? null : 'REQUIRED_EVIDENCE_NOT_DELIVERED',
    TaskCycle: TASKCYCLE,
    coverage,
    semantic_action_sufficiency: 'NOT_EVALUATED_BY_DETERMINISTIC_PACKAGER',
    independent_model_context: 'NOT_ESTABLISHED_BY_NODE_FIXTURE',
    Product_authority_created: false,
  };
}

function repositoryMaterializer() {
  return {
    provider: 'repository-exact-paths',
    evidence: REQUIREMENTS.map(({ evidence_id, path: p }) => ({
      evidence_id,
      path: p,
      content: fs.readFileSync(path.join(ROOT, p), 'utf8'),
    })),
  };
}

test('ULC-OP02 actor explorer consumes exact Product SOT/Task/context via existing registry and packager', () => {
  const result = consumeExplorer(caller(), repositoryMaterializer);
  assert.equal(result.gate, 'MECHANICAL_COVERAGE_COMPLETE');
  assert.equal(result.coverage.status, 'COMPLETE');
  assert.deepEqual(result.coverage.missing_evidence_ids, []);
  assert.deepEqual(result.coverage.telemetry.included_paths, SCOPE);
  assert.equal(result.coverage.telemetry.tokenizer.exact, true);
  assert.equal(result.semantic_action_sufficiency, 'NOT_EVALUATED_BY_DETERMINISTIC_PACKAGER');
  assert.equal(result.independent_model_context, 'NOT_ESTABLISHED_BY_NODE_FIXTURE');
  assert.equal(result.Product_authority_created, false);
});

test('ULC-OP02 refuses missing Developer grant without invoking the materializer', () => {
  let calls = 0;
  const r = consumeExplorer(caller({ accepted_authority_ref: null }), () => { calls++; return repositoryMaterializer(); });
  assert.equal(r.gate, 'BLOCKED');
  assert.match(r.reason, /MISSING_ACTOR_REQUIRED_INPUT/);
  assert.equal(calls, 0);
  const mismatched = consumeExplorer(caller({ accepted_authority_ref: 'TRANSPORT_ONLY' }), () => { calls++; return repositoryMaterializer(); });
  assert.equal(mismatched.reason, 'AUTHORITY_OR_SUBJECT_MISMATCH');
  assert.equal(calls, 0);
});

test('ULC-OP02 blocks out-of-scope paths and changed Product repository identity', () => {
  const invalidPath = consumeExplorer(caller({ read_scope: [...SCOPE, 'src/secrets.env'] }), repositoryMaterializer);
  assert.equal(invalidPath.reason, 'INVALID_CONTEXT_SCOPE_OR_BUDGET');
  const wrongRepo = consumeExplorer(caller({ resolved_repository_ref: REPOSITORY + '-drift' }), repositoryMaterializer);
  assert.equal(wrongRepo.reason, 'AUTHORITY_OR_SUBJECT_MISMATCH');
});

test('ULC-OP02 rejects mechanical missing evidence and explicitly reports incomplete coverage', () => {
  const r = consumeExplorer(caller(), () => ({
    provider: 'incomplete-provider',
    evidence: repositoryMaterializer().evidence.slice(0, 1),
  }));
  assert.equal(r.gate, 'BLOCKED');
  assert.equal(r.coverage.status, 'PARTIAL');
  assert.deepEqual(r.coverage.missing_evidence_ids, ['context-policy', 'assigned-task']);
});

test('ULC-OP02 treats insufficient budget as coverage failure, not semantic success', () => {
  const r = consumeExplorer(caller({ context_budget: 1 }), repositoryMaterializer);
  assert.equal(r.gate, 'BLOCKED');
  assert.equal(r.coverage.status, 'EMPTY');
  assert.deepEqual(r.coverage.missing_evidence_ids, ['product-sot', 'context-policy', 'assigned-task']);
});

test('ULC-OP02 stale evidence requires explicit source fallback and preserves provenance', () => {
  const primary = () => ({
    provider: 'stale-derived-index',
    quality_status: 'STALE',
    evidence: REQUIREMENTS.map(({ evidence_id, path: p }) => ({ evidence_id, path: p, content: 'stale' })),
  });
  const withoutFallback = consumeExplorer(caller(), primary);
  // Mechanical inclusion alone is never evidence of semantic sufficiency or freshness.
  assert.equal(withoutFallback.semantic_action_sufficiency, 'NOT_EVALUATED_BY_DETERMINISTIC_PACKAGER');
  const withFallback = consumeExplorer(caller(), primary, repositoryMaterializer);
  assert.equal(withFallback.gate, 'MECHANICAL_COVERAGE_COMPLETE');
  assert.equal(withFallback.coverage.fallback.reason, 'STALE_EVIDENCE');
  assert.deepEqual(withFallback.coverage.retrieval_providers, ['stale-derived-index', 'repository-exact-paths']);
  assert.notEqual(withFallback.coverage.included_evidence[0].content, 'stale');
});

test('ULC-OP02 registry preserves actor vs Developer separation and denied writer capabilities', () => {
  const registry = loadAgentProfiles();
  assert.equal(registry.schema_version, 'tecnotron-agent-profile/v1');
  assert.equal(registry.profiles.explorer.subagent_depth, 0);
  assert.equal(registry.profiles.explorer.permissions.filesystem_write, 'denied');
  assert.equal(registry.profiles.explorer.permissions.secret_access, 'denied');
  assert.equal(registry.profiles.reviewer.permissions.filesystem_write, 'denied');
  assert.equal(registry.profiles.implementer.permissions.filesystem_write, 'task_owned_source');
  assert.equal(registry.profiles.implementer.permissions.git_mutation, 'denied');
  assert.equal(Object.prototype.hasOwnProperty.call(registry.profiles, 'Product_Control'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(registry.profiles, 'Developer'), false);
});
