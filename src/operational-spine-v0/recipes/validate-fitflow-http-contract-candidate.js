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
const BoundedArgs = z.array(z.string().max(512)).min(1).max(128);
const CommandBinding = z.object({
  executable: NonEmpty,
  args_prefix: z.array(z.string().max(512)).max(32).default([]),
  probe_args: z.array(z.string().max(512)).min(1).max(16),
}).strict();
const Candidate = z.object({
  repository_identity: NonEmpty,
  expected_ref: NonEmpty,
  parent: GitOid,
  commit: GitOid,
  tree: GitOid,
  allowed_changed_paths: z.array(RepoPath),
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

const RuntimeEvidenceReference = referenceSchema.refine(
  (value) => ['EVIDENCE', 'ARTIFACT'].includes(value.kind),
  'runtime receipt evidence must be an EVIDENCE or ARTIFACT reference',
);
const RuntimeCorrespondence = z.object({
  status: z.literal('COMPETENT'),
  source_recipe: z.object({
    id: z.literal('prepare_fitflow_test_runtime'),
    version: z.literal('v0'),
    receipt_ref: NonEmpty,
    evidence_ref: RuntimeEvidenceReference,
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

const FullRegressionStep = z.discriminatedUnion('requested', [
  z.object({ requested: z.literal(false) }).strict(),
  z.object({ requested: z.literal(true), args: BoundedArgs }).strict(),
]);
const ScopedStep = z.discriminatedUnion('requested', [
  z.object({ requested: z.literal(false) }).strict(),
  z.object({ requested: z.literal(true), scope: z.array(RepoPath).min(1).max(128) }).strict(),
]);
const ExtraProbeRequest = z.object({
  id: NonEmpty,
}).strict();
const ValidationProfile = z.object({
  targeted_pytest_selectors: z.array(NonEmpty).min(1).max(128),
  expected_behavior_ref: referenceSchema.optional(),
  full_backend_regression: FullRegressionStep,
  ruff: ScopedStep,
  pyright: ScopedStep,
  extra_probes: z.array(ExtraProbeRequest).max(32),
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

const ExtraProbeDefinition = z.object({
  id: NonEmpty,
  purpose: z.literal('CORRESPONDENCE'),
  effects: z.array(z.object({
    effect: NonEmpty,
    scope: NonEmpty,
  }).strict()),
  command: CommandBinding,
  args: z.array(z.string().max(512)).max(128).default([]),
}).strict();

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

function gitEvidence(step, argv, result) {
  return {
    step,
    argv,
    exit_code: result.exit_code,
    signal: result.signal || null,
    error_code: result.error_code || null,
    error_message: result.error_message || null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function observeCandidate(request, input, git) {
  const repositoryPath = request.context.worktree?.location || request.context.repository.location;
  const candidate = input.candidate;
  const runtime = input.runtime_correspondence;
  const evidence = {
    repository_path: repositoryPath,
    target_ref: candidate.expected_ref,
    target_ref_commit: null,
    commit: null,
    parent: null,
    tree: null,
    changed_paths: null,
    clean_status: 'UNKNOWN',
    raw_git: [],
  };

  if (!fs.existsSync(repositoryPath)) {
    return { status: 'UNAVAILABLE', reason: 'REPOSITORY_LOCATION_UNAVAILABLE', drift_proven: false, evidence };
  }
  if (!request.context.git) {
    return { status: 'BLOCKED', reason: 'EXECUTION_CONTEXT_GIT_REQUIRED', drift_proven: false, evidence };
  }
  if (request.context.taskcycle_id !== input.responsibility.taskcycle_id) {
    return { status: 'BLOCKED', reason: 'TASKCYCLE_CONTEXT_MISMATCH', drift_proven: false, evidence };
  }
  if (
    request.context.repository.identity !== candidate.repository_identity
    || runtime.repository_identity !== candidate.repository_identity
  ) {
    return { status: 'BLOCKED', reason: 'REPOSITORY_IDENTITY_MISMATCH', drift_proven: false, evidence };
  }
  if (
    request.context.git.expected_ref !== candidate.expected_ref
    || request.context.git.expected_commit !== candidate.commit
  ) {
    return { status: 'BLOCKED', reason: 'EXECUTION_CONTEXT_GIT_MISMATCH', drift_proven: false, evidence };
  }
  if (
    runtime.candidate_ref !== candidate.expected_ref
    || runtime.candidate_commit !== candidate.commit
    || runtime.candidate_tree !== candidate.tree
  ) {
    return { status: 'BLOCKED', reason: 'RUNTIME_CANDIDATE_CORRESPONDENCE_MISMATCH', drift_proven: false, evidence };
  }

  const status = git.status(repositoryPath);
  evidence.raw_git.push(gitEvidence('status', ['status', '--porcelain=v1', '--untracked-files=all'], status));
  if (status.exit_code === null || status.error_code || status.exit_code !== 0) {
    return { status: 'UNAVAILABLE', reason: 'GIT_STATUS_UNAVAILABLE', drift_proven: false, evidence };
  }
  evidence.clean_status = exactLine(status) === '' ? 'CLEAN' : 'DIRTY';

  const refSpec = `${candidate.expected_ref}^{commit}`;
  const ref = git.revParse(repositoryPath, refSpec);
  evidence.raw_git.push(gitEvidence('target_ref', ['rev-parse', refSpec], ref));
  if (ref.exit_code === null || ref.error_code) {
    return { status: 'UNAVAILABLE', reason: 'CANDIDATE_REF_UNAVAILABLE', drift_proven: false, evidence };
  }
  evidence.target_ref_commit = ref.exit_code === 0 ? exactLine(ref) : null;

  const commitSpec = `${candidate.commit}^{commit}`;
  const commit = git.revParse(repositoryPath, commitSpec);
  evidence.raw_git.push(gitEvidence('commit', ['rev-parse', commitSpec], commit));
  if (commit.exit_code === null || commit.error_code) {
    return { status: 'UNAVAILABLE', reason: 'CANDIDATE_IDENTITY_UNAVAILABLE', drift_proven: false, evidence };
  }
  evidence.commit = commit.exit_code === 0 ? exactLine(commit) : null;

  const parentSpec = `${candidate.commit}^1`;
  const parent = git.revParse(repositoryPath, parentSpec);
  evidence.raw_git.push(gitEvidence('parent', ['rev-parse', parentSpec], parent));
  if (parent.exit_code === null || parent.error_code) {
    return { status: 'UNAVAILABLE', reason: 'CANDIDATE_PARENT_UNAVAILABLE', drift_proven: false, evidence };
  }
  evidence.parent = parent.exit_code === 0 ? exactLine(parent) : null;

  const treeSpec = `${candidate.commit}^{tree}`;
  const tree = git.revParse(repositoryPath, treeSpec);
  evidence.raw_git.push(gitEvidence('tree', ['rev-parse', treeSpec], tree));
  if (tree.exit_code === null || tree.error_code) {
    return { status: 'UNAVAILABLE', reason: 'CANDIDATE_TREE_UNAVAILABLE', drift_proven: false, evidence };
  }
  evidence.tree = tree.exit_code === 0 ? exactLine(tree) : null;

  const paths = git.changedPaths(repositoryPath, candidate.parent, candidate.commit);
  evidence.raw_git.push(gitEvidence(
    'changed_paths',
    ['diff', '--name-only', '--no-renames', candidate.parent, candidate.commit, '--'],
    paths,
  ));
  if (paths.exit_code === null || paths.error_code || paths.exit_code !== 0) {
    return { status: 'UNAVAILABLE', reason: 'CANDIDATE_CHANGED_PATHS_UNAVAILABLE', drift_proven: false, evidence };
  }
  evidence.changed_paths = normalizedLines(paths);

  if (evidence.clean_status !== 'CLEAN') {
    return { status: 'BLOCKED', reason: 'CANDIDATE_WORKTREE_NOT_CLEAN', drift_proven: true, evidence };
  }
  if (ref.exit_code !== 0 || evidence.target_ref_commit !== candidate.commit) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_REF_MISMATCH', drift_proven: true, evidence };
  }
  if (commit.exit_code !== 0 || evidence.commit !== candidate.commit) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_IDENTITY_MISMATCH', drift_proven: true, evidence };
  }
  if (parent.exit_code !== 0 || evidence.parent !== candidate.parent) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_PARENT_MISMATCH', drift_proven: true, evidence };
  }
  if (tree.exit_code !== 0 || evidence.tree !== candidate.tree) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_TREE_MISMATCH', drift_proven: true, evidence };
  }
  if (evidence.changed_paths.join('\0') !== candidate.allowed_changed_paths.join('\0')) {
    return { status: 'BLOCKED', reason: 'CANDIDATE_CHANGED_PATHS_MISMATCH', drift_proven: true, evidence };
  }
  return { status: 'READY', drift_proven: false, evidence };
}

function candidateGuard(request, input, git) {
  const observed = observeCandidate(request, input, git);
  return { status: observed.status, ...(observed.reason ? { reason: observed.reason } : {}) };
}

function normalizeProbeRegistry(rawRegistry) {
  const source = rawRegistry instanceof Map ? Object.fromEntries(rawRegistry) : rawRegistry;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('probeRegistry must be a keyed object or Map');
  }
  const normalized = new Map();
  for (const [key, raw] of Object.entries(source)) {
    const definition = ExtraProbeDefinition.parse(raw);
    if (definition.id !== key) throw new TypeError(`probeRegistry identity mismatch: ${key}/${definition.id}`);
    normalized.set(key, definition);
  }
  return normalized;
}

function resolveExtraProbes(profile, probeRegistry) {
  const resolved = [];
  for (const request of profile.extra_probes) {
    const definition = probeRegistry.get(request.id);
    if (!definition) {
      return { status: 'BLOCKED', reason: `UNKNOWN_EXTRA_PROBE:${request.id}`, probes: [] };
    }
    if (definition.effects.length !== 0) {
      return { status: 'BLOCKED', reason: `EFFECTFUL_EXTRA_PROBE_REJECTED:${request.id}`, probes: [] };
    }
    resolved.push(definition);
  }
  return { status: 'READY', probes: resolved };
}

function requiredCommands(input, resolvedExtraProbes) {
  const profile = input.validation_profile;
  const tooling = input.runtime_correspondence.tooling;
  const commands = [['targeted_pytest', tooling.targeted_pytest]];
  if (profile.full_backend_regression.requested) commands.push(['full_regression', tooling.full_regression]);
  if (profile.ruff.requested) commands.push(['ruff', tooling.ruff]);
  if (profile.pyright.requested) commands.push(['pyright', tooling.pyright]);
  for (const probe of resolvedExtraProbes) commands.push([`extra_probe:${probe.id}`, probe.command]);
  return commands;
}

function runtimeGuard(request, input, runner, probeRegistry) {
  const runtime = input.runtime_correspondence;
  const evidence = {
    source_recipe: runtime.source_recipe,
    matched_runtime_evidence_ref: null,
    tool_probes: [],
    extra_probe_resolution: [],
  };
  if (
    runtime.compose_project !== 'fitflow-test'
    || runtime.backend_service !== 'backend_test'
    || runtime.database !== 'fitflow_test'
    || runtime.development_database !== 'fitflow_db'
    || runtime.development_database_excluded !== true
    || runtime.database === runtime.development_database
  ) {
    return { status: 'BLOCKED', reason: 'FITFLOW_TEST_RUNTIME_IDENTITY_MISMATCH', evidence };
  }

  const suppliedRuntimeEvidence = request.evidence_refs.find((ref) =>
    ref.id === runtime.source_recipe.receipt_ref
    && sameReference(ref, runtime.source_recipe.evidence_ref));
  if (!suppliedRuntimeEvidence) {
    return { status: 'BLOCKED', reason: 'RUNTIME_RECEIPT_EVIDENCE_BINDING_MISSING_OR_MISMATCHED', evidence };
  }
  evidence.matched_runtime_evidence_ref = suppliedRuntimeEvidence;

  if (
    input.validation_profile.expected_behavior_ref
    && !request.evidence_refs.some((ref) => sameReference(ref, input.validation_profile.expected_behavior_ref))
  ) {
    return { status: 'BLOCKED', reason: 'EXPECTED_BEHAVIOR_REFERENCE_NOT_SUPPLIED', evidence };
  }

  const resolved = resolveExtraProbes(input.validation_profile, probeRegistry);
  if (resolved.status !== 'READY') {
    return { ...resolved, evidence };
  }
  evidence.extra_probe_resolution = resolved.probes.map((probe) => ({
    id: probe.id,
    purpose: probe.purpose,
    effects: probe.effects,
  }));

  for (const [stepId, command] of requiredCommands(input, resolved.probes)) {
    if (!command) return { status: 'BLOCKED', reason: `REQUIRED_TOOL_BINDING_MISSING:${stepId}`, evidence };
    const probe = runner.probe({ command, cwd: runtime.backend_root, step_id: stepId });
    evidence.tool_probes.push({
      step_id: stepId,
      executable: command.executable,
      argv: [...command.args_prefix, ...command.probe_args],
      cwd: runtime.backend_root,
      ...probe,
    });
    if (probe.exit_code === null || probe.error_code || probe.exit_code !== 0) {
      return { status: 'UNAVAILABLE', reason: `TOOL_UNAVAILABLE:${stepId}`, evidence };
    }
  }
  return { status: 'READY', resolved_extra_probes: resolved.probes, evidence };
}

function receipt(request, {
  status,
  effectState = status === 'UNKNOWN' ? 'UNKNOWN' : 'NONE',
  reason,
  output,
}) {
  return RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: `recipe-receipt:${request.execution_attempt_id}:validate-fitflow-http-contract-candidate`,
    recipe_id: request.recipe_id,
    recipe_version: request.recipe_version,
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    effect_state: effectState,
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

function resultOutput(input, commandRecords, failureLayer, observedStatus, evidence = {}) {
  return {
    responsibility: input.responsibility,
    candidate_expected: input.candidate,
    candidate_pre: evidence.candidate_pre || null,
    candidate_post: evidence.candidate_post || null,
    runtime_correspondence: {
      ...input.runtime_correspondence,
      tooling: undefined,
    },
    runtime_guard_evidence: evidence.runtime_guard_evidence || null,
    validation_profile: input.validation_profile,
    command_records: commandRecords,
    observation: {
      observed_status: observedStatus,
      failure_layer: failureLayer,
      product_semantic_disposition: 'NOT_ADJUDICATED',
    },
    candidate_mutation: evidence.candidate_mutation || 'NONE',
    canonical_effect: 'NONE',
  };
}

function correspondenceReceipt(request, input, commandRecords, preEvidence, runtimeEvidence, observation, context) {
  const output = resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT',
    observation.status === 'UNAVAILABLE' ? 'UNKNOWN' : 'FAIL', {
      candidate_pre: preEvidence,
      candidate_post: observation.evidence,
      runtime_guard_evidence: runtimeEvidence,
      candidate_mutation: observation.status === 'UNAVAILABLE'
        ? 'UNKNOWN'
        : (observation.drift_proven ? 'OBSERVED_DRIFT' : 'NOT_PROVEN'),
    });
  if (observation.status === 'UNAVAILABLE') {
    return receipt(request, {
      status: 'UNKNOWN',
      effectState: 'UNKNOWN',
      reason: `POST_DISPATCH_CANDIDATE_CORRESPONDENCE_UNAVAILABLE:${context}:${observation.reason}`,
      output,
    });
  }
  return receipt(request, {
    status: 'FAIL',
    effectState: 'NONE',
    reason: `CANDIDATE_CORRESPONDENCE_MISMATCH:${context}:${observation.reason || observation.status}`,
    output,
  });
}

function createValidateFitFlowHttpContractCandidateRecipe({
  git = createValidationGitAdapter(),
  runner = createValidationProcessRunner(),
  probeRegistry = {},
} = {}) {
  const registeredProbes = normalizeProbeRegistry(probeRegistry);
  const definition = RecipeDefinition.parse({
    id: 'validate_fitflow_http_contract_candidate',
    version: 'v0',
    provides: ['fitflow.http_contract.validate'],
    required_inputs: [
      'responsibility',
      'candidate.allowed_changed_paths',
      'runtime_correspondence.source_recipe.receipt_ref',
      'runtime_correspondence.source_recipe.evidence_ref',
      'validation_profile.targeted_pytest_selectors',
      'validation_profile.full_backend_regression',
      'validation_profile.ruff',
      'validation_profile.pyright',
      'validation_profile.extra_probes',
    ],
    preconditions: [
      'candidate ref, parent, commit, tree, changed paths and clean worktree are exact',
      'competent prepare_fitflow_test_runtime@v0 receipt is explicitly bound to supplied evidence',
      'fitflow_test is proven distinct from fitflow_db',
      'caller supplies all responsibility-specific selectors, changed-path allowlist, probes and static-analysis scopes',
      'extra probes resolve only through registered no-effect correspondence identities',
      'every requested validation tool is competent on the supplied runtime surface',
    ],
    effects: [],
    postconditions: [
      'candidate pre/post observations preserve independently auditable raw Git evidence',
      'post-dispatch unavailable candidate correspondence returns UNKNOWN/effect_state=UNKNOWN',
      'proven deterministic candidate mismatch returns FAIL without inventing ambiguity',
      'every executed validation step records command, stdout, stderr and exit code',
      'runtime preparation receipt evidence remains bound in the Recipe receipt evidence surface',
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
    const candidate = observeCandidate(request, input, git);
    if (candidate.status !== 'READY') return { status: candidate.status, reason: candidate.reason };
    const runtime = runtimeGuard(request, input, runner, registeredProbes);
    return runtime.status === 'READY'
      ? { status: 'READY' }
      : { status: runtime.status, reason: runtime.reason };
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

    const preCandidate = observeCandidate(request, input, git);
    if (preCandidate.status !== 'READY') {
      return correspondenceReceipt(request, input, [], preCandidate.evidence, null, preCandidate, 'PRE_VALIDATION_RECHECK');
    }

    const runtimeCheck = runtimeGuard(request, input, runner, registeredProbes);
    if (runtimeCheck.status !== 'READY') {
      return receipt(request, {
        status: 'FAIL',
        reason: `PRECONDITION_CHANGED_AFTER_PREFLIGHT:${runtimeCheck.status}:${runtimeCheck.reason || 'UNKNOWN'}`,
        output: resultOutput(input, [], 'MECHANICAL_OR_ENVIRONMENT', runtimeCheck.status, {
          candidate_pre: preCandidate.evidence,
          runtime_guard_evidence: runtimeCheck.evidence,
          candidate_mutation: 'NONE',
        }),
      });
    }

    const runtime = input.runtime_correspondence;
    const profile = input.validation_profile;
    const commandRecords = [];
    const nonpass = [];
    let latestCandidate = preCandidate;

    const observeAfterStep = (context) => {
      latestCandidate = observeCandidate(request, input, git);
      if (latestCandidate.status === 'READY') return null;
      return correspondenceReceipt(
        request,
        input,
        commandRecords,
        preCandidate.evidence,
        runtimeCheck.evidence,
        latestCandidate,
        context,
      );
    };

    const runStep = (stepId, command, args, classification) => {
      const result = runner.run({
        step_id: stepId,
        command,
        args,
        cwd: runtime.backend_root,
      });
      commandRecords.push(evidenceRecord(stepId, command, args, runtime.backend_root, result));

      const correspondenceFailure = observeAfterStep(stepId);
      if (correspondenceFailure) return { terminal: true, receipt: correspondenceFailure };

      if (result.exit_code === null || result.error_code) {
        return {
          terminal: true,
          receipt: receipt(request, {
            status: 'FAIL',
            reason: `EXECUTION_SUBSTRATE_UNAVAILABLE_AFTER_DISPATCH:${stepId}`,
            output: resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'UNAVAILABLE', {
              candidate_pre: preCandidate.evidence,
              candidate_post: latestCandidate.evidence,
              runtime_guard_evidence: runtimeCheck.evidence,
              candidate_mutation: 'NONE',
            }),
          }),
        };
      }
      if (result.exit_code !== 0) nonpass.push({ step_id: stepId, classification, exit_code: result.exit_code });
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

    const repositoryPath = request.context.worktree?.location || request.context.repository.location;
    const diff = git.diffCheck(repositoryPath, input.candidate.parent, input.candidate.commit);
    commandRecords.push(evidenceRecord(
      'git_diff_check',
      { executable: 'git', args_prefix: [], probe_args: ['--version'] },
      ['diff', '--check', input.candidate.parent, input.candidate.commit, '--'],
      repositoryPath,
      diff,
    ));
    const afterDiffCorrespondence = observeAfterStep('git_diff_check');
    if (afterDiffCorrespondence) return afterDiffCorrespondence;
    if (diff.exit_code === null || diff.error_code) {
      return receipt(request, {
        status: 'FAIL',
        reason: 'EXECUTION_SUBSTRATE_UNAVAILABLE_AFTER_DISPATCH:git_diff_check',
        output: resultOutput(input, commandRecords, 'MECHANICAL_OR_ENVIRONMENT', 'UNAVAILABLE', {
          candidate_pre: preCandidate.evidence,
          candidate_post: latestCandidate.evidence,
          runtime_guard_evidence: runtimeCheck.evidence,
          candidate_mutation: 'NONE',
        }),
      });
    }
    if (diff.exit_code !== 0) nonpass.push({
      step_id: 'git_diff_check',
      classification: 'VALIDATION_MECHANICAL_FINDING',
      exit_code: diff.exit_code,
    });

    if (profile.ruff.requested) {
      step = runStep('ruff', runtime.tooling.ruff, profile.ruff.scope, 'VALIDATION_MECHANICAL_FINDING');
      if (step.terminal) return step.receipt;
    }
    if (profile.pyright.requested) {
      step = runStep('pyright', runtime.tooling.pyright, profile.pyright.scope, 'VALIDATION_MECHANICAL_FINDING');
      if (step.terminal) return step.receipt;
    }
    for (const probe of runtimeCheck.resolved_extra_probes) {
      step = runStep(
        `extra_probe:${probe.id}`,
        probe.command,
        probe.args,
        'VALIDATION_MECHANICAL_FINDING',
      );
      if (step.terminal) return step.receipt;
    }

    latestCandidate = observeCandidate(request, input, git);
    if (latestCandidate.status !== 'READY') {
      return correspondenceReceipt(
        request,
        input,
        commandRecords,
        preCandidate.evidence,
        runtimeCheck.evidence,
        latestCandidate,
        'FINAL',
      );
    }

    if (nonpass.length > 0) {
      return receipt(request, {
        status: 'FAIL',
        reason: `${nonpass[0].classification}:${nonpass[0].step_id}:EXIT_${nonpass[0].exit_code}`,
        output: {
          ...resultOutput(input, commandRecords, nonpass[0].classification, 'FAIL', {
            candidate_pre: preCandidate.evidence,
            candidate_post: latestCandidate.evidence,
            runtime_guard_evidence: runtimeCheck.evidence,
            candidate_mutation: 'NONE',
          }),
          nonpass,
        },
      });
    }

    return receipt(request, {
      status: 'PASS',
      output: resultOutput(input, commandRecords, 'NONE', 'PASS', {
        candidate_pre: preCandidate.evidence,
        candidate_post: latestCandidate.evidence,
        runtime_guard_evidence: runtimeCheck.evidence,
        candidate_mutation: 'NONE',
      }),
    });
  }

  return { definition, preflight, execute };
}

module.exports = {
  ValidateFitFlowHttpContractCandidateInput,
  RuntimeCorrespondence,
  ValidationProfile,
  ExtraProbeDefinition,
  createValidateFitFlowHttpContractCandidateRecipe,
  createValidationGitAdapter,
  createValidationProcessRunner,
  normalizeProbeRegistry,
  observeCandidate,
};
