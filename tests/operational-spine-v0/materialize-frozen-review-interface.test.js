'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  MaterializeFrozenReviewInterfaceInput,
  PackagePath,
  RepositoryPath,
  createMaterializeFrozenReviewInterfaceRecipe,
  createReviewGitAdapter,
  createTar,
  readTar,
  renderReviewPrompt,
  verifyArchive,
} = require('../../src/operational-spine-v0/recipes/materialize-frozen-review-interface');
const { RecipeRegistry } = require('../../src/operational-spine-v0/recipe-registry');

const authorityRef = {
  kind: 'AUTHORITY',
  id: 'DEV-AUTH-FREEZE-001',
};

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function gitBytes(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: null,
    shell: false,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr?.toString('utf8') || ''}`);
  return result.stdout;
}

function fixture(t, { candidatePath = 'candidate.txt' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnotron-review-interface-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  const evidence = path.join(root, 'evidence');
  const output = path.join(root, 'interfaces');
  fs.mkdirSync(repo);
  fs.mkdirSync(evidence);
  fs.mkdirSync(output);
  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['checkout', '-b', 'tools']);
  fs.writeFileSync(path.join(repo, 'base.txt'), 'base\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'base']);
  const parent = git(repo, ['rev-parse', 'HEAD']);
  git(repo, ['checkout', '-b', 'candidate']);
  fs.writeFileSync(path.join(repo, candidatePath), 'candidate\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'candidate']);
  const commit = git(repo, ['rev-parse', 'HEAD']);
  const tree = git(repo, ['rev-parse', 'HEAD^{tree}']);
  const blob = git(repo, ['rev-parse', `HEAD:${candidatePath}`]);

  const reviewRequest = path.join(evidence, 'review-request.md');
  const validation = path.join(evidence, 'validation.json');
  fs.writeFileSync(reviewRequest, '# Independent Review Request\n\nAssess only the supplied responsibility.\n');
  fs.writeFileSync(validation, '{"status":"PASS","coverage":"focused"}\n');
  return {
    root,
    repo,
    output,
    reviewRequest,
    validation,
    parent,
    commit,
    tree,
    blob,
    candidatePath,
  };
}

function rangeFixture(t) {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, 'range-second.txt'), 'second range commit\n');
  git(f.repo, ['add', '.']);
  git(f.repo, ['commit', '-m', 'second range commit']);
  const acceptedTip = git(f.repo, ['rev-parse', 'HEAD']);
  return {
    ...f,
    acceptedTip,
    acceptedTipParent: git(f.repo, ['rev-parse', 'HEAD^1']),
    acceptedTipTree: git(f.repo, ['rev-parse', 'HEAD^{tree}']),
    orderedCommitRange: git(f.repo, ['rev-list', '--reverse', '--topo-order', `${f.parent}..${acceptedTip}`]).split(/\r?\n/),
    changedPaths: ['candidate.txt', 'range-second.txt'],
  };
}

function rangeSubject(f) {
  return {
    integration_range_base: f.parent,
    accepted_tip: f.acceptedTip,
    accepted_tip_parent: f.acceptedTipParent,
    accepted_tip_tree: f.acceptedTipTree,
    ordered_commit_range: f.orderedCommitRange,
    commit_count: f.orderedCommitRange.length,
    changed_paths: f.changedPaths,
  };
}

function mergedRangeFixture(t) {
  const f = rangeFixture(t);
  git(f.repo, ['checkout', '-b', 'range-feature', f.commit]);
  fs.writeFileSync(path.join(f.repo, 'range-feature.txt'), 'feature range commit\n');
  git(f.repo, ['add', '.']);
  git(f.repo, ['commit', '-m', 'feature range commit']);
  git(f.repo, ['checkout', 'candidate']);
  git(f.repo, ['merge', '--no-ff', '--no-edit', 'range-feature']);
  const acceptedTip = git(f.repo, ['rev-parse', 'HEAD']);
  return {
    ...f,
    acceptedTip,
    acceptedTipParent: git(f.repo, ['rev-parse', 'HEAD^1']),
    acceptedTipTree: git(f.repo, ['rev-parse', 'HEAD^{tree}']),
    orderedCommitRange: git(f.repo, ['rev-list', '--reverse', '--topo-order', `${f.parent}..${acceptedTip}`]).split(/\r?\n/),
    changedPaths: ['candidate.txt', 'range-feature.txt', 'range-second.txt'],
  };
}

function request(f, {
  interfaceId = 'REVIEW-INTERFACE-001',
  attemptId = 'ATTEMPT-001',
  exactSubject = null,
  renderPrompt = false,
  input = {},
  authorization = null,
  evidenceRefs = null,
} = {}) {
  const validationHash = sha256(fs.readFileSync(f.validation));
  const reviewHash = sha256(fs.readFileSync(f.reviewRequest));
  const evidenceRef = {
    kind: 'EVIDENCE',
    id: 'VALIDATION-001',
    location: 'validation.json',
    sha256: validationHash,
  };
  const subject = exactSubject || {
    parent: f.parent,
    commit: f.commit,
    tree: f.tree,
    changed_paths: [f.candidatePath],
  };
  const subjectCommit = subject.accepted_tip || subject.commit;
  const subjectBase = subject.integration_range_base || subject.parent;
  const resolvedInput = {
    interface_id: interfaceId,
    output_root: f.output,
    ...(renderPrompt ? { render_review_prompt: true } : {}),
    review_instance: {
      TaskCycle: 'TASKCYCLE-REVIEW-001',
      responsibility: 'MATURE_EXISTING_FREEZE_REVIEW_INTERFACE_RESPONSIBILITY',
      exact_subject: subject,
      review_request: {
        id: 'review-request',
        kind: 'FILE',
        source_path: f.reviewRequest,
        package_path: 'review/request.md',
        sha256: reviewHash,
      },
      required_evidence_specification: [
        {
          id: 'validation-evidence',
          kind: 'FILE',
          source_path: f.validation,
          package_path: 'evidence/validation.json',
          sha256: validationHash,
          reference_id: evidenceRef.id,
        },
        {
          id: 'candidate-source',
          kind: 'GIT_BLOB',
          revision: subjectCommit,
          repository_path: f.candidatePath,
          package_path: 'candidate/candidate.txt',
          git_oid: f.blob,
        },
        {
          id: 'candidate-diff',
          kind: 'GIT_DIFF',
          parent: subjectBase,
          commit: subjectCommit,
          package_path: 'candidate/candidate.diff',
        },
      ],
      validation_evidence_refs: [evidenceRef],
      authority_and_scope: {
        protocol_ref: 'tecnotron-independent-review-protocol/v1',
        authority_refs: [authorityRef],
        scope: {
          include: ['materialize exact frozen review interface'],
          exclude: ['Independent Review verdict', 'Developer acceptance'],
        },
      },
    },
    ...input,
  };
  const scope = path.join(f.output, interfaceId).replaceAll('\\', '/');
  return {
    recipe_id: 'materialize_frozen_review_interface',
    recipe_version: 'v0',
    operation_id: 'OP-REVIEW-001',
    execution_attempt_id: attemptId,
    context: {
      schema_version: 'tecnotron-execution-context/v0',
      operation_id: 'OP-REVIEW-001',
      taskcycle_id: 'TASKCYCLE-REVIEW-001',
      repository: { identity: 'fixture', location: f.repo },
      worktree: { identity: 'candidate', location: f.repo },
      git: { expected_ref: 'refs/heads/candidate', expected_commit: subjectCommit },
      runtime: { executor: 'test', platform: process.platform, runtime_identity: process.version },
      state_store: { reference: 'fixture-state' },
      authority_refs: [authorityRef],
      evidence_refs: [evidenceRef],
    },
    authorization: authorization || {
      disposition: 'AUTHORIZED',
      authority_reference: authorityRef.id,
      effect_constraints: [{ effect: 'review_interface.write', scope }],
    },
    evidence_refs: evidenceRefs || [evidenceRef],
    input: resolvedInput,
  };
}

test('caller must supply the complete exact semantic review interface', t => {
  const f = fixture(t);
  const complete = request(f).input;
  assert.doesNotThrow(() => MaterializeFrozenReviewInterfaceInput.parse(complete));
  assert.throws(() => MaterializeFrozenReviewInterfaceInput.parse({
    ...complete,
    review_instance: { ...complete.review_instance, review_request: undefined },
  }));
  assert.throws(() => MaterializeFrozenReviewInterfaceInput.parse({
    ...complete,
    review_instance: { ...complete.review_instance, invented_semantic_evidence: [] },
  }));
});

test('RepositoryPath accepts safe dot-prefixed Git paths and rejects traversal or non-POSIX paths', () => {
  const accepted = [
    '.gitattributes',
    '.gitignore',
    '.github/workflows/test.yml',
    '.opencode/agents/reviewer.md',
    'src/example.js',
  ];
  const rejected = ['.', '..', '../foo', './foo', 'foo/../bar', '/foo', 'foo\\bar'];

  for (const value of accepted) assert.equal(RepositoryPath.safeParse(value).success, true, value);
  for (const value of rejected) assert.equal(RepositoryPath.safeParse(value).success, false, value);
});

test('PackagePath preserves the existing review-package member boundary', () => {
  const accepted = ['candidate/file.txt', 'evidence/validation.json', 'review-instance.json'];
  const rejected = [
    '.gitattributes',
    '.gitignore',
    '.github/workflows/test.yml',
    '.opencode/agents/reviewer.md',
    '.',
    '..',
    '../foo',
    './foo',
    'foo/../bar',
    '/foo',
    'foo\\bar',
  ];

  for (const value of accepted) assert.equal(PackagePath.safeParse(value).success, true, value);
  for (const value of rejected) assert.equal(PackagePath.safeParse(value).success, false, value);
});

test('materializes exact bytes, verifies archive and manifest, and preserves candidate identity', async t => {
  const f = fixture(t);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const req = request(f);
  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const before = git(f.repo, ['rev-parse', 'HEAD']);
  const receipt = await recipe.execute(req);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'CONFIRMED');
  assert.equal(receipt.output.candidate_correspondence.unchanged, true);
  assert.equal(git(f.repo, ['rev-parse', 'HEAD']), before);
  assert.equal(git(f.repo, ['status', '--porcelain=v1', '--untracked-files=all']), '');

  const archive = fs.readFileSync(receipt.output.archive_path);
  assert.equal(sha256(archive), receipt.output.archive_sha256);
  const members = readTar(archive);
  assert.equal(members.size, receipt.output.archive_entry_count);
  assert.equal(members.get('candidate/candidate.txt').toString('utf8'), 'candidate\n');
  assert.equal(members.get('evidence/validation.json').equals(fs.readFileSync(f.validation)), true);
  const manifest = JSON.parse(members.get('manifest.json').toString('utf8'));
  assert.equal(manifest.exact_subject.commit, f.commit);
  assert.equal(manifest.entries.length, receipt.output.declared_payload_count);
  for (const entry of manifest.entries) {
    assert.equal(sha256(members.get(entry.package_path)), entry.sha256);
    assert.equal(members.get(entry.package_path).length, entry.size);
  }
  assert.equal(Object.hasOwn(receipt.output, 'verdict'), false);
  assert.equal(Object.hasOwn(receipt.output, 'developer_acceptance'), false);
});

test('materializes an exact first-parent linear range and its base-to-tip diff without candidate mutation', async t => {
  const f = rangeFixture(t);
  const subject = rangeSubject(f);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const req = request(f, { exactSubject: subject, interfaceId: 'REVIEW-RANGE-001' });

  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const before = git(f.repo, ['rev-parse', 'HEAD']);
  const receipt = await recipe.execute(req);

  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'CONFIRMED');
  assert.deepEqual(receipt.output.candidate_correspondence, { ...subject, unchanged: true });
  assert.equal(git(f.repo, ['rev-parse', 'HEAD']), before);
  assert.equal(git(f.repo, ['status', '--porcelain=v1', '--untracked-files=all']), '');

  const members = readTar(fs.readFileSync(receipt.output.archive_path));
  const manifest = JSON.parse(members.get('manifest.json').toString('utf8'));
  assert.deepEqual(manifest.exact_subject, subject);
  assert.equal(
    members.get('candidate/candidate.diff').equals(gitBytes(f.repo, [
      'diff', '--binary', '--full-index', '--no-ext-diff', '--no-renames',
      subject.integration_range_base, subject.accepted_tip, '--',
    ])),
    true,
  );
});

test('exact linear ranges fail closed on every declared identity and topology mismatch', async t => {
  const cases = [
    {
      name: 'wrong base',
      reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH',
      mutateSubject(subject, f) { subject.integration_range_base = f.commit; },
    },
    {
      name: 'wrong tip',
      reason: 'CANDIDATE_REF_MISMATCH',
      mutateSubject(subject) { subject.accepted_tip = 'f'.repeat(40); },
    },
    {
      name: 'wrong tip parent',
      reason: 'CANDIDATE_PARENT_MISMATCH',
      mutateSubject(subject, f) { subject.accepted_tip_parent = f.parent; },
    },
    {
      name: 'wrong tip tree',
      reason: 'CANDIDATE_TREE_MISMATCH',
      mutateSubject(subject) { subject.accepted_tip_tree = 'f'.repeat(40); },
    },
    {
      name: 'wrong order',
      reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH',
      mutateSubject(subject) { subject.ordered_commit_range.reverse(); },
    },
    {
      name: 'wrong commit count',
      reason: 'ACCEPTED_RANGE_COMMIT_COUNT_MISMATCH',
      mutateSubject(subject) { subject.commit_count += 1; },
    },
    {
      name: 'duplicate commit',
      reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH',
      mutateSubject(subject) {
        subject.ordered_commit_range = [subject.ordered_commit_range[0], ...subject.ordered_commit_range];
        subject.commit_count += 1;
      },
    },
    {
      name: 'non-linear declared history',
      reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH',
      mutateSubject(subject, f) { subject.ordered_commit_range[0] = f.parent; },
    },
    {
      name: 'changed paths mismatch',
      reason: 'ACCEPTED_RANGE_CHANGED_PATHS_MISMATCH',
      mutateSubject(subject) { subject.changed_paths = ['base.txt']; },
    },
    {
      name: 'candidate ref is not the tip',
      reason: 'CANDIDATE_REF_MISMATCH',
      mutateRequest(req) { req.context.git.expected_ref = 'refs/heads/tools'; },
    },
    {
      name: 'execution context commit is not the tip',
      reason: 'EXECUTION_CONTEXT_GIT_MISMATCH',
      mutateRequest(req, f) { req.context.git.expected_commit = f.commit; },
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async st => {
      const f = rangeFixture(st);
      const subject = structuredClone(rangeSubject(f));
      testCase.mutateSubject?.(subject, f);
      const req = request(f, { exactSubject: subject });
      testCase.mutateRequest?.(req, f);
      assert.deepEqual(await createMaterializeFrozenReviewInterfaceRecipe().preflight(req), {
        status: 'BLOCKED',
        reason: testCase.reason,
      });
      assert.deepEqual(fs.readdirSync(f.output), []);
    });
  }
});

test('exact range rejects a hidden merge before materializing any interface', async t => {
  const f = mergedRangeFixture(t);
  const req = request(f, { exactSubject: rangeSubject(f), interfaceId: 'REVIEW-MERGE-001' });
  assert.deepEqual(await createMaterializeFrozenReviewInterfaceRecipe().preflight(req), {
    status: 'BLOCKED',
    reason: 'ACCEPTED_RANGE_HIDDEN_MERGE_OR_NON_LINEAR',
  });
  assert.deepEqual(fs.readdirSync(f.output), []);
});

test('renders a deterministic external reviewer prompt bound to archive, manifest, and exact subject', async t => {
  const f = rangeFixture(t);
  const subject = rangeSubject(f);
  const req = request(f, {
    exactSubject: subject,
    interfaceId: 'REVIEW-RANGE-PROMPT-001',
    renderPrompt: true,
  });
  const receipt = await createMaterializeFrozenReviewInterfaceRecipe().execute(req);

  assert.equal(receipt.status, 'PASS');
  const prompt = fs.readFileSync(receipt.output.review_prompt.path);
  const promptText = prompt.toString('utf8');
  const archive = fs.readFileSync(receipt.output.archive_path);
  const members = readTar(archive);
  const renderArguments = {
    interfaceId: req.input.interface_id,
    TaskCycle: req.input.review_instance.TaskCycle,
    responsibility: req.input.review_instance.responsibility,
    archiveFilename: path.basename(receipt.output.archive_path),
    archiveSha256: receipt.output.archive_sha256,
    archiveSize: receipt.output.archive_size,
    archiveEntryCount: receipt.output.archive_entry_count,
    manifestSha256: receipt.output.manifest_sha256,
    exactSubject: subject,
  };

  assert.equal(sha256(prompt), receipt.output.review_prompt.sha256);
  assert.equal(prompt.length, receipt.output.review_prompt.size);
  assert.equal(receipt.output.review_prompt.archive_sha256, sha256(archive));
  assert.equal(receipt.output.review_prompt.manifest_sha256, sha256(members.get('manifest.json')));
  assert.equal(receipt.output.review_prompt.exact_subject_sha256, sha256(Buffer.from(`${JSON.stringify(subject, Object.keys(subject).sort(), 2)}\n`)));
  assert.equal(prompt.equals(renderReviewPrompt(renderArguments)), true);
  assert.equal(renderReviewPrompt(renderArguments).equals(renderReviewPrompt(renderArguments)), true);
  assert.match(promptText, /REVIEW-RANGE-PROMPT-001/);
  assert.match(promptText, new RegExp(receipt.output.archive_sha256));
  assert.match(promptText, new RegExp(receipt.output.manifest_sha256));
  assert.match(promptText, new RegExp(subject.integration_range_base));
  assert.match(promptText, new RegExp(subject.accepted_tip));
  assert.match(promptText, /complete input boundary/);
  assert.match(promptText, /review read-only/);
  assert.match(promptText, /`PASS`, `FAIL`, or `BLOCKED`/);
  assert.match(promptText, /`PASS` is not Developer acceptance/);
  assert.match(promptText, /candidate mutation, Phase 2, integration, publication, or lifecycle close/);
  assert.doesNotMatch(promptText, /(?:verdict|result)\s*:\s*(?:PASS|FAIL|BLOCKED)/i);
  assert.doesNotMatch(promptText, /Developer acceptance\s*:\s*(?:GRANTED|PASS)/i);
  assert.equal([...members.keys()].some(name => name.includes('review-prompt')), false);
  assert.equal(receipt.result_refs.some(ref => ref.id === 'review-prompt:REVIEW-RANGE-PROMPT-001' && ref.sha256 === sha256(prompt)), true);
});

test('preflights and materializes an exact candidate changing only a dot-prefixed repository path', async t => {
  const f = fixture(t, { candidatePath: '.gitattributes' });
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const req = request(f, { interfaceId: 'REVIEW-DOTFILE-001' });

  assert.deepEqual(req.input.review_instance.exact_subject.changed_paths, ['.gitattributes']);
  assert.deepEqual(await recipe.preflight(req), { status: 'READY' });
  const receipt = await recipe.execute(req);

  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effect_state, 'CONFIRMED');
  assert.deepEqual(receipt.output.candidate_correspondence.changed_paths, ['.gitattributes']);
  assert.equal(readTar(fs.readFileSync(receipt.output.archive_path)).get('candidate/candidate.txt').toString('utf8'), 'candidate\n');
  assert.equal(git(f.repo, ['status', '--porcelain=v1', '--untracked-files=all']), '');
});

test('candidate identity, changed paths, state, and context mismatches fail closed before effect', async t => {
  const f = fixture(t);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const wrongTree = request(f);
  wrongTree.input.review_instance.exact_subject.tree = 'f'.repeat(40);
  assert.equal((await recipe.preflight(wrongTree)).reason, 'CANDIDATE_TREE_MISMATCH');

  const wrongPaths = request(f);
  wrongPaths.input.review_instance.exact_subject.changed_paths = ['base.txt'];
  assert.equal((await recipe.preflight(wrongPaths)).reason, 'CANDIDATE_CHANGED_PATHS_MISMATCH');

  fs.writeFileSync(path.join(f.repo, 'unexpected.txt'), 'unexpected\n');
  assert.equal((await recipe.preflight(request(f))).reason, 'CANDIDATE_WORKTREE_NOT_FROZEN');
  assert.deepEqual(fs.readdirSync(f.output), []);
});

test('output root cannot alias or mutate the candidate worktree', async t => {
  const f = fixture(t);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const req = request(f);
  req.input.output_root = f.repo;
  req.authorization.effect_constraints[0].scope = path.join(f.repo, req.input.interface_id).replaceAll('\\', '/');
  assert.equal((await recipe.preflight(req)).reason, 'OUTPUT_ROOT_INSIDE_CANDIDATE_WORKTREE');
  assert.equal(git(f.repo, ['status', '--porcelain=v1', '--untracked-files=all']), '');
});

test('candidate mutation observed during materialization fails without publishing an interface', async t => {
  const f = fixture(t);
  const actualGit = createReviewGitAdapter();
  let statusReads = 0;
  const recipe = createMaterializeFrozenReviewInterfaceRecipe({
    git: {
      ...actualGit,
      status(repositoryPath) {
        statusReads += 1;
        if (statusReads === 1) return actualGit.status(repositoryPath);
        return { exit_code: 0, signal: null, error: null, stdout: ' M candidate.txt\n', stderr: '' };
      },
    },
  });
  const receipt = await recipe.execute(request(f));
  assert.equal(receipt.status, 'FAIL');
  assert.equal(receipt.effect_state, 'NONE');
  assert.match(receipt.reason, /CANDIDATE_CHANGED_DURING_MATERIALIZATION:CANDIDATE_WORKTREE_NOT_FROZEN/);
  assert.equal(fs.existsSync(path.join(f.output, 'REVIEW-INTERFACE-001')), false);
  assert.equal(fs.existsSync(path.join(f.output, 'REVIEW-INTERFACE-001.tar')), false);
});

test('missing, stale, or undeclared evidence fails closed and is never invented', async t => {
  const f = fixture(t);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const missingRef = request(f, { evidenceRefs: [{ kind: 'EVIDENCE', id: 'OTHER' }] });
  assert.equal((await recipe.preflight(missingRef)).reason, 'VALIDATION_EVIDENCE_REFERENCE_NOT_SUPPLIED:VALIDATION-001');

  const staleBytes = request(f);
  fs.writeFileSync(f.validation, '{"status":"FAIL"}\n');
  assert.equal((await recipe.preflight(staleBytes)).reason, 'DECLARED_ARTIFACT_HASH_MISMATCH:validation-evidence');
  assert.deepEqual(fs.readdirSync(f.output), []);
});

test('authorization is bound to the exact requested output identity', async t => {
  const f = fixture(t);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const req = request(f, {
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: authorityRef.id,
      effect_constraints: [{ effect: 'review_interface.write', scope: 'different/interface' }],
    },
  });
  assert.equal((await recipe.preflight(req)).reason, 'REVIEW_INTERFACE_WRITE_AUTHORIZATION_REQUIRED');
});

test('previous review history is immutable and a new attempt uses a distinct identity', async t => {
  const f = fixture(t);
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  const first = await recipe.execute(request(f));
  assert.equal(first.status, 'PASS');
  const firstBytes = fs.readFileSync(first.output.archive_path);

  const collision = await recipe.preflight(request(f, { attemptId: 'ATTEMPT-002' }));
  assert.deepEqual(collision, { status: 'BLOCKED', reason: 'REVIEW_INTERFACE_IDENTITY_ALREADY_EXISTS' });
  assert.equal(fs.readFileSync(first.output.archive_path).equals(firstBytes), true);

  const second = await recipe.execute(request(f, { interfaceId: 'REVIEW-INTERFACE-002', attemptId: 'ATTEMPT-002' }));
  assert.equal(second.status, 'PASS');
  assert.notEqual(first.receipt_ref, second.receipt_ref);
  assert.notEqual(first.output.archive_path, second.output.archive_path);
  assert.equal(fs.readFileSync(first.output.archive_path).equals(firstBytes), true);
});

test('archive verification fails closed on member bytes or member-count mismatch', () => {
  const expected = new Map([
    ['a.txt', Buffer.from('alpha\n')],
    ['b.txt', Buffer.from('beta\n')],
  ]);
  const archive = createTar(expected);
  assert.equal(verifyArchive(expected, archive).size, 2);

  const corrupted = Buffer.from(archive);
  corrupted[512] ^= 0xff;
  assert.throws(() => verifyArchive(expected, corrupted), /ARCHIVE_MEMBER_HASH_MISMATCH:a.txt/);

  const incomplete = createTar(new Map([['a.txt', Buffer.from('alpha\n')]]));
  assert.throws(() => verifyArchive(expected, incomplete), /ARCHIVE_MEMBER_SET_MISMATCH/);
});

test('registry resolves the new capability without disturbing adopted Recipes', t => {
  const f = fixture(t);
  const registry = new RecipeRegistry();
  const recipe = createMaterializeFrozenReviewInterfaceRecipe();
  registry.register(recipe);
  assert.deepEqual(registry.resolve(['candidate.freeze.verify', 'review_interface.materialize']), {
    resolution: 'SELECTED',
    recipe: recipe.definition,
  });
  const effects = registry.resolveEffects(recipe.definition.id, recipe.definition.version, request(f).input);
  assert.deepEqual(effects, [{
    effect: 'review_interface.write',
    scope: path.join(f.output, 'REVIEW-INTERFACE-001').replaceAll('\\', '/'),
  }]);
});
