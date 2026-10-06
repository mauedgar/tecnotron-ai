'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { z } = require('zod');
const { referenceSchema } = require('../../state-kernel-v0/contracts');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../contracts');
const { createGitCliAdapter } = require('./integrate-accepted-candidate');

const NonEmpty = z.string().min(1);
const GitOid = z.string().regex(/^[a-f0-9]{40,64}$/);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const PackagePath = z.string().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/).refine((value) => {
  const normalized = path.posix.normalize(value);
  return value === normalized && !path.posix.isAbsolute(value) && !value.startsWith('../');
}, 'package_path must be a normalized relative POSIX path of at most 100 bytes');
const RepositoryPath = z.string().min(1).max(4096).regex(/^[A-Za-z0-9.][A-Za-z0-9._/-]*$/).refine((value) => {
  const normalized = path.posix.normalize(value);
  return value !== '.' && value !== '..'
    && value === normalized
    && !path.posix.isAbsolute(value)
    && !value.startsWith('../');
}, 'repository_path must be a normalized relative POSIX path');
const AbsolutePath = NonEmpty.refine(
  (value) => path.isAbsolute(value) && path.resolve(value) === value,
  'path must be absolute and normalized',
);

const FileArtifact = z.object({
  id: NonEmpty,
  kind: z.literal('FILE'),
  source_path: AbsolutePath,
  package_path: PackagePath,
  sha256: Sha256,
  reference_id: NonEmpty.optional(),
}).strict();

const GitBlobArtifact = z.object({
  id: NonEmpty,
  kind: z.literal('GIT_BLOB'),
  revision: GitOid,
  repository_path: RepositoryPath,
  package_path: PackagePath,
  git_oid: GitOid,
}).strict();

const GitDiffArtifact = z.object({
  id: NonEmpty,
  kind: z.literal('GIT_DIFF'),
  parent: GitOid,
  commit: GitOid,
  package_path: PackagePath,
}).strict();

const ArtifactSpecification = z.discriminatedUnion('kind', [
  FileArtifact,
  GitBlobArtifact,
  GitDiffArtifact,
]);

const DirectChildExactSubject = z.object({
  parent: GitOid,
  commit: GitOid,
  tree: GitOid,
  changed_paths: z.array(RepositoryPath),
}).strict();

const ExactFirstParentLinearRange = z.object({
  integration_range_base: GitOid,
  accepted_tip: GitOid,
  accepted_tip_parent: GitOid,
  accepted_tip_tree: GitOid,
  ordered_commit_range: z.array(GitOid).min(1),
  commit_count: z.number().int().positive(),
  changed_paths: z.array(RepositoryPath),
}).strict();

const ExactSubject = z.union([
  DirectChildExactSubject,
  ExactFirstParentLinearRange,
]);

const AuthorityAndScope = z.object({
  protocol_ref: z.literal('tecnotron-independent-review-protocol/v1'),
  authority_refs: z.array(referenceSchema).min(1),
  scope: z.record(z.string(), z.unknown()),
}).strict();

const ReviewInstance = z.object({
  TaskCycle: NonEmpty,
  responsibility: NonEmpty,
  exact_subject: ExactSubject,
  review_request: FileArtifact,
  required_evidence_specification: z.array(ArtifactSpecification).min(1),
  validation_evidence_refs: z.array(referenceSchema).min(1),
  authority_and_scope: AuthorityAndScope,
}).strict();

