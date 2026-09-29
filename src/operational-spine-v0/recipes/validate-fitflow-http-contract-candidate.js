'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { z } = require('zod');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../contracts');
const { referenceSchema } = require('../../state-kernel-v0/contracts');

const NonEmpty = z.string().min(1);
const GitOid = z.string().regex(/^[a-f0-9]{40,64}$/);
const RepoPath = z.string().min(1).refine(
  (value) => !value.startsWith('/') && !/^[A-Za-z]:/.test(value)
    && !value.split(/[\\/]/).includes('..'),
  'repository path must be relative and must not traverse',
);
const CommandBinding = z.object({
  executable: NonEmpty,
  args_prefix: z.array(z.string()).default([]),
  probe_args: z.array(z.string()).min(1),
}).strict();
const Candidate = z.object({
  repository_identity: NonEmpty,
  expected_ref: NonEmpty,
  parent: GitOid,
  commit: GitOid,
  tree: GitOid,
  allowed_changed_paths: z.array(RepoPath).default([]),
}).strict().superRefine((value, ctx) => {
  const sorted = [...value.allowed_changed_paths].sort((a, b) => a.localeCompare(b, 'en'));
  if (
    new Set(value.allowed_changed_paths).size !== value.allowed_changed_paths.length
    || sorted.join('\0') !== value.allowed_changed_paths.join('\0')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowed_changed_paths'],
      message: 'allowed_changed_paths must be unique and sorted',
    });
  }
});
const RuntimeCorrespondence = z.object({
  status: z.literal('COMPETENT'),
  source_recipe: z.object({
    id: z.literal('prepare_fitflow_test_runtime'),
    version: z.literal('v0'),
    receipt_ref: NonEmpty.optional(),
  }).strict(),
  repository_identity: NonEmpty,
  candidate_ref: NonEmpty,
  candidate_commit: GitOid,
  candidate_tree: GitOid,
  compose_project: z.literal('fitflow-test'),
  backend_service: z.literal('backend_test'),
  database: z.literal('fitflow_test'),
  database_user: NonEmpty,
  development_database: z.literal('fitflow_db'),
  development_database_excluded: z.literal(true),
  backend_root: NonEmpty,
  tooling: z.object({
    targeted_pytest: CommandBinding,
    full_regression: CommandBinding.optional(),
    ruff: CommandBinding.optional(),
    pyright: CommandBinding.optional(),
  }).strict(),
}).strict();
const RequestedStep = z.object({
  requested: z.boolean(),
  args: z.array(z.string()).default([]),
}).strict();
const ScopedStep = z.object({
  requested: z.boolean(),
  scope: z.array(RepoPath).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.requested && value.scope.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scope'],
      message: 'requested static analysis requires explicit scope',
    });
  }
});
const ExtraProbe = z.object({
  id: NonEmpty,
  purpose: z.literal('CORRESPONDENCE'),
  command: CommandBinding,
  args: z.array(z.string()).default([]),
}).strict();
const ValidationProfile = z.object({
  targeted_pytest_selectors: z.array(NonEmpty).min(1),
  expected_behavior_ref: referenceSchema.optional(),
  full_backend_regression: RequestedStep,
  ruff: ScopedStep,
  pyright: ScopedStep,
  extra_probes: z.array(ExtraProbe).default([]),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.targeted_pytest_selectors).size !== value.targeted_pytest_selectors.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targeted_pytest_selectors'],
      message: 'targeted_pytest_selectors must be unique',
    });
  }
  const ids = value.extra_probes.map((probe) => probe.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extra_probes'],
      message: 'extra probe ids must be unique',
    });
  }
});

const ValidateFitFlowHttpContractCandidateInput = z.object({
  responsibility: z.object({
    taskcycle_id: NonEmpty,
    responsibility_id: NonEmpty,
    validation_attempt_id: NonEmpty,
  }).strict(),
  candidate: Candidate,
  runtime_correspondence: RuntimeCorrespondence,
  validation_profile: ValidationProfile,
}).strict();

function exactLine(result) {
  return (result.stdout || '').trim();
}

