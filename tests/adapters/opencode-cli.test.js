'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  ADAPTER_ID,
  ADAPTER_VERSION,
  SUPPORTED_OPENCODE_VERSION,
  CAPABILITY_MATRIX,
  CONFIG_SOURCE_MAP,
  OpenCodeCLIError,
  resolveOpenCodeCommand,
  runOpenCodeProcess,
  findExecutable,
  discoverVersion,
  isVersionSupported,
  observeConfig,
  probeCapabilities,
  normalizePermissionRules,
  buildEffectiveConfig,
  parseJsonOutput,
  observeIdentity,
  compareIdentity,
  proveEffectiveConfig,
  createOpenCodeCLIAdapter,
} = require('../../src/adapters/opencode-cli');

test('adapter exports have correct constants', () => {
  assert.strictEqual(ADAPTER_ID, 'opencode-cli');
  assert.strictEqual(typeof ADAPTER_VERSION, 'string');
  assert.strictEqual(SUPPORTED_OPENCODE_VERSION, '1.18.29');
});

test('capability matrix does not claim security enforcement without runtime proof', () => {
  assert.strictEqual(CAPABILITY_MATRIX.repository_read, null);
  assert.strictEqual(CAPABILITY_MATRIX.filesystem_write, null);
  assert.strictEqual(CAPABILITY_MATRIX.web, null);
  assert.strictEqual(typeof CAPABILITY_MATRIX.enforcement, 'object');
  for (const value of Object.values(CAPABILITY_MATRIX.enforcement)) assert.strictEqual(value, null);
});

test('config source map preserves unprovable provenance', () => {
  assert.strictEqual(CONFIG_SOURCE_MAP.remote, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.organizational, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.global, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.personal, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.custom, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.project, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.managed, 'unproven');
  assert.strictEqual(CONFIG_SOURCE_MAP.inline, 'unproven');
});

test('Windows npm shim resolves to node without shell execution', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-shim-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'node_modules', 'opencode-ai', 'bin', 'opencode');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'process.stdout.write("ok");\n');
  const shim = path.join(root, 'opencode.cmd');
  fs.writeFileSync(shim, '@ECHO off\r\n"%dp0%\\node.exe" "%dp0%\\node_modules\\opencode-ai\\bin\\opencode" %*\r\n');

  const resolved = resolveOpenCodeCommand(shim, { platform: 'win32' });

  assert.strictEqual(resolved.command, process.execPath);
  assert.deepStrictEqual(resolved.prefixArgs, [target]);
});

test('Windows npm shim executes a native OpenCode target directly', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-native-shim-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'node_modules', 'opencode-ai', 'bin', 'opencode.exe');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'native-placeholder');
  const shim = path.join(root, 'opencode.cmd');
  fs.writeFileSync(shim, '@ECHO off\r\n"%dp0%\\node_modules\\opencode-ai\\bin\\opencode.exe" %*\r\n');

  const resolved = resolveOpenCodeCommand(shim, { platform: 'win32' });

  assert.strictEqual(resolved.command, target);
  assert.deepStrictEqual(resolved.prefixArgs, []);
});

test('process arguments remain separate when actor text contains shell metacharacters', () => {
  const calls = [];
  runOpenCodeProcess('C:/tools/opencode.exe', ['run', '--', 'safe & calc.exe'], {
    cwd: 'C:/work',
    environment: { PATH: 'C:/Windows/System32' },
    timeoutMs: 1000,
    processRunner: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout: '{}', stderr: '' };
    },
  });

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].command, 'C:/tools/opencode.exe');
  assert.deepStrictEqual(calls[0].args, ['run', '--', 'safe & calc.exe']);
  assert.strictEqual(calls[0].options.shell, false);
});

