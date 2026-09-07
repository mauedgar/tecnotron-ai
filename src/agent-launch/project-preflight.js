'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveProject: resolveExistingProject } = require('../project-profile');
const { AgentLaunchPreflightError } = require('./authority');

function canonicalDirectory(value, reasonCode) {
  try {
    if (!fs.statSync(value).isDirectory()) throw new Error('not directory');
    return fs.realpathSync.native(value);
  } catch {
    throw new AgentLaunchPreflightError(reasonCode);
  }
}

function canonicalFile(value, reasonCode) {
  try {
    if (!fs.statSync(value).isFile()) throw new Error('not file');
    return fs.realpathSync.native(value);
  } catch {
    throw new AgentLaunchPreflightError(reasonCode);
  }
}

function samePath(left, right) {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function git(repositoryRoot, args) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0 || result.error) throw new AgentLaunchPreflightError('PROJECT_RESOLUTION_REJECTED');
  return result.stdout.trim();
}

function observeGit(repositoryRoot) {
  return {
    repository_root: canonicalDirectory(git(repositoryRoot, ['rev-parse', '--show-toplevel']), 'PROJECT_RESOLUTION_REJECTED'),
    branch: git(repositoryRoot, ['branch', '--show-current']),
    head: git(repositoryRoot, ['rev-parse', 'HEAD']),
    worktree: canonicalDirectory(git(repositoryRoot, ['rev-parse', '--show-toplevel']), 'PROJECT_RESOLUTION_REJECTED'),
  };
}

function validateScopeSyntax(scope) {
  if (scope.includes('\\') || scope.includes('\0') || scope.includes('//') || path.posix.isAbsolute(scope) || /^[A-Za-z]:/.test(scope)) {
    throw new AgentLaunchPreflightError('SCOPE_INVALID');
  }
  const segments = scope.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || /%2e/i.test(segment))) {
    throw new AgentLaunchPreflightError('SCOPE_INVALID');
  }
  return segments;
}

function proveScopeContained(root, scope) {
  const segments = validateScopeSyntax(scope);
  const visited = new Set();

  function scan(current, index) {
    if (index >= segments.length || !fs.existsSync(current)) return;
    let currentReal;
    let entries;
    try {
      currentReal = fs.realpathSync.native(current);
      const key = `${currentReal}\0${index}`;
      if (visited.has(key)) return;
      visited.add(key);
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      throw new AgentLaunchPreflightError('SCOPE_INVALID');
    }

    const segment = segments[index];
    if (segment === '**') scan(current, index + 1);
    for (const entry of entries) {
      if (segment !== '**' && !path.matchesGlob(entry.name, segment)) continue;
      const candidate = path.join(current, entry.name);
      if (!isContained(root, path.resolve(candidate))) throw new AgentLaunchPreflightError('SCOPE_INVALID');

      let directory = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        let resolved;
        try {
          resolved = fs.realpathSync.native(candidate);
          directory = fs.statSync(candidate).isDirectory();
        } catch {
          throw new AgentLaunchPreflightError('SCOPE_INVALID');
        }
        if (!isContained(root, resolved)) throw new AgentLaunchPreflightError('SCOPE_INVALID');
      }

      if (!directory) continue;
      if (segment === '**') scan(candidate, index);
      else scan(candidate, index + 1);
    }
  }

  scan(root, 0);
}