function normalizedLines(result) {
  return exactLine(result) === ''
    ? []
    : exactLine(result).split(/\r?\n/).filter(Boolean).sort((a, b) => a.localeCompare(b, 'en'));
}

function sameReference(left, right) {
  return ['kind', 'id', 'location', 'sha256', 'git_oid']
    .every((field) => left?.[field] === right?.[field]);
}

function commandResult({ exit_code, stdout = '', stderr = '', signal = null, error = null }) {
  return {
    exit_code,
    stdout,
    stderr,
    signal,
    error_code: error?.code || null,
    error_message: error?.message || null,
  };
}

function createValidationProcessRunner() {
  function runProcess(command, args, cwd) {
    const result = spawnSync(command.executable, [...command.args_prefix, ...args], {
      cwd,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return commandResult({
      exit_code: result.status,
      signal: result.signal || null,
      error: result.error || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    });
  }

  return {
    probe({ command, cwd }) {
      return runProcess(command, command.probe_args, cwd);
    },
    run({ command, args, cwd }) {
      return runProcess(command, args, cwd);
    },
  };
}

function createValidationGitAdapter({ command = 'git' } = {}) {
  function run(repositoryPath, args) {
    const result = spawnSync(command, args, {
      cwd: repositoryPath,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return commandResult({
      exit_code: result.status,
      signal: result.signal || null,
      error: result.error || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    });
  }

  return {
    status(repositoryPath) {
      return run(repositoryPath, ['status', '--porcelain=v1', '--untracked-files=all']);
    },
    revParse(repositoryPath, spec) {
      return run(repositoryPath, ['rev-parse', spec]);
    },
    changedPaths(repositoryPath, parent, commit) {
      return run(repositoryPath, ['diff', '--name-only', '--no-renames', parent, commit, '--']);
    },
    diffCheck(repositoryPath, parent, commit) {
      return run(repositoryPath, ['diff', '--check', parent, commit, '--']);
    },
  };
}

function candidateGuard(request, input, git) {
  const repositoryPath = request.context.worktree?.location || request.context.repository.location;
  const candidate = input.candidate;
  const runtime = input.runtime_correspondence;

  if (!fs.existsSync(repositoryPath)) return { status: 'UNAVAILABLE', reason: 'REPOSITORY_LOCATION_UNAVAILABLE' };
  if (!request.context.git) return { status: 'BLOCKED', reason: 'EXECUTION_CONTEXT_GIT_REQUIRED' };
  if (request.context.taskcycle_id !== input.responsibility.taskcycle_id) {
    return { status: 'BLOCKED', reason: 'TASKCYCLE_CONTEXT_MISMATCH' };
  }
  if (
    request.context.repository.identity !== candidate.repository_identity
    || runtime.repository_identity !== candidate.repository_identity
  ) {
    return { status: 'BLOCKED', reason: 'REPOSITORY_IDENTITY_MISMATCH' };
  }
  if (
    request.context.git.expected_ref !== candidate.expected_ref
    || request.context.git.expected_commit !== candidate.commit
  ) {
    return { status: 'BLOCKED', reason: 'EXECUTION_CONTEXT_GIT_MISMATCH' };
  }
  if (
    runtime.candidate_ref !== candidate.expected_ref
    || runtime.candidate_commit !== candidate.commit
    || runtime.candidate_tree !== candidate.tree
  ) {
    return { status: 'BLOCKED', reason: 'RUNTIME_CANDIDATE_CORRESPONDENCE_MISMATCH' };
  }

  const status = git.status(repositoryPath);
  if (status.exit_code === null || status.error_code) return { status: 'UNAVAILABLE', reason: 'GIT_STATUS_UNAVAILABLE' };
  if (status.exit_code !== 0) return { status: 'UNAVAILABLE', reason: 'GIT_STATUS_UNAVAILABLE' };
  if (exactLine(status) !== '') return { status: 'BLOCKED', reason: 'CANDIDATE_WORKTREE_NOT_CLEAN' };

  const ref = git.revParse(repositoryPath, `${candidate.expected_ref}^{commit}`);
  if (ref.exit_code !== 0 || exactLine(ref) !== candidate.commit) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_REF_MISMATCH' };
  }
  const commit = git.revParse(repositoryPath, `${candidate.commit}^{commit}`);
  if (commit.exit_code !== 0 || exactLine(commit) !== candidate.commit) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_IDENTITY_MISMATCH' };
  }
  const parent = git.revParse(repositoryPath, `${candidate.commit}^1`);
  if (parent.exit_code !== 0 || exactLine(parent) !== candidate.parent) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_PARENT_MISMATCH' };
  }
  const tree = git.revParse(repositoryPath, `${candidate.commit}^{tree}`);
  if (tree.exit_code !== 0 || exactLine(tree) !== candidate.tree) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_TREE_MISMATCH' };
  }
  const paths = git.changedPaths(repositoryPath, candidate.parent, candidate.commit);
  if (paths.exit_code !== 0 || paths.error_code) {
    return { status: 'UNAVAILABLE', reason: 'CANDIDATE_CHANGED_PATHS_UNAVAILABLE' };
  }
  if (normalizedLines(paths).join('\0') !== candidate.allowed_changed_paths.join('\0')) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_CHANGED_PATHS_MISMATCH' };
  }
  return { status: 'READY' };
}

