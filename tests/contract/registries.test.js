'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { loadRegistries, loadRegistryFile, REGISTRY_SCHEMAS, RegistryLoadError } = require('../../src/registries/index.js');

const CONFIG_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'FitFlow', '.ai', 'config');

test('registry schemas cover the canonical config set', () => {
  for (const expected of ['orchestrator.yaml', 'roles.yaml', 'models.yaml', 'project-profile.yaml', 'finops.yaml']) {
    assert.ok(REGISTRY_SCHEMAS[expected], `missing schema for ${expected}`);
  }
});

test('loads real orchestrator registry from project config', () => {
  const reg = loadRegistryFile('orchestrator.yaml', CONFIG_DIR);
  assert.strictEqual(reg.schema_version, 'fitflow-orchestrator/v2');
  assert.ok(reg.states.includes('PENDING_ACCEPTANCE'));
  assert.strictEqual(reg.control.final_actor, 'developer');
  assert.strictEqual(reg.control.final_state, 'DONE');
  assert.ok(reg.transitions.PENDING_ACCEPTANCE.includes('DONE'));
});

test('loads real roles registry', () => {
  const reg = loadRegistryFile('roles.yaml', CONFIG_DIR);
  assert.strictEqual(reg.schema_version, 'fitflow-role-registry/v2');
  assert.strictEqual(reg.roles.developer_planner.terminal_authority, true);
  assert.ok(reg.disabled_roles.includes('security_reviewer'));
});

test('loads real models registry', () => {
  const reg = loadRegistryFile('models.yaml', CONFIG_DIR);
  assert.strictEqual(reg.schema_version, 'fitflow-model-registry/v2');
  assert.ok(reg.entries.fastcontext_local_candidate);
  assert.ok(reg.prohibited.includes('programmatic_github_copilot'));
});

test('loads real project profile', () => {
  const reg = loadRegistryFile('project-profile.yaml', CONFIG_DIR);
  assert.strictEqual(reg.project_id, 'fitflow');
  assert.strictEqual(reg.features.mcp, false);
});

test('loads real finops registry', () => {
  const reg = loadRegistryFile('finops.yaml', CONFIG_DIR);
  assert.strictEqual(reg.incremental_budget_usd, 0);
  assert.strictEqual(reg.paid_api_enabled, false);
  assert.strictEqual(reg.resource_pools.paid.enabled, false);
});

test('loadRegistries loads all registered files together', () => {
  const all = loadRegistries(CONFIG_DIR, Object.keys(REGISTRY_SCHEMAS));
  assert.strictEqual(Object.keys(all).length, Object.keys(REGISTRY_SCHEMAS).length);
});

test('rejects malformed registry', () => {
  const malformed = {
    artifact: 'TASK',
    schema_version: 'fitflow-task/v2',
    task_id: 'FF-AI-VNEXT-003',
    title: 'x',
    status: 'READY',
    task_type: 'tooling',
    area: 'ai_tooling',
    scope: 'docs_tooling',
    lane: 'ai_orchestrated',
    risk: 'low',
    priority: 'P0',
    created_at: '2026-08-18T16:00:00-03:00',
    author_role: 'developer',
    baseline: { revision: 'a', fingerprint_status: 'unavailable', working_tree_fingerprint: null, fingerprint_reason: 'x'.repeat(3) },
    github_issue: null,
    openspec_change: null,
    objective: 'x',
    in_scope: ['x'],
    out_of_scope: [],
    acceptance_criteria: [{ id: 'AC-1', criterion: 'x'.repeat(5) }],
    ownership_keys: ['path:x'],
  };
  assert.throws(() => {
    loadRegistryFile('does-not-exist.yaml', CONFIG_DIR);
  }, RegistryLoadError);
});