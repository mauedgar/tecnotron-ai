'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { validateResponsibilityCheckpointPair } = require('./contracts');
const { sha256File } = require('./observation');

const SCHEMA = 'deterministic-taskcycle-portable-export/v0';
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const RESERVED_FILES = new Set(['manifest.json', 'responsibility.json', 'checkpoint.json', 'START.md']);

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stable(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function writeStableJson(filePath, value) {
  fs.writeFileSync(filePath, stableJson(value), 'utf8');
}

function digestText(text) {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

function assertSha256(value, name) {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) fail('INVALID_SHA256_IDENTITY', name);
}

function renderStart(responsibility) {
  return [
    'Consume this portable continuation.',
    '',
    `Responsibility: ${responsibility.id}`,
    'Authoritative machine-readable entrypoint: manifest.json',
    '',
    'Verify manifest.json against the independently supplied SHA-256 before trusting this package.',
    'This proves exact-package identity only to the extent that the external digest channel is trusted.',
    'It is not cryptographic origin authentication.',
    'Do not infer missing authority or lifecycle semantics.',
    '',
  ].join('\n');
}

function normalizeEvidencePath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') fail('INVALID_EVIDENCE_PATH', 'path must be non-empty');
  if (relativePath.includes('\\')) fail('INVALID_EVIDENCE_PATH', 'evidence paths must use forward slashes');
  if (!relativePath.startsWith('evidence/')) fail('INVALID_EVIDENCE_PATH', `${relativePath} must live under evidence/`);
  if (relativePath.endsWith('/')) fail('INVALID_EVIDENCE_PATH', `${relativePath} must name a file`);

  const parts = relativePath.split('/');
  if (parts[0] !== 'evidence' || parts.length < 2 || parts.some((part) => part === '' || part === '.' || part === '..')) {
    fail('INVALID_EVIDENCE_PATH', relativePath);
  }

  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || normalized === 'evidence' || !normalized.startsWith('evidence/')) {
    fail('INVALID_EVIDENCE_PATH', relativePath);
  }
  if (RESERVED_FILES.has(normalized)) fail('RESERVED_EXPORT_PATH_ALIAS', normalized);
  return normalized;
}

function evidenceDestination(root, evidencePath) {
  const normalized = normalizeEvidencePath(evidencePath);
  return path.join(root, ...normalized.split('/'));
}

function assertRegularNonSymlinkFile(filePath, code, detail) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    fail(code, detail);
  }
  if (stat.isSymbolicLink() || stat.nlink !== 1) fail('EXPORT_PATH_ALIAS_FORBIDDEN', detail);
  if (!stat.isFile()) fail(code, detail);
}

function preflightEvidence(checkpoint, evidenceSources) {
  if (!Array.isArray(evidenceSources)) fail('INVALID_EVIDENCE_SOURCES', 'evidence_sources must be an array');
  const sourceById = new Map();
  for (const source of evidenceSources) {
    if (!source || typeof source.id !== 'string' || source.id.trim() === '' || typeof source.source_path !== 'string' || source.source_path.trim() === '') {
      fail('INVALID_EVIDENCE_SOURCE', 'each evidence source requires id and source_path');
    }
    if (sourceById.has(source.id)) fail('DUPLICATE_EVIDENCE_SOURCE', source.id);
    sourceById.set(source.id, source);
  }

  if (sourceById.size !== checkpoint.evidence.length) fail('EVIDENCE_SOURCE_COVERAGE_MISMATCH', 'evidence_sources must exactly cover checkpoint evidence');

  const seenPaths = new Set();
  const prepared = [];
  for (const evidence of checkpoint.evidence) {
    const normalizedPath = normalizeEvidencePath(evidence.path);
    if (seenPaths.has(normalizedPath)) fail('DUPLICATE_EVIDENCE_PATH', normalizedPath);
    seenPaths.add(normalizedPath);

    const source = sourceById.get(evidence.id);
    if (!source) fail('EVIDENCE_SOURCE_MISSING', evidence.id);
    assertRegularNonSymlinkFile(source.source_path, 'EVIDENCE_SOURCE_INVALID', evidence.id);
    const actual = sha256File(source.source_path);
    if (actual !== evidence.sha256) fail('EVIDENCE_DIGEST_MISMATCH', evidence.id);
    prepared.push({ evidence, normalizedPath, sourcePath: source.source_path });
  }

  for (const sourceId of sourceById.keys()) {
    if (!checkpoint.evidence.some((entry) => entry.id === sourceId)) fail('UNDECLARED_EVIDENCE_SOURCE', sourceId);
  }

  return prepared;
}