function requiredCommands(input) {
  const profile = input.validation_profile;
  const tooling = input.runtime_correspondence.tooling;
  const commands = [
    ['targeted_pytest', tooling.targeted_pytest],
  ];
  if (profile.full_backend_regression.requested) commands.push(['full_regression', tooling.full_regression]);
  if (profile.ruff.requested) commands.push(['ruff', tooling.ruff]);
  if (profile.pyright.requested) commands.push(['pyright', tooling.pyright]);
  for (const probe of profile.extra_probes) commands.push([`extra_probe:${probe.id}`, probe.command]);
  return commands;
}

function runtimeGuard(request, input, runner) {
  const runtime = input.runtime_correspondence;
  if (
    runtime.compose_project !== 'fitflow-test'
    || runtime.backend_service !== 'backend_test'
    || runtime.database !== 'fitflow_test'
    || runtime.development_database !== 'fitflow_db'
    || runtime.development_database_excluded !== true
    || runtime.database === runtime.development_database
  ) {
    return { status: 'BLOCKED', reason: 'FITFLOW_TEST_RUNTIME_IDENTITY_MISMATCH' };
  }
  if (
    input.validation_profile.expected_behavior_ref
    && !request.evidence_refs.some((ref) => sameReference(ref, input.validation_profile.expected_behavior_ref))
  ) {
    return { status: 'BLOCKED', reason: 'EXPECTED_BEHAVIOR_REFERENCE_NOT_SUPPLIED' };
  }

  for (const [stepId, command] of requiredCommands(input)) {
    if (!command) return { status: 'BLOCKED', reason: `REQUIRED_TOOL_BINDING_MISSING:${stepId}` };
    const probe = runner.probe({ command, cwd: runtime.backend_root, step_id: stepId });
    if (probe.exit_code === null || probe.error_code || probe.exit_code !== 0) {
      return { status: 'UNAVAILABLE', reason: `TOOL_UNAVAILABLE:${stepId}` };
    }
  }
  return { status: 'READY' };
}

function receipt(request, { status, reason, output }) {
  return RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: `recipe-receipt:${request.execution_attempt_id}:validate-fitflow-http-contract-candidate`,
    recipe_id: request.recipe_id,
    recipe_version: request.recipe_version,
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    effect_state: status === 'UNKNOWN' ? 'UNKNOWN' : 'NONE',
    ...(reason ? { reason } : {}),
    ...(output !== undefined ? { output } : {}),
    result_refs: [],
    evidence_refs: request.evidence_refs || [],
  });
}

