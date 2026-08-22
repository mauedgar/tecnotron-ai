'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { loadRegistryFile, REGISTRY_SCHEMAS, RegistryLoadError } = require('../../src/registries/index.js');
const { resolveProject } = require('../../src/project-profile');

const PRODUCT_ROOT = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fitflow-profile-'));
const CONFIG_DIR = path.join(PRODUCT_ROOT, '.ai', 'config');
fs.mkdirSync(CONFIG_DIR, { recursive: true });
fs.writeFileSync(path.join(CONFIG_DIR, 'project-profile.yaml'), `schema_version: fitflow-project-profile/v1
project_id: fitflow-test
baseline: test
roots:
  product: ignored-by-explicit-root
  ai_core: ignored-by-explicit-root
authority:
  source_of_truth: docs/SOURCE_OF_TRUTH.md
  agents: AGENTS.md
  canonical_docs: []
product_architecture:
  backend_dependency_direction: [router]
  target: test
operational:
  task_store: local
  project_count: one
  run_root: .ai/runs
  local_state: .ai/local/state.sqlite
specification:
  adapter: openspec
  status: planned
features:
  semantic_retrieval: false
  mcp: false
  temporal: false
  orchestrator_workers: false
environment:
  reusable_discovery_env: none
  official_ai_core_env: null
`);
const RESOLUTION = resolveProject({ projectRoot: PRODUCT_ROOT, aiCoreRoot: path.resolve(__dirname, '..', '..') });

test('registry schemas cover the canonical config set', () => {
  for (const expected of ['orchestrator.yaml', 'roles.yaml', 'models.yaml', 'project-profile.yaml', 'finops.yaml']) {
    assert.ok(REGISTRY_SCHEMAS[expected], `missing schema for ${expected}`);
  }
});

test('resuelve perfil sin depender de repositorios hermanos', () => {
  const reg = loadRegistryFile('project-profile.yaml', RESOLUTION.configDir);
  assert.strictEqual(reg.project_id, 'fitflow-test');
  assert.strictEqual(RESOLUTION.projectRoot, PRODUCT_ROOT);
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
