'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TYPES, BASELINE_NODE_TESTS, classifyTest, assertBaselineMembership,
  discoverTests, inventory } = require('./run-by-type');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-suite-inventory-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const part of ['tests', 'scripts/doctor/tests', 'scripts/tests']) {
    fs.mkdirSync(path.join(root, part), { recursive: true });
  }
  return root;
}

test('every discovered Node test belongs to exactly one review-oriented type', () => {
  const { files, suites } = inventory();
  assert.equal(BASELINE_NODE_TESTS.length, 50, 'frozen tools baseline');
  assert.deepEqual(BASELINE_NODE_TESTS.slice().sort(), BASELINE_NODE_TESTS.slice());
  assertBaselineMembership(files);
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
  assert.throws(() => classifyTest('tests/operational-spine-v0/new-unreviewed.test.js'), /UNCLASSIFIED_NODE_TEST/);
  assert.throws(() => classifyTest('tests/deterministic-taskcycle-substrate-v0/new-unreviewed.test.js'), /UNCLASSIFIED_NODE_TEST/);
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

test('an exact frozen baseline path cannot disappear while the count stays sufficient', () => {
  const omitted = BASELINE_NODE_TESTS.slice(1).concat('tests/contract/newly-added.test.js');
  assert.equal(omitted.length, BASELINE_NODE_TESTS.length);
  assert.throws(() => assertBaselineMembership(omitted), /BASELINE_NODE_TEST_MISSING/);
  assert.doesNotThrow(() => assertBaselineMembership(BASELINE_NODE_TESTS));
});

test('Node tests outside declared roots are detected and rejected', t => {
  const root = fixture(t);
  const outside = path.join(root, 'scripts', 'experimental-tests');
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'new-contract.test.js'), '// synthetic test\\n');
  assert.ok(discoverTests(root).includes('scripts/experimental-tests/new-contract.test.js'));
  assert.throws(() => inventory(root), /UNCLASSIFIED_NODE_TEST/);
});

test('missing configured search root fails closed', t => {
  const root = fixture(t);
  fs.rmSync(path.join(root, 'scripts/tests'), { recursive: true });
  assert.throws(() => discoverTests(root), /REQUIRED_TEST_ROOT_MISSING/);
});

test('search root symlink never redirects test execution outside repository', t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-suite-external-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.rmSync(path.join(root, 'tests'), { recursive: true });
  try {
    fs.symlinkSync(outside, path.join(root, 'tests'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'EOPNOTSUPP'].includes(error.code)) {
      t.skip('symlink creation not available on this host: ' + error.code);
      return;
    }
    throw error;
  }
  assert.throws(() => discoverTests(root), /TEST_DIRECTORY_SYMLINK/);
});
