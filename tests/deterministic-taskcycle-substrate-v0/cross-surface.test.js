'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const substrateDir = path.resolve(__dirname, '../../src/deterministic-taskcycle-substrate-v0');
const cliPath = path.join(substrateDir, 'cli.js');
const { sha256File } = require(path.join(substrateDir, 'observation.js'));

test('separate producer and consumer processes cross a continuation boundary using an independently passed manifest identity', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcs-v0-cross-'));
  try {
    const producerDir = path.join(temp, 'producer');
    const consumerDir = path.join(temp, 'consumer');
    const exportRoot = path.join(temp, 'portable-export');
    fs.mkdirSync(producerDir);
    fs.mkdirSync(consumerDir);
    const evidenceSource = path.join(producerDir, 'repo-state.txt');
    fs.writeFileSync(evidenceSource, 'ref=abc123\n', 'utf8');

    const spec = {
      export_id: 'EXPORT-E1',
      responsibility: {
        id: 'PROVE_PORTABLE_DETERMINISTIC_CONTINUATION_001',
        objective: 'Resume one bounded responsibility across execution surfaces.',
        authority_basis: 'DEVELOPER_AUTHORIZED_LOCAL_CANDIDATE_ONLY',
        permitted_effects: ['READ_ONLY_OBSERVATION'],
        forbidden_effects: ['repository_mutation', 'remote_mutation', 'lifecycle_transition'],
        mechanical_postconditions: [{ id: 'REPOSITORY_IDENTITY', operator: 'EXACT', expected: 'abc123' }],
      },
      checkpoint: {
        checkpoint_id: 'CHECKPOINT-C1',
        predecessor_checkpoint_id: null,
        responsibility_id: 'PROVE_PORTABLE_DETERMINISTIC_CONTINUATION_001',
        authority_basis: 'DEVELOPER_AUTHORIZED_LOCAL_CANDIDATE_ONLY',
        context_cutoff: 'CONTEXT-CUTOFF-001',
        exact_state: { repository_ref: 'abc123' },
        evidence: [{ id: 'REPO_STATE', path: 'evidence/repo-state.txt', sha256: sha256File(evidenceSource) }],
        postconditions: [{ id: 'REPOSITORY_IDENTITY', expected: 'abc123', observed: 'abc123', correspondence: 'EXACT', evidence_refs: ['REPO_STATE'] }],
        disposition: { continuation_eligible: true, reason: 'MECHANICAL_POSTCONDITIONS_EXACT' },
      },
      evidence_sources: [{ id: 'REPO_STATE', source_path: 'repo-state.txt' }],
    };

    const specPath = path.join(producerDir, 'spec.json');
    fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
    const produced = spawnSync(process.execPath, [cliPath, 'materialize', specPath, exportRoot], { cwd: producerDir, encoding: 'utf8' });
    assert.equal(produced.status, 0, produced.stderr);
    const producedSummary = JSON.parse(produced.stdout);
    assert.match(producedSummary.manifest_sha256, /^sha256:[a-f0-9]{64}$/);

    const consumed = spawnSync(process.execPath, [cliPath, 'consume', exportRoot, producedSummary.manifest_sha256], {
      cwd: consumerDir,
      encoding: 'utf8',
      env: { ...process.env, DTCS_SURFACE: 'SURFACE_B' },
    });
    assert.equal(consumed.status, 0, consumed.stderr);
    const summary = JSON.parse(consumed.stdout);
    assert.equal(summary.status, 'CONSUMED');
    assert.equal(summary.manifest_sha256, producedSummary.manifest_sha256);
    assert.equal(summary.responsibility_id, spec.responsibility.id);
    assert.equal(summary.checkpoint_id, spec.checkpoint.checkpoint_id);
    assert.equal(summary.authority_basis, spec.responsibility.authority_basis);
    assert.equal(summary.context_cutoff, spec.checkpoint.context_cutoff);
    assert.equal(summary.continuation_eligible, true);
    assert.match(summary.trust_boundary, /NOT_ORIGIN_AUTHENTICATION/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
