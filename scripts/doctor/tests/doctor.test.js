'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseVersion, firstLine, resolveWindowsExtension } = require('../lib/exec');
const { TOOLS } = require('../lib/index');

test('parseVersion extracts semver from known tool outputs', () => {
  assert.strictEqual(parseVersion('v22.18.0\n'), '22.18.0');
  assert.strictEqual(parseVersion('gh version 2.97.0 (2026-07-31)\n'), '2.97.0');
  assert.strictEqual(parseVersion('1.9.0\n'), '1.9.0');
  assert.strictEqual(parseVersion(''), null);
  assert.strictEqual(parseVersion('no version here'), null);
});

test('firstLine returns first non-empty trimmed line', () => {
  assert.strictEqual(firstLine('  \nhello\nworld\n'), 'hello');
  assert.strictEqual(firstLine(''), null);
  assert.strictEqual(firstLine('only'), 'only');
});

test('TOOLS covers the required toolchain contract', () => {
  const ids = TOOLS.map((t) => t.id);
  for (const required of ['node', 'npm', 'python', 'git', 'gh', 'openspec', 'repomix', 'opencode']) {
    assert.ok(ids.includes(required), `missing ${required}`);
  }
});

test('doctor no exporta un root FitFlow inferido por topologia', () => {
  const doctor = require('../lib/index');
  assert.strictEqual(Object.hasOwn(doctor, 'FFROOT'), false);
});

test('resolver usa un Project Profile explicito fuera de topologia hermana', () => {
  const { resolveProject } = require('../../../src/project-profile');
  const productRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'producto-activo-'));
  const configDir = path.join(productRoot, '.ai', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'project-profile.yaml'), [
    'schema_version: fitflow-project-profile/v1',
    'project_id: profile-test',
    'baseline: test',
    'roots:',
    '  product: stale-product-root',
    '  ai_core: stale-ai-root',
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
  const resolution = resolveProject({ projectRoot: productRoot, aiCoreRoot: path.resolve(__dirname, '..', '..', '..') });
  assert.strictEqual(resolution.projectRoot, productRoot);
  assert.strictEqual(resolution.projectId, 'profile-test');
});

test('resolveWindowsExtension keeps an existing extension', () => {
  assert.strictEqual(resolveWindowsExtension('C:\\Tools\\node.exe'), 'C:\\Tools\\node.exe');
});

test('resolveWindowsExtension resolves .cmd shims on Windows', () => {
  if (process.platform !== 'win32') return;
  const path = require('node:path');
  const npmDir = path.dirname(process.execPath);
  const npmShim = path.join(npmDir, 'npm');
  const resolved = resolveWindowsExtension(npmShim);
  assert.ok(/\.(cmd|bat|exe)$/i.test(resolved), `expected shim extension in ${resolved}`);
});
