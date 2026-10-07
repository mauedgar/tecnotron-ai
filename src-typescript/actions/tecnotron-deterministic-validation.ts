import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DeterministicValidationReceipt,
  DeterministicValidationRequest,
  type DeterministicValidationReceipt as DeterministicValidationReceiptValue,
  type DeterministicValidationRequest as DeterministicValidationRequestValue,
  type DeterministicValidationRequestInput,
  type GitHubActionsExecutionRefInput,
  type ValidationCheckInput,
} from '../contracts/deterministic-validation';

export const TECNOTRON_PROMOTION_PROFILE = {
  id: 'tecnotron-promotion',
  version: 'v0',
} as const;

interface CommandSpec {
  readonly id: string;
  readonly command: string;
  readonly args: readonly string[];
}

const TECNOTRON_PROMOTION_COMMANDS: readonly CommandSpec[] = [
  { id: 'dependency-scripts', command: 'npm', args: ['rebuild'] },
  { id: 'workspace-verify', command: 'npm', args: ['run', 'workspace:verify'] },
  { id: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { id: 'build', command: 'npm', args: ['run', 'build'] },
  { id: 'tests', command: 'npm', args: ['test'] },
  { id: 'contracts-check', command: 'npm', args: ['run', 'contracts:check'] },
];

export interface CommandResult {
  readonly status: 'PASS' | 'FAIL' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly elapsed_ms: number;
  readonly reason?: string;
}

export interface ValidationRunnerHooks {
  readonly observeSubject: (repositoryRoot: string, repository: string) => {
    repository: string;
    commit: string;
    tree: string;
  };
  readonly executeCommand: (spec: CommandSpec, repositoryRoot: string) => CommandResult;
}

function gitValue(repositoryRoot: string, args: readonly string[]): string {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`GIT_UNAVAILABLE: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`GIT_COMMAND_FAILED: git ${args.join(' ')}${detail ? `: ${detail}` : ''}`);
  }
  return (result.stdout || '').trim();
}

export function observeExactSubject(repositoryRoot: string, repository: string) {
  return {
    repository,
    commit: gitValue(repositoryRoot, ['rev-parse', 'HEAD']),
    tree: gitValue(repositoryRoot, ['rev-parse', 'HEAD^{tree}']),
  };
}

export function executeValidationCommand(spec: CommandSpec, repositoryRoot: string): CommandResult {
  const started = process.hrtime.bigint();
  const result = spawnSync(spec.command, [...spec.args], {
    cwd: repositoryRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  const elapsed_ms = Number((process.hrtime.bigint() - started) / 1_000_000n);

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    return {
      status: code === 'ENOENT' ? 'UNAVAILABLE' : 'UNKNOWN',
      elapsed_ms,
      reason: `${spec.id}: ${result.error.message}`,
    };
  }
  if (result.status === null) {
    return {
      status: 'UNKNOWN',
      elapsed_ms,
      reason: `${spec.id}: process terminated without an exit code`,
    };
  }
  if (result.status !== 0) {
    return {
      status: 'FAIL',
      elapsed_ms,
      reason: `${spec.id}: exit code ${result.status}`,
    };
  }
  return { status: 'PASS', elapsed_ms };
}

const defaultHooks: ValidationRunnerHooks = {
  observeSubject: observeExactSubject,
  executeCommand: executeValidationCommand,
};

function checkInput(id: string, result: CommandResult): ValidationCheckInput {
  return {
    id,
    status: result.status,
    elapsed_ms: result.elapsed_ms,
    ...(result.reason === undefined ? {} : { reason: result.reason }),
  };
}

function receiptBase(
  request: DeterministicValidationRequestValue,
  execution: GitHubActionsExecutionRefInput,
) {
  return {
    schema_version: 'tecnotron-deterministic-validation-receipt/v0' as const,
    requested_subject: request.subject,
    profile: request.profile,
    execution,
    effect_state: 'NONE' as const,
    artifact_refs: [],
    evidence_refs: request.evidence_refs,
  };
}

function subjectsMatch(
  requested: DeterministicValidationRequestValue['subject'],
  observed: { repository: string; commit: string; tree: string },
): boolean {
  if (requested.repository !== observed.repository) return false;
  if (requested.commit !== observed.commit) return false;
  if (requested.tree !== undefined && requested.tree !== observed.tree) return false;
  return true;
}

export function runTecnotronDeterministicValidation(
  rawRequest: DeterministicValidationRequestInput,
  execution: GitHubActionsExecutionRefInput,
  repositoryRoot = process.cwd(),
  hooks: ValidationRunnerHooks = defaultHooks,
): {
  request: DeterministicValidationRequestValue;
  receipt: DeterministicValidationReceiptValue;
  exitCode: number;
} {
  const request = DeterministicValidationRequest.parse(rawRequest);
  const base = receiptBase(request, execution);

  if (
    request.profile.id !== TECNOTRON_PROMOTION_PROFILE.id ||
    request.profile.version !== TECNOTRON_PROMOTION_PROFILE.version
  ) {
    const reason = `unsupported validation profile: ${request.profile.id}@${request.profile.version}`;
    const receipt = DeterministicValidationReceipt.parse({
      ...base,
      observed_subject: null,
      correspondence: 'UNKNOWN',
      checks: [{ id: 'profile', status: 'BLOCKED', elapsed_ms: 0, reason }],
      conclusion: 'BLOCKED',
      reason,
    });
    return { request, receipt, exitCode: 2 };
  }

  let observed: { repository: string; commit: string; tree: string };
  try {
    observed = hooks.observeSubject(repositoryRoot, request.subject.repository);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const receipt = DeterministicValidationReceipt.parse({
      ...base,
      observed_subject: null,
      correspondence: 'UNKNOWN',
      checks: [{ id: 'subject-observation', status: 'UNKNOWN', elapsed_ms: 0, reason }],
      conclusion: 'UNKNOWN',
      reason,
    });
    return { request, receipt, exitCode: 2 };
  }

  if (!subjectsMatch(request.subject, observed)) {
    const reason = 'observed Git subject does not match requested subject';
    const receipt = DeterministicValidationReceipt.parse({
      ...base,
      observed_subject: observed,
      correspondence: 'MISMATCH',
      checks: [{ id: 'subject-correspondence', status: 'FAIL', elapsed_ms: 0, reason }],
      conclusion: 'FAIL',
      reason,
    });
    return { request, receipt, exitCode: 1 };
  }

  const checks: ValidationCheckInput[] = [
    { id: 'subject-correspondence', status: 'PASS', elapsed_ms: 0 },
  ];

  for (const spec of TECNOTRON_PROMOTION_COMMANDS) {
    const result = hooks.executeCommand(spec, repositoryRoot);
    checks.push(checkInput(spec.id, result));
    if (result.status !== 'PASS') {
      const receipt = DeterministicValidationReceipt.parse({
        ...base,
        observed_subject: observed,
        correspondence: 'EXACT',
        checks,
        conclusion: result.status,
        reason: result.reason ?? `${spec.id} did not pass`,
      });
      return {
        request,
        receipt,
        exitCode: result.status === 'FAIL' ? 1 : 2,
      };
    }
  }

  const receipt = DeterministicValidationReceipt.parse({
    ...base,
    observed_subject: observed,
    correspondence: 'EXACT',
    checks,
    conclusion: 'PASS',
  });
  return { request, receipt, exitCode: 0 };
}

interface CliOptions {
  readonly repository: string;
  readonly subjectSha: string;
  readonly expectedTree?: string;
  readonly operationId?: string;
  readonly executionAttemptId?: string;
  readonly requestOutput: string;
  readonly receiptOutput: string;
}

function argumentMap(argv: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error('arguments must be provided as --key value pairs');
    }
    result.set(key.slice(2), value);
  }
  return result;
}

function required(map: Map<string, string>, key: string): string {
  const value = map.get(key);
  if (!value) throw new Error(`missing --${key}`);
  return value;
}

function cliOptions(argv: readonly string[]): CliOptions {
  const map = argumentMap(argv);
  const operationId = map.get('operation-id') || undefined;
  const executionAttemptId = map.get('execution-attempt-id') || undefined;
  if ((operationId === undefined) !== (executionAttemptId === undefined)) {
    throw new Error('operation-id and execution-attempt-id must be provided together');
  }

  const expectedTree = map.get('expected-tree') || undefined;
  return {
    repository: required(map, 'repository'),
    subjectSha: required(map, 'subject-sha'),
    requestOutput: required(map, 'request-output'),
    receiptOutput: required(map, 'receipt-output'),
    ...(expectedTree === undefined ? {} : { expectedTree }),
    ...(operationId === undefined ? {} : { operationId }),
    ...(executionAttemptId === undefined ? {} : { executionAttemptId }),
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable ${name}`);
  return value;
}