const MaterializeFrozenReviewInterfaceInput = z.object({
  interface_id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  output_root: AbsolutePath,
  review_instance: ReviewInstance,
  render_review_prompt: z.boolean().optional(),
}).strict().superRefine((value, ctx) => {
  const instance = value.review_instance;
  const artifacts = [instance.review_request, ...instance.required_evidence_specification];
  const ids = new Set();
  const packagePaths = new Set(['manifest.json', 'review-instance.json']);
  for (const [index, artifact] of artifacts.entries()) {
    if (ids.has(artifact.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['review_instance', 'required_evidence_specification', index], message: `duplicate artifact id: ${artifact.id}` });
    }
    if (packagePaths.has(artifact.package_path)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['review_instance', 'required_evidence_specification', index], message: `duplicate or reserved package_path: ${artifact.package_path}` });
    }
    ids.add(artifact.id);
    packagePaths.add(artifact.package_path);
  }

  const changedPaths = instance.exact_subject.changed_paths;
  if (new Set(changedPaths).size !== changedPaths.length || [...changedPaths].sort().join('\0') !== changedPaths.join('\0')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['review_instance', 'exact_subject', 'changed_paths'], message: 'changed_paths must be unique and sorted' });
  }

  const refs = instance.validation_evidence_refs;
  const refIds = refs.map((ref) => ref.id);
  if (refs.some((ref) => !['EVIDENCE', 'ARTIFACT'].includes(ref.kind)) || new Set(refIds).size !== refIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['review_instance', 'validation_evidence_refs'], message: 'validation evidence references must be unique EVIDENCE or ARTIFACT references' });
  }

  const boundRefIds = instance.required_evidence_specification
    .filter((artifact) => artifact.kind === 'FILE' && artifact.reference_id)
    .map((artifact) => artifact.reference_id)
    .sort();
  if (boundRefIds.join('\0') !== [...refIds].sort().join('\0')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['review_instance', 'required_evidence_specification'], message: 'each validation evidence reference must bind exactly one FILE artifact' });
  }
});

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

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(stable(value), null, 2)}\n`);
}

function exactLine(result) {
  return (result.stdout || '').trim();
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isExactRange(subject) {
  return Object.hasOwn(subject, 'accepted_tip');
}

function subjectCommit(subject) {
  return isExactRange(subject) ? subject.accepted_tip : subject.commit;
}

function sameReference(left, right) {
  return ['kind', 'id', 'location', 'sha256', 'git_oid']
    .every((field) => left?.[field] === right?.[field]);
}

function effectScope(input) {
  return path.join(input.output_root, input.interface_id).replaceAll('\\', '/');
}

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function effectsForInput(rawInput) {
  const input = MaterializeFrozenReviewInterfaceInput.parse(rawInput);
  return [{ effect: 'review_interface.write', scope: effectScope(input) }];
}

function authorizationCovers(request, input) {
  return request.authorization?.disposition === 'AUTHORIZED'
    && (request.authorization.effect_constraints || []).some((constraint) => (
      constraint.effect === 'review_interface.write' && constraint.scope === effectScope(input)
    ));
}

function createReviewGitAdapter({ command = 'git', base = createGitCliAdapter({ command }) } = {}) {
  function run(repositoryPath, args, options = {}) {
    const result = spawnSync(command, args, {
      cwd: repositoryPath,
      encoding: options.encoding === null ? null : 'utf8',
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return {
      exit_code: result.status,
      signal: result.signal || null,
      error: result.error || null,
      stdout: result.stdout || (options.encoding === null ? Buffer.alloc(0) : ''),
      stderr: result.stderr || (options.encoding === null ? Buffer.alloc(0) : ''),
    };
  }

  return {
    ...base,
    changedPaths(repositoryPath, parent, commit) {
      return run(repositoryPath, ['diff', '--name-only', '--no-renames', parent, commit, '--']);
    },
    blobOid(repositoryPath, revision, repositoryPathValue) {
      return run(repositoryPath, ['rev-parse', `${revision}:${repositoryPathValue}`]);
    },
    readBlob(repositoryPath, oid) {
      return run(repositoryPath, ['cat-file', 'blob', oid], { encoding: null });
    },
    diff(repositoryPath, parent, commit) {
      return run(repositoryPath, ['diff', '--binary', '--full-index', '--no-ext-diff', '--no-renames', parent, commit, '--']);
    },
  };
}

function verifyFileArtifact(artifact, evidenceById) {
  let stat;
  try {
    stat = fs.lstatSync(artifact.source_path);
  } catch {
    return `DECLARED_ARTIFACT_MISSING:${artifact.id}`;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) return `DECLARED_ARTIFACT_NOT_REGULAR_FILE:${artifact.id}`;
  const digest = sha256(fs.readFileSync(artifact.source_path));
  if (digest !== artifact.sha256) return `DECLARED_ARTIFACT_HASH_MISMATCH:${artifact.id}`;

  if (artifact.reference_id) {
    const ref = evidenceById.get(artifact.reference_id);
    if (!ref) return `DECLARED_EVIDENCE_REFERENCE_MISSING:${artifact.reference_id}`;
    if (!ref.sha256 || ref.sha256 !== artifact.sha256) return `DECLARED_EVIDENCE_REFERENCE_HASH_MISMATCH:${artifact.reference_id}`;
    if (ref.location) {
      const source = artifact.source_path.replaceAll('\\', '/');
      const location = ref.location.replaceAll('\\', '/');
      if (!(source === location || source.endsWith(`/${location}`))) return `DECLARED_EVIDENCE_REFERENCE_LOCATION_MISMATCH:${artifact.reference_id}`;
    }
  }
  return null;
}

function verifyExactRange(git, repositoryPath, subject) {
  if (subject.commit_count !== subject.ordered_commit_range.length) return 'ACCEPTED_RANGE_COMMIT_COUNT_MISMATCH';
  if (new Set(subject.ordered_commit_range).size !== subject.ordered_commit_range.length) return 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH';
  if (subject.ordered_commit_range.at(-1) !== subject.accepted_tip) return 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH';

  const base = git.revParse(repositoryPath, `${subject.integration_range_base}^{commit}`);
  if (base.exit_code !== 0 || exactLine(base) !== subject.integration_range_base) return 'ACCEPTED_RANGE_BASE_IDENTITY_MISMATCH';

  const range = git.commitRange(repositoryPath, subject.integration_range_base, subject.accepted_tip);
  if (range.exit_code !== 0 || range.error) return 'ACCEPTED_RANGE_COMMIT_LIST_UNAVAILABLE';
  const observed = exactLine(range) ? exactLine(range).split(/\r?\n/) : [];
  if (!sameList(observed, subject.ordered_commit_range)) return 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH';
  if (observed.length !== subject.commit_count) return 'ACCEPTED_RANGE_COMMIT_COUNT_MISMATCH';

  for (const commit of observed) {
    const secondParent = git.revParse(repositoryPath, `${commit}^2`);
    if (secondParent.exit_code === 0) return 'ACCEPTED_RANGE_HIDDEN_MERGE_OR_NON_LINEAR';
    if (secondParent.error) return 'ACCEPTED_RANGE_PARENT_AUDIT_UNAVAILABLE';
  }

  let expectedParent = subject.integration_range_base;
  for (const commit of observed) {
    const firstParent = git.revParse(repositoryPath, `${commit}^1`);
    if (firstParent.exit_code !== 0 || exactLine(firstParent) !== expectedParent) return 'ACCEPTED_RANGE_NON_LINEAR';
    expectedParent = commit;
  }

  const paths = git.changedPaths(repositoryPath, subject.integration_range_base, subject.accepted_tip);
  if (paths.exit_code !== 0 || paths.error) return 'ACCEPTED_RANGE_CHANGED_PATHS_UNAVAILABLE';
  const observedPaths = exactLine(paths) ? [...new Set(exactLine(paths).split(/\r?\n/))].sort() : [];
  if (!sameList(observedPaths, subject.changed_paths)) return 'ACCEPTED_RANGE_CHANGED_PATHS_MISMATCH';
  return null;
}

function candidateGuard(request, input, git) {
  const repositoryPath = request.context.worktree?.location || request.context.repository.location;
  const subject = input.review_instance.exact_subject;
  const expectedCommit = subjectCommit(subject);
  if (input.review_instance.TaskCycle !== request.context.taskcycle_id) return 'TASKCYCLE_CONTEXT_MISMATCH';
  if (!request.context.git || request.context.git.expected_commit !== expectedCommit) return 'EXECUTION_CONTEXT_GIT_MISMATCH';

  const status = git.status(repositoryPath);
  if (status.exit_code !== 0) return 'GIT_STATUS_UNAVAILABLE';
  if (exactLine(status) !== '') return 'CANDIDATE_WORKTREE_NOT_FROZEN';

  const ref = git.revParse(repositoryPath, `${request.context.git.expected_ref}^{commit}`);
  if (ref.exit_code !== 0 || exactLine(ref) !== expectedCommit) return 'CANDIDATE_REF_MISMATCH';
  const commit = git.revParse(repositoryPath, `${expectedCommit}^{commit}`);
  if (commit.exit_code !== 0 || exactLine(commit) !== expectedCommit) return 'CANDIDATE_IDENTITY_MISMATCH';

  const declaredParent = isExactRange(subject) ? subject.accepted_tip_parent : subject.parent;
  const parent = git.revParse(repositoryPath, `${expectedCommit}^1`);
  if (parent.exit_code !== 0 || exactLine(parent) !== declaredParent) return 'CANDIDATE_PARENT_MISMATCH';
  if (!isExactRange(subject)) {
    const secondParent = git.revParse(repositoryPath, `${expectedCommit}^2`);
    if (secondParent.exit_code === 0) return 'MERGE_CANDIDATE_NOT_BOUNDED';
  }

  const declaredTree = isExactRange(subject) ? subject.accepted_tip_tree : subject.tree;
  const tree = git.revParse(repositoryPath, `${expectedCommit}^{tree}`);
  if (tree.exit_code !== 0 || exactLine(tree) !== declaredTree) return 'CANDIDATE_TREE_MISMATCH';

  if (isExactRange(subject)) return verifyExactRange(git, repositoryPath, subject);

  const paths = git.changedPaths(repositoryPath, subject.parent, subject.commit);
  if (paths.exit_code !== 0) return 'CANDIDATE_CHANGED_PATHS_UNAVAILABLE';
  const observed = exactLine(paths) ? exactLine(paths).split(/\r?\n/).sort() : [];
  if (observed.join('\0') !== subject.changed_paths.join('\0')) return 'CANDIDATE_CHANGED_PATHS_MISMATCH';
  return null;
}

function validateRequestBoundary(request, input) {
  if (!authorizationCovers(request, input)) return 'REVIEW_INTERFACE_WRITE_AUTHORIZATION_REQUIRED';

  const requestedEvidence = new Map(request.evidence_refs.map((ref) => [ref.id, ref]));
  for (const ref of input.review_instance.validation_evidence_refs) {
    const supplied = requestedEvidence.get(ref.id);
    if (!supplied || !sameReference(supplied, ref)) return `VALIDATION_EVIDENCE_REFERENCE_NOT_SUPPLIED:${ref.id}`;
  }

  for (const ref of input.review_instance.authority_and_scope.authority_refs) {
    if (!request.context.authority_refs.some((candidate) => sameReference(candidate, ref))) {
      return `AUTHORITY_REFERENCE_NOT_IN_EXECUTION_CONTEXT:${ref.id}`;
    }
  }

  const artifacts = [input.review_instance.review_request, ...input.review_instance.required_evidence_specification];
  const evidenceById = new Map(input.review_instance.validation_evidence_refs.map((ref) => [ref.id, ref]));
  for (const artifact of artifacts.filter((candidate) => candidate.kind === 'FILE')) {
    const reason = verifyFileArtifact(artifact, evidenceById);
    if (reason) return reason;
  }
  return null;
}

function writeOctal(buffer, offset, length, value) {
  const encoded = `${value.toString(8).padStart(length - 1, '0')}\0`;
  buffer.write(encoded, offset, length, 'ascii');
}

function tarHeader(name, size) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write('0', 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  writeOctal(header, 148, 8, header.reduce((sum, byte) => sum + byte, 0));
  return header;
}

function createTar(entries) {
  const blocks = [];
  for (const [name, data] of [...entries.entries()].sort(([left], [right]) => left.localeCompare(right, 'en'))) {
    blocks.push(tarHeader(name, data.length), data);
    const padding = (512 - (data.length % 512)) % 512;
    if (padding) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

function readTar(archive) {
  const entries = new Map();
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const storedChecksum = Number.parseInt(header.toString('ascii', 148, 156).replace(/\0.*$/, '').trim(), 8);
    const checkHeader = Buffer.from(header);
    checkHeader.fill(0x20, 148, 156);
    if (storedChecksum !== checkHeader.reduce((sum, byte) => sum + byte, 0)) throw new Error('archive header checksum mismatch');
    const name = header.toString('utf8', 0, 100).replace(/\0.*$/, '');
    const size = Number.parseInt(header.toString('ascii', 124, 136).replace(/\0.*$/, '').trim(), 8);
    if (!name || !Number.isSafeInteger(size) || size < 0 || entries.has(name)) throw new Error('archive member is invalid or duplicated');
    const start = offset + 512;
    const end = start + size;
    if (end > archive.length) throw new Error('archive member is truncated');
    entries.set(name, Buffer.from(archive.subarray(start, end)));
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function verifyArchive(expectedEntries, archive) {
  const reopened = readTar(archive);
  const expectedNames = [...expectedEntries.keys()].sort();
  const reopenedNames = [...reopened.keys()].sort();
  if (expectedNames.join('\0') !== reopenedNames.join('\0')) throw new Error('ARCHIVE_MEMBER_SET_MISMATCH');
  for (const name of expectedNames) {
    if (!reopened.get(name).equals(expectedEntries.get(name))) throw new Error(`ARCHIVE_MEMBER_HASH_MISMATCH:${name}`);
  }
  return reopened;
}

function renderReviewPrompt({
  interfaceId,
  TaskCycle,
  responsibility,
  archiveFilename,
  archiveSha256,
  archiveSize,
  archiveEntryCount,
  manifestSha256,
  exactSubject,
}) {
  const transportIdentity = {
    review_interface_id: interfaceId,
    TaskCycle,
    responsibility,
    archive_filename: archiveFilename,
    archive_sha256: archiveSha256,
    archive_size: archiveSize,
    archive_entry_count: archiveEntryCount,
    manifest_sha256: manifestSha256,
    exact_frozen_subject: exactSubject,
  };
  return Buffer.from([
    '# Independent Review Launch',
    '',
    'Use the attached frozen archive as the complete input boundary for one Independent Review.',
    'The semantic review questions and acceptance criteria are only those already supplied inside that archive.',
    '',
    '## Exact Transport Identity',
    '',
    '```json',
    JSON.stringify(stable(transportIdentity), null, 2),
    '```',
    '',
    '## Review Boundary',
    '',
    '- Treat the declared archive contents as the complete input boundary; do not repair it from chat history, memory, live repository state, or undeclared evidence.',
    '- Keep the review read-only. Do not mutate the candidate or its repository.',
    '- Return exactly one bounded review result using `PASS`, `FAIL`, or `BLOCKED`.',
    '- `PASS` is not Developer acceptance.',
    '- Do not authorize or perform candidate mutation, Phase 2, integration, publication, or lifecycle close.',
    '- Stop after returning one review result.',
    '',
  ].join('\n'), 'utf8');
}

