'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const contractsPath = path.resolve(__dirname, '../../src/contracts');

test('el paquete de contratos carga desde CommonJS y ESM', () => {
  const cjs = spawnSync(process.execPath, ['-e', 'const c = require(process.argv[1]); if (!c.task.Task) process.exit(1)', contractsPath], { encoding: 'utf8' });
  assert.equal(cjs.status, 0, cjs.stderr);
  const esm = spawnSync(process.execPath, ['--input-type=module', '-e', 'const c = await import(process.argv[1]); if (!c.task.Task) process.exit(1)', pathToFileURL(path.join(contractsPath, 'index.mjs')).href], { encoding: 'utf8' });
  assert.equal(esm.status, 0, esm.stderr);
});
