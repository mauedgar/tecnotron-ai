'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const { observeExplicitProcess, verifyMechanicalPostcondition } = require('../../src/deterministic-taskcycle-substrate-v0/observation');

test('explicit native observation preserves command boundary, exit code, stdout and stderr', () => {
  const result = observeExplicitProcess({
    command: process.execPath,
    args: ['-e', "process.stdout.write('OUT');process.stderr.write('ERR')"],
    cwd: os.tmpdir(),
  });
  assert.equal(result.started, true);
  assert.equal(result.exit_code, 0);
  assert.equal(result.stdout, 'OUT');
  assert.equal(result.stderr, 'ERR');
});

test('mechanical EXACT predicate compares only declared expected and observed values', () => {
  assert.equal(verifyMechanicalPostcondition({ id: 'P1', operator: 'EXACT', expected: { ref: 'abc' }, observed: { ref: 'abc' } }).correspondence, 'EXACT');
  assert.equal(verifyMechanicalPostcondition({ id: 'P2', operator: 'SEMANTICALLY_COMPLETE', expected: 'DONE', observed: 'Done' }).correspondence, 'UNRESOLVED');
});