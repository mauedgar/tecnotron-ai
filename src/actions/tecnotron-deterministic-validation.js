"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TECNOTRON_PROMOTION_PROFILE = void 0;
exports.observeExactSubject = observeExactSubject;
exports.executeValidationCommand = executeValidationCommand;
exports.runTecnotronDeterministicValidation = runTecnotronDeterministicValidation;
exports.runCli = runCli;
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const deterministic_validation_1 = require("../contracts/deterministic-validation");
exports.TECNOTRON_PROMOTION_PROFILE = {
    id: 'tecnotron-promotion',
    version: 'v0',
};
const TECNOTRON_PROMOTION_COMMANDS = [
    { id: 'dependency-scripts', command: 'npm', args: ['rebuild'] },
    { id: 'workspace-verify', command: 'npm', args: ['run', 'workspace:verify'] },
    { id: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
    { id: 'build', command: 'npm', args: ['run', 'build'] },
    { id: 'tests', command: 'npm', args: ['test'] },
    { id: 'contracts-check', command: 'npm', args: ['run', 'contracts:check'] },
];
function gitValue(repositoryRoot, args) {
    const result = (0, node_child_process_1.spawnSync)('git', args, {
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
function observeExactSubject(repositoryRoot, repository) {
    return {
        repository,
        commit: gitValue(repositoryRoot, ['rev-parse', 'HEAD']),
        tree: gitValue(repositoryRoot, ['rev-parse', 'HEAD^{tree}']),
    };
}
function executeValidationCommand(spec, repositoryRoot) {
    const started = process.hrtime.bigint();
    const result = (0, node_child_process_1.spawnSync)(spec.command, [...spec.args], {
        cwd: repositoryRoot,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: true,
    });
    const elapsed_ms = Number((process.hrtime.bigint() - started) / 1000000n);
    if (result.error) {
        const code = result.error.code;
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
const defaultHooks = {
    observeSubject: observeExactSubject,
    executeCommand: executeValidationCommand,
};
function checkInput(id, result) {
    return {
        id,
        status: result.status,
        elapsed_ms: result.elapsed_ms,
        ...(result.reason === undefined ? {} : { reason: result.reason }),
    };
}
function receiptBase(request, execution) {
    return {
        schema_version: 'tecnotron-deterministic-validation-receipt/v0',
        requested_subject: request.subject,
        profile: request.profile,
        execution,
        effect_state: 'NONE',
        artifact_refs: [],
        evidence_refs: request.evidence_refs,
    };
}
function subjectsMatch(requested, observed) {
    if (requested.repository !== observed.repository)
        return false;
    if (requested.commit !== observed.commit)
        return false;
    if (requested.tree !== undefined && requested.tree !== observed.tree)
        return false;
    return true;
}
function runTecnotronDeterministicValidation(rawRequest, execution, repositoryRoot = process.cwd(), hooks = defaultHooks) {
    const request = deterministic_validation_1.DeterministicValidationRequest.parse(rawRequest);
    const base = receiptBase(request, execution);
    if (request.profile.id !== exports.TECNOTRON_PROMOTION_PROFILE.id ||
        request.profile.version !== exports.TECNOTRON_PROMOTION_PROFILE.version) {
        const reason = `unsupported validation profile: ${request.profile.id}@${request.profile.version}`;
        const receipt = deterministic_validation_1.DeterministicValidationReceipt.parse({
            ...base,
            observed_subject: null,
            correspondence: 'UNKNOWN',
            checks: [{ id: 'profile', status: 'BLOCKED', elapsed_ms: 0, reason }],
            conclusion: 'BLOCKED',
            reason,
        });
        return { request, receipt, exitCode: 2 };
    }
    let observed;
    try {
        observed = hooks.observeSubject(repositoryRoot, request.subject.repository);
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const receipt = deterministic_validation_1.DeterministicValidationReceipt.parse({
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
        const receipt = deterministic_validation_1.DeterministicValidationReceipt.parse({
            ...base,
            observed_subject: observed,
            correspondence: 'MISMATCH',
            checks: [{ id: 'subject-correspondence', status: 'FAIL', elapsed_ms: 0, reason }],
            conclusion: 'FAIL',
            reason,
        });
        return { request, receipt, exitCode: 1 };
    }
    const checks = [
        { id: 'subject-correspondence', status: 'PASS', elapsed_ms: 0 },
    ];
    for (const spec of TECNOTRON_PROMOTION_COMMANDS) {
        const result = hooks.executeCommand(spec, repositoryRoot);
        checks.push(checkInput(spec.id, result));
        if (result.status !== 'PASS') {
            const receipt = deterministic_validation_1.DeterministicValidationReceipt.parse({
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
    const receipt = deterministic_validation_1.DeterministicValidationReceipt.parse({
        ...base,
        observed_subject: observed,
        correspondence: 'EXACT',
        checks,
        conclusion: 'PASS',
    });
    return { request, receipt, exitCode: 0 };
}
function argumentMap(argv) {
    const result = new Map();
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
function required(map, key) {
    const value = map.get(key);
    if (!value)
        throw new Error(`missing --${key}`);
    return value;
}
function cliOptions(argv) {
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
function requiredEnv(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`missing environment variable ${name}`);
    return value;
}
function executionFromEnvironment() {
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
function writeJson(target, value) {
    fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function runCli(argv) {
    const options = cliOptions(argv);
    const rawRequest = {
        schema_version: 'tecnotron-deterministic-validation-request/v0',
        subject: {
            repository: options.repository,
            commit: options.subjectSha,
            ...(options.expectedTree === undefined ? {} : { tree: options.expectedTree }),
        },
        profile: exports.TECNOTRON_PROMOTION_PROFILE,
        ...(options.operationId === undefined || options.executionAttemptId === undefined
            ? {}
            : {
                correlation: {
                    operation_id: options.operationId,
                    execution_attempt_id: options.executionAttemptId,
                },
            }),
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
    }
    catch (error) {
        process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
        process.exitCode = 2;
    }
}
