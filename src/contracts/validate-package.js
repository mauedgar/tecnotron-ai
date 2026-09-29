'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const cwd = __dirname;
function pack() {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--json', '--dry-run'], { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(result.error ? result.error.message : (result.stderr || result.stdout));
  return JSON.parse(result.stdout)[0];
}

const first = pack();
const second = pack();
if (first.integrity !== second.integrity || first.filename !== second.filename) {
  throw new Error('npm pack no produjo metadata determinista');
}
for (const required of [
  'index.js',
  'index.mjs',
  'index.d.ts',
  'execution-coordination.js',
  'execution-coordination.d.ts',
  'package.json',
]) {
  if (!first.files.some((file) => file.path === required)) throw new Error(`archivo publico ausente: ${required}`);
}
const manifest = require('./package.json');
if (manifest.types !== './index.d.ts' || manifest.exports?.['.']?.types !== './index.d.ts') {
  throw new Error('metadata publica de tipos ausente o inconsistente');
}
process.stdout.write(`PASS ${first.name}@${first.version} ${first.integrity}\n`);
