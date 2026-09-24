'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('workspace contract resolves canonical dependencies from repository-local materialization', () => {
  const script = path.join(__dirname, '../../scripts/workspace/verify.js');
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: '' },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);

  assert.equal(report.package_manager, 'npm');
  assert.equal(report.package_manager_evidence, 'package-lock.json');
  assert.equal(report.install_command, 'npm ci');
  assert.equal(report.test_command, 'npm test');
  assert.equal(report.dependency_source_of_truth, 'package.json');
  assert.equal(report.lockfile, 'package-lock.json');
  assert.equal(report.dependency_manifest_complete, true);
  assert.equal(report.lockfile_consistent, true);
  assert.equal(report.canonical_source_dependencies_declared, true);
  assert.equal(report.clean_workspace_dependencies_resolved, true);
  assert.equal(report.clean_workspace_materialization_validated, true);
  assert.equal(report.inherited_node_modules_required, false);
  assert.equal(report.implementer_cache_required, false);
  assert.equal(report.global_project_dependency_required, false);
  assert.ok(report.canonical_source_dependencies.includes('zod'));
});
