'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { ContextPackager } = require('../../src/core/context-packager');
const { loadAgentProfiles } = require('../../src/registries/agent-profiles');

const ROOT = path.resolve(__dirname, '../..');
const TASKCYCLE = 'TASKCYCLE-TECNOTRON-ULC-OP02-ACTOR-CONTEXT-CONSUMER-001';
const GRANT = 'DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11';
const REPOSITORY = 'mauedgar/tecnotron-ai@518fb736b96e2a4f5084c5c930cdac6c090dc73b';
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
const SOURCE_BLOBS = [
  'dd8d34a7e3ef3094805d014f9e59741d2c553957',
  '8b32f6b9a149ef5b240c7e31f42dc05f92e457e1',
  'd9bc7baefcc933c0ea8b7c23eb63f0bff84ca7c8',
];
function gitBlobSha(content) {
  const bytes = Buffer.from(content, 'utf8');
  return createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
}

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
      || input.resolved_project_profile_ref !== 'tecnotron-ai:tools'
      || input.context_ref_or_evidence_requirements !== 'ULC-OP02-MINIMUM-REQUIREMENTS'
      || input.project_profile !== 'tecnotron-agent-profile/v1:explorer') {
    return { gate: 'BLOCKED', reason: 'AUTHORITY_OR_SUBJECT_MISMATCH' };
  }
  if (explorer.responsibility !== 'evidence_exploration'
      || explorer.permissions.default !== 'deny'
      || explorer.permissions.filesystem_write !== 'denied'
      || explorer.permissions.git_mutation !== 'denied'
      || explorer.permissions.command_execution !== 'read_only_deterministic'
      || explorer.permissions.delegation !== 'denied'
      || explorer.permissions.planning_provider_mutation !== 'denied'
      || explorer.tools.allow.length !== 0 || explorer.skills.allow.length !== 0) {
    return { gate: 'BLOCKED', reason: 'ACTOR_PERMISSION_NOT_READ_ONLY' };
  }
  // A scoped Actor fixture must refuse any attempted write or non-read-only execution.
  // This checks the boundary before any materializer can be invoked; no effect is attempted.
  if (input.attempted_effect && input.attempted_effect !== 'read_only_evidence') {
    return { gate: 'BLOCKED', reason: 'ACTOR_EFFECT_DENIED' };
  }
  // This Task binds three mandatory evidence IDs and paths. A caller may not
  // redefine the minimum by omitting, duplicating or renaming requirements.
  if (!Array.isArray(input.read_scope) || !Array.isArray(input.evidence_requirements)
      || input.read_scope.length !== SCOPE.length
      || new Set(input.read_scope).size !== SCOPE.length
      || SCOPE.some((p) => !input.read_scope.includes(p))
      || input.evidence_requirements.length !== REQUIREMENTS.length
      || REQUIREMENTS.some(({ evidence_id, path: p }) => input.evidence_requirements.filter(
        (r) => r && r.evidence_id === evidence_id && r.path === p && r.required !== false
      ).length !== 1)
      || !Number.isInteger(input.context_budget) || input.context_budget < 0) {
    return { gate: 'BLOCKED', reason: 'INVALID_CONTEXT_SCOPE_OR_BUDGET' };
  }
  let primaryQuality = null;
  let fallbackQuality = null;
  let freshFallbackEvidenceIds = new Set();
  const packager = new ContextPackager({
    materializer: (request) => {
      const result = materializer(request);
      primaryQuality = result.quality_status || 'CURRENT';
      return result;
    },
    fallbackMaterializer: fallbackMaterializer ? (request) => {
      const result = fallbackMaterializer(request);
      fallbackQuality = result.quality_status || 'CURRENT';
      freshFallbackEvidenceIds = new Set((Array.isArray(result.evidence) ? result.evidence : [])
        .map((evidence) => evidence && evidence.evidence_id));
      return result;
    } : null,
    tokenizer: { name: 'exact-characters-fixture', exact: true, limitation: null, count: (text) => text.length },
  });
  const coverage = packager.package({
    budget_tokens: input.context_budget,
    requested_paths: input.read_scope,
    requested_evidence: input.evidence_requirements,
  });
  // COMPLETE is mechanical ID coverage, never sufficient evidence of freshness,
  // authorized paths or exact repository bytes.
  let reason = null;
  if (primaryQuality !== 'CURRENT' && !(
    ['STALE', 'CONTRADICTORY'].includes(primaryQuality)
    && coverage.fallback.used && fallbackQuality === 'CURRENT')) {
    reason = 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE';
  }
  // A fallback is only valid if it declares CURRENT quality, even when the
  // primary was CURRENT but missing one or more required evidence IDs.
  if (!reason && coverage.fallback.used && fallbackQuality !== 'CURRENT') {
    reason = 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE';
  }
  // Replacing a stale/contradictory primary requires a fresh replacement for
  // EVERY required ID, not merely a fallback being invoked. ContextPackager
  // can retain primary evidence for IDs the fallback omitted.
  if (!reason && primaryQuality !== 'CURRENT' && coverage.fallback.used
      && REQUIREMENTS.some((requirement) => !freshFallbackEvidenceIds.has(requirement.evidence_id))) {
    reason = 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE';
  }
  if (!reason && coverage.included_evidence.some((item) => {
    const expected = REQUIREMENTS.findIndex((requirement) => requirement.evidence_id === item.evidence_id);
    return expected === -1 || item.path !== REQUIREMENTS[expected].path
      || gitBlobSha(item.content) !== SOURCE_BLOBS[expected];
  })) reason = 'DELIVERED_EVIDENCE_NOT_EXACT_SOURCE';
  const complete = coverage.status === 'COMPLETE' && reason === null;
  return {
    gate: complete ? 'MECHANICAL_COVERAGE_COMPLETE' : 'BLOCKED',
    reason: reason || (complete ? null : 'REQUIRED_EVIDENCE_NOT_DELIVERED'),
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
  assert.equal(withoutFallback.gate, 'BLOCKED');
  assert.equal(withoutFallback.reason, 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE');
  assert.equal(withoutFallback.coverage.status, 'COMPLETE');
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

test('ULC-OP02 rejects contradictory evidence without a qualified exact-source fallback', () => {
  const contradictory = () => ({ provider: 'contradictory-index', quality_status: 'CONTRADICTORY',
    evidence: repositoryMaterializer().evidence });
  const blocked = consumeExplorer(caller(), contradictory);
  assert.equal(blocked.coverage.status, 'COMPLETE');
  assert.equal(blocked.gate, 'BLOCKED');
  assert.equal(blocked.reason, 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE');
  const corrected = consumeExplorer(caller(), contradictory, repositoryMaterializer);
  assert.equal(corrected.gate, 'MECHANICAL_COVERAGE_COMPLETE');
  assert.equal(corrected.coverage.fallback.reason, 'CONTRADICTORY_EVIDENCE');
});
test('ULC-OP02 rejects delivered evidence whose required ID maps to an unauthorized path', () => {
  const bad = () => ({ provider: 'wrong-path', evidence: repositoryMaterializer().evidence.map((item, i) =>
    i === 0 ? { ...item, path: 'src/unauthorized.js' } : item) });
  const result = consumeExplorer(caller(), bad);
  assert.equal(result.coverage.status, 'COMPLETE');
  assert.equal(result.gate, 'BLOCKED');
  assert.equal(result.reason, 'DELIVERED_EVIDENCE_NOT_EXACT_SOURCE');
});
test('ULC-OP02 rejects drifted bytes despite COMPLETE evidence IDs and allowed path labels', () => {
  const bad = () => ({ provider: 'drift', evidence: repositoryMaterializer().evidence.map((item, i) =>
    i === 1 ? { ...item, content: item.content + 'drift' } : item) });
  const result = consumeExplorer(caller(), bad);
  assert.equal(result.coverage.status, 'COMPLETE');
  assert.equal(result.gate, 'BLOCKED');
  assert.equal(result.reason, 'DELIVERED_EVIDENCE_NOT_EXACT_SOURCE');
});
for (const attempted_effect of ['filesystem_write', 'command_execution_write']) {
  test('ULC-OP02 refuses attempted forbidden Actor effect ' + attempted_effect + ' before materialization', () => {
    let materializerCalls = 0;
    const result = consumeExplorer(caller({ attempted_effect }), () => {
      materializerCalls += 1;
      return repositoryMaterializer();
    });
    assert.equal(result.gate, 'BLOCKED');
    assert.equal(result.reason, 'ACTOR_EFFECT_DENIED');
    assert.equal(materializerCalls, 0);
  });
}

test('ULC-OP02 blocks stale or contradictory MISSING_EVIDENCE fallback even if exact bytes complete coverage', () => {
  const incompletePrimary = () => ({ provider: 'primary-incomplete', quality_status: 'CURRENT',
    evidence: repositoryMaterializer().evidence.slice(0, 1) });
  for (const quality_status of ['STALE', 'CONTRADICTORY']) {
    const invalidFallback = () => ({ ...repositoryMaterializer(), quality_status });
    const result = consumeExplorer(caller(), incompletePrimary, invalidFallback);
    assert.equal(result.coverage.status, 'COMPLETE');
    assert.equal(result.coverage.fallback.reason, 'MISSING_EVIDENCE');
    assert.equal(result.gate, 'BLOCKED');
    assert.equal(result.reason, 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE');
  }
  const valid = consumeExplorer(caller(), incompletePrimary, repositoryMaterializer);
  assert.equal(valid.gate, 'MECHANICAL_COVERAGE_COMPLETE');
});
test('ULC-OP02 refuses caller-reduced, duplicate or redefined minimum requirements before materialization', () => {
  let calls = 0;
  const materializer = () => { calls++; return repositoryMaterializer(); };
  const altered = [
    { read_scope: [SCOPE[0]], evidence_requirements: [REQUIREMENTS[0]] },
    { evidence_requirements: REQUIREMENTS.slice(1) },
    { evidence_requirements: [...REQUIREMENTS, REQUIREMENTS[0]] },
    { evidence_requirements: REQUIREMENTS.map((r, i) => i === 0 ? { ...r, path: 'src/other' } : r) },
    { evidence_requirements: REQUIREMENTS.map((r, i) => i === 0 ? { ...r, required: false } : r) },
    { read_scope: [...SCOPE, SCOPE[0]] },
    { read_scope: SCOPE.slice(1) },
  ];
  for (const mutation of altered) {
    const result = consumeExplorer(caller(mutation), materializer);
    assert.equal(result.gate, 'BLOCKED');
    assert.equal(result.reason, 'INVALID_CONTEXT_SCOPE_OR_BUDGET');
  }
  assert.equal(calls, 0);
});
test('ULC-OP02 refuses drifted project-profile and minimum requirement binding before materialization', () => {
  let calls = 0;
  for (const mutation of [
    { resolved_project_profile_ref: 'other-project:tools' },
    { context_ref_or_evidence_requirements: 'INCOMPLETE' },
  ]) {
    const result = consumeExplorer(caller(mutation), () => { calls++; return repositoryMaterializer(); });
    assert.equal(result.gate, 'BLOCKED');
    assert.equal(result.reason, 'AUTHORITY_OR_SUBJECT_MISMATCH');
  }
  assert.equal(calls, 0);
});

test('ULC-OP02 never carries stale/contradictory primary IDs through an incomplete fallback', () => {
  const exact = repositoryMaterializer().evidence;
  for (const quality_status of ['STALE', 'CONTRADICTORY']) {
    const primary = () => ({ provider: 'untrusted-index', quality_status, evidence: exact });
    const incompleteFallback = () => ({ provider: 'partial-current-fallback',
      quality_status: 'CURRENT', evidence: exact.slice(0, 1) });
    const result = consumeExplorer(caller(), primary, incompleteFallback);
    assert.equal(result.coverage.status, 'COMPLETE');
    assert.equal(result.coverage.fallback.used, true);
    assert.equal(result.gate, 'BLOCKED');
    assert.equal(result.reason, 'UNRESOLVED_STALE_OR_CONTRADICTORY_EVIDENCE');
    const completeFallback = () => ({ provider: 'full-current-fallback',
      quality_status: 'CURRENT', evidence: exact });
    const resolved = consumeExplorer(caller(), primary, completeFallback);
    assert.equal(resolved.gate, 'MECHANICAL_COVERAGE_COMPLETE');
  }
});
