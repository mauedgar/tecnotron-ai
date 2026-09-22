'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');

const {
  SUPPORTED_OPENCODE_VERSION,
  SUPPORTED_OPENCODE_VERSIONS,
  OpenCodeSurfaceError,
  resolveOpenCodeCommand,
  sanitizeEnvironment,
  buildDirectPermissionProjectionRules,
  buildInlineConfig,
  isVersionSupported,
  parseJsonOutput,
  validateOpenCodeEvents,
  runOpenCodeProcess,
  assertEffectivePermissionBoundary,
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

function conformingAgentConfig({ write = true, webAllowed = false } = {}) {
  return {
    permission: [
      // Existing harness/project capabilities can be broad. The supported v1
      // permission model is ordered and the final matching rule wins.
      { permission: '*', pattern: '*', action: 'allow' },
      { permission: 'bash', pattern: '*', action: 'allow' },
      { permission: 'task', pattern: '*', action: 'deny' },
      { permission: 'skill', pattern: '*', action: 'allow' },
      ...buildDirectPermissionProjectionRules({
        readScopes: ['**'],
        writeScopes: write ? ['src/**'] : [],
        webAllowed,
      }),
    ],
  };
}

function mockRunner({
  run = { exitCode: 0, stdout: JSON.stringify({
      type: 'text',
      timestamp: 1,
      sessionID: 'session-1',
      part: {
        id: 'part-1',
        messageID: 'message-1',
        sessionID: 'session-1',
        type: 'text',
        text: 'ok',
      },
    }) + '\n' , stderr: '' },
  resolvedConfig = conformingConfig(),
  agentConfig = conformingAgentConfig(),
} = {}) {
  const calls = [];
  const runner = async (_executable, args, options) => {
    calls.push({ args: [...args], options });
    if (args[0] === 'debug' && args[1] === 'config') {
      return { exitCode: 0, stdout: JSON.stringify(resolvedConfig), stderr: '' };
    }
    if (args[0] === 'debug' && args[1] === 'agent') {
      return { exitCode: 0, stdout: JSON.stringify(agentConfig), stderr: '' };
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

test('unsupported OpenCode version cannot bypass exact tested support at adapter construction', async () => {
  const { runner, calls } = mockRunner();
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    versionCheck: false,
    syncRunner: () => ({ status: 0, stdout: 'opencode 9.9.9\n', stderr: '' }),
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.started, false);
  assert.equal(result.reason, 'OPENCODE_VERSION_UNSUPPORTED');
  assert.equal(calls.length, 0);
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

test('inline config projects only direct portable permissions and does not author harness capabilities', () => {
  const config = buildInlineConfig({
    actorId: 'implementer',
    readScopes: ['src/**'],
    writeScopes: [],
    webAllowed: false,
  });
  assert.deepEqual(config, {
    autoupdate: false,
    share: 'disabled',
    agent: {
      implementer: {
        permission: {
          read: { '*': 'deny', 'src/**': 'allow' },
          edit: { '*': 'deny' },
          webfetch: 'deny',
          websearch: 'deny',
          external_directory: 'deny',
        },
      },
    },
  });
  assert.equal(Object.hasOwn(config, 'permission'), false);
  assert.equal(Object.hasOwn(config, 'mcp'), false);
  assert.equal(Object.hasOwn(config, 'plugin'), false);
  assert.equal(Object.hasOwn(config.agent.implementer.permission, 'skill'), false);
  assert.equal(Object.hasOwn(config.agent.implementer.permission, 'bash'), false);
  assert.equal(Object.hasOwn(config.agent.implementer.permission, 'task'), false);
});

test('JSON output normalization accepts one JSON value or newline-delimited events', () => {
  assert.deepEqual(parseJsonOutput('{"a":1}'), [{ a: 1 }]);
  assert.deepEqual(parseJsonOutput('{"a":1}\n{"b":2}\n'), [{ a: 1 }, { b: 2 }]);
  assert.equal(parseJsonOutput('not-json'), null);
});

test('semantic OpenCode output validator enforces the supported v1.18.31 event envelope and payload shapes', () => {
  const textEvent = {
    type: 'text',
    timestamp: 1,
    sessionID: 'session-1',
    part: {
      id: 'part-1',
      messageID: 'message-1',
      sessionID: 'session-1',
      type: 'text',
      text: 'ok',
    },
  };
  const stepStartEvent = {
    type: 'step_start',
    timestamp: 2,
    sessionID: 'session-1',
    part: {
      id: 'part-2',
      messageID: 'message-1',
      sessionID: 'session-1',
      type: 'step-start',
    },
  };

  assert.equal(validateOpenCodeEvents([textEvent, stepStartEvent]), true);
  assert.equal(validateOpenCodeEvents([{ ...textEvent, timestamp: undefined }]), false);
  assert.equal(validateOpenCodeEvents([{ ...textEvent, sessionID: undefined }]), false);
  assert.equal(validateOpenCodeEvents([{ type: 'text', text: 'forged-top-level-text' }]), false);
  assert.equal(validateOpenCodeEvents([{
    type: 'text',
    timestamp: 1,
    sessionID: 'session-1',
    part: { type: 'text', text: 'ok' },
  }]), false);
  assert.equal(validateOpenCodeEvents([{
    type: 'tool_use',
    timestamp: 1,
    sessionID: 'session-1',
    part: {},
  }]), false);
  assert.equal(validateOpenCodeEvents([{
    type: 'step_start',
    timestamp: 1,
    sessionID: 'session-1',
    part: {},
  }]), false);
  assert.equal(validateOpenCodeEvents([{ unexpected: 'shape' }]), false);
  assert.equal(validateOpenCodeEvents([{ type: 'unknown-event', timestamp: 1, sessionID: 'session-1' }]), false);
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


test('surface blocks write scope when authorization contains no write effect', async () => {
  const { runner, calls } = mockRunner();
  const request = validRequest();
  request.authorization.effect_constraints = [
    { effect: 'repository_read', scope: 'candidate-only' },
  ];

  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(request);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.started, false);
  assert.equal(result.reason, 'WRITE_EFFECT_NOT_AUTHORIZED');
  assert.equal(calls.length, 0);
});

test('surface accepts earlier wildcard allow when final ordered projection narrows direct permissions', async () => {
  const { runner, calls } = mockRunner({ agentConfig: conformingAgentConfig() });
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.started, true);
  assert.equal(calls.length, 3);
  assert.equal(
    result.result.execution_surface.config_proof.permission_conformance
      .direct_permission_conformance.proof_semantics,
    'ORDERED_LAST_MATCH_SEMANTIC_CONFORMANCE',
  );
});


test('semantic permission proof accepts a runtime-managed allow confined to the isolated adapter root', () => {
  const isolationRoot = path.join(process.cwd(), '.tmp-runtime-root');
  const rules = conformingAgentConfig();
  rules.permission.push({
    permission: 'external_directory',
    pattern: `${isolationRoot.replaceAll('\\', '/')}/*`,
    action: 'allow',
  });

  const proof = assertEffectivePermissionBoundary({
    agentConfig: rules,
    readScopes: ['**'],
    writeScopes: ['src/**'],
    webAllowed: false,
    isolationRoot,
  });

  assert.equal(proof.non_broadening, true);
  assert.equal(
    proof.direct_permission_conformance.trailing_rule_classification[0].classification,
    'RUNTIME_ISOLATION_ROOT_ONLY',
  );
});

test('semantic permission proof rejects root-prefix wildcard escapes without a directory boundary', () => {
  const isolationRoot = path.join(process.cwd(), '.tmp-runtime-root');

  for (const suffix of ['*', '?']) {
    const rules = conformingAgentConfig();
    rules.permission.push({
      permission: 'external_directory',
      pattern: `${isolationRoot.replaceAll('\\', '/')}${suffix}`,
      action: 'allow',
    });

    assert.throws(
      () => assertEffectivePermissionBoundary({
        agentConfig: rules,
        readScopes: ['**'],
        writeScopes: ['src/**'],
        webAllowed: false,
        isolationRoot,
      }),
      (error) => error instanceof OpenCodeSurfaceError
        && error.reasonCode === 'EFFECTIVE_PERMISSION_BROADENING'
        && String(error.details).includes('MATERIAL_DIRECT_PERMISSION_EXPANSION'),
    );
  }
});

test('semantic permission proof accepts wildcard descendants only after the isolation-root separator', () => {
  const isolationRoot = path.join(process.cwd(), '.tmp-runtime-root');

  for (const descendantPattern of ['/*', '/**', '/child*']) {
    const rules = conformingAgentConfig();
    rules.permission.push({
      permission: 'external_directory',
      pattern: `${isolationRoot.replaceAll('\\', '/')}${descendantPattern}`,
      action: 'allow',
    });

    const proof = assertEffectivePermissionBoundary({
      agentConfig: rules,
      readScopes: ['**'],
      writeScopes: ['src/**'],
      webAllowed: false,
      isolationRoot,
    });
    assert.equal(proof.non_broadening, true);
  }
});

test('semantic permission proof rejects a runtime-managed-looking allow outside the isolated adapter root', () => {
  const isolationRoot = path.join(process.cwd(), '.tmp-runtime-root');
  const rules = conformingAgentConfig();
  rules.permission.push({
    permission: 'external_directory',
    pattern: path.resolve(process.cwd(), '..').replaceAll('\\', '/') + '/*',
    action: 'allow',
  });

  assert.throws(
    () => assertEffectivePermissionBoundary({
      agentConfig: rules,
      readScopes: ['**'],
      writeScopes: ['src/**'],
      webAllowed: false,
      isolationRoot,
    }),
    (error) => error instanceof OpenCodeSurfaceError
      && error.reasonCode === 'EFFECTIVE_PERMISSION_BROADENING'
      && String(error.details).includes('MATERIAL_DIRECT_PERMISSION_EXPANSION'),
  );
});

test('semantic permission proof accepts later deny as safely narrower', () => {
  const rules = conformingAgentConfig();
  rules.permission.push({ permission: 'edit', pattern: 'src/generated/**', action: 'deny' });

  const proof = assertEffectivePermissionBoundary({
    agentConfig: rules,
    readScopes: ['**'],
    writeScopes: ['src/**'],
    webAllowed: false,
    isolationRoot: process.cwd(),
  });

  assert.equal(proof.non_broadening, true);
  assert.equal(
    proof.direct_permission_conformance.trailing_rule_classification[0].classification,
    'SAFELY_NARROWER_DENY',
  );
});

test('semantic permission proof rejects later ask because interactive expansion is not authorized', () => {
  const rules = conformingAgentConfig();
  rules.permission.push({ permission: 'edit', pattern: '*', action: 'ask' });

  assert.throws(
    () => assertEffectivePermissionBoundary({
      agentConfig: rules,
      readScopes: ['**'],
      writeScopes: ['src/**'],
      webAllowed: false,
      isolationRoot: process.cwd(),
    }),
    (error) => error instanceof OpenCodeSurfaceError
      && error.reasonCode === 'EFFECTIVE_PERMISSION_BROADENING'
      && String(error.details).includes('INTERACTIVE_EXPANSION_UNPROVABLE'),
  );
});

test('surface blocks a later effective edit rule that broadens beyond the ordered projection', async () => {
  const broadAgentConfig = conformingAgentConfig();
  broadAgentConfig.permission.push({ permission: 'edit', pattern: '*', action: 'allow' });

  const { runner, calls } = mockRunner({ agentConfig: broadAgentConfig });
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.started, false);
  assert.equal(result.reason, 'EFFECTIVE_PERMISSION_BROADENING');
  assert.equal(calls.length, 2);
});

test('surface blocks a later effective web allow when web was not requested', async () => {
  const webAgentConfig = conformingAgentConfig();
  webAgentConfig.permission.push({ permission: 'websearch', pattern: '*', action: 'allow' });

  const { runner, calls } = mockRunner({ agentConfig: webAgentConfig });
  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:selected',
    syncRunner: syncVersionRunner,
    processRunner: runner,
  });

  const result = await surface.execute(validRequest());
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.started, false);
  assert.equal(result.reason, 'EFFECTIVE_PERMISSION_BROADENING');
  assert.equal(calls.length, 2);
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


test('surface fails closed on syntactically valid but semantically unknown JSON output', async () => {
  const { runner } = mockRunner({
    run: {
      exitCode: 0,
      stdout: '{"unexpected":"shape"}\n',
      stderr: '',
      timedOut: false,
      aborted: false,
    },
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
  assert.equal(result.reason, 'OUTPUT_CONTRACT_VIOLATION');
});
