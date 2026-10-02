'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const {
  GitExecutionQualificationRequest,
  GitExecutionQualificationResult,
} = require('./invocation-contracts');
const {
  IntegrateAcceptedCandidateInput,
} = require('./recipes/integrate-accepted-candidate');

function createGitCliAdapter({
  command = 'git',
  spawn = spawnSync,
  env = process.env,
} = {}) {
  return {
    run(repositoryPath, args, {
      safeDirectory = false,
      timeoutMs = 5000,
    } = {}) {
      const effectiveArgs = safeDirectory
        ? ['-c', `safe.directory=${repositoryPath}`, ...args]
        : args;
      const result = spawn(command, effectiveArgs, {
        cwd: repositoryPath,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        env: {
          ...env,
          GIT_TERMINAL_PROMPT: '0',
          GCM_INTERACTIVE: 'Never',
        },
      });
      return {
        exit_code: result.status,
        signal: result.signal || null,
        error_code: result.error?.code || null,
        timed_out: result.error?.code === 'ETIMEDOUT',
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      };
    },
  };
}

function exactOutput(result) {
  return (result.stdout || '').trim();
}

function diagnostics(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function safeDirectoryFailure(result) {
  return /dubious ownership|safe\.directory/i.test(diagnostics(result));
}

function gitUnavailable(result) {
  return result.error_code === 'ENOENT';
}

function evidenceFor(request, {
  qualificationMethod = 'DIRECT',
  observedRef = null,
  observedCommit = null,
  remoteStatus = 'NOT_ATTEMPTED',
  remoteCommit = null,
} = {}) {
  return {
    repository: {
      identity: request.repository.identity,
      location: request.repository.location,
      observed_ref: observedRef,
      observed_commit: observedCommit,
    },
    remote: request.remote
      ? {
          name_or_declared_identity: request.remote.name,
          target_ref: request.remote.target_ref,
          observation_status: remoteStatus,
          observed_commit: remoteCommit,
        }
      : null,
    surface: {
      id: request.surface_id,
      qualification_method: qualificationMethod,
    },
    mutations: {
      repository: 'NONE',
      remote: 'NONE',
      persistent_global_git_config: 'NONE',
    },
  };
}

function qualificationResult(request, status, reason, evidence) {
  return GitExecutionQualificationResult.parse({
    schema_version: 'tecnotron-git-execution-qualification-result/v0',
    status,
    ...(reason ? { reason } : {}),
    evidence: evidence || evidenceFor(request),
  });
}

function commandFailure(request, result, reason, evidence) {
  if (result.timed_out) {
    return qualificationResult(request, 'UNAVAILABLE', 'LOCAL_GIT_OBSERVATION_TIMEOUT', evidence);
  }
  if (gitUnavailable(result)) {
    return qualificationResult(request, 'UNAVAILABLE', 'GIT_EXECUTABLE_UNAVAILABLE', evidence);
  }
  return qualificationResult(request, 'BLOCKED', reason, evidence);
}

function observeLocal(git, request, safeDirectory) {
  const options = {
    safeDirectory,
    timeoutMs: Math.min(request.remote_timeout_ms, 5000),
  };

  const repository = git.run(request.repository.location, ['rev-parse', '--is-inside-work-tree'], options);
  if (repository.exit_code !== 0 || repository.error_code) {
    return { ok: false, command: repository, reason: 'GIT_REPOSITORY_NOT_COMPETENT' };
  }
  if (exactOutput(repository) !== 'true') {
    return { ok: false, command: repository, reason: 'GIT_REPOSITORY_NOT_COMPETENT' };
  }

  const ref = git.run(request.repository.location, ['symbolic-ref', '--quiet', 'HEAD'], options);
  if (ref.exit_code !== 0 || ref.error_code) {
    return { ok: false, command: ref, reason: 'EXPECTED_REF_NOT_OBSERVABLE' };
  }

  const observedRef = exactOutput(ref);
  const commit = git.run(request.repository.location, ['rev-parse', 'HEAD^{commit}'], options);
  if (commit.exit_code !== 0 || commit.error_code) {
    return { ok: false, command: commit, reason: 'EXPECTED_COMMIT_NOT_OBSERVABLE', observedRef };
  }

  const observedCommit = exactOutput(commit);
  const declaredRef = git.run(
    request.repository.location,
    ['rev-parse', `${request.expected_ref}^{commit}`],
    options,
  );
  if (declaredRef.exit_code !== 0 || declaredRef.error_code) {
    return {
      ok: false,
      command: declaredRef,
      reason: 'DECLARED_REF_NOT_OBSERVABLE',
      observedRef,
      observedCommit,
    };
  }

  const declaredCommit = exactOutput(declaredRef);
  if (observedRef !== request.expected_ref) {
    return {
      ok: false,
      mismatch: true,
      reason: 'EXPECTED_REF_MISMATCH',
      observedRef,
      observedCommit,
    };
  }
  if (observedCommit !== request.expected_commit || declaredCommit !== request.expected_commit) {
    return {
      ok: false,
      mismatch: true,
      reason: 'EXPECTED_COMMIT_MISMATCH',
      observedRef,
      observedCommit,
    };
  }

  return { ok: true, observedRef, observedCommit };
}

function parseRemoteOid(result, targetRef) {
  const matches = exactOutput(result)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === targetRef);
  if (matches.length !== 1) return { status: 'MALFORMED', oid: null };
  const oid = matches[0][0];
  if (!/^[a-f0-9]{40,64}$/.test(oid)) return { status: 'MALFORMED', oid: null };
  return { status: 'READY', oid };
}

