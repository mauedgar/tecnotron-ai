'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRenderCurrentStateRecipe } = require('../../src/operational-spine-v0/recipes/render-current-state');

const root = path.resolve(__dirname, '../..');

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function sourceFilesUnder(relativeDir) {
  const base = path.join(root, relativeDir);
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        files.push(path.relative(root, absolute).replaceAll('\\', '/'));
      }
    }
  };
  visit(base);
  return files.sort();
}

test('shipped Operational Spine Recipes have no direct State Kernel imports', () => {
  const offenders = sourceFilesUnder('src/operational-spine-v0/recipes')
    .filter((relativePath) => source(relativePath).includes('state-kernel-v0'));
  assert.deepEqual(offenders, []);
});

test('State Kernel direct imports are confined to the compatibility adapter', () => {
  const operationalSources = [
    ...sourceFilesUnder('src/operational-spine-v0'),
    ...sourceFilesUnder('src-typescript/operational-spine-v0'),
  ];
  const offenders = operationalSources
    .filter((relativePath) => source(relativePath).includes('state-kernel-v0'))
    .filter((relativePath) => relativePath !== 'src/operational-spine-v0/state-kernel-adapter.js');
  assert.deepEqual(offenders, []);

  assert.equal(
    source('src/operational-spine-v0/state-kernel-adapter.js').includes("require('../state-kernel-v0')"),
    true,
  );

  const reconcile = source('src/operational-spine-v0/recipes/reconcile-and-close-taskcycle.js');
  assert.equal(reconcile.includes('state-kernel-v0'), false);
  assert.equal(reconcile.includes('requireTaskCycleLifecycleCapability'), true);
});

test('render_current_state remains provider-neutral and uses the injected render capability', async () => {
  const projection = { TaskCycle: { id: 'TC-PORTABLE', state: 'ACTIVE' } };
  const recipe = createRenderCurrentStateRecipe({ renderState: () => projection });

  assert.deepEqual(recipe.definition.preconditions, ['state render capability is available']);
  assert.deepEqual(recipe.definition.postconditions, ['current state projection is returned without mutation']);
  assert.deepEqual(await recipe.preflight(), { status: 'READY' });

  const receipt = await recipe.execute({
    recipe_id: 'render_current_state',
    recipe_version: 'v0',
    operation_id: 'OP-PORTABLE',
    execution_attempt_id: 'ATTEMPT-PORTABLE',
  });
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'NONE');
  assert.deepEqual(receipt.output.projection, projection);
});
