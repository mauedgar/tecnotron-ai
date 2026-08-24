'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const os = require('node:os');

const contractsPath = path.resolve(__dirname, '../../src/contracts');

test('el paquete de contratos carga desde CommonJS y ESM', () => {
  const cjs = spawnSync(process.execPath, ['-e', 'const c = require(process.argv[1]); if (!c.task.Task) process.exit(1)', contractsPath], { encoding: 'utf8' });
  assert.equal(cjs.status, 0, cjs.stderr);
  const esm = spawnSync(process.execPath, ['--input-type=module', '-e', 'const c = await import(process.argv[1]); if (!c.task.Task) process.exit(1)', pathToFileURL(path.join(contractsPath, 'index.mjs')).href], { encoding: 'utf8' });
  assert.equal(esm.status, 0, esm.stderr);
});

test('el nombre publicado resuelve via package exports en CJS y ESM', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitflow-contracts-'));
  const nmDir = path.join(tmpDir, 'node_modules', '@tecnotron-ai', 'contracts');

  try {
    fs.mkdirSync(path.dirname(nmDir), { recursive: true });

    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const link = spawnSync('cmd', ['/c', 'mklink', '/J', nmDir, contractsPath], { stdio: 'inherit' });
      assert.equal(link.status, 0, link.stderr || 'No se pudo crear la junction del paquete');
    } else {
      fs.symlinkSync(contractsPath, nmDir);
    }
    const cjsScript = `process.env.NODE_PATH=${JSON.stringify(tmpDir)};require('module').Module._initPaths();const c=require('@tecnotron-ai/contracts');if(!c.task.Task)process.exit(1);`;
    const cjs = spawnSync(process.execPath, ['-e', cjsScript], { encoding: 'utf8', cwd: tmpDir });
    assert.equal(cjs.status, 0, cjs.stderr);

    const esmFile = path.join(tmpDir, '_test_esm.mjs');
    fs.writeFileSync(esmFile, `import c from '@tecnotron-ai/contracts';\nif(!c.task.Task)process.exit(1);\n`);
    const esm = spawnSync(process.execPath, [esmFile], { encoding: 'utf8', cwd: tmpDir });
    assert.equal(esm.status, 0, esm.stderr);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