function preflightProject(authorityResult, dependencies = {}) {
  const { request, resolvedAuthority, profile } = authorityResult;
  const projectResolver = dependencies.resolveProject || ((coordinates) => {
    const initial = resolveExistingProject({
      profilePath: coordinates.projectProfileRef,
      aiCoreRoot: coordinates.repositoryRoot,
    });
    return resolveExistingProject({
      profilePath: coordinates.projectProfileRef,
      projectRoot: initial.profile.roots.product,
      aiCoreRoot: initial.profile.roots.ai_core,
    });
  });
  let resolution;
  try {
    resolution = projectResolver({
      projectProfileRef: request.project.project_profile_ref,
      repositoryRef: request.project.repository_ref,
      repositoryRoot: resolvedAuthority.project.repository_root,
    });
  } catch (error) {
    if (error instanceof AgentLaunchPreflightError) throw error;
    throw new AgentLaunchPreflightError('PROJECT_RESOLUTION_REJECTED');
  }
  if (!resolution || resolution.projectId !== resolvedAuthority.project.project_id) {
    throw new AgentLaunchPreflightError('PROJECT_RESOLUTION_REJECTED');
  }

  const projectRoot = canonicalDirectory(resolution.projectRoot, 'PROJECT_RESOLUTION_REJECTED');
  const profilePath = canonicalFile(resolution.profilePath, 'PROJECT_RESOLUTION_REJECTED');
  if (!samePath(profilePath, request.project.project_profile_ref)) throw new AgentLaunchPreflightError('PROJECT_RESOLUTION_REJECTED');
  const declaredProductRoot = canonicalDirectory(resolution.profile?.roots?.product, 'PROJECT_RESOLUTION_REJECTED');
  const declaredAiCoreRoot = canonicalDirectory(resolution.profile?.roots?.ai_core, 'PROJECT_RESOLUTION_REJECTED');
  const resolvedAiCoreRoot = canonicalDirectory(resolution.aiCoreRoot, 'PROJECT_RESOLUTION_REJECTED');
  if (!samePath(projectRoot, declaredProductRoot) || !samePath(resolvedAiCoreRoot, declaredAiCoreRoot)) {
    throw new AgentLaunchPreflightError('PROJECT_RESOLUTION_REJECTED');
  }
  const selectedRoot = resolution.repositories?.[request.project.repository_ref];
  if (!selectedRoot) throw new AgentLaunchPreflightError('REPOSITORY_REF_MISMATCH');
  const repositoryRoot = canonicalDirectory(selectedRoot, 'REPOSITORY_REF_MISMATCH');
  const authoritativeRoot = canonicalDirectory(resolvedAuthority.project.repository_root, 'REPOSITORY_REF_MISMATCH');
  if (!samePath(repositoryRoot, authoritativeRoot)) throw new AgentLaunchPreflightError('REPOSITORY_REF_MISMATCH');

  const observed = observeGit(repositoryRoot);
  if (!observed || !samePath(observed.repository_root, repositoryRoot)) throw new AgentLaunchPreflightError('REPOSITORY_REF_MISMATCH');
  const cwd = canonicalDirectory(request.project.cwd, 'CWD_OUTSIDE_REPOSITORY');
  if (!samePath(cwd, canonicalDirectory(resolvedAuthority.repository.cwd, 'CWD_OUTSIDE_REPOSITORY'))) {
    throw new AgentLaunchPreflightError('WORKTREE_AUTHORITY_MISMATCH');
  }
  if (!isContained(repositoryRoot, cwd)) throw new AgentLaunchPreflightError('CWD_OUTSIDE_REPOSITORY');
  if (observed.branch !== resolvedAuthority.repository.branch || observed.head !== resolvedAuthority.repository.head_or_baseline) {
    throw new AgentLaunchPreflightError('WORKTREE_AUTHORITY_MISMATCH');
  }
  const worktree = canonicalDirectory(observed.worktree, 'WORKTREE_MISMATCH');
  if (!isContained(worktree, cwd)) throw new AgentLaunchPreflightError('WORKTREE_MISMATCH');

  const writer = profile.permissions.filesystem_write !== 'denied';
  if (writer) {
    if (resolvedAuthority.repository.worktree_path === null || request.project.worktree_ref === null) {
      throw new AgentLaunchPreflightError('WORKTREE_REQUIRED');
    }
    const authorityWorktree = canonicalDirectory(resolvedAuthority.repository.worktree_path, 'WORKTREE_MISMATCH');
    const requestWorktree = canonicalDirectory(request.project.worktree_ref, 'WORKTREE_MISMATCH');
    if (!samePath(worktree, authorityWorktree) || !samePath(worktree, requestWorktree)) {
      throw new AgentLaunchPreflightError('WORKTREE_MISMATCH');
    }
  } else {
    if (request.scope.write_scope.length !== 0 || resolvedAuthority.scope.write_scope.length !== 0) {
      throw new AgentLaunchPreflightError('SCOPE_INVALID');
    }
    if (resolvedAuthority.repository.worktree_path !== null) {
      const authorityWorktree = canonicalDirectory(resolvedAuthority.repository.worktree_path, 'WORKTREE_MISMATCH');
      const requestWorktree = canonicalDirectory(request.project.worktree_ref, 'WORKTREE_MISMATCH');
      if (!samePath(worktree, authorityWorktree) || !samePath(worktree, requestWorktree)) {
        throw new AgentLaunchPreflightError('WORKTREE_MISMATCH');
      }
    }
  }

  for (const scope of request.scope.read_scope) proveScopeContained(repositoryRoot, scope);
  for (const scope of request.scope.write_scope) proveScopeContained(worktree, scope);

  return Object.freeze({
    execution_observation: Object.freeze({
      project_root: projectRoot,
      repository_root: repositoryRoot,
      cwd,
      branch: observed.branch,
      head: observed.head,
      worktree,
    }),
    scope: Object.freeze({
      read_scope: Object.freeze([...request.scope.read_scope]),
      write_scope: Object.freeze([...request.scope.write_scope]),
    }),
  });
}

module.exports = { observeGit, preflightProject, proveScopeContained };
