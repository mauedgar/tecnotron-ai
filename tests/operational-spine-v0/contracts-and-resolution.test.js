'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ExecutionContext,
  RecipeDefinition,
  RecipeReceipt,
} = require('../../src/operational-spine-v0/contracts');
const {
  RecipeRegistry,
  materializeExecutionPlan,
} = require('../../src/operational-spine-v0');

const authorityRef = {
  kind: 'AUTHORITY',
  id: 'DEV-W2',
  location: 'evidence/dev-w2.json',
  sha256: 'a'.repeat(64),
};
const evidenceRef = {
  kind: 'EVIDENCE',
  id: 'EVIDENCE-W2',
  location: 'evidence/w2.json',
  sha256: 'b'.repeat(64),
};

function context(overrides = {}) {
  return {
    schema_version: 'tecnotron-execution-context/v0',
    operation_id: 'OP-001',
    taskcycle_id: 'TC-001',
    repository: { identity: 'mauedgar/tecnotron-ai', location: '/repo' },
    runtime: {
      executor: 'deterministic-recipe',
      platform: 'fixture',
      runtime_identity: 'node:fixture',
    },
    state_store: { reference: 'kernel-v0', location: '/tecnotron-home' },
    authority_refs: [authorityRef],
    evidence_refs: [evidenceRef],
    ...overrides,
  };
}

function operation() {
  return {
    kind: 'Operation',
    id: 'OP-001',
    taskcycle_id: 'TC-001',
  };
}

function recipe(id, provides) {
  return {
    definition: RecipeDefinition.parse({
      id,
      version: 'v0',
      provides,
      required_inputs: [],
      preconditions: [],
      effects: [],
      postconditions: [],
    }),
    async execute(request) {
      return RecipeReceipt.parse({
        schema_version: 'tecnotron-recipe-receipt/v0',
        receipt_ref: `receipt:${request.execution_attempt_id}`,
        recipe_id: request.recipe_id,
        recipe_version: request.recipe_version,
        operation_id: request.operation_id,
        execution_attempt_id: request.execution_attempt_id,
        status: 'PASS',
        effect_state: 'NONE',
        result_refs: [],
        evidence_refs: [],
      });
    },
  };
}

test('ExecutionContext remains bounded and rejects unrelated fields', () => {
  const parsed = ExecutionContext.parse(context());
  assert.equal(parsed.repository.identity, 'mauedgar/tecnotron-ai');
  assert.throws(() => ExecutionContext.parse(context({ conversation_history: ['hidden'] })));
});

test('deterministic recipe is selected before semantic escalation', () => {
  const registry = new RecipeRegistry();
  registry.register(recipe('render', ['state.render']));

  const plan = materializeExecutionPlan({
    operation: operation(),
    executionContext: context(),
    requiredCapabilities: ['state.render'],
    recipeRegistry: registry,
    authorityRefs: [authorityRef],
    evidenceRefs: [evidenceRef],
  });

  assert.equal(plan.resolution, 'DETERMINISTIC_RECIPE');
  assert.deepEqual(plan.recipe, { id: 'render', version: 'v0' });
  assert.equal(plan.semantic_escalation, null);
});

test('absence or ambiguity produces explicit semantic escalation without fallback', () => {
  const missing = new RecipeRegistry();
  const missingPlan = materializeExecutionPlan({
    operation: operation(),
    executionContext: context(),
    requiredCapabilities: ['semantic_reasoning.high'],
    recipeRegistry: missing,
  });
  assert.equal(missingPlan.resolution, 'SEMANTIC_ESCALATION_REQUIRED');
  assert.equal(missingPlan.semantic_escalation.reason, 'NO_DETERMINISTIC_RECIPE');

  const ambiguous = new RecipeRegistry();
  ambiguous.register(recipe('a', ['state.render']));
  ambiguous.register(recipe('b', ['state.render']));
  const ambiguousPlan = materializeExecutionPlan({
    operation: operation(),
    executionContext: context(),
    requiredCapabilities: ['state.render'],
    recipeRegistry: ambiguous,
  });
  assert.equal(ambiguousPlan.resolution, 'SEMANTIC_ESCALATION_REQUIRED');
  assert.equal(ambiguousPlan.semantic_escalation.reason, 'AMBIGUOUS_DETERMINISTIC_RECIPE');
});

test('ExecutionPlan cannot launder authority or evidence outside ExecutionContext', () => {
  const registry = new RecipeRegistry();
  registry.register(recipe('render', ['state.render']));

  assert.throws(() => materializeExecutionPlan({
    operation: operation(),
    executionContext: context(),
    requiredCapabilities: ['state.render'],
    recipeRegistry: registry,
    authorityRefs: [{ ...authorityRef, id: 'OTHER' }],
  }), /not present in ExecutionContext/);
});

test('RecipeReceipt requires UNKNOWN status and effect_state to agree', () => {
  const base = {
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: 'receipt:1',
    recipe_id: 'recipe',
    recipe_version: 'v0',
    operation_id: 'OP-001',
    execution_attempt_id: 'AT-001',
    reason: 'AMBIGUOUS',
    result_refs: [],
    evidence_refs: [],
  };

  assert.throws(() => RecipeReceipt.parse({
    ...base,
    status: 'FAIL',
    effect_state: 'UNKNOWN',
  }));

  assert.throws(() => RecipeReceipt.parse({
    ...base,
    status: 'UNKNOWN',
    effect_state: 'NONE',
  }));

  assert.equal(RecipeReceipt.parse({
    ...base,
    status: 'UNKNOWN',
    effect_state: 'UNKNOWN',
  }).status, 'UNKNOWN');
});