function materializeArtifact(repositoryPath, artifact, git) {
  if (artifact.kind === 'FILE') return fs.readFileSync(artifact.source_path);
  if (artifact.kind === 'GIT_BLOB') {
    const oid = git.blobOid(repositoryPath, artifact.revision, artifact.repository_path);
    if (oid.exit_code !== 0 || exactLine(oid) !== artifact.git_oid) throw new Error(`GIT_BLOB_IDENTITY_MISMATCH:${artifact.id}`);
    const blob = git.readBlob(repositoryPath, artifact.git_oid);
    if (blob.exit_code !== 0 || blob.error) throw new Error(`GIT_BLOB_MATERIALIZATION_FAILED:${artifact.id}`);
    return Buffer.from(blob.stdout);
  }
  const diff = git.diff(repositoryPath, artifact.parent, artifact.commit);
  if (diff.exit_code !== 0 || diff.error) throw new Error(`GIT_DIFF_MATERIALIZATION_FAILED:${artifact.id}`);
  return Buffer.from(diff.stdout, 'utf8');
}

function receipt(request, { status, effectState, reason, output, resultRefs = [] }) {
  return RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: `recipe-receipt:${request.execution_attempt_id}:materialize-frozen-review-interface`,
    recipe_id: request.recipe_id,
    recipe_version: request.recipe_version,
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    effect_state: effectState,
    ...(reason ? { reason } : {}),
    ...(output ? { output } : {}),
    result_refs: resultRefs,
    evidence_refs: request.evidence_refs || [],
  });
}

