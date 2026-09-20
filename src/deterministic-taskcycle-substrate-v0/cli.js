'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { materializePortableExport, consumePortableExport } = require('./continuation');

function usage() {
  process.stderr.write(
    'Usage:\n' +
      '  node cli.js materialize <spec.json> <export-root>\n' +
      '  node cli.js consume <export-root> <expected-manifest-sha256>\n',
  );
  process.exitCode = 2;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'materialize' && rest.length === 2) {
    const [specPath, exportRoot] = rest;
    const resolvedSpecPath = path.resolve(specPath);
    const spec = readJson(resolvedSpecPath);
    const result = materializePortableExport({
      root: path.resolve(exportRoot),
      export_id: spec.export_id,
      responsibility: spec.responsibility,
      checkpoint: spec.checkpoint,
      evidence_sources: (spec.evidence_sources || []).map((entry) => ({
        id: entry.id,
        source_path: path.resolve(path.dirname(resolvedSpecPath), entry.source_path),
      })),
    });
    process.stdout.write(`${JSON.stringify({ status: 'MATERIALIZED', ...result }, null, 2)}\n`);
    return;
  }
  if (command === 'consume' && rest.length === 2) {
    const [exportRoot, expectedManifestSha256] = rest;
    const consumed = consumePortableExport(path.resolve(exportRoot), expectedManifestSha256);
    process.stdout.write(`${JSON.stringify({
      status: 'CONSUMED',
      manifest_sha256: consumed.manifest_sha256,
      responsibility_id: consumed.responsibility.id,
      checkpoint_id: consumed.checkpoint.checkpoint_id,
      authority_basis: consumed.responsibility.authority_basis,
      context_cutoff: consumed.checkpoint.context_cutoff,
      continuation_eligible: consumed.checkpoint.disposition.continuation_eligible,
      trust_boundary: 'EXACT_PACKAGE_IDENTITY_REQUIRES_TRUSTED_EXTERNAL_MANIFEST_SHA256; NOT_ORIGIN_AUTHENTICATION',
    }, null, 2)}\n`);
    return;
  }
  usage();
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    status: 'FAILED',
    code: error && error.code ? error.code : 'ERROR',
    message: error && error.message ? error.message : String(error),
  }, null, 2)}\n`);
  process.exitCode = 1;
}
