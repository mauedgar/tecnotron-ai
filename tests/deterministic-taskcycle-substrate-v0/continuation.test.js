'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  materializePortableExport,
  consumePortableExport,
} = require('../../src/deterministic-taskcycle-substrate-v0/continuation');
const { sha256File } = require('../../src/deterministic-taskcycle-substrate-v0/observation');

function fixture(root) {
  const evidenceSource = path.join(root, 'repo-state.txt');
  fs.writeFileSync(evidenceSource, 'ref=abc123\n', 'utf8');
  const responsibility = {
    id: 'PROVE_PORTABLE_DETERMINISTIC_CONTINUATION_001',
    objective: 'Resume one bounded responsibility across execution surfaces.',
    authority_basis: 'DEVELOPER_AUTHORIZED_LOCAL_CANDIDATE_ONLY',
    permitted_effects: ['READ_ONLY_OBSERVATION'],
    forbidden_effects: ['repository_mutation', 'remote_mutation', 'lifecycle_transition'],
    mechanical_postconditions: [{ id: 'REPOSITORY_IDENTITY', operator: 'EXACT', expected: 'abc123' }],
  };
  const checkpoint = {
    checkpoint_id: 'CHECKPOINT-C1',
    predecessor_checkpoint_id: null,
    responsibility_id: responsibility.id,
    authority_basis: responsibility.authority_basis,
    context_cutoff: 'CONTEXT-CUTOFF-001',
    exact_state: { repository_ref: 'abc123' },
    evidence: [{ id: 'REPO_STATE', path: 'evidence/repo-state.txt', sha256: sha256File(evidenceSource) }],
    postconditions: [{ id: 'REPOSITORY_IDENTITY', expected: 'abc123', observed: 'abc123', correspondence: 'EXACT', evidence_refs: ['REPO_STATE'] }],
    disposition: { continuation_eligible: true, reason: 'MECHANICAL_POSTCONDITIONS_EXACT' },
  };
  return { evidenceSource, responsibility, checkpoint };
}

