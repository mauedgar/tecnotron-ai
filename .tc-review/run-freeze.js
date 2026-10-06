'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fail(message) {
  throw new Error(message);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function safeRelative(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be non-empty`);
  if (path.isAbsolute(value) || value.includes('\\')) fail(`${label} must be relative POSIX path`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || value === '.' || value === '..' || value.startsWith('../')) {
    fail(`${label} is not a safe normalized relative path`);
  }
  return value;
}

function git(repo, args, options = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: options.encoding === null ? null : 'utf8',
    shell: false,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return result;
}

function exact(result, label) {
  if (result.status !== 0 || result.error) {
    fail(`${label} failed: ${result.error?.message || result.stderr || result.status}`);
  }
  return (result.stdout || '').trim();
}

function readExactFile(root, spec, label) {
  const relative = safeRelative(spec.path, `${label}.path`);
  const file = path.resolve(root, ...relative.split('/'));
  const rel = path.relative(path.resolve(root), file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) fail(`${label}.path escaped root`);
  const data = fs.readFileSync(file);
  const observed = sha256(data);
  if (observed !== spec.sha256) fail(`${label} sha256 mismatch: ${observed}`);
  return { file, data };
}

function tipIdentity(exactSubject) {
  if (exactSubject && exactSubject.accepted_tip) {
    return {
      commit: exactSubject.accepted_tip,
      tree: exactSubject.accepted_tip_tree,
      diffBase: exactSubject.integration_range_base,
    };
  }
  return {
    commit: exactSubject.commit,
    tree: exactSubject.tree,
    diffBase: exactSubject.parent,
  };
}

function tarList(archive) {
  const result = spawnSync('tar', ['-tf', archive], { encoding: 'utf8', shell: false });
  if (result.status !== 0 || result.error) fail(`tar list failed: ${result.error?.message || result.stderr || result.status}`);
  return (result.stdout || '').split(/\r?\n/).filter(Boolean);
}

function tarRead(archive, member) {
  const result = spawnSync('tar', ['-xOf', archive, member], { encoding: null, shell: false });
  if (result.status !== 0 || result.error) fail(`tar read failed for ${member}: ${result.error?.message || result.stderr || result.status}`);
  return Buffer.from(result.stdout || Buffer.alloc(0));
}

async function main() {
  const [requestPath, executorRoot, subjectRoot, workerRoot, validationRoot, resultRoot] = process.argv.slice(2);
  if (![requestPath, executorRoot, subjectRoot, workerRoot, validationRoot, resultRoot].every(Boolean)) {
    fail('usage: run-freeze.js <request> <executor> <subject> <worker-evidence> <validation-evidence> <result-root>');
  }

  const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
  if (request.schema_version !== 'tecnotron-tc-review-freeze-request/v0') fail('unsupported request schema');
  if (request.dispatch !== 'AUTHORIZED') fail('freeze dispatch is not authorized');
  if (!request.request_id || !request.interface_id || !request.taskcycle || !request.responsibility) fail('request identity is incomplete');
  if (!request.subject?.exact_subject || !request.subject?.branch) fail('subject is incomplete');
  if (!Array.isArray(request.authority_refs) || request.authority_refs.length === 0) fail('authority_refs required');
  if (!Array.isArray(request.validation?.files) || request.validation.files.length === 0) fail('validation evidence files required');
  if (!request.worker_evidence?.ref || !request.worker_evidence?.commit || !Array.isArray(request.worker_evidence.files)) {
    fail('worker evidence binding required');
  }

  const exactSubject = request.subject.exact_subject;
  const tip = tipIdentity(exactSubject);
  if (!tip.commit || !tip.tree || !tip.diffBase) fail('exact subject identity is incomplete');

  const observedHead = exact(git(subjectRoot, ['rev-parse', 'HEAD^{commit}']), 'subject HEAD');
  const observedTree = exact(git(subjectRoot, ['rev-parse', 'HEAD^{tree}']), 'subject tree');
  if (observedHead !== tip.commit) fail(`subject commit mismatch: ${observedHead}`);
  if (observedTree !== tip.tree) fail(`subject tree mismatch: ${observedTree}`);
  if (exact(git(subjectRoot, ['status', '--porcelain=v1', '--untracked-files=all']), 'subject status') !== '') {
    fail('subject worktree is not frozen');
  }

  fs.mkdirSync(resultRoot, { recursive: true });
  const inputRoot = path.join(resultRoot, 'inputs');
  const outputRoot = path.join(resultRoot, 'frozen');
  fs.mkdirSync(inputRoot, { recursive: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const reviewRequestPath = path.join(inputRoot, 'review-request.md');
  const reviewRequestBytes = Buffer.from(String(request.review_request_markdown || ''), 'utf8');
  if (reviewRequestBytes.length === 0) fail('review_request_markdown required');
  fs.writeFileSync(reviewRequestPath, reviewRequestBytes);

  const requiredEvidence = [{
    id: 'review-request',
    kind: 'FILE',
    source_path: reviewRequestPath,
    package_path: 'review/review-request.md',
    sha256: sha256(reviewRequestBytes),
  }];

  const validationRefs = [];
  for (let index = 0; index < request.validation.files.length; index += 1) {
    const spec = request.validation.files[index];
    if (!spec.ref || !['EVIDENCE', 'ARTIFACT'].includes(spec.ref.kind) || !spec.ref.id) {
      fail(`validation.files[${index}].ref invalid`);
    }
    if (spec.ref.sha256 && spec.ref.sha256 !== spec.sha256) fail(`validation.files[${index}] ref sha mismatch`);
    const { file } = readExactFile(validationRoot, spec, `validation.files[${index}]`);
    const ref = { ...spec.ref, sha256: spec.sha256 };
    validationRefs.push(ref);
    requiredEvidence.push({
      id: `validation-${index + 1}`,
      kind: 'FILE',
      source_path: file,
      package_path: safeRelative(spec.package_path, `validation.files[${index}].package_path`),
      sha256: spec.sha256,
      reference_id: ref.id,
    });
  }

  for (let index = 0; index < request.worker_evidence.files.length; index += 1) {
    const spec = request.worker_evidence.files[index];
    const { file } = readExactFile(workerRoot, spec, `worker_evidence.files[${index}]`);
    requiredEvidence.push({
      id: `worker-${index + 1}`,
      kind: 'FILE',
      source_path: file,
      package_path: safeRelative(spec.package_path, `worker_evidence.files[${index}].package_path`),
      sha256: spec.sha256,
    });
  }

  for (const repositoryPath of exactSubject.changed_paths || []) {
    safeRelative(repositoryPath, 'subject.changed_path');
    const oidResult = git(subjectRoot, ['rev-parse', `${tip.commit}:${repositoryPath}`]);
    if (oidResult.status === 0 && !oidResult.error) {
      const oid = (oidResult.stdout || '').trim();
      requiredEvidence.push({
        id: `candidate-blob-${requiredEvidence.length + 1}`,
        kind: 'GIT_BLOB',
        revision: tip.commit,
        repository_path: repositoryPath,
        package_path: `candidate/files/${repositoryPath}`,
        git_oid: oid,
      });
    }
  }

  requiredEvidence.push({
    id: 'candidate-diff',
    kind: 'GIT_DIFF',
    parent: tip.diffBase,
    commit: tip.commit,
    package_path: 'candidate/candidate.diff',
  });

  const recipeModule = path.resolve(executorRoot, 'src/operational-spine-v0/recipes/materialize-frozen-review-interface.js');
  const { createMaterializeFrozenReviewInterfaceRecipe } = require(recipeModule);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();

  const operationId = `OP-FREEZE-${request.interface_id}`;
  const effectScope = path.join(outputRoot, request.interface_id).replaceAll('\\', '/');
  const recipeRequest = {
    recipe_id: 'materialize_frozen_review_interface',
    recipe_version: 'v0',
    operation_id: operationId,
    execution_attempt_id: request.request_id,
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: operationId,
      taskcycle_id: request.taskcycle,
      repository: { identity: 'mauedgar/tecnotron-ai', location: path.resolve(subjectRoot) },
      worktree: { identity: request.subject.branch, location: path.resolve(subjectRoot) },
      git: { expected_ref: 'HEAD', expected_commit: tip.commit },
      runtime: {
        executor: 'github-actions:tc-review-freeze-v0',
        platform: process.platform,
        runtime_identity: process.version,
      },
      state_store: { reference: 'KERNEL_FREE_NOT_USED' },
      authority_refs: request.authority_refs,
      evidence_refs: validationRefs,
    },
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: request.authority_refs[0].id,
      effect_constraints: [{ effect: 'review_interface.write', scope: effectScope }],
    },
    evidence_refs: validationRefs,
    input: {
      interface_id: request.interface_id,
      output_root: path.resolve(outputRoot),
      review_instance: {
        TaskCycle: request.taskcycle,
        responsibility: request.responsibility,
        exact_subject: exactSubject,
        review_request: requiredEvidence[0],
        required_evidence_specification: requiredEvidence.slice(1),
        validation_evidence_refs: validationRefs,
        authority_and_scope: {
          protocol_ref: 'tecnotron-independent-review-protocol/v1',
          authority_refs: request.authority_refs,
          scope: request.review_scope || {
            include: ['exact frozen candidate semantic review'],
            exclude: ['Developer acceptance', 'Phase 2', 'integration', 'publication', 'close'],
          },
        },
      },
      render_review_prompt: true,
    },
  };

  fs.writeFileSync(path.join(resultRoot, 'resolved-recipe-request.json'), `${JSON.stringify(stable(recipeRequest), null, 2)}\n`);

  const preflight = await recipe.preflight(recipeRequest);
  fs.writeFileSync(path.join(resultRoot, 'preflight.json'), `${JSON.stringify(stable(preflight), null, 2)}\n`);
  if (preflight.status !== 'READY') fail(`recipe preflight ${preflight.status}: ${preflight.reason || 'NO_REASON'}`);

  const receipt = await recipe.execute(recipeRequest);
  fs.writeFileSync(path.join(resultRoot, 'receipt.json'), `${JSON.stringify(stable(receipt), null, 2)}\n`);
  if (receipt.status !== 'PASS' || receipt.effect_state !== 'CONFIRMED') {
    fail(`recipe receipt ${receipt.status}/${receipt.effect_state}: ${receipt.reason || 'NO_REASON'}`);
  }

  const archivePath = receipt.output?.archive_path;
  const promptPath = receipt.output?.review_prompt?.path;
  if (!archivePath || !promptPath) fail('receipt missing archive or review prompt');

  const archive = fs.readFileSync(archivePath);
  const prompt = fs.readFileSync(promptPath);
  if (sha256(archive) !== receipt.output.archive_sha256) fail('archive sha256 mismatch after recipe');
  if (sha256(prompt) !== receipt.output.review_prompt.sha256) fail('review prompt sha256 mismatch after recipe');

  const members = tarList(archivePath);
  if (members.length !== receipt.output.archive_entry_count) fail('archive entry count mismatch after recipe');
  if (!members.includes('manifest.json')) fail('archive manifest missing');

  const manifestBytes = tarRead(archivePath, 'manifest.json');
  if (sha256(manifestBytes) !== receipt.output.manifest_sha256) fail('manifest sha256 mismatch after recipe');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (!sameJson(manifest.exact_subject, exactSubject)) fail('manifest exact subject mismatch');

  for (const entry of manifest.entries || []) {
    const member = safeRelative(entry.package_path, 'manifest.entry.package_path');
    const bytes = tarRead(archivePath, member);
    if (bytes.length !== entry.size) fail(`manifest size mismatch: ${member}`);
    if (sha256(bytes) !== entry.sha256) fail(`manifest sha256 mismatch: ${member}`);
  }

  const afterHead = exact(git(subjectRoot, ['rev-parse', 'HEAD^{commit}']), 'post-freeze subject HEAD');
  const afterTree = exact(git(subjectRoot, ['rev-parse', 'HEAD^{tree}']), 'post-freeze subject tree');
  const afterStatus = exact(git(subjectRoot, ['status', '--porcelain=v1', '--untracked-files=all']), 'post-freeze subject status');
  if (afterHead !== tip.commit || afterTree !== tip.tree || afterStatus !== '') fail('candidate changed during freeze');

  const result = {
    schema_version: 'tecnotron-tc-review-freeze-result/v0',
    request_id: request.request_id,
    interface_id: request.interface_id,
    taskcycle: request.taskcycle,
    responsibility: request.responsibility,
    executor: request.executor,
    subject: {
      branch: request.subject.branch,
      commit: tip.commit,
      tree: tip.tree,
      exact_subject: exactSubject,
    },
    recipe: { id: 'materialize_frozen_review_interface', version: 'v0' },
    status: 'PASS',
    effect_state: 'CONFIRMED',
    archive: {
      path: path.relative(resultRoot, archivePath).replaceAll('\\', '/'),
      sha256: receipt.output.archive_sha256,
      size: receipt.output.archive_size,
      entry_count: receipt.output.archive_entry_count,
      manifest_sha256: receipt.output.manifest_sha256,
    },
    review_prompt: {
      path: path.relative(resultRoot, promptPath).replaceAll('\\', '/'),
      sha256: receipt.output.review_prompt.sha256,
      size: receipt.output.review_prompt.size,
    },
    candidate_unchanged: true,
    state_kernel_runtime_binding: false,
    authority: 'NONE',
    Product_effect: 'NONE',
  };
  fs.writeFileSync(path.join(resultRoot, 'freeze-result.json'), `${JSON.stringify(stable(result), null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    schema_version: 'tecnotron-tc-review-freeze-result/v0',
    status: 'FAIL',
    reason: error instanceof Error ? error.message : String(error),
    authority: 'NONE',
    Product_effect: 'NONE',
  })}\n`);
  process.exitCode = 1;
});
