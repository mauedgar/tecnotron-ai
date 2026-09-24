'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { z } = require('zod');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../contracts');

const GitOid = z.string().regex(/^[a-f0-9]{40,64}$/);
const BranchRef = z.string().regex(/^refs\/heads\/[A-Za-z0-9._\/-]+$/);
const GitRemoteName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

const IntegrateAcceptedCandidateInput = z.object({
  target_ref: BranchRef,
  expected_target_commit: GitOid,
  candidate_commit: GitOid,
  candidate_parent: GitOid,
  candidate_tree: GitOid.optional(),
  remote: z.object({
    remote: GitRemoteName,
    target_ref: BranchRef,
    expected_commit: GitOid,
  }).strict(),
}).strict();

function createGitCliAdapter({ command = 'git' } = {}) {
  function run(repositoryPath, args) {
    const result = spawnSync(command, args, {
      cwd: repositoryPath,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    return {
      exit_code: result.status,
      signal: result.signal || null,
      error: result.error || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  }

  function exactOutput(result) {
    return result.stdout.trim();
  }

  return {
    version(repositoryPath) {
      return run(repositoryPath, ['--version']);
    },

    status(repositoryPath) {
      return run(repositoryPath, ['status', '--porcelain=v1', '--untracked-files=all']);
    },

    revParse(repositoryPath, spec) {
      return run(repositoryPath, ['rev-parse', spec]);
    },

    symbolicRef(repositoryPath) {
      return run(repositoryPath, ['symbolic-ref', '-q', 'HEAD']);
    },

    isAncestor(repositoryPath, ancestor, descendant) {
      return run(repositoryPath, ['merge-base', '--is-ancestor', ancestor, descendant]);
    },

    rewriteRules(repositoryPath) {
      return run(repositoryPath, ['config', '--get-regexp', '^url\\..*\\.(insteadOf|pushInsteadOf)$']);
    },

    fastForwardLocal(repositoryPath, targetRef, candidateCommit, expectedTargetCommit) {
      const current = this.symbolicRef(repositoryPath);
      const currentRef = current.exit_code === 0 ? exactOutput(current) : null;

      if (currentRef === targetRef) {
        return run(repositoryPath, [
          'merge',
          '--ff-only',
          '--no-edit',
          '--no-verify',
          candidateCommit,
        ]);
      }

      return run(repositoryPath, [
        'update-ref',
        targetRef,
        candidateCommit,
        expectedTargetCommit,
      ]);
    },

    lsRemote(repositoryPath, remote, targetRef) {
      return run(repositoryPath, [
        '-c', 'http.followRedirects=false',
        'ls-remote',
        '--heads',
        remote,
        targetRef,
      ]);
    },

    pushExactRef(repositoryPath, remote, candidateCommit, targetRef) {
      return run(repositoryPath, [
        '-c', 'http.followRedirects=false',
        'push',
        '--porcelain',
        '--no-follow-tags',
        '--no-recurse-submodules',
        '--no-verify',
        remote,
        `${candidateCommit}:${targetRef}`,
      ]);
    },
  };
}

function resultText(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`.trim();
}

function exactLine(result) {
  return (result.stdout || '').trim();
}

function readRemoteOid(result) {
  if (result.exit_code !== 0) return null;
  const line = exactLine(result);
  if (!line) return null;
  const [oid] = line.split(/\s+/);
  return /^[a-f0-9]{40,64}$/.test(oid) ? oid : null;
}

function receipt(request, {
  status,
  effectState,
  reason,
  output,
  resultRefs = [],
  evidenceRefs = [],
}) {
  return RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: `recipe-receipt:${request.execution_attempt_id}:integrate-accepted-candidate`,
    recipe_id: request.recipe_id,
    recipe_version: request.recipe_version,
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    effect_state: effectState,
    ...(reason ? { reason } : {}),
    ...(output !== undefined ? { output } : {}),
    result_refs: resultRefs,
    evidence_refs: evidenceRefs,
  });
}

function createIntegrateAcceptedCandidateRecipe({ git = createGitCliAdapter() } = {}) {
  const definition = RecipeDefinition.parse({
    id: 'integrate_accepted_candidate',
    version: 'v0',
    provides: ['git.integration', 'git.remote.write'],
    required_inputs: [
      'target_ref',
      'expected_target_commit',
      'candidate_commit',
      'candidate_parent',
      'remote',
    ],
    preconditions: [
      'repository path exists',
      'worktree is clean',
      'Git URL rewrite configuration is absent',
      'target ref exactly matches expected target commit',
      'candidate commit identity is exact',
      'candidate parent exactly matches target baseline',
      'candidate tree identity matches when supplied',
      'candidate is a fast-forward descendant of target',
      'remote target exactly matches expected remote commit',
    ],
    effects: [
      { effect: 'git.integration', scope: 'exact target ref only' },
      { effect: 'git.remote.write', scope: 'exact remote target ref only' },
    ],
    postconditions: [
      'local target ref exactly equals candidate commit',
      'remote target ref exactly equals candidate commit',
      'worktree remains clean',
    ],
  });

  async function preflight(request) {
    const input = IntegrateAcceptedCandidateInput.parse(request.input);
    const repositoryPath = request.context.worktree?.location || request.context.repository.location;

    if (!fs.existsSync(repositoryPath)) {
      return { status: 'UNAVAILABLE', reason: 'REPOSITORY_LOCATION_UNAVAILABLE' };
    }

    if (!request.context.git) {
      return { status: 'BLOCKED', reason: 'EXECUTION_CONTEXT_GIT_REQUIRED' };
    }

    if (
      request.context.git.expected_ref !== input.target_ref ||
      request.context.git.expected_commit !== input.expected_target_commit
    ) {
      return { status: 'BLOCKED', reason: 'EXECUTION_CONTEXT_GIT_MISMATCH' };
    }

    if (input.remote.target_ref !== input.target_ref) {
      return { status: 'BLOCKED', reason: 'REMOTE_TARGET_REF_MISMATCH' };
    }

    if (input.remote.expected_commit !== input.expected_target_commit) {
      return { status: 'BLOCKED', reason: 'LOCAL_REMOTE_BASELINE_MISMATCH' };
    }

    if (input.candidate_parent !== input.expected_target_commit) {
      return { status: 'BLOCKED', reason: 'CANDIDATE_PARENT_NOT_TARGET_BASELINE' };
    }

    const version = git.version(repositoryPath);
    if (version.exit_code !== 0 || version.error) {
      return { status: 'UNAVAILABLE', reason: 'GIT_UNAVAILABLE' };
    }

    const rewrite = git.rewriteRules(repositoryPath);
    if (rewrite.exit_code === 0 && exactLine(rewrite) !== '') {
      return { status: 'BLOCKED', reason: 'GIT_URL_REWRITE_CONFIG_PRESENT' };
    }
    // git config --get-regexp returns 1 when there are no matches.
    if (![0, 1].includes(rewrite.exit_code)) {
      return { status: 'UNAVAILABLE', reason: 'GIT_URL_REWRITE_AUDIT_UNAVAILABLE' };
    }

    const status = git.status(repositoryPath);
    if (status.exit_code !== 0) {
      return { status: 'UNAVAILABLE', reason: 'GIT_STATUS_UNAVAILABLE' };
    }
    if (exactLine(status) !== '') {
      return { status: 'BLOCKED', reason: 'WORKTREE_NOT_CLEAN' };
    }

    const candidate = git.revParse(repositoryPath, `${input.candidate_commit}^{commit}`);
    if (candidate.exit_code !== 0 || exactLine(candidate) !== input.candidate_commit) {
      return { status: 'BLOCKED', reason: 'CANDIDATE_IDENTITY_MISMATCH' };
    }

    const parent = git.revParse(repositoryPath, `${input.candidate_commit}^1`);
    if (parent.exit_code !== 0 || exactLine(parent) !== input.candidate_parent) {
      return { status: 'BLOCKED', reason: 'CANDIDATE_PARENT_MISMATCH' };
    }

    if (input.candidate_tree) {
      const tree = git.revParse(repositoryPath, `${input.candidate_commit}^{tree}`);
      if (tree.exit_code !== 0 || exactLine(tree) !== input.candidate_tree) {
        return { status: 'BLOCKED', reason: 'CANDIDATE_TREE_MISMATCH' };
      }
    }

    const target = git.revParse(repositoryPath, `${input.target_ref}^{commit}`);
    if (target.exit_code !== 0 || exactLine(target) !== input.expected_target_commit) {
      return { status: 'BLOCKED', reason: 'TARGET_REF_DRIFT' };
    }

    const ancestor = git.isAncestor(repositoryPath, input.expected_target_commit, input.candidate_commit);
    if (ancestor.exit_code !== 0) {
      return { status: 'BLOCKED', reason: 'NON_FAST_FORWARD_CANDIDATE' };
    }

    const remote = git.lsRemote(repositoryPath, input.remote.remote, input.remote.target_ref);
    if (remote.exit_code !== 0) {
      return { status: 'UNAVAILABLE', reason: 'REMOTE_STATE_UNAVAILABLE' };
    }

    const remoteOid = readRemoteOid(remote);
    if (remoteOid !== input.remote.expected_commit) {
      return { status: 'BLOCKED', reason: 'REMOTE_TARGET_DRIFT' };
    }

    return { status: 'READY' };
  }

  async function execute(request) {
    const input = IntegrateAcceptedCandidateInput.parse(request.input);
    const repositoryPath = request.context.worktree?.location || request.context.repository.location;

    const recheck = await preflight(request);
    if (recheck.status !== 'READY') {
      return receipt(request, {
        status: 'FAIL',
        effectState: 'NONE',
        reason: `PRECONDITION_CHANGED_AFTER_PREFLIGHT:${recheck.reason}`,
      });
    }

    const local = git.fastForwardLocal(
      repositoryPath,
      input.target_ref,
      input.candidate_commit,
      input.expected_target_commit,
    );

    const localObserved = git.revParse(repositoryPath, `${input.target_ref}^{commit}`);
    const localOid = localObserved.exit_code === 0 ? exactLine(localObserved) : null;

    if (localOid !== input.candidate_commit) {
      if (localOid === input.expected_target_commit) {
        return receipt(request, {
          status: 'FAIL',
          effectState: 'NONE',
          reason: `LOCAL_FAST_FORWARD_FAILED_NO_EFFECT:${resultText(local) || 'unknown git error'}`,
        });
      }
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: 'LOCAL_FAST_FORWARD_EFFECT_AMBIGUOUS',
      });
    }

    const localResultRefs = [
      { kind: 'GIT_OBJECT', id: 'accepted-candidate', git_oid: input.candidate_commit },
      { kind: 'GIT_OBJECT', id: 'integrated-target', git_oid: input.candidate_commit },
    ];

    const cleanAfterLocal = git.status(repositoryPath);
    if (cleanAfterLocal.exit_code !== 0) {
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: 'LOCAL_FAST_FORWARD_POSTCONDITION_UNAVAILABLE',
        resultRefs: localResultRefs,
      });
    }
    if (exactLine(cleanAfterLocal) !== '') {
      return receipt(request, {
        status: 'FAIL',
        effectState: 'CONFIRMED',
        reason: 'LOCAL_FAST_FORWARD_DIRTY_WORKTREE',
        resultRefs: localResultRefs,
      });
    }

    const push = git.pushExactRef(
      repositoryPath,
      input.remote.remote,
      input.candidate_commit,
      input.remote.target_ref,
    );

    const remoteObserved = git.lsRemote(
      repositoryPath,
      input.remote.remote,
      input.remote.target_ref,
    );
    const remoteOid = readRemoteOid(remoteObserved);

    if (remoteObserved.exit_code !== 0 || remoteOid === null) {
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: 'REMOTE_PUBLICATION_EFFECT_AMBIGUOUS',
        output: { push_exit_code: push.exit_code },
        resultRefs: localResultRefs,
      });
    }

    if (remoteOid !== input.candidate_commit) {
      return receipt(request, {
        status: 'FAIL',
        effectState: 'CONFIRMED',
        reason: `REMOTE_PUBLICATION_POSTCONDITION_MISMATCH:${remoteOid}`,
        output: { push_exit_code: push.exit_code, remote_observed: remoteOid },
        resultRefs: localResultRefs,
      });
    }

    const cleanAfterRemote = git.status(repositoryPath);
    if (cleanAfterRemote.exit_code !== 0) {
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: 'FINAL_WORKTREE_STATE_UNAVAILABLE',
        resultRefs: localResultRefs,
      });
    }
    if (exactLine(cleanAfterRemote) !== '') {
      return receipt(request, {
        status: 'FAIL',
        effectState: 'CONFIRMED',
        reason: 'FINAL_WORKTREE_NOT_CLEAN',
        resultRefs: [
          ...localResultRefs,
          { kind: 'GIT_OBJECT', id: 'published-target', git_oid: input.candidate_commit },
        ],
      });
    }

    return receipt(request, {
      status: 'PASS',
      effectState: 'CONFIRMED',
      output: {
        target_ref: input.target_ref,
        remote: input.remote.remote,
        remote_target_ref: input.remote.target_ref,
        candidate_commit: input.candidate_commit,
        push_exit_code: push.exit_code,
      },
      resultRefs: [
        ...localResultRefs,
        { kind: 'GIT_OBJECT', id: 'published-target', git_oid: input.candidate_commit },
      ],
    });
  }

  return { definition, preflight, execute };
}

module.exports = {
  IntegrateAcceptedCandidateInput,
  GitRemoteName,
  createGitCliAdapter,
  createIntegrateAcceptedCandidateRecipe,
  readRemoteOid,
};
