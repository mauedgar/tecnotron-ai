'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  SUPPORTED_OPENCODE_VERSION,
  SUPPORTED_OPENCODE_VERSIONS,
  OpenCodeSurfaceError,
  resolveOpenCodeCommand,
  sanitizeEnvironment,
  buildInlineConfig,
  isVersionSupported,
  parseJsonOutput,
  runOpenCodeProcess,
  createOpenCodeExecutionSurface,
} = require('../../src/adapters/opencode-cli');

function syncVersionRunner() {
  return {
    status: 0,
    stdout: `opencode ${SUPPORTED_OPENCODE_VERSION}\n`,
    stderr: '',
  };
}

function validRequest(overrides = {}) {
  return {
    operation_id: 'OP-001',
    execution_attempt_id: 'ATTEMPT-001',
    resolved_execution: {
      decision_ref: 'decision:001',
      actor_id: 'implementer',
      runtime_id: 'runtime:selected',
      model_id: 'provider-a/model-a',
      provider_id: 'provider-a',
    },
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: 'authority:001',
      effect_constraints: [
        { effect: 'repository_write', scope: 'candidate-only' },
      ],
    },
    harness_conformance: {
      disposition: 'CONFORMING',
      evidence_ref: 'evidence:harness:001',
    },
    evidence_refs: [],
    cancellation_requested: false,
    input: {
      cwd: process.cwd(),
      profile_id: 'implementer',
      message: ['Do the exact already-authorized work.'],
      context_files: ['README.md'],
      environment: { inherit: false, variables: { TECNOTRON_TASK_ID: 'TOF-W1-003' } },
      permissions: {
        read_scope: ['**'],
        write_scope: ['src/**'],
        web: false,
      },
      timeout_ms: 1000,
    },
    ...overrides,
  };
}

function conformingConfig() {
  return {
    autoupdate: false,
    share: 'disabled',
    mcp: {
      project_docs: { type: 'local', enabled: true },
    },
    plugin: ['project-observer'],
  };
}

function conformingAgentConfig({ write = true } = {}) {
  return {
    permission: [
      { permission: '*', pattern: '*', action: 'deny' },
      { permission: 'read', pattern: '**', action: 'allow' },
      { permission: 'edit', pattern: '*', action: 'deny' },
      ...(write ? [{ permission: 'edit', pattern: 'src/**', action: 'allow' }] : []),
      { permission: 'bash', pattern: '*', action: 'allow' },
      { permission: 'task', pattern: '*', action: 'deny' },
      { permission: 'external_directory', pattern: '*', action: 'deny' },
      { permission: 'skill', pattern: '*', action: 'allow' },
      { permission: 'webfetch', pattern: '*', action: 'deny' },
      { permission: 'websearch', pattern: '*', action: 'deny' },
    ],
  };
}

function mockRunner({ run = { exitCode: 0, stdout: '{"type":"text","text":"ok"}\n', stderr: '' } } = {}) {
  const calls = [];
  const runner = async (_executable, args, options) => {
    calls.push({ args: [...args], options });
    if (args[0] === 'debug' && args[1] === 'config') {
      return { exitCode: 0, stdout: JSON.stringify(conformingConfig()), stderr: '' };
    }
    if (args[0] === 'debug' && args[1] === 'agent') {
      return { exitCode: 0, stdout: JSON.stringify(conformingAgentConfig()), stderr: '' };
    }
    return { timedOut: false, aborted: false, ...run };
  };
  return { runner, calls };
}

test('tested OpenCode support boundary is explicit and version-specific', () => {
  assert.deepEqual(SUPPORTED_OPENCODE_VERSIONS, ['1.18.29', '1.18.31']);
  assert.equal(SUPPORTED_OPENCODE_VERSION, '1.18.31');
  assert.equal(isVersionSupported('1.18.29'), true);
  assert.equal(isVersionSupported('1.18.31'), true);
  assert.equal(isVersionSupported('1.18.30'), false);
  assert.equal(isVersionSupported('1.18.32'), false);
});

test('Windows .cmd resolution never invokes a shell', () => {
  const target = 'C:\\tools\\opencode\\node_modules\\opencode\\bin\\opencode.js';
  const resolved = resolveOpenCodeCommand('C:\\tools\\opencode\\opencode.cmd', {
    platform: 'win32',
    readFileSync: () => '@ECHO off\r\n"%dp0%\\node_modules\\opencode\\bin\\opencode.js" %*\r\n',
    existsSync: (value) => value === target,
  });
  assert.equal(resolved.command, process.execPath);
  assert.deepEqual(resolved.prefixArgs, [target]);
});

test('environment sanitization denies secrets, identity overrides and config overrides', () => {
  assert.throws(
    () => sanitizeEnvironment({ PATH: 'C:\\Windows' }, { OPENAI_API_KEY: 'x' }),
    (error) => error instanceof OpenCodeSurfaceError && error.reasonCode === 'ENVIRONMENT_VARIABLE_DENIED',
  );
  assert.throws(
    () => sanitizeEnvironment({ PATH: 'C:\\Windows' }, { MODEL_OVERRIDE: 'other' }),
    (error) => error.reasonCode === 'ENVIRONMENT_VARIABLE_DENIED',
  );
  assert.throws(
    () => sanitizeEnvironment({ PATH: 'C:\\Windows' }, { OPENCODE_CONFIG: 'other.json' }),
    (error) => error.reasonCode === 'ENVIRONMENT_VARIABLE_DENIED',
  );

  assert.deepEqual(
    sanitizeEnvironment({ PATH: 'C:\\Windows', HOME: 'should-not-inherit' }, { TECNOTRON_TASK_ID: 'T-1' }),
    { PATH: 'C:\\Windows', TECNOTRON_TASK_ID: 'T-1' },
  );
});