function evidenceRecord(stepId, command, args, cwd, result) {
  return {
    step_id: stepId,
    executable: command.executable,
    argv: [...command.args_prefix, ...args],
    cwd,
    exit_code: result.exit_code,
    signal: result.signal || null,
    error_code: result.error_code || null,
    error_message: result.error_message || null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function resultOutput(input, commandRecords, failureLayer, observedStatus) {
  return {
    responsibility: input.responsibility,
    candidate: input.candidate,
    runtime_correspondence: {
      ...input.runtime_correspondence,
      tooling: undefined,
    },
    validation_profile: input.validation_profile,
    command_records: commandRecords,
    observation: {
      observed_status: observedStatus,
      failure_layer: failureLayer,
      product_semantic_disposition: 'NOT_ADJUDICATED',
    },
    candidate_mutation: 'NONE',
    canonical_effect: 'NONE',
  };
}

function createValidateFitFlowHttpContractCandidateRecipe({
  git = createValidationGitAdapter(),
  runner = createValidationProcessRunner(),
} = {}) {
  const definition = RecipeDefinition.parse({
    id: 'validate_fitflow_http_contract_candidate',
    version: 'v0',
    provides: ['fitflow.http_contract.validate'],
    required_inputs: [
      'responsibility',
      'candidate',
      'runtime_correspondence',
      'validation_profile.targeted_pytest_selectors',
    ],
    preconditions: [
      'candidate ref, parent, commit, tree, changed paths and clean worktree are exact',
      'competent prepare_fitflow_test_runtime@v0 correspondence is supplied',
      'fitflow_test is proven distinct from fitflow_db',
      'caller supplies all responsibility-specific selectors, probes and static-analysis scopes',
      'every requested validation tool is competent on the supplied runtime surface',
    ],
    effects: [],
    postconditions: [
      'candidate identity and changed-path correspondence remain exact',
      'every executed validation step records command, stdout, stderr and exit code',
      'receipt contains no Product semantic verdict, Independent Review or Developer acceptance',
      'canonical Product and repository effects are NONE',
    ],
  });

  async function preflight(request) {
    let input;
    try {
      input = ValidateFitFlowHttpContractCandidateInput.parse(request.input);
    } catch (error) {
      return { status: 'BLOCKED', reason: `INVALID_VALIDATION_INPUT:${error.message}` };
    }
    const candidate = candidateGuard(request, input, git);
    if (candidate.status !== 'READY') return candidate;
    return runtimeGuard(request, input, runner);
  }

  async function execute(request) {
    let input;
    try {
      input = ValidateFitFlowHttpContractCandidateInput.parse(request.input);
    } catch (error) {
      return receipt(request, {
        status: 'FAIL',
        reason: `INVALID_VALIDATION_INPUT_AFTER_DISPATCH:${error.message}`,
        output: {
          observation: {
            observed_status: 'BLOCKED',
            failure_layer: 'MECHANICAL_OR_ENVIRONMENT',
            product_semantic_disposition: 'NOT_ADJUDICATED',
          },
          candidate_mutation: 'NONE',
          canonical_effect: 'NONE',
        },
      });
    }

    const recheck = await preflight(request);
    if (recheck.status !== 'READY') {
      return receipt(request, {
        status: 'FAIL',
        reason: `PRECONDITION_CHANGED_AFTER_PREFLIGHT:${recheck.status}:${recheck.reason || 'UNKNOWN'}`,
        output: resultOutput(input, [], 'MECHANICAL_OR_ENVIRONMENT', recheck.status),
      });
    }

    const runtime = input.runtime_correspondence;
    const profile = input.validation_profile;
    const commandRecords = [];
    const nonpass = [];

    const runStep = (stepId, command, args, classification) => {
      const result = runner.run({
        step_id: stepId,
        command,
        args,
        cwd: runtime.backend_root,
      });
      commandRecords.push(evidenceRecord(stepId, command, args, runtime.backend_root, result));
      if (result.exit_code === null || result.error_code) {
        return {
          terminal: true,
          receipt: receipt(request, {
            status: 'FAIL',
            reason: `EXECUTION_SUBSTRATE_UNAVAILABLE_AFTER_DISPATCH:${stepId}`,
            output: resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'UNAVAILABLE'),
          }),
        };
      }
      if (result.exit_code !== 0) nonpass.push({ step_id: stepId, classification, exit_code: result.exit_code });

      const correspondence = candidateGuard(request, input, git);
      if (correspondence.status !== 'READY') {
        return {
          terminal: true,
          receipt: receipt(request, {
            status: 'FAIL',
            reason: `CANDIDATE_DRIFT_AFTER_STEP:${stepId}:${correspondence.reason || correspondence.status}`,
            output: {
              ...resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'FAIL'),
              candidate_mutation: 'OBSERVED_DRIFT',
            },
          }),
        };
      }
      return { terminal: false };
    };

    let step = runStep(
      'targeted_pytest',
      runtime.tooling.targeted_pytest,
      profile.targeted_pytest_selectors,
      'TARGETED_HTTP_OBSERVATION_NONPASS',
    );
    if (step.terminal) return step.receipt;

    if (profile.full_backend_regression.requested) {
      step = runStep(
        'full_regression',
        runtime.tooling.full_regression,
        profile.full_backend_regression.args,
        'FULL_BACKEND_REGRESSION_NONPASS',
      );
      if (step.terminal) return step.receipt;
    }

    const diff = git.diffCheck(
      request.context.worktree?.location || request.context.repository.location,
      input.candidate.parent,
      input.candidate.commit,
    );
    commandRecords.push(evidenceRecord(
      'git_diff_check',
      { executable: 'git', args_prefix: [], probe_args: ['--version'] },
      ['diff', '--check', input.candidate.parent, input.candidate.commit, '--'],
      request.context.worktree?.location || request.context.repository.location,
      diff,
    ));
    if (diff.exit_code === null || diff.error_code) {
      return receipt(request, {
        status: 'FAIL',
        reason: 'EXECUTION_SUBSTRATE_UNAVAILABLE_AFTER_DISPATCH:git_diff_check',
        output: resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'UNAVAILABLE'),
      });
    }
    if (diff.exit_code !== 0) nonpass.push({
      step_id: 'git_diff_check',
      classification: 'VALIDATION_MECHANICAL_FINDING',
      exit_code: diff.exit_code,
    });

    const afterDiff = candidateGuard(request, input, git);
    if (afterDiff.status !== 'READY') {
      return receipt(request, {
        status: 'FAIL',
        reason: `CANDIDATE_DRIFT_AFTER_STEP:git_diff_check:${afterDiff.reason || afterDiff.status}`,
        output: {
          ...resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'FAIL'),
          candidate_mutation: 'OBSERVED_DRIFT',
        },
      });
    }

    if (profile.ruff.requested) {
      step = runStep('ruff', runtime.tooling.ruff, profile.ruff.scope, 'VALIDATION_MECHANICAL_FINDING');
      if (step.terminal) return step.receipt;
    }
    if (profile.pyright.requested) {
      step = runStep('pyright', runtime.tooling.pyright, profile.pyright.scope, 'VALIDATION_MECHANICAL_FINDING');
      if (step.terminal) return step.receipt;
    }
    for (const probe of profile.extra_probes) {
      step = runStep(
        `extra_probe:${probe.id}`,
        probe.command,
        probe.args,
        'VALIDATION_MECHANICAL_FINDING',
      );
      if (step.terminal) return step.receipt;
    }

    const finalCorrespondence = candidateGuard(request, input, git);
    if (finalCorrespondence.status !== 'READY') {
      return receipt(request, {
        status: 'FAIL',
        reason: `FINAL_CANDIDATE_CORRESPONDENCE_FAILED:${finalCorrespondence.reason || finalCorrespondence.status}`,
        output: {
          ...resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'FAIL'),
          candidate_mutation: 'OBSERVED_DRIFT',
        },
      });
    }

    if (nonpass.length > 0) {
      return receipt(request, {
        status: 'FAIL',
        reason: `${nonpass[0].classification}:${nonpass[0].step_id}:EXIT_${nonpass[0].exit_code}`,
        output: {
          ...resultOutput(input, commandRecords, nonpass[0].classification, 'FAIL'),
          nonpass,
        },
      });
    }

    return receipt(request, {
      status: 'PASS',
      output: resultOutput(input, commandRecords, 'NONE', 'PASS'),
    });
  }

  return { definition, preflight, execute };
}

module.exports = {
  ValidateFitFlowHttpContractCandidateInput,
  RuntimeCorrespondence,
  ValidationProfile,
  createValidateFitFlowHttpContractCandidateRecipe,
  createValidationGitAdapter,
  createValidationProcessRunner,
};