test('isVersionSupported only accepts exact observed version', () => {
  assert.strictEqual(isVersionSupported('1.18.29'), true);
  assert.strictEqual(isVersionSupported('1.18.21'), false);
  assert.strictEqual(isVersionSupported('1.18.0'), false);
  assert.strictEqual(isVersionSupported('1.18.99'), false);
  assert.strictEqual(isVersionSupported('1.19.0'), false);
  assert.strictEqual(isVersionSupported('2.0.0'), false);
  assert.strictEqual(isVersionSupported(null), false);
  assert.strictEqual(isVersionSupported(undefined), false);
  assert.strictEqual(isVersionSupported(''), false);
  assert.strictEqual(isVersionSupported('invalid'), false);
});

test('parseJsonOutput handles valid JSON and invalid output', () => {
  const valid = parseJsonOutput('{"model":"test"}', 0);
  assert.deepStrictEqual(valid, { model: 'test' });

  const multiline = parseJsonOutput('line1\n{"model":"test"}\nline2', 0);
  assert.deepStrictEqual(multiline, { model: 'test' });

  const invalid = parseJsonOutput('not json', 0);
  assert.strictEqual(invalid, null);

  const empty = parseJsonOutput('', 0);
  assert.strictEqual(empty, null);

  const nullOutput = parseJsonOutput(null, 0);
  assert.strictEqual(nullOutput, null);
});

test('observeIdentity extracts model, provider, runtime, version', () => {
  const output = { model: 'model-1', provider: 'provider-1', runtime: 'runtime-1', version: '1.0.0' };
  const result = observeIdentity(output, null);
  assert.strictEqual(result.model, 'model-1');
  assert.strictEqual(result.provider, 'provider-1');
  assert.strictEqual(result.runtime, 'runtime-1');
  assert.strictEqual(result.version, '1.0.0');

  const nullOutput = observeIdentity(null, null);
  assert.strictEqual(nullOutput.model, null);
  assert.strictEqual(nullOutput.provider, null);
  assert.strictEqual(nullOutput.runtime, null);
  assert.strictEqual(nullOutput.version, null);

  assert.deepStrictEqual(observeIdentity({ model: {}, provider: '', runtime: 42, version: [] }), {
    model: null,
    provider: null,
    runtime: null,
    version: null,
  });
});

test('compareIdentity detects match and mismatch', () => {
  const resolved = {
    resolved_model_ref: 'model-1',
    resolved_provider_ref: 'provider-1',
    resolved_runtime_ref: 'runtime-1',
  };

  const matching = { model: 'model-1', provider: 'provider-1', runtime: 'runtime-1' };
  const result1 = compareIdentity(resolved, matching);
  assert.strictEqual(result1.match, true);
  assert.deepStrictEqual(result1.mismatches, []);

  const mismatch = { model: 'different-model', provider: 'provider-1', runtime: 'runtime-1' };
  const result2 = compareIdentity(resolved, mismatch);
  assert.strictEqual(result2.match, false);
  assert.ok(result2.mismatches.includes('model'));

  const providerMismatch = { model: 'model-1', provider: 'different-provider', runtime: 'runtime-1' };
  const result3 = compareIdentity(resolved, providerMismatch);
  assert.strictEqual(result3.match, false);
  assert.ok(result3.mismatches.includes('provider'));

  const runtimeMismatch = { model: 'model-1', provider: 'provider-1', runtime: 'different-runtime' };
  assert.deepStrictEqual(compareIdentity(resolved, runtimeMismatch).mismatches, ['runtime']);

  assert.deepStrictEqual(
    compareIdentity(resolved, { model: 'model-1', provider: null, runtime: 'runtime-1' }).mismatches,
    ['provider'],
  );
});

test('buildEffectiveConfig does not inject cwd or project unproven runtime config', () => {
  const projectedConfig = {
    schema_version: 'tecnotron-opencode-config-projection/v1',
    profile_id: 'spec_analyst',
    identity: {
      resolved_model_ref: 'model-1',
      resolved_provider_ref: 'provider-1',
      resolved_runtime_ref: 'runtime-1',
      model_resolution_ref: 'sha256:' + 'a'.repeat(64),
    },
    permissions: { default: 'deny', filesystem_write: { mode: 'denied', scope: [] } },
    environment: { inherit: false, names: ['PATH'] },
    config_sources: CONFIG_SOURCE_MAP,
    runtime: { sharing: 'denied', autoupdate: 'denied' },
  };

  const observedConfig = { model: 'observed-model', provider: { local: {} } };
  const effective = buildEffectiveConfig({
    projectedConfig,
    invocation: { cwd: '/task/worktree' },
    observedConfig,
  });

  assert.strictEqual(effective, null);
  assert.strictEqual(Object.hasOwn(projectedConfig.identity, 'cwd'), false);
});

