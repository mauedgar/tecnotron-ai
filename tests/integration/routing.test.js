'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { resolveProject } = require('../../src/project-profile');
const { loadRegistries } = require('../../src/registries');
const { routeTask } = require('../../src/router');
const { resolveModel } = require('../../src/model-resolver');
const { createStateMachineFromOrchestrator } = require('../../src/core/state-machine');

const hasExplicitProjectResolution = Boolean(
  process.env.FF_PROJECT_ROOT
  && process.env.FF_AI_CORE_ROOT
  && process.env.FF_PROJECT_PROFILE,
);

test('real FitFlow profile and active registries produce a deterministic runtime proposal', { skip: !hasExplicitProjectResolution }, () => {
  const resolution = resolveProject();
  assert.strictEqual(resolution.projectRoot, path.resolve(process.env.FF_PROJECT_ROOT));
  assert.strictEqual(resolution.aiCoreRoot, path.resolve(process.env.FF_AI_CORE_ROOT));
  assert.strictEqual(resolution.profilePath, path.resolve(process.env.FF_PROJECT_PROFILE));
  assert.strictEqual(resolution.configDir, path.join(resolution.projectRoot, '.ai', 'config'));
  const registries = loadRegistries(resolution.configDir, ['project-profile.yaml', 'roles.yaml', 'models.yaml', 'finops.yaml', 'orchestrator.yaml']);
  const profile = registries['project-profile.yaml'];
  assert.strictEqual(profile.schema_version, 'fitflow-project-profile/v1');
  assert.strictEqual(registries['roles.yaml'].schema_version, 'fitflow-role-registry/v3');
  assert.strictEqual(registries['models.yaml'].schema_version, 'fitflow-model-registry/v3');
  assert.strictEqual(registries['finops.yaml'].schema_version, 'fitflow-finops/v1');
  assert.strictEqual(registries['orchestrator.yaml'].schema_version, 'fitflow-orchestrator/v2');
  assert.strictEqual(fs.statSync(profile.roots.product).isDirectory(), true);
  assert.strictEqual(fs.statSync(profile.roots.ai_core).isDirectory(), true);
  assert.strictEqual(
    path.resolve(profile.environment.reusable_discovery_env),
    path.join(path.resolve(profile.roots.ai_core), 'python', '.venv_tools'),
  );
  assert.strictEqual(fs.statSync(profile.environment.reusable_discovery_env).isDirectory(), true);
  assert.strictEqual(profile.environment.official_ai_core_env, null);
  assert.strictEqual(createStateMachineFromOrchestrator(registries['orchestrator.yaml']).canTransition('ROUTING', 'EXECUTING'), true);

  const task = { task_type: 'tooling', area: 'ai_tooling', risk: 'low' };
  const route = routeTask(task, registries['roles.yaml']);
  assert.strictEqual(route.role, 'coder_b');
  assert.deepStrictEqual(route.requirements.capabilities, ['coding']);
  const proposal = resolveModel({
    role: route.role,
    requirements: route.requirements,
    modelRegistry: registries['models.yaml'],
    roleRegistry: registries['roles.yaml'],
    finops: registries['finops.yaml'],
  });
  assert.deepStrictEqual(proposal.selected, {
    registry_id: 'mimo_v25_free_opencode',
    provider: 'opencode',
    runtime_id: 'opencode/mimo-v2.5-free',
    pool_id: 'opencode_zero_incremental',
    resource_class: 'zero_incremental',
    access_mode: 'included',
  });
  assert.strictEqual(registries['finops.yaml'].paid_api_enabled, false);
});