function createMaterializeFrozenReviewInterfaceRecipe({ git = createReviewGitAdapter() } = {}) {
  const definition = RecipeDefinition.parse({
    id: 'materialize_frozen_review_interface',
    version: 'v0',
    provides: ['candidate.freeze.verify', 'review_interface.materialize'],
    required_inputs: [
      'interface_id',
      'output_root',
      'review_instance.TaskCycle',
      'review_instance.responsibility',
      'review_instance.exact_subject',
      'review_instance.review_request',
      'review_instance.required_evidence_specification',
      'review_instance.validation_evidence_refs',
      'review_instance.authority_and_scope',
      'render_review_prompt (optional)',
    ],
    preconditions: [
      'caller supplied the exact semantic review interface under tecnotron-independent-review-protocol/v1',
      'direct-child or exact first-parent linear-range identity, changed paths, ref, and clean worktree are exact',
      'every declared validation evidence reference is supplied and bound to exact bytes',
      'review interface identity has not been materialized previously',
    ],
    effects: [{ effect: 'review_interface.write', scope: 'exact requested immutable interface only' }],
    postconditions: [
      'candidate identity and clean worktree remain unchanged',
      'manifest member hashes, sizes, count, and candidate correspondence verify',
      'archive reopens with exactly the declared member set and bytes',
      'optional external review prompt is bound to the exact archive, manifest, and subject',
      'prior review interface identities remain unchanged',
      'receipt contains no Independent Review verdict or Developer acceptance',
    ],
  });

  async function preflight(request) {
    let input;
    try {
      input = MaterializeFrozenReviewInterfaceInput.parse(request.input);
    } catch (error) {
      return { status: 'BLOCKED', reason: `INVALID_RESOLVED_REVIEW_INTERFACE:${error.message}` };
    }

    const repositoryPath = request.context.worktree?.location || request.context.repository.location;
    if (!fs.existsSync(repositoryPath)) return { status: 'UNAVAILABLE', reason: 'REPOSITORY_LOCATION_UNAVAILABLE' };
    let outputStat;
    try {
      outputStat = fs.lstatSync(input.output_root);
    } catch {
      return { status: 'UNAVAILABLE', reason: 'OUTPUT_ROOT_UNAVAILABLE' };
    }
    if (!outputStat.isDirectory() || outputStat.isSymbolicLink()) {
      return { status: 'BLOCKED', reason: 'OUTPUT_ROOT_NOT_EXACT_DIRECTORY' };
    }
    if (isWithin(repositoryPath, input.output_root)) {
      return { status: 'BLOCKED', reason: 'OUTPUT_ROOT_INSIDE_CANDIDATE_WORKTREE' };
    }
    const version = git.version(repositoryPath);
    if (version.exit_code !== 0 || version.error) return { status: 'UNAVAILABLE', reason: 'GIT_UNAVAILABLE' };

    const boundaryReason = validateRequestBoundary(request, input);
    if (boundaryReason) return { status: 'BLOCKED', reason: boundaryReason };
    const candidateReason = candidateGuard(request, input, git);
    if (candidateReason) return { status: 'BLOCKED', reason: candidateReason };

    const finalDirectory = path.join(input.output_root, input.interface_id);
    const archivePath = `${finalDirectory}.tar`;
    const promptPath = `${finalDirectory}.review-prompt.md`;
    if (fs.existsSync(finalDirectory) || fs.existsSync(archivePath) || fs.existsSync(promptPath)) {
      return { status: 'BLOCKED', reason: 'REVIEW_INTERFACE_IDENTITY_ALREADY_EXISTS' };
    }
    return { status: 'READY' };
  }

  async function execute(request) {
    const input = MaterializeFrozenReviewInterfaceInput.parse(request.input);
    const repositoryPath = request.context.worktree?.location || request.context.repository.location;
    const finalDirectory = path.join(input.output_root, input.interface_id);
    const archivePath = `${finalDirectory}.tar`;
    const promptPath = `${finalDirectory}.review-prompt.md`;
    const stagingDirectory = path.join(input.output_root, `.${input.interface_id}.${request.execution_attempt_id}.staging`);
    const archiveTemporary = `${archivePath}.${request.execution_attempt_id}.tmp`;
    const promptTemporary = `${promptPath}.${request.execution_attempt_id}.tmp`;

    const recheck = await preflight(request);
    if (recheck.status !== 'READY') {
      return receipt(request, { status: 'FAIL', effectState: 'NONE', reason: `PRECONDITION_CHANGED_AFTER_PREFLIGHT:${recheck.reason}` });
    }

    try {
      fs.mkdirSync(stagingDirectory, { recursive: false });

      const artifacts = [input.review_instance.review_request, ...input.review_instance.required_evidence_specification];
      const entries = new Map();
      const provenance = [];
      for (const artifact of artifacts) {
        const data = materializeArtifact(repositoryPath, artifact, git);
        entries.set(artifact.package_path, data);
        provenance.push({
          id: artifact.id,
          package_path: artifact.package_path,
          source_kind: artifact.kind,
          source_identity: artifact.kind === 'FILE'
            ? { sha256: artifact.sha256, reference_id: artifact.reference_id || null }
            : artifact.kind === 'GIT_BLOB'
              ? { revision: artifact.revision, repository_path: artifact.repository_path, git_oid: artifact.git_oid }
              : { parent: artifact.parent, commit: artifact.commit },
          sha256: sha256(data),
          size: data.length,
        });
      }

      const reviewInstanceBytes = jsonBytes(input.review_instance);
      entries.set('review-instance.json', reviewInstanceBytes);
      provenance.push({
        id: 'resolved-review-instance',
        package_path: 'review-instance.json',
        source_kind: 'CALLER_SUPPLIED_REVIEW_INSTANCE',
        source_identity: { protocol_ref: input.review_instance.authority_and_scope.protocol_ref },
        sha256: sha256(reviewInstanceBytes),
        size: reviewInstanceBytes.length,
      });

      const manifest = {
        schema_version: 'tecnotron-frozen-review-interface-manifest/v0',
        interface_id: input.interface_id,
        TaskCycle: input.review_instance.TaskCycle,
        responsibility: input.review_instance.responsibility,
        exact_subject: input.review_instance.exact_subject,
        protocol_ref: input.review_instance.authority_and_scope.protocol_ref,
        entries: provenance.sort((left, right) => left.package_path.localeCompare(right.package_path, 'en')),
      };
      const manifestBytes = jsonBytes(manifest);
      entries.set('manifest.json', manifestBytes);

      for (const [packagePath, data] of entries) {
        const destination = path.join(stagingDirectory, ...packagePath.split('/'));
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, data, { flag: 'wx' });
      }

      const archive = createTar(entries);
      fs.writeFileSync(archiveTemporary, archive, { flag: 'wx' });
      const reopenedMembers = verifyArchive(entries, fs.readFileSync(archiveTemporary));
      const archiveHash = sha256(archive);
      const manifestHash = sha256(manifestBytes);
      const subjectHash = sha256(jsonBytes(input.review_instance.exact_subject));
      let promptBytes = null;
      if (input.render_review_prompt) {
        promptBytes = renderReviewPrompt({
          interfaceId: input.interface_id,
          TaskCycle: input.review_instance.TaskCycle,
          responsibility: input.review_instance.responsibility,
          archiveFilename: path.basename(archivePath),
          archiveSha256: archiveHash,
          archiveSize: archive.length,
          archiveEntryCount: reopenedMembers.size,
          manifestSha256: manifestHash,
          exactSubject: input.review_instance.exact_subject,
        });
        fs.writeFileSync(promptTemporary, promptBytes, { flag: 'wx' });
      }

      const boundaryReason = validateRequestBoundary(request, input);
      if (boundaryReason) throw new Error(`SOURCE_CHANGED_DURING_MATERIALIZATION:${boundaryReason}`);
      const candidateReason = candidateGuard(request, input, git);
      if (candidateReason) throw new Error(`CANDIDATE_CHANGED_DURING_MATERIALIZATION:${candidateReason}`);

      fs.renameSync(stagingDirectory, finalDirectory);
      fs.renameSync(archiveTemporary, archivePath);
      if (promptBytes) fs.renameSync(promptTemporary, promptPath);

      const finalArchive = fs.readFileSync(archivePath);
      const finalMembers = verifyArchive(entries, finalArchive);
      if (sha256(finalArchive) !== archiveHash) throw new Error('FINAL_ARCHIVE_IDENTITY_MISMATCH');
      if (promptBytes && !fs.readFileSync(promptPath).equals(promptBytes)) throw new Error('REVIEW_PROMPT_BYTES_MISMATCH');
      const finalCandidateReason = candidateGuard(request, input, git);
      if (finalCandidateReason) throw new Error(`CANDIDATE_CHANGED_AFTER_MATERIALIZATION:${finalCandidateReason}`);

      return receipt(request, {
        status: 'PASS',
        effectState: 'CONFIRMED',
        output: {
          interface_id: input.interface_id,
          interface_directory: finalDirectory,
          archive_path: archivePath,
          archive_sha256: archiveHash,
          archive_size: finalArchive.length,
          archive_entry_count: finalMembers.size,
          manifest_sha256: manifestHash,
          declared_payload_count: provenance.length,
          candidate_correspondence: {
            ...input.review_instance.exact_subject,
            unchanged: true,
          },
          ...(promptBytes ? {
            review_prompt: {
              path: promptPath,
              sha256: sha256(promptBytes),
              size: promptBytes.length,
              archive_sha256: archiveHash,
              manifest_sha256: manifestHash,
              exact_subject_sha256: subjectHash,
            },
          } : {}),
        },
        resultRefs: [
          { kind: 'ARTIFACT', id: `review-interface:${input.interface_id}`, sha256: archiveHash },
          { kind: 'ARTIFACT', id: `review-interface-manifest:${input.interface_id}`, sha256: manifestHash },
          { kind: 'GIT_OBJECT', id: `review-subject:${input.interface_id}`, git_oid: subjectCommit(input.review_instance.exact_subject) },
          ...(promptBytes ? [{ kind: 'ARTIFACT', id: `review-prompt:${input.interface_id}`, sha256: sha256(promptBytes) }] : []),
        ],
      });
    } catch (error) {
      const finalExists = fs.existsSync(finalDirectory) || fs.existsSync(archivePath) || fs.existsSync(promptPath);
      if (!finalExists) {
        fs.rmSync(stagingDirectory, { recursive: true, force: true });
        fs.rmSync(archiveTemporary, { force: true });
        fs.rmSync(promptTemporary, { force: true });
      }
      return receipt(request, {
        status: finalExists ? 'UNKNOWN' : 'FAIL',
        effectState: finalExists ? 'UNKNOWN' : 'NONE',
        reason: `REVIEW_INTERFACE_MATERIALIZATION_FAILED:${error.message || String(error)}`,
      });
    }
  }

  return { definition, effectsForInput, preflight, execute };
}

module.exports = {
  ArtifactSpecification,
  MaterializeFrozenReviewInterfaceInput,
  PackagePath,
  RepositoryPath,
  createMaterializeFrozenReviewInterfaceRecipe,
  createReviewGitAdapter,
  createTar,
  effectsForInput,
  readTar,
  renderReviewPrompt,
  verifyArchive,
};