test('buildEffectiveConfig rejects ambiguous permission rule effects', () => {
  const projectedConfig = {
    schema_version: 'tecnotron-opencode-config-projection/v1',
    profile_id: 'spec_analyst',
    identity: {
      resolved_model_ref: 'model-1',
      resolved_provider_ref: 'provider-1',
      resolved_runtime_ref: 'runtime-1',
      model_resolution_ref: 'sha256:' + 'a'.repeat(64),
    },
    permissions: {
      default: 'deny',
      filesystem_write: { mode: 'task_owned_source', scope: ['src/**'] },
      command_execution: 'denied',
    },
    environment: { inherit: false, names: ['PATH'] },
    config_sources: CONFIG_SOURCE_MAP,
    runtime: { sharing: 'denied', autoupdate: 'denied' },
  };

  const agentConfig = {
    permission: [
      { permission: 'bash', pattern: '*', action: 'deny' },
      { permission: 'bash', pattern: 'git status', action: 'allow' },
    ],
  };

  const effective = buildEffectiveConfig({
    projectedConfig,
    agentConfig,
  });

  assert.strictEqual(effective, null);
});

test('permission rule normalization only classifies precedence-independent effects', () => {
  assert.deepStrictEqual(
    normalizePermissionRules(
      [{ permission: 'bash', pattern: '*', action: 'deny' }],
      'bash',
      'denied',
    ),
    { status: 'SAFELY_NARROWER', effect: 'denied' },
  );
  assert.deepStrictEqual(
    normalizePermissionRules(
      [{ permission: 'bash', pattern: '*', action: 'allow' }],
      'bash',
      'denied',
    ),
    { status: 'BROADER', effect: 'allowed' },
  );
  assert.deepStrictEqual(
    normalizePermissionRules([
      { permission: 'bash', pattern: '*', action: 'deny' },
      { permission: 'bash', pattern: 'git status', action: 'allow' },
    ], 'bash', 'denied'),
    { status: 'UNPROVABLE', effect: null },
  );
});

test('createOpenCodeCLIAdapter returns adapter with correct interface', () => {
  const adapter = createOpenCodeCLIAdapter({ versionCheck: false });
  assert.strictEqual(adapter.id, 'opencode-cli');
  assert.strictEqual(typeof adapter.version, 'string');
  assert.strictEqual(typeof adapter.discover, 'function');
  assert.strictEqual(typeof adapter.getObservedConfig, 'function');
  assert.strictEqual(typeof adapter.getCapabilities, 'function');
  assert.strictEqual(typeof adapter.effectiveConfigProbe, 'function');
  assert.strictEqual(typeof adapter.invoke, 'function');
});

test('adapter getCapabilities returns explicit unknowns for permission projection', () => {
  const adapter = createOpenCodeCLIAdapter({
    executablePath: 'C:/tools/opencode.exe',
    processRunner: (command, args) => ({
      status: 0,
      stdout: args[0] === '--version' ? '1.18.29\n' : '{}',
      stderr: '',
    }),
  });
  assert.deepStrictEqual(adapter.getCapabilities(), CAPABILITY_MATRIX);
});