function sha256Text(text) {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

function rewriteManifestAndGetDigest(exportRoot, mutate) {
  const manifestPath = path.join(exportRoot, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  mutate(manifest);
  const text = `${JSON.stringify(Object.keys(manifest).sort().reduce((acc, key) => { acc[key] = manifest[key]; return acc; }, {}), null, 2)}\n`;
  fs.writeFileSync(manifestPath, text, 'utf8');
  return sha256Text(text);
}

test('portable export round-trip preserves exact continuation semantics and requires an external manifest identity', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const sourceRoot = path.join(temp, 'source');
    const exportRoot = path.join(temp, 'export');
    fs.mkdirSync(sourceRoot);
    const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
    const produced = materializePortableExport({ root: exportRoot, export_id: 'EXPORT-E1', responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] });
    const consumed = consumePortableExport(exportRoot, produced.manifest_sha256);
    assert.deepEqual(consumed.responsibility, responsibility);
    assert.deepEqual(consumed.checkpoint, checkpoint);
    assert.equal(consumed.manifest.semantics.creates_authority, false);
    assert.equal(consumed.manifest.semantics.external_manifest_sha256_required, true);
    assert.equal(consumed.manifest.semantics.origin_authentication, false);
    assert.equal(consumed.manifest_sha256, produced.manifest_sha256);
    assert.throws(() => consumePortableExport(exportRoot), /INVALID_SHA256_IDENTITY/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('consumer fails closed on modified checkpoint, START.md, extra files, and stale external manifest identity', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const make = (name) => {
      const sourceRoot = path.join(temp, `${name}-source`);
      const exportRoot = path.join(temp, `${name}-export`);
      fs.mkdirSync(sourceRoot);
      const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
      const produced = materializePortableExport({ root: exportRoot, export_id: `EXPORT-${name}`, responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] });
      return { exportRoot, produced };
    };

    const a = make('A');
    fs.appendFileSync(path.join(a.exportRoot, 'checkpoint.json'), '\n', 'utf8');
    assert.throws(() => consumePortableExport(a.exportRoot, a.produced.manifest_sha256), /EXPORT_INTEGRITY_FAILED/);

    const b = make('B');
    fs.appendFileSync(path.join(b.exportRoot, 'START.md'), 'tampered\n', 'utf8');
    assert.throws(() => consumePortableExport(b.exportRoot, b.produced.manifest_sha256), /EXPORT_INTEGRITY_FAILED/);

    const c = make('C');
    fs.writeFileSync(path.join(c.exportRoot, 'extra.txt'), 'extra', 'utf8');
    assert.throws(() => consumePortableExport(c.exportRoot, c.produced.manifest_sha256), /UNEXPECTED_EXPORT_FILE_SET/);

    const d = make('D');
    const oldDigest = d.produced.manifest_sha256;
    rewriteManifestAndGetDigest(d.exportRoot, (manifest) => { manifest.export_id = 'COORDINATED-REPLACEMENT'; });
    assert.throws(() => consumePortableExport(d.exportRoot, oldDigest), /MANIFEST_IDENTITY_MISMATCH/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('consumer directly verifies checkpoint evidence digest and exact manifest coverage', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const sourceRoot = path.join(temp, 'source');
    const exportRoot = path.join(temp, 'export');
    fs.mkdirSync(sourceRoot);
    const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
    const produced = materializePortableExport({ root: exportRoot, export_id: 'EXPORT-E1', responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] });

    const checkpointPath = path.join(exportRoot, 'checkpoint.json');
    const parsed = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    parsed.evidence[0].sha256 = `sha256:${'0'.repeat(64)}`;
    const checkpointText = `${JSON.stringify(parsed, null, 2)}\n`;
    fs.writeFileSync(checkpointPath, checkpointText, 'utf8');

    const newManifestDigest = rewriteManifestAndGetDigest(exportRoot, (manifest) => {
      manifest.files['checkpoint.json'] = sha256File(checkpointPath);
    });
    assert.throws(() => consumePortableExport(exportRoot, newManifestDigest), /CHECKPOINT_EVIDENCE_DIGEST_MISMATCH/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('materialization rejects traversal/alias evidence paths before writing the final root', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const sourceRoot = path.join(temp, 'source');
    const exportRoot = path.join(temp, 'export');
    fs.mkdirSync(sourceRoot);
    const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
    checkpoint.evidence[0].path = 'evidence/../responsibility.json';
    assert.throws(() => materializePortableExport({ root: exportRoot, export_id: 'EXPORT-E1', responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] }), /INVALID_EVIDENCE_PATH/);
    assert.equal(fs.existsSync(exportRoot), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('failed materialization cleans owned staging and identical retry does not degrade into EXPORT_ROOT_ALREADY_EXISTS', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const sourceRoot = path.join(temp, 'source');
    const exportRoot = path.join(temp, 'export');
    fs.mkdirSync(sourceRoot);
    const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
    fs.unlinkSync(evidenceSource);

    const invoke = () => materializePortableExport({ root: exportRoot, export_id: 'EXPORT-E1', responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] });
    assert.throws(invoke, /EVIDENCE_SOURCE_INVALID/);
    assert.equal(fs.existsSync(exportRoot), false);
    assert.throws(invoke, /EVIDENCE_SOURCE_INVALID/);
    assert.equal(fs.existsSync(exportRoot), false);
    assert.equal(fs.readdirSync(temp).some((name) => name.startsWith('.export.staging-')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('consumer rejects symlink aliases inside the export when the platform permits creating them', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const sourceRoot = path.join(temp, 'source');
    const exportRoot = path.join(temp, 'export');
    fs.mkdirSync(sourceRoot);
    const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
    const produced = materializePortableExport({ root: exportRoot, export_id: 'EXPORT-E1', responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] });
    const extra = path.join(exportRoot, 'alias');
    try {
      fs.symlinkSync(path.join(exportRoot, 'responsibility.json'), extra, 'file');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip(`symlink creation unavailable: ${error.code}`);
      throw error;
    }
    assert.throws(() => consumePortableExport(exportRoot, produced.manifest_sha256), /EXPORT_PATH_ALIAS_FORBIDDEN/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});


test('consumer rejects hardlink aliases inside the export when the platform permits creating them', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const sourceRoot = path.join(temp, 'source');
    const exportRoot = path.join(temp, 'export');
    fs.mkdirSync(sourceRoot);
    const { evidenceSource, responsibility, checkpoint } = fixture(sourceRoot);
    const produced = materializePortableExport({ root: exportRoot, export_id: 'EXPORT-E1', responsibility, checkpoint, evidence_sources: [{ id: 'REPO_STATE', source_path: evidenceSource }] });
    const extra = path.join(exportRoot, 'alias-hardlink');
    try {
      fs.linkSync(path.join(exportRoot, 'responsibility.json'), extra);
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP', 'EXDEV'].includes(error.code)) return t.skip(`hardlink creation unavailable: ${error.code}`);
      throw error;
    }
    assert.throws(() => consumePortableExport(exportRoot, produced.manifest_sha256), /EXPORT_PATH_ALIAS_FORBIDDEN/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});


test('portable materialization fails closed when required mechanical operands are omitted', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-'));
  try {
    const make = (name) => {
      const sourceRoot = path.join(temp, `${name}-source`);
      const exportRoot = path.join(temp, `${name}-export`);
      fs.mkdirSync(sourceRoot);
      const data = fixture(sourceRoot);
      return { ...data, exportRoot };
    };

    const a = make('missing-responsibility-expected');
    delete a.responsibility.mechanical_postconditions[0].expected;
    assert.throws(() => materializePortableExport({
      root: a.exportRoot, export_id: 'EXPORT-A', responsibility: a.responsibility, checkpoint: a.checkpoint,
      evidence_sources: [{ id: 'REPO_STATE', source_path: a.evidenceSource }],
    }), /INVALID_CONTRACT/);
    assert.equal(fs.existsSync(a.exportRoot), false);

    const b = make('missing-checkpoint-expected');
    delete b.checkpoint.postconditions[0].expected;
    assert.throws(() => materializePortableExport({
      root: b.exportRoot, export_id: 'EXPORT-B', responsibility: b.responsibility, checkpoint: b.checkpoint,
      evidence_sources: [{ id: 'REPO_STATE', source_path: b.evidenceSource }],
    }), /INVALID_CONTRACT/);
    assert.equal(fs.existsSync(b.exportRoot), false);

    const c = make('missing-checkpoint-observed');
    delete c.checkpoint.postconditions[0].observed;
    assert.throws(() => materializePortableExport({
      root: c.exportRoot, export_id: 'EXPORT-C', responsibility: c.responsibility, checkpoint: c.checkpoint,
      evidence_sources: [{ id: 'REPO_STATE', source_path: c.evidenceSource }],
    }), /INVALID_CONTRACT/);
    assert.equal(fs.existsSync(c.exportRoot), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
