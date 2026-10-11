'use strict';

/**
 * Repository-local Node test inventory and type-specific selector.
 *
 * This is a test runner, not a Product lifecycle gate, review verdict,
 * native-provider qualification or authority source.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');
const SEARCH_ROOTS = Object.freeze(['tests', 'scripts/doctor/tests', 'scripts/tests']);
const TYPES = Object.freeze(['unit', 'contract', 'integration', 'operational', 'compatibility']);

function classifyTest(relativePath) {
  const p = relativePath.replace(/\\/g, '/');
  if (!p.endsWith('.test.js')) {
    throw new Error('NOT_NODE_TEST:' + p);
  }

  if (p.startsWith('scripts/tests/')) return 'contract';
  if (p.startsWith('scripts/doctor/tests/')) return 'unit';
  if (p.startsWith('tests/contract/') || p.startsWith('tests/contracts/')) return 'contract';
  if (p.startsWith('tests/core/') || p.startsWith('tests/adapters/')) return 'unit';
  if (p.startsWith('tests/integration/')) return 'integration';
  if (p.startsWith('tests/state-kernel-v0/')) return 'compatibility';
  if (p.startsWith('tests/self-hosting-reconciliation-v0/')) return 'operational';

  if (p.startsWith('tests/deterministic-taskcycle-substrate-v0/')) {
    const base = path.posix.basename(p);
    if (base === 'contracts.test.js') return 'contract';
    if (base === 'observation.test.js') return 'unit';
    if (base === 'continuation.test.js' || base === 'cross-surface.test.js') return 'integration';
    return 'operational';
  }

  if (p.startsWith('tests/operational-spine-v0/')) {
    const base = path.posix.basename(p);
    if (base === 'contracts-and-resolution.test.js') return 'contract';
    if (['git-range-qualification.test.js', 'taskcycle-lifecycle-capability.test.js',
      'recipe-kernel-decoupling.test.js', 'workspace-readiness.test.js'].includes(base)) return 'unit';
    if (['git-execution-qualification.test.js', 'recipe-invocation-worker.test.js',
      'recipe-invocation.test.js', 'vertical.test.js'].includes(base)) return 'integration';
    return 'operational';
  }

  throw new Error('UNCLASSIFIED_NODE_TEST:' + p);
}

function discoverTests(root = REPOSITORY_ROOT) {
  const discovered = [];
  const search = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('TEST_DIRECTORY_SYMLINK:' + fullPath);
      if (entry.isDirectory()) search(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        discovered.push(path.relative(root, fullPath).split(path.sep).join('/'));
      }
    }
  };
  for (const part of SEARCH_ROOTS) {
    const directory = path.join(root, part);
    if (fs.existsSync(directory)) search(directory);
  }
  return [...new Set(discovered)].sort();
}

function inventory(root = REPOSITORY_ROOT) {
  const files = discoverTests(root);
  if (files.length === 0) throw new Error('NO_NODE_TESTS_DISCOVERED');
  const suites = Object.fromEntries(TYPES.map(type => [type, []]));
  for (const file of files) {
    suites[classifyTest(file)].push(file);
  }
  return { files, suites };
}

function run(type) {
  if (type !== 'all' && type !== 'inventory' && !TYPES.includes(type)) {
    throw new Error('UNKNOWN_TEST_SUITE:' + type);
  }
  const { files, suites } = inventory();
  const counts = Object.fromEntries(TYPES.map(key => [key, suites[key].length]));
  if (type === 'inventory') {
    process.stdout.write(JSON.stringify({ total: files.length, counts, suites }, null, 2) + '\n');
    return 0;
  }
  const selected = type === 'all' ? files : suites[type];
  if (!selected.length) throw new Error('EMPTY_TEST_SUITE:' + type);
  process.stdout.write(JSON.stringify({ suite: type, selected_files: selected.length,
    total_files: files.length, counts }) + '\n');
  const result = spawnSync(process.execPath, ['--test', ...selected], {
    cwd: REPOSITORY_ROOT,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return typeof result.status === 'number' ? result.status : 1;
}

if (require.main === module) {
  try {
    process.exitCode = run(process.argv[2] || 'inventory');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { TYPES, classifyTest, discoverTests, inventory, run };
