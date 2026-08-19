'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { parseVersion, firstLine, resolveWindowsExtension } = require('../lib/exec');
const { TOOLS, FFROOT } = require('../lib/index');

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

test('project root resolves to FitFlow', () => {
  assert.ok(FFROOT.endsWith('FitFlow'));
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