function qualifyGitExecutionSurface(rawRequest, {
  git = createGitCliAdapter(),
  exists = fs.existsSync,
} = {}) {
  const request = GitExecutionQualificationRequest.parse(rawRequest);
  if (!exists(request.repository.location)) {
    return qualificationResult(
      request,
      'UNAVAILABLE',
      'REPOSITORY_LOCATION_UNAVAILABLE',
      evidenceFor(request),
    );
  }

  let safeDirectory = false;
  let local = observeLocal(git, request, false);

  if (!local.ok && local.command && safeDirectoryFailure(local.command)) {
    safeDirectory = true;
    local = observeLocal(git, request, true);
  }

  const qualificationMethod = safeDirectory
    ? 'PROCESS_LOCAL_SAFE_DIRECTORY'
    : 'DIRECT';
  const localEvidence = evidenceFor(request, {
    qualificationMethod,
    observedRef: local.observedRef || null,
    observedCommit: local.observedCommit || null,
  });

  if (!local.ok) {
    if (local.command && safeDirectory && safeDirectoryFailure(local.command)) {
      return qualificationResult(
        request,
        'BLOCKED',
        'PROCESS_LOCAL_SAFE_DIRECTORY_ADAPTATION_FAILED',
        localEvidence,
      );
    }
    if (local.command) {
      return commandFailure(request, local.command, local.reason, localEvidence);
    }
    return qualificationResult(request, 'BLOCKED', local.reason, localEvidence);
  }

  if (!request.remote) {
    return qualificationResult(request, 'READY', null, localEvidence);
  }

  const remote = git.run(
    request.repository.location,
    [
      '-c', 'http.followRedirects=false',
      'ls-remote',
      '--exit-code',
      '--heads',
      request.remote.name,
      request.remote.target_ref,
    ],
    {
      safeDirectory,
      timeoutMs: request.remote_timeout_ms,
    },
  );

  const remoteBase = {
    qualificationMethod,
    observedRef: local.observedRef,
    observedCommit: local.observedCommit,
  };

  if (remote.timed_out) {
    return qualificationResult(
      request,
      'UNAVAILABLE',
      'REMOTE_OBSERVATION_TIMEOUT',
      evidenceFor(request, { ...remoteBase, remoteStatus: 'UNAVAILABLE' }),
    );
  }
  if (gitUnavailable(remote)) {
    return qualificationResult(
      request,
      'UNAVAILABLE',
      'GIT_EXECUTABLE_UNAVAILABLE',
      evidenceFor(request, { ...remoteBase, remoteStatus: 'UNAVAILABLE' }),
    );
  }
  if (remote.exit_code === 2) {
    return qualificationResult(
      request,
      'BLOCKED',
      'REMOTE_TARGET_REF_NOT_OBSERVABLE',
      evidenceFor(request, { ...remoteBase, remoteStatus: 'BLOCKED' }),
    );
  }
  if (remote.exit_code !== 0 || remote.error_code) {
    return qualificationResult(
      request,
      'UNAVAILABLE',
      'REMOTE_OBSERVATION_UNAVAILABLE',
      evidenceFor(request, { ...remoteBase, remoteStatus: 'UNAVAILABLE' }),
    );
  }

  const parsedRemote = parseRemoteOid(remote, request.remote.target_ref);
  if (parsedRemote.status !== 'READY') {
    return qualificationResult(
      request,
      'UNKNOWN',
      'REMOTE_OBSERVATION_MALFORMED',
      evidenceFor(request, { ...remoteBase, remoteStatus: 'UNKNOWN' }),
    );
  }
  if (parsedRemote.oid !== request.remote.expected_commit) {
    return qualificationResult(
      request,
      'BLOCKED',
      'REMOTE_EXPECTED_COMMIT_MISMATCH',
      evidenceFor(request, {
        ...remoteBase,
        remoteStatus: 'BLOCKED',
        remoteCommit: parsedRemote.oid,
      }),
    );
  }

  return qualificationResult(
    request,
    'READY',
    null,
    evidenceFor(request, {
      ...remoteBase,
      remoteStatus: 'READY',
      remoteCommit: parsedRemote.oid,
    }),
  );
}

function qualificationSpecForRecipe(recipe, rawInput) {
  if (!recipe || recipe.version !== 'v0' || recipe.id !== 'integrate_accepted_candidate') {
    return null;
  }

  const parsed = IntegrateAcceptedCandidateInput.safeParse(rawInput);
  if (!parsed.success) {
    return {
      kind: 'INVALID',
      reason: 'GIT_QUALIFICATION_DECLARATION_INVALID',
    };
  }

  const input = parsed.data;
  const expectedCommit = input.accepted_range
    ? input.accepted_range.integration_range_base
    : input.expected_target_commit;

  return {
    kind: 'REQUIRED',
    expected_ref: input.target_ref,
    expected_commit: expectedCommit,
    ...(input.remote
      ? {
          remote: {
            name: input.remote.remote,
            target_ref: input.remote.target_ref,
            expected_commit: input.remote.expected_commit,
          },
        }
      : {}),
  };
}

module.exports = {
  createGitCliAdapter,
  qualifyGitExecutionSurface,
  qualificationSpecForRecipe,
  safeDirectoryFailure,
};