function walkFilesNoAliases(root) {
  const files = [];
  function walk(dir, relativeDir) {
    for (const name of fs.readdirSync(dir)) {
      const absolute = path.join(dir, name);
      const relative = relativeDir ? `${relativeDir}/${name}` : name;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) fail('EXPORT_PATH_ALIAS_FORBIDDEN', relative);
      if (stat.isDirectory()) {
        walk(absolute, relative);
      } else if (stat.isFile()) {
        if (stat.nlink !== 1) fail('EXPORT_PATH_ALIAS_FORBIDDEN', relative);
        files.push(relative.replaceAll('\\', '/'));
      } else {
        fail('UNSUPPORTED_EXPORT_ENTRY', relative);
      }
    }
  }
  walk(root, '');
  return files.sort();
}

function assertExactFileSet(root, permittedFiles) {
  const actual = walkFilesNoAliases(root);
  const expected = [...permittedFiles].sort();
  if (actual.length !== expected.length || actual.some((entry, index) => entry !== expected[index])) {
    fail('UNEXPECTED_EXPORT_FILE_SET', `expected ${expected.join(', ')}, observed ${actual.join(', ')}`);
  }
}

function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('INVALID_MANIFEST', 'manifest must be an object');
  const allowed = ['schema', 'export_id', 'source_checkpoint', 'responsibility_id', 'authority_basis', 'context_cutoff', 'files', 'semantics'];
  for (const key of Object.keys(manifest)) if (!allowed.includes(key)) fail('INVALID_MANIFEST', `unknown key ${key}`);
  for (const key of allowed) if (!(key in manifest)) fail('INVALID_MANIFEST', `missing key ${key}`);
  if (manifest.schema !== SCHEMA) fail('UNSUPPORTED_EXPORT_SCHEMA', String(manifest.schema));
  for (const key of ['export_id', 'source_checkpoint', 'responsibility_id', 'authority_basis', 'context_cutoff']) {
    if (typeof manifest[key] !== 'string' || manifest[key].trim() === '') fail('INVALID_MANIFEST', `${key} must be a non-empty string`);
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) fail('INVALID_MANIFEST', 'files must be an object');
  for (const [relativePath, digest] of Object.entries(manifest.files)) {
    if (relativePath === 'manifest.json') fail('INVALID_MANIFEST', 'manifest.json must be anchored externally, not recursively listed');
    assertSha256(digest, `manifest.files.${relativePath}`);
  }
  const semantics = manifest.semantics;
  if (!semantics || typeof semantics !== 'object' || Array.isArray(semantics)) fail('INVALID_MANIFEST', 'semantics must be an object');
  const semanticKeys = ['source_of_truth', 'git_tracking_required', 'git_push_required', 'creates_authority', 'external_manifest_sha256_required', 'origin_authentication'];
  for (const key of Object.keys(semantics)) if (!semanticKeys.includes(key)) fail('INVALID_MANIFEST', `unknown semantics key ${key}`);
  for (const key of semanticKeys) if (!(key in semantics)) fail('INVALID_MANIFEST', `missing semantics key ${key}`);
  if (semantics.source_of_truth !== false || semantics.git_tracking_required !== false || semantics.git_push_required !== false || semantics.creates_authority !== false || semantics.external_manifest_sha256_required !== true || semantics.origin_authentication !== false) {
    fail('INVALID_MANIFEST_SEMANTICS', 'V0 manifest semantics do not match the bounded trust contract');
  }
}