function executionFromEnvironment(): GitHubActionsExecutionRefInput {
  const attempt = Number.parseInt(requiredEnv('GITHUB_RUN_ATTEMPT'), 10);
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error('GITHUB_RUN_ATTEMPT must be a positive integer');
  }
  return {
    provider: 'github-actions',
    run_id: requiredEnv('GITHUB_RUN_ID'),
    run_attempt: attempt,
    workflow_ref: requiredEnv('GITHUB_WORKFLOW_REF'),
    workflow_sha: requiredEnv('GITHUB_WORKFLOW_SHA'),
  };
}

function writeJson(target: string, value: unknown): void {
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function runCli(argv: readonly string[]): number {
  const options = cliOptions(argv);
  const rawRequest: DeterministicValidationRequestInput = {
    schema_version: 'tecnotron-deterministic-validation-request/v0',
    subject: {
      repository: options.repository,
      commit: options.subjectSha,
      ...(options.expectedTree === undefined ? {} : { tree: options.expectedTree }),
    },
    profile: TECNOTRON_PROMOTION_PROFILE,
    ...(
      options.operationId === undefined || options.executionAttemptId === undefined
        ? {}
        : {
            correlation: {
              operation_id: options.operationId,
              execution_attempt_id: options.executionAttemptId,
            },
          }
    ),
    evidence_refs: [],
  };

  const execution = executionFromEnvironment();
  const result = runTecnotronDeterministicValidation(rawRequest, execution);
  writeJson(options.requestOutput, result.request);
  writeJson(options.receiptOutput, result.receipt);
  return result.exitCode;
}

if (require.main === module) {
  try {
    process.exitCode = runCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