test('adapter effectiveConfigProbe uses the intended cwd, child environment, and agent', () => {
  const calls = [];
  const adapter = createOpenCodeCLIAdapter({
    executablePath: 'C:/tools/opencode.exe',
    processRunner: (command, args, options) => {
      calls.push({ command, args, options });
      if (args[0] === '--version') return { status: 0, stdout: '1.18.29\n', stderr: '' };
      return { status: 0, stdout: '{}', stderr: '' };
    },
  });
  const projectedConfig = {
    schema_version: 'tecnotron-opencode-config-projection/v1',
    profile_id: 'spec_analyst',
    identity: {
      resolved_model_ref: 'model-1',
      resolved_provider_ref: 'provider-1',
      resolved_runtime_ref: 'runtime-1',
      model_resolution_ref: 'sha256:' + 'a'.repeat(64),
    },
    permissions: { default: 'deny' },
    environment: { inherit: false, names: ['PATH'] },
    config_sources: CONFIG_SOURCE_MAP,
    runtime: { sharing: 'denied', autoupdate: 'denied' },
  };

  const environment = { PATH: 'C:/Windows/System32', LANG: 'C' };
  const result = adapter.effectiveConfigProbe({
    projected_config: projectedConfig,
    invocation: { cwd: 'C:/task/worktree', profile: 'spec_analyst' },
    environment,
    agent_name: 'spec_analyst',
  });

  assert.strictEqual(result.effective_config, null);
  const probes = calls.filter((call) => call.args[0] === 'debug');
  assert.deepStrictEqual(probes.map((call) => call.args), [
    ['debug', 'config'],
    ['debug', 'agent', 'spec_analyst'],
  ]);
  for (const probe of probes) {
    assert.strictEqual(probe.options.cwd, 'C:/task/worktree');
    assert.strictEqual(probe.options.env, environment);
  }
});

test('adapter observed config requires and uses explicit process coordinates', () => {
  const calls = [];
  const adapter = createOpenCodeCLIAdapter({
    executablePath: 'C:/tools/opencode.exe',
    processRunner: (command, args, options) => {
      calls.push({ args, options });
      if (args[0] === '--version') return { status: 0, stdout: '1.18.29\n', stderr: '' };
      return { status: 0, stdout: '{"model":"local/test"}', stderr: '' };
    },
  });
  const environment = { PATH: 'C:/Windows/System32' };

  assert.strictEqual(adapter.getObservedConfig(), null);
  assert.deepStrictEqual(adapter.getObservedConfig({ cwd: 'C:/task/worktree', environment }), { model: 'local/test' });
  const debugCall = calls.find((call) => call.args[0] === 'debug');
  assert.strictEqual(debugCall.options.cwd, 'C:/task/worktree');
  assert.strictEqual(debugCall.options.env, environment);
});

test('adapter discover throws OpenCodeCLIError when executable not found', () => {
  const adapter = createOpenCodeCLIAdapter({ executablePath: '/nonexistent/opencode', versionCheck: false });
  try {
    adapter.discover();
    assert.fail('Expected OpenCodeCLIError to be thrown');
  } catch (error) {
    assert.ok(error instanceof OpenCodeCLIError);
    assert.ok(
      error.reasonCode === 'OPENCODE_NOT_FOUND' || error.reasonCode === 'OPENCODE_VERSION_UNSUPPORTED',
      `Expected OPENCODE_NOT_FOUND or OPENCODE_VERSION_UNSUPPORTED, got ${error.reasonCode}`,
    );
  }
});

test('OpenCodeCLIError has correct properties', () => {
  const error = new OpenCodeCLIError('TEST_REASON', 'TEST_STATUS', 'TEST_PHASE');
  assert.strictEqual(error.name, 'OpenCodeCLIError');
  assert.strictEqual(error.reasonCode, 'TEST_REASON');
  assert.strictEqual(error.status, 'TEST_STATUS');
  assert.strictEqual(error.phase, 'TEST_PHASE');
  assert.ok(error instanceof Error);
});

test('capability matrix is frozen', () => {
  assert.ok(Object.isFrozen(CAPABILITY_MATRIX));
  assert.ok(Object.isFrozen(CAPABILITY_MATRIX.enforcement));
});

test('config source map is frozen', () => {
  assert.ok(Object.isFrozen(CONFIG_SOURCE_MAP));
});
