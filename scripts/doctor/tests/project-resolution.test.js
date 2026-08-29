'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  PROFILE_RELATIVE_PATH,
  ProjectResolutionError,
  resolveProject,
} = require('../../../src/project-profile');

const AI_CORE_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECT_ENV_KEYS = ['FF_PROJECT_ROOT', 'FF_PROJECT_PROFILE', 'FF_AI_CORE_ROOT'];

function createProject(projectId = 'resolution-test') {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${projectId}-`));
  const profilePath = path.join(projectRoot, PROFILE_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(profilePath), { recursive: true });
  fs.writeFileSync(profilePath, [
    'schema_version: fitflow-project-profile/v1',
    `project_id: ${projectId}`,
    'baseline: test',
    'roots:',
    '  product: stale-profile-product-root',
    '  ai_core: stale-profile-ai-root',
    'authority:',
    '  source_of_truth: docs/SOURCE_OF_TRUTH.md',
    '  agents: AGENTS.md',
    '  canonical_docs: []',
    'product_architecture:',
    '  backend_dependency_direction: [router]',
    '  target: test',
    'operational:',
    '  task_store: local',
    '  project_count: one',
    '  run_root: .ai/runs',
    '  local_state: .ai/local/state.sqlite',
    'specification:',
    '  adapter: openspec',
    '  status: planned',
    'features:',
    '  semantic_retrieval: false',
    '  mcp: false',
    '  temporal: false',
    '  orchestrator_workers: false',
    'environment:',
    '  reusable_discovery_env: none',
    '  official_ai_core_env: null',
  ].join('\n'));
  return { projectRoot, profilePath };
}

function withProjectEnv(values, operation) {
  const previous = Object.fromEntries(PROJECT_ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of PROJECT_ENV_KEYS) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    return operation();
  } finally {
    for (const key of PROJECT_ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('resolver accepts one coherent explicit root/profile/AI Core set', () => {
  const project = createProject('explicit-project');
  const resolution = withProjectEnv({}, () => resolveProject({
    projectRoot: project.projectRoot,
    profilePath: project.profilePath,
    aiCoreRoot: AI_CORE_ROOT,
  }));

  assert.strictEqual(resolution.projectRoot, project.projectRoot);
  assert.strictEqual(resolution.profilePath, project.profilePath);
  assert.strictEqual(resolution.aiCoreRoot, AI_CORE_ROOT);
  assert.strictEqual(resolution.projectId, 'explicit-project');
});

test('an explicit profile selects its product root without using stale environment root coordinates', () => {
  const active = createProject('profile-only-project');
  const stale = createProject('profile-only-stale');
  const resolution = withProjectEnv({
    FF_PROJECT_ROOT: stale.projectRoot,
    FF_PROJECT_PROFILE: stale.profilePath,
    FF_AI_CORE_ROOT: path.join(stale.projectRoot, 'missing-ai-core'),
  }, () => resolveProject({
    profilePath: active.profilePath,
    aiCoreRoot: AI_CORE_ROOT,
  }));

  assert.strictEqual(resolution.projectRoot, active.projectRoot);
  assert.strictEqual(resolution.profilePath, active.profilePath);
  assert.strictEqual(resolution.projectId, 'profile-only-project');
});

test('resolver accepts one coherent environment root/profile/AI Core set', () => {
  const project = createProject('environment-project');
  const resolution = withProjectEnv({
    FF_PROJECT_ROOT: project.projectRoot,
    FF_PROJECT_PROFILE: project.profilePath,
    FF_AI_CORE_ROOT: AI_CORE_ROOT,
  }, () => resolveProject());

  assert.strictEqual(resolution.projectRoot, project.projectRoot);
  assert.strictEqual(resolution.profilePath, project.profilePath);
  assert.strictEqual(resolution.aiCoreRoot, AI_CORE_ROOT);
});

test('explicit project coordinates take precedence as one set over stale environment coordinates', () => {
  const active = createProject('active-project');
  const stale = createProject('stale-project');
  const resolution = withProjectEnv({
    FF_PROJECT_ROOT: stale.projectRoot,
    FF_PROJECT_PROFILE: stale.profilePath,
    FF_AI_CORE_ROOT: path.join(stale.projectRoot, 'missing-ai-core'),
  }, () => resolveProject({
    projectRoot: active.projectRoot,
    aiCoreRoot: AI_CORE_ROOT,
  }));

  assert.strictEqual(resolution.projectRoot, active.projectRoot);
  assert.strictEqual(resolution.profilePath, active.profilePath);
  assert.strictEqual(resolution.projectId, 'active-project');
  assert.strictEqual(resolution.aiCoreRoot, AI_CORE_ROOT);
});

test('resolver rejects conflicting root and profile inputs', () => {
  const rootProject = createProject('root-project');
  const profileProject = createProject('profile-project');

  assert.throws(
    () => withProjectEnv({}, () => resolveProject({
      projectRoot: rootProject.projectRoot,
      profilePath: profileProject.profilePath,
      aiCoreRoot: AI_CORE_ROOT,
    })),
    (error) => error instanceof ProjectResolutionError && /no coinciden/.test(error.message),
  );
  assert.throws(
    () => withProjectEnv({
      FF_PROJECT_ROOT: rootProject.projectRoot,
      FF_PROJECT_PROFILE: profileProject.profilePath,
      FF_AI_CORE_ROOT: AI_CORE_ROOT,
    }, () => resolveProject()),
    (error) => error instanceof ProjectResolutionError && /no coinciden/.test(error.message),
  );
});

test('resolver fails closed when all external project coordinates are absent', () => {
  assert.throws(
    () => withProjectEnv({}, () => resolveProject({ aiCoreRoot: AI_CORE_ROOT })),
    (error) => error instanceof ProjectResolutionError && /Project Root o Project Profile explicito/.test(error.message),
  );
});

test('resolver rejects unavailable roots and missing profiles without fallback', () => {
  const project = createProject('negative-project');
  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'missing-profile-'));

  assert.throws(
    () => withProjectEnv({}, () => resolveProject({
      projectRoot: path.join(project.projectRoot, 'missing-product'),
      aiCoreRoot: AI_CORE_ROOT,
    })),
    (error) => error instanceof ProjectResolutionError && /Root de FitFlow no es un directorio disponible/.test(error.message),
  );
  assert.throws(
    () => withProjectEnv({}, () => resolveProject({
      projectRoot: project.projectRoot,
      aiCoreRoot: path.join(project.projectRoot, 'missing-ai-core'),
    })),
    (error) => error instanceof ProjectResolutionError && /Root de FitFlow-ai no es un directorio disponible/.test(error.message),
  );
  assert.throws(
    () => withProjectEnv({}, () => resolveProject({
      projectRoot: emptyRoot,
      aiCoreRoot: AI_CORE_ROOT,
    })),
    (error) => error instanceof ProjectResolutionError && /Project Profile no encontrado/.test(error.message),
  );
});

test('stale environment coordinates never fall back to a related checkout', () => {
  const unrelated = createProject('unrelated-project');
  assert.throws(
    () => withProjectEnv({
      FF_PROJECT_ROOT: path.join(unrelated.projectRoot, 'stale-product'),
      FF_PROJECT_PROFILE: unrelated.profilePath,
      FF_AI_CORE_ROOT: AI_CORE_ROOT,
    }, () => resolveProject()),
    (error) => error instanceof ProjectResolutionError,
  );
});
