'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { resolveProject } = require('../../src/project-profile');
const { loadRegistries } = require('../../src/registries');
const { routeTask } = require('../../src/router');
const { resolveModel } = require('../../src/model-resolver');
const { createStateMachineFromOrchestrator } = require('../../src/core/state-machine');

const externalProjectEnabled = process.env.FF_TEST_EXTERNAL_PROJECT === '1';

test('real FitFlow profile and active registries produce a deterministic runtime proposal', { skip: externalProjectEnabled ? false : 'set FF_TEST_EXTERNAL_PROJECT=1' }, () => {
  const resolution = resolveProject();
  if (process.env.FF_PROJECT_ROOT) {
    assert.strictEqual(resolution.projectRoot, require('path').resolve(process.env.FF_PROJECT_ROOT));
  }
  assert.strictEqual(resolution.configDir, require('path').join(resolution.projectRoot, '.ai', 'config'));
  const registries = loadRegistries(resolution.configDir, ['project-profile.yaml', 'roles.yaml', 'models.yaml', 'finops.yaml', 'orchestrator.yaml']);
  assert.strictEqual(registries['roles.yaml'].schema_version, 'fitflow-role-registry/v3');
  assert.strictEqual(registries['models.yaml'].schema_version, 'fitflow-model-registry/v3');
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
