'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TYPES, classifyTest, discoverTests, inventory } = require('./run-by-type');

test('every discovered Node test belongs to exactly one review-oriented type', () => {
  const { files, suites } = inventory();
  assert.ok(files.length >= 50, 'repository baseline contained 50 Node test files');
  assert.deepEqual(Object.keys(suites), TYPES);
  const flattened = TYPES.flatMap(type => suites[type]);
  assert.deepEqual(flattened.slice().sort(), files);
  assert.equal(new Set(flattened).size, flattened.length);
  for (const type of TYPES) assert.ok(suites[type].length > 0);
});

test('native validation, historical compatibility and independent review stay distinct', () => {
  assert.equal(classifyTest('tests/state-kernel-v0/kernel.test.js'), 'compatibility');
  assert.equal(classifyTest('tests/deterministic-taskcycle-substrate-v0/contracts.test.js'), 'contract');
  assert.equal(classifyTest('tests/operational-spine-v0/reconcile-and-close-taskcycle.test.js'), 'operational');
  assert.equal(classifyTest('tests/integration/opencode-execution-surface.test.js'), 'integration');
  assert.equal(classifyTest('tests/adapters/opencode-cli.test.js'), 'unit');
  assert.equal(classifyTest('scripts/doctor/tests/doctor.test.js'), 'unit');
  assert.equal(classifyTest('scripts/tests/test-suites.test.js'), 'contract');
});

test('unclassified future test and non-test inputs fail closed', () => {
  assert.throws(() => classifyTest('tests/new-surface/new-contract.test.js'), /UNCLASSIFIED_NODE_TEST/);
  assert.throws(() => classifyTest('tests/repo-packager/pack.test.py'), /NOT_NODE_TEST/);
  assert.throws(() => classifyTest('tests/integration/new-surface.test.ts'), /NOT_NODE_TEST/);
});

test('optional external FitFlow-profile integration tests remain in the complete inventory', () => {
  const paths = discoverTests();
  for (const relative of [
    'tests/integration/agent-mvp.test.js',
    'tests/integration/routing.test.js',
    'tests/integration/runtime-conformance.test.js',
  ]) {
    assert.ok(paths.includes(relative), relative);
    assert.equal(classifyTest(relative), 'integration');
  }
});

test('all typed selections preserve baseline Node-suite membership', () => {
  const { files, suites } = inventory();
  for (const relative of files) {
    const matching = TYPES.filter(type => suites[type].includes(relative));
    assert.equal(matching.length, 1, 'missing or duplicated: ' + relative);
  }
});