test('inline config controls only surface-local side effects and does not author harness capabilities', () => {
  const config = buildInlineConfig({
    actorId: 'implementer',
    readScopes: ['src/**'],
    writeScopes: [],
    webAllowed: false,
  });
  assert.deepEqual(config, {
    autoupdate: false,
    share: 'disabled',
  });
  assert.equal(Object.hasOwn(config, 'permission'), false);
  assert.equal(Object.hasOwn(config, 'mcp'), false);
  assert.equal(Object.hasOwn(config, 'plugin'), false);
  assert.equal(Object.hasOwn(config, 'agent'), false);
});

test('JSON output normalization accepts one JSON value or newline-delimited events', () => {
  assert.deepEqual(parseJsonOutput('{"a":1}'), [{ a: 1 }]);
  assert.deepEqual(parseJsonOutput('{"a":1}\n{"b":2}\n'), [{ a: 1 }, { b: 2 }]);
  assert.equal(parseJsonOutput('not-json'), null);
});

test('low-level process runner contains an aborted child through the injected tree killer', async () => {
  const controller = new AbortController();
  let killCalls = 0;

  const child = new EventEmitter();
  child.pid = 1234;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();

  const promise = runOpenCodeProcess(process.execPath, ['--version'], {
    cwd: process.cwd(),
    environment: {},
    timeoutMs: 1000,
    signal: controller.signal,
    processSpawner: () => child,
    killTree: () => {
      killCalls += 1;
      queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
    },
  });

  controller.abort();
  const result = await promise;
  assert.equal(killCalls, 1);
  assert.equal(result.aborted, true);
  assert.equal(result.exitCode, null);
});

test('surface transports exact resolved identity without routing or reselection', async () => {
  const { runner, calls } = mockRunner();
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
    systemEnvironment: { PATH: process.env.PATH || '/bin' },
  });

  const result = await surface.execute(validRequest());

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.started, true);

  const run = calls.at(-1);
  assert.deepEqual(run.args.slice(0, 8), [
    'run',
    '--agent',
    'implementer',
    '--model',
    'provider-a/model-a',
    '--format',
    'json',
    '--dir',
  ]);
  assert.equal(run.args[8], process.cwd());
  assert.equal(run.args.includes('--pure'), false);
  assert.ok(run.args.includes('--file'));
  assert.ok(run.args.includes('README.md'));
  assert.ok(!Object.hasOwn(run.options.environment, 'OPENAI_API_KEY'));

  assert.equal(result.result.execution_surface.actor_id, 'implementer');
  assert.equal(result.result.execution_surface.model_id, 'provider-a/model-a');
  assert.equal(result.result.execution_surface.provider_id, 'provider-a');
  assert.equal(result.result.execution_surface.runtime_id, 'runtime:selected');
});

test('surface fails closed before process invocation on runtime identity mismatch', async () => {
  const { runner, calls } = mockRunner();
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:other',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.started, false);
  assert.equal(result.reason, 'RUNTIME_IDENTITY_MISMATCH');
  assert.equal(calls.length, 0);
});

test('surface fails closed when provider and OpenCode model coordinate disagree', async () => {
  const { runner, calls } = mockRunner();
  const request = validRequest();
  request.resolved_execution.provider_id = 'provider-b';

  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(request);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'PROVIDER_MODEL_IDENTITY_MISMATCH');
  assert.equal(calls.length, 0);
});

test('surface observes project-scoped MCP/plugins/skills without originating harness policy', async () => {
  const { runner, calls } = mockRunner();
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(calls.length, 3);
  assert.equal(result.result.execution_surface.harness_conformance_ref, 'evidence:harness:001');
  assert.deepEqual(
    result.result.execution_surface.config_proof.capability_observation.mcp_entries,
    ['project_docs'],
  );
  assert.equal(result.result.execution_surface.config_proof.capability_observation.plugin_count, 1);
  assert.ok(
    result.result.execution_surface.config_proof.capability_observation.permission_names.includes('skill'),
  );
  assert.equal(
    result.result.execution_surface.config_proof.capability_observation.observed_not_authorized,
    true,
  );
});

test('surface reports timeout explicitly after confirmed invocation start', async () => {
  const { runner } = mockRunner({
    run: { exitCode: null, stdout: '', stderr: '', timedOut: true, aborted: false },
  });
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'CANCELLED');
  assert.equal(result.started, true);
  assert.equal(result.reason, 'OPENCODE_TIMEOUT');
});

test('surface fails closed on malformed machine-readable output', async () => {
  const { runner } = mockRunner({
    run: { exitCode: 0, stdout: 'not json', stderr: '', timedOut: false, aborted: false },
  });
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'FAILED');
  assert.equal(result.started, true);
  assert.equal(result.reason, 'MALFORMED_ADAPTER_OUTPUT');
});