function validatePackageAtRoot(root, expectedManifestSha256) {
  assertSha256(expectedManifestSha256, 'expected manifest SHA-256');
  const manifestPath = path.join(root, 'manifest.json');
  assertRegularNonSymlinkFile(manifestPath, 'MANIFEST_MISSING', manifestPath);

  const actualManifestSha256 = sha256File(manifestPath);
  if (actualManifestSha256 !== expectedManifestSha256) fail('MANIFEST_IDENTITY_MISMATCH', `${actualManifestSha256} !== ${expectedManifestSha256}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  validateManifestShape(manifest);

  const responsibilityPath = path.join(root, 'responsibility.json');
  const checkpointPath = path.join(root, 'checkpoint.json');
  const startPath = path.join(root, 'START.md');
  for (const [name, filePath] of [['responsibility.json', responsibilityPath], ['checkpoint.json', checkpointPath], ['START.md', startPath]]) {
    assertRegularNonSymlinkFile(filePath, 'EXPORT_FILE_MISSING', name);
  }

  const responsibility = JSON.parse(fs.readFileSync(responsibilityPath, 'utf8'));
  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  const pair = validateResponsibilityCheckpointPair(responsibility, checkpoint);

  const evidencePaths = [];
  const seenEvidencePaths = new Set();
  for (const evidence of pair.checkpoint.evidence) {
    const normalizedPath = normalizeEvidencePath(evidence.path);
    if (seenEvidencePaths.has(normalizedPath)) fail('DUPLICATE_EVIDENCE_PATH', normalizedPath);
    seenEvidencePaths.add(normalizedPath);
    evidencePaths.push(normalizedPath);
  }

  const requiredManifestFiles = ['START.md', 'checkpoint.json', 'responsibility.json', ...evidencePaths].sort();
  const actualManifestFiles = Object.keys(manifest.files).sort();
  if (actualManifestFiles.length !== requiredManifestFiles.length || actualManifestFiles.some((entry, index) => entry !== requiredManifestFiles[index])) {
    fail('MANIFEST_FILE_COVERAGE_MISMATCH', `expected ${requiredManifestFiles.join(', ')}, observed ${actualManifestFiles.join(', ')}`);
  }

  assertExactFileSet(root, ['manifest.json', ...requiredManifestFiles]);

  for (const relativePath of requiredManifestFiles) {
    const filePath = relativePath.startsWith('evidence/') ? evidenceDestination(root, relativePath) : path.join(root, relativePath);
    assertRegularNonSymlinkFile(filePath, 'EXPORT_FILE_MISSING', relativePath);
    const actualDigest = sha256File(filePath);
    if (actualDigest !== manifest.files[relativePath]) fail('EXPORT_INTEGRITY_FAILED', relativePath);
  }

  for (const evidence of pair.checkpoint.evidence) {
    const normalizedPath = normalizeEvidencePath(evidence.path);
    const actualDigest = sha256File(evidenceDestination(root, normalizedPath));
    if (actualDigest !== evidence.sha256) fail('CHECKPOINT_EVIDENCE_DIGEST_MISMATCH', evidence.id);
    if (manifest.files[normalizedPath] !== evidence.sha256) fail('MANIFEST_CHECKPOINT_EVIDENCE_MISMATCH', evidence.id);
  }

  const expectedStart = renderStart(pair.responsibility);
  const actualStart = fs.readFileSync(startPath, 'utf8');
  if (actualStart !== expectedStart) fail('START_ENTRYPOINT_MISMATCH', 'START.md does not match the deterministic V0 entrypoint');

  if (manifest.responsibility_id !== pair.responsibility.id) fail('MANIFEST_RESPONSIBILITY_MISMATCH', pair.responsibility.id);
  if (manifest.source_checkpoint !== pair.checkpoint.checkpoint_id) fail('MANIFEST_CHECKPOINT_MISMATCH', pair.checkpoint.checkpoint_id);
  if (manifest.authority_basis !== pair.responsibility.authority_basis) fail('MANIFEST_AUTHORITY_MISMATCH', pair.responsibility.authority_basis);
  if (manifest.context_cutoff !== pair.checkpoint.context_cutoff) fail('MANIFEST_CONTEXT_CUTOFF_MISMATCH', pair.checkpoint.context_cutoff);

  return { manifest, responsibility: pair.responsibility, checkpoint: pair.checkpoint, manifest_sha256: actualManifestSha256 };
}

function materializePortableExport({ root, export_id, responsibility, checkpoint, evidence_sources = [] }) {
  if (typeof export_id !== 'string' || export_id.trim() === '') fail('INVALID_EXPORT_ID', 'export_id must be a non-empty string');
  const pair = validateResponsibilityCheckpointPair(responsibility, checkpoint);
  const preparedEvidence = preflightEvidence(pair.checkpoint, evidence_sources);

  const finalRoot = path.resolve(root);
  if (fs.existsSync(finalRoot)) fail('EXPORT_ROOT_ALREADY_EXISTS', finalRoot);
  const parent = path.dirname(finalRoot);
  assertRegularDirectoryNoSymlink(parent, 'EXPORT_PARENT_INVALID', parent);

  const stagingRoot = fs.mkdtempSync(path.join(parent, `.${path.basename(finalRoot)}.staging-`));
  let published = false;
  try {
    for (const item of preparedEvidence) {
      const destination = evidenceDestination(stagingRoot, item.normalizedPath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(item.sourcePath, destination);
    }

    const responsibilityPath = path.join(stagingRoot, 'responsibility.json');
    const checkpointPath = path.join(stagingRoot, 'checkpoint.json');
    const startPath = path.join(stagingRoot, 'START.md');
    writeStableJson(responsibilityPath, pair.responsibility);
    writeStableJson(checkpointPath, pair.checkpoint);
    fs.writeFileSync(startPath, renderStart(pair.responsibility), 'utf8');

    const files = {
      'START.md': sha256File(startPath),
      'checkpoint.json': sha256File(checkpointPath),
      'responsibility.json': sha256File(responsibilityPath),
    };
    for (const item of preparedEvidence) {
      files[item.normalizedPath] = sha256File(evidenceDestination(stagingRoot, item.normalizedPath));
    }

    const manifest = {
      schema: SCHEMA,
      export_id,
      source_checkpoint: pair.checkpoint.checkpoint_id,
      responsibility_id: pair.responsibility.id,
      authority_basis: pair.responsibility.authority_basis,
      context_cutoff: pair.checkpoint.context_cutoff,
      files,
      semantics: {
        source_of_truth: false,
        git_tracking_required: false,
        git_push_required: false,
        creates_authority: false,
        external_manifest_sha256_required: true,
        origin_authentication: false,
      },
    };
    const manifestPath = path.join(stagingRoot, 'manifest.json');
    writeStableJson(manifestPath, manifest);
    const manifestSha256 = sha256File(manifestPath);

    validatePackageAtRoot(stagingRoot, manifestSha256);
    if (fs.existsSync(finalRoot)) fail('EXPORT_ROOT_ALREADY_EXISTS_AT_PUBLISH', finalRoot);
    fs.renameSync(stagingRoot, finalRoot);
    published = true;
    return { manifest, manifest_sha256: manifestSha256 };
  } finally {
    if (!published && fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function assertRegularDirectoryNoSymlink(dirPath, code, detail) {
  let stat;
  try {
    stat = fs.lstatSync(dirPath);
  } catch (error) {
    fail(code, detail);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(code, detail);
}

function consumePortableExport(root, expectedManifestSha256) {
  return validatePackageAtRoot(path.resolve(root), expectedManifestSha256);
}

module.exports = {
  SCHEMA,
  digestText,
  normalizeEvidencePath,
  renderStart,
  materializePortableExport,
  consumePortableExport,
};
