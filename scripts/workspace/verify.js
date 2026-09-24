#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { builtinModules } = require('node:module');

const repoRoot = path.resolve(__dirname, '..', '..');
const packagePath = path.join(repoRoot, 'package.json');
const lockPath = path.join(repoRoot, 'package-lock.json');
const sourceRoot = path.join(repoRoot, 'src');
const nodeModulesRoot = path.join(repoRoot, 'node_modules');

function fail(code, detail) {
  process.stderr.write(`${JSON.stringify({ code, detail })}\n`);
  process.exitCode = 1;
}

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function walkSource(root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walkSource(full));
    else if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name)) result.push(full);
  }
  return result;
}

function sourceDependencies() {
  const builtins = new Set([
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
  ]);
  const dependencies = new Set();
  const patterns = [
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const file of walkSource(sourceRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const specifier = match[1];
        if (
          specifier.startsWith('.') ||
          specifier.startsWith('/') ||
          builtins.has(specifier)
        ) continue;
        dependencies.add(packageName(specifier));
      }
    }
  }

  return [...dependencies].sort();
}

if (!fs.existsSync(packagePath) || !fs.existsSync(lockPath)) {
  fail('WORKSPACE_METADATA_MISSING', 'package.json and package-lock.json are required');
} else {
  const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const declaredRuntime = {
    ...(manifest.dependencies || {}),
    ...(manifest.optionalDependencies || {}),
  };
  const declaredInstall = {
    ...declaredRuntime,
    ...(manifest.devDependencies || {}),
  };
  const rootLock = lock.packages && lock.packages[''];
  const lockDeclared = {
    ...(rootLock?.dependencies || {}),
    ...(rootLock?.optionalDependencies || {}),
    ...(rootLock?.devDependencies || {}),
  };
  const required = sourceDependencies();

  const undeclared = required.filter((name) => !Object.hasOwn(declaredRuntime, name));
  const rootLockMismatch = Object.entries(declaredInstall)
    .filter(([name, range]) => lockDeclared[name] !== range)
    .map(([name, range]) => ({
      dependency: name,
      manifest: range,
      lock_root: lockDeclared[name] || null,
    }));
  const rootLockExtra = Object.keys(lockDeclared)
    .filter((name) => !Object.hasOwn(declaredInstall, name))
    .sort();
  const unlocked = required.filter((name) => !lock.packages?.[`node_modules/${name}`]);

  const unresolved = [];
  const outsideWorkspace = [];
  for (const name of required) {
    try {
      const resolved = require.resolve(name, { paths: [repoRoot] });
      const relative = path.relative(nodeModulesRoot, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        outsideWorkspace.push({ dependency: name, resolved });
      }
    } catch {
      unresolved.push(name);
    }
  }

  const testCommand = manifest.scripts?.test ? 'npm test' : null;
  const workspaceVerifyCommand = manifest.scripts?.['workspace:verify']
    ? 'npm run workspace:verify'
    : null;

  const result = {
    schema_version: 'tecnotron-workspace-readiness/v0',
    package_manager: 'npm',
    package_manager_evidence: 'package-lock.json',
    install_command: 'npm ci',
    dependency_source_of_truth: 'package.json',
    lockfile: 'package-lock.json',
    lockfile_version: lock.lockfileVersion,
    runtime_requirement: manifest.engines?.node || null,
    test_command: testCommand,
    workspace_verify_command: workspaceVerifyCommand,
    canonical_source_dependencies: required,
    dependency_manifest_complete: undeclared.length === 0,
    lockfile_consistent: rootLockMismatch.length === 0 && rootLockExtra.length === 0 && unlocked.length === 0,
    canonical_source_dependencies_declared: undeclared.length === 0,
    deterministic_install_path_known: true,
    deterministic_test_path_known: Boolean(testCommand),
    clean_workspace_dependencies_resolved: unresolved.length === 0 && outsideWorkspace.length === 0,
    clean_workspace_materialization_validated: unresolved.length === 0 && outsideWorkspace.length === 0,
    inherited_node_modules_required: false,
    implementer_cache_required: false,
    global_project_dependency_required: false,
    details: {
      undeclared,
      root_lock_mismatch: rootLockMismatch,
      root_lock_extra: rootLockExtra,
      unlocked,
      unresolved,
      outside_workspace: outsideWorkspace,
    },
  };

  const pass = (
    result.dependency_manifest_complete &&
    result.lockfile_consistent &&
    result.canonical_source_dependencies_declared &&
    result.deterministic_install_path_known &&
    result.deterministic_test_path_known &&
    result.clean_workspace_dependencies_resolved &&
    result.clean_workspace_materialization_validated
  );

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!pass) process.exitCode = 1;
}
