'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { reconcilePinnedEffect } = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-pinned-effect-io');

const pkg = Object.freeze({ manifestText: '{"manifest":1}\n', projectionText: '{"projection":1}\n' });
const run = (root, qualifyFirstWrite = () => ({ status: 'PASS' }), packageValue = pkg) =>
  reconcilePinnedEffect({ root, taskName: 'TASKCYCLE-FORK-001',
    obligationName: 'implementation', pkg: packageValue, qualifyFirstWrite });
function fixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-pinned-output-'));
  const root = path.join(tmp, 'root');
  fs.mkdirSync(root, { mode: 0o700 });
  return { tmp, root, clean: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}
test('forked reconciliation requires native pinned output, never silently falling back', () => {
  if (process.platform === 'linux') return;
  const f = fixture();
  try {
    assert.deepEqual(run(f.root), { kind: 'BLOCKED', reason: 'ANCHORED_IO_UNSUPPORTED_PLATFORM', effect_state: 'NONE' });
    assert.deepEqual(fs.readdirSync(f.root), []);
  } finally { f.clean(); }
});
test('Linux: first publication requires qualification, replay is exact without another Git observation', { skip: process.platform !== 'linux' }, () => {
  const f = fixture();
  try {
    const rejected = run(f.root, () => ({ status: 'BLOCKED', reason: 'GIT_NOT_VERIFIED' }));
    assert.equal(rejected.kind, 'BLOCKED');
    assert.equal(rejected.reason, 'GIT_NOT_VERIFIED');
    assert.deepEqual(fs.readdirSync(f.root), []);
    const created = run(f.root);
    assert.equal(created.kind, 'CREATED', JSON.stringify(created));
    const replay = run(f.root, () => { throw Error('MUST_NOT_REQUALIFY'); });
    assert.equal(replay.kind, 'EXACT', JSON.stringify(replay));
    const conflict = run(f.root, () => { throw Error('MUST_NOT_REQUALIFY'); },
      { ...pkg, projectionText: 'different\n' });
    assert.equal(conflict.kind, 'BLOCKED');
    assert.equal(conflict.reason, 'TASKCYCLE_EFFECT_RECONCILIATION_IDENTITY_CONFLICT');
  } finally { f.clean(); }
});
test('Linux: symlinked existing exact effect cannot impersonate publication', { skip: process.platform !== 'linux' }, () => {
  const f = fixture();
  try {
    assert.equal(run(f.root).kind, 'CREATED');
    const dest = path.join(f.root, 'TASKCYCLE-FORK-001', 'implementation');
    const outside = path.join(f.tmp, 'outside-effect');
    fs.renameSync(dest, outside);
    fs.symlinkSync(outside, dest, 'dir');
    const v = run(f.root, () => { throw Error('SHOULD_NOT_USE_GIT'); });
    assert.equal(v.kind, 'BLOCKED');
    assert.notEqual(v.effect_state, 'CONFIRMED');
    assert.equal(fs.readFileSync(path.join(outside, 'manifest.json'), 'utf8'), pkg.manifestText);
  } finally { f.clean(); }
});
test('Linux: symlinked parent never redirects output', { skip: process.platform !== 'linux' }, () => {
  const f = fixture();
  try {
    const outside = path.join(f.tmp, 'outside-parent');
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(f.root, 'TASKCYCLE-FORK-001'), 'dir');
    const v = run(f.root);
    assert.equal(v.kind, 'BLOCKED', JSON.stringify(v));
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally { f.clean(); }
});
test('Linux: untrusted writable root is blocked before Git or writes', { skip: process.platform !== 'linux' }, () => {
  const f = fixture();
  try {
    fs.chmodSync(f.root, 0o777);
    const v = run(f.root);
    assert.equal(v.kind, 'BLOCKED');
    assert.match(v.reason, /ROOT_NOT_PRIVATE/);
    assert.deepEqual(fs.readdirSync(f.root), []);
  } finally { f.clean(); }
});
test('Linux: root name swap during Git verification cannot redirect writes', { skip: process.platform !== 'linux' }, () => {
  const f = fixture();
  try {
    const outside = path.join(f.tmp, 'attacker-root');
    fs.mkdirSync(outside);
    const originalMoved = path.join(f.tmp, 'trusted-root-moved');
    const v = run(f.root, () => {
      fs.renameSync(f.root, originalMoved);
      fs.symlinkSync(outside, f.root, 'dir');
      return { status: 'PASS' };
    });
    assert.equal(v.kind, 'BLOCKED', JSON.stringify(v));
    assert.equal(v.effect_state, 'UNKNOWN');
    assert.deepEqual(fs.readdirSync(outside), []);
    assert.deepEqual(fs.readdirSync(originalMoved), []);
  } finally { f.clean(); }
});
test('Linux: dangling final symlink remains a blocking identity mismatch', { skip: process.platform !== 'linux' }, () => {
  const f = fixture();
  try {
    fs.mkdirSync(path.join(f.root, 'TASKCYCLE-FORK-001'));
    fs.symlinkSync(path.join(f.tmp, 'missing'), path.join(f.root, 'TASKCYCLE-FORK-001', 'implementation'));
    const v = run(f.root);
    assert.equal(v.kind, 'BLOCKED');
    assert.notEqual(v.reason, null);
  } finally { f.clean(); }
});
