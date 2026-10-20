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
const EXCLUDED_DIRECTORY_NAMES = new Set(['.git', 'node_modules', '.venv', 'dist', 'coverage', '.cache']);
const BASELINE_NODE_TESTS = Object.freeze([
  'scripts/doctor/tests/doctor.test.js',
  'scripts/doctor/tests/project-resolution.test.js',
  'tests/adapters/github-operational-projection.test.js',
  'tests/adapters/opencode-cli.test.js',
  'tests/adapters/providers.test.js',
  'tests/contract/agent-profiles.test.js',
  'tests/contract/contracts.test.js',
  'tests/contract/execution-coordination.test.js',
  'tests/contract/opencode-agent-profiles.test.js',
  'tests/contract/registries.test.js',
  'tests/contract/runtime-identity.test.js',
  'tests/contract/sdd-artifact-authority.test.js',
  'tests/contracts/package-modes.test.js',
  'tests/core/agent-mvp.test.js',
  'tests/core/agent-runtime.test.js',
  'tests/core/context-packager.test.js',
  'tests/core/execution-coordinator.test.js',
  'tests/core/explorer.test.js',
  'tests/core/routing.test.js',
  'tests/core/state-machine.test.js',
  'tests/deterministic-taskcycle-substrate-v0/continuation.test.js',
  'tests/deterministic-taskcycle-substrate-v0/contracts.test.js',
  'tests/deterministic-taskcycle-substrate-v0/cross-surface.test.js',
  'tests/deterministic-taskcycle-substrate-v0/observation.test.js',
  'tests/deterministic-taskcycle-substrate-v0/taskcycle-closure-compatibility.test.js',
  'tests/deterministic-taskcycle-substrate-v0/taskcycle-effect-reconciliation.test.js',
  'tests/deterministic-taskcycle-substrate-v0/taskcycle-initialization.test.js',
  'tests/deterministic-taskcycle-substrate-v0/taskcycle-post-phase1-lifecycle.test.js',
  'tests/deterministic-taskcycle-substrate-v0/taskcycle-terminal-preflight.test.js',
  'tests/integration/agent-mvp.test.js',
  'tests/integration/opencode-execution-surface.test.js',
  'tests/integration/routing.test.js',
  'tests/integration/runtime-conformance.test.js',
  'tests/operational-spine-v0/contracts-and-resolution.test.js',
  'tests/operational-spine-v0/git-execution-qualification.test.js',
  'tests/operational-spine-v0/git-range-qualification.test.js',
  'tests/operational-spine-v0/integrate-accepted-candidate.test.js',
  'tests/operational-spine-v0/materialize-frozen-review-interface.test.js',
  'tests/operational-spine-v0/prepare-fitflow-test-runtime.test.js',
  'tests/operational-spine-v0/recipe-invocation-worker.test.js',
  'tests/operational-spine-v0/recipe-invocation.test.js',
  'tests/operational-spine-v0/recipe-kernel-decoupling.test.js',
  'tests/operational-spine-v0/reconcile-and-close-taskcycle.test.js',
  'tests/operational-spine-v0/taskcycle-lifecycle-capability.test.js',
  'tests/operational-spine-v0/validate-fitflow-http-contract-candidate.test.js',
  'tests/operational-spine-v0/vertical.test.js',
  'tests/operational-spine-v0/workspace-readiness.test.js',
  'tests/self-hosting-reconciliation-v0/reconciliation.test.js',
  'tests/state-kernel-v0/kernel.test.js',
  'tests/state-kernel-v0/late-obligation-extension.test.js',
]);
const OPERATIONAL_SUBSTRATE = new Set([
  'taskcycle-closure-compatibility.test.js', 'taskcycle-effect-reconciliation.test.js',
  'taskcycle-initialization.test.js', 'taskcycle-post-phase1-lifecycle.test.js',
  'taskcycle-terminal-preflight.test.js', 'conditioned-acceptance-preflight.test.js',
]);
const OPERATIONAL_SPINE = new Set([
  'integrate-accepted-candidate.test.js', 'materialize-frozen-review-interface.test.js',
  'prepare-fitflow-test-runtime.test.js', 'reconcile-and-close-taskcycle.test.js',
  'validate-fitflow-http-contract-candidate.test.js',
]);


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
    if (OPERATIONAL_SUBSTRATE.has(base)) return 'operational';
  }

  if (p.startsWith('tests/operational-spine-v0/')) {
    const base = path.posix.basename(p);
    if (base === 'contracts-and-resolution.test.js') return 'contract';
    if (['git-range-qualification.test.js', 'taskcycle-lifecycle-capability.test.js',
      'recipe-kernel-decoupling.test.js', 'workspace-readiness.test.js'].includes(base)) return 'unit';
    if (['git-execution-qualification.test.js', 'recipe-invocation-worker.test.js',
      'recipe-invocation.test.js', 'vertical.test.js'].includes(base)) return 'integration';
    if (OPERATIONAL_SPINE.has(base)) return 'operational';
  }

  throw new Error('UNCLASSIFIED_NODE_TEST:' + p);
}

function assertBaselineMembership(discovered, baseline = BASELINE_NODE_TESTS) {
  const current = new Set(discovered);
  for (const relative of baseline) {
    if (!current.has(relative)) throw new Error('BASELINE_NODE_TEST_MISSING:' + relative);
  }
}

function discoverTests(root = REPOSITORY_ROOT) {
  const absoluteRoot = path.resolve(root);
  if (fs.lstatSync(absoluteRoot).isSymbolicLink()) {
    throw new Error('TEST_DIRECTORY_SYMLINK:' + absoluteRoot);
  }
  // Historical configured roots are mandatory even when other tests exist.
  for (const part of SEARCH_ROOTS) {
    const requiredRoot = path.join(absoluteRoot, part);
    if (!fs.existsSync(requiredRoot)) throw new Error('REQUIRED_TEST_ROOT_MISSING:' + part);
    if (fs.lstatSync(requiredRoot).isSymbolicLink()) {
      throw new Error('TEST_DIRECTORY_SYMLINK:' + requiredRoot);
    }
  }
  const discovered = [];
  const search = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('TEST_DIRECTORY_SYMLINK:' + fullPath);
      if (entry.isDirectory()) search(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        discovered.push(path.relative(absoluteRoot, fullPath).split(path.sep).join('/'));
      }
    }
  };
  // Scanning the repository (not only SEARCH_ROOTS) detects unknown test roots.
  search(absoluteRoot);
  return [...new Set(discovered)].sort();
}

function inventory(root = REPOSITORY_ROOT) {
  const files = discoverTests(root);
  if (files.length === 0) throw new Error('NO_NODE_TESTS_DISCOVERED');
  if (path.resolve(root) === REPOSITORY_ROOT) assertBaselineMembership(files);
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

module.exports = { TYPES, BASELINE_NODE_TESTS, classifyTest, assertBaselineMembership,
  discoverTests, inventory, run };
