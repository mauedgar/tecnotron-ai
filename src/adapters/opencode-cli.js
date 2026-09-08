'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ADAPTER_ID = 'opencode-cli';
const ADAPTER_VERSION = '1.0.0';
const SUPPORTED_OPENCODE_VERSION = '1.18.29';

const CAPABILITY_MATRIX = Object.freeze({
  repository_read: null,
  filesystem_write: null,
  web: null,
  enforcement: Object.freeze({
    native_actor_shell_denied: null,
    scope_containment: null,
    delegation_denied: null,
    subagents_denied: null,
    task_spawning_denied: null,
    paid_api_denied: null,
    additional_tools_denied: null,
    additional_skills_denied: null,
    mcp_denied: null,
    plugins_denied: null,
    indirect_capability_routes_denied: null,
    unauthorized_web_denied: null,
    external_filesystem_denied: null,
  }),
});

const CONFIG_SOURCE_MAP = Object.freeze({
  remote: 'unproven',
  organizational: 'unproven',
  global: 'unproven',
  personal: 'unproven',
  custom: 'unproven',
  project: 'unproven',
  managed: 'unproven',
  inline: 'unproven',
});

class OpenCodeCLIError extends Error {
  constructor(reasonCode, status = 'UNAVAILABLE', phase = 'ADAPTER') {
    super(reasonCode);
    this.name = 'OpenCodeCLIError';
    this.reasonCode = reasonCode;
    this.status = status;
    this.phase = phase;
  }
}

function findExecutable() {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(locator, ['opencode'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
    shell: false,
  });
  if (result.status !== 0 || !result.stdout?.trim()) return null;
  const candidates = result.stdout.trim().split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  if (process.platform !== 'win32') return candidates[0] || null;
  return candidates.find((entry) => /\.exe$/i.test(entry))
    || candidates.find((entry) => /\.cmd$/i.test(entry))
    || null;
}

function resolveOpenCodeCommand(executablePath, { platform = process.platform, readFileSync = fs.readFileSync } = {}) {
  if (typeof executablePath !== 'string' || !executablePath || /[\r\n\0"]/u.test(executablePath)) {
    throw new OpenCodeCLIError('OPENCODE_NOT_FOUND');
  }
  if (platform !== 'win32' || !/\.cmd$/i.test(executablePath)) {
    return { command: executablePath, prefixArgs: [] };
  }

  let shim;
  try {
    shim = readFileSync(executablePath, 'utf8');
  } catch {
    throw new OpenCodeCLIError('OPENCODE_NOT_FOUND');
  }
  const targets = [...shim.matchAll(/"%dp0%\\([^"\r\n]+)"\s+%\*/gi)];
  const relativeTarget = targets.at(-1)?.[1];
  if (!relativeTarget || relativeTarget.split(/[\\/]/).some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new OpenCodeCLIError('OPENCODE_CONFORMANCE_UNAVAILABLE');
  }
  const target = path.resolve(path.dirname(executablePath), relativeTarget.replaceAll('\\', path.sep));
  if (!fs.existsSync(target)) throw new OpenCodeCLIError('OPENCODE_NOT_FOUND');
  if (/\.exe$/i.test(target)) return { command: target, prefixArgs: [] };
  return { command: process.execPath, prefixArgs: [target] };
}

function runOpenCodeProcess(executablePath, args, {
  cwd,
  environment,
  timeoutMs,
  processRunner = spawnSync,
} = {}) {
  const resolved = resolveOpenCodeCommand(executablePath);
  return processRunner(resolved.command, [...resolved.prefixArgs, ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: timeoutMs,
    env: environment || {},
    shell: false,
  });
}

function discoverVersion(executablePath, options = {}) {
  const result = runOpenCodeProcess(executablePath, ['--version'], {
    timeoutMs: 10000,
    ...options,
  });
  if (result.status !== 0 || result.error) {
    return null;
  }
  const output = result.stdout?.trim() || '';
  const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
  return versionMatch ? versionMatch[1] : null;
}

function isVersionSupported(version) {
  if (!version) return false;
  return version === SUPPORTED_OPENCODE_VERSION;
}

function observeConfig(executablePath, options = {}) {
  const result = runOpenCodeProcess(executablePath, ['debug', 'config'], { timeoutMs: 10000, ...options });
  if (result.status !== 0 || result.error) {
    return null;
  }
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }
}

function observeAgentConfig(executablePath, agentName, options = {}) {
  const result = runOpenCodeProcess(executablePath, ['debug', 'agent', agentName], { timeoutMs: 10000, ...options });
  if (result.status !== 0 || result.error) {
    return null;
  }
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }
}

function probeCapabilities() {
  return {
    source_categories: Object.entries(CONFIG_SOURCE_MAP)
      .map(([source, state]) => ({ source, state }))
      .sort((a, b) => a.source.localeCompare(b.source)),
    capabilities: [],
  };
}

function normalizePermissionRules(permissionRules, permission, projectedEffect) {
  if (!Array.isArray(permissionRules) || !permissionRules.length) {
    return { status: 'UNPROVABLE', effect: null };
  }
  const relevant = permissionRules.filter((rule) => rule?.permission === permission || rule?.permission === '*');
  if (!relevant.length || relevant.some((rule) => (
    !rule
    || typeof rule.pattern !== 'string'
    || !['allow', 'deny', 'ask'].includes(rule.action)
  ))) return { status: 'UNPROVABLE', effect: null };
  const actions = new Set(relevant.map((rule) => rule.action));
  if (actions.size !== 1 || actions.has('ask')) return { status: 'UNPROVABLE', effect: null };
  const action = relevant[0].action;
  if (action === 'deny') return { status: 'SAFELY_NARROWER', effect: 'denied' };
  if (projectedEffect === 'denied') return { status: 'BROADER', effect: 'allowed' };
  return { status: 'UNPROVABLE', effect: null };
}

function buildEffectiveConfig({ projectedConfig, observedConfig, agentConfig }) {
  if (!projectedConfig || !observedConfig || !Array.isArray(agentConfig?.permission)) return null;
  const permissionCoordinates = [
    ['bash', projectedConfig.permissions?.command_execution],
    ['edit', projectedConfig.permissions?.filesystem_write?.mode],
    ['task', projectedConfig.permissions?.task_spawning],
    ['external_directory', projectedConfig.permissions?.external_filesystem_access],
  ];
  const normalized = permissionCoordinates.map(([permission, ceiling]) => (
    normalizePermissionRules(agentConfig.permission, permission, ceiling)
  ));
  if (normalized.some(({ status }) => status === 'UNPROVABLE')) return null;

  // OpenCode 1.18.29 does not expose complete config-layer provenance, so a
  // Tecnotron effective configuration cannot be constructed from these views.
  return null;
}

function invokeOpenCode({ executablePath, cwd, agent, model, message, format, timeoutMs, environment, processRunner }) {
  const args = ['run'];

  if (agent) {
    args.push('--agent', agent);
  }

  if (model) {
    args.push('--model', model);
  }

  if (format) {
    args.push('--format', format);
  }

  if (cwd) {
    args.push('--dir', cwd);
  }

  if (message && message.length > 0) {
    args.push('--', ...message);
  }

  const startTime = new Date().toISOString();
  const result = runOpenCodeProcess(executablePath, args, {
    cwd,
    environment,
    timeoutMs,
    processRunner,
  });

  const endTime = new Date().toISOString();

  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    startTime,
    endTime,
    timedOut: result.status === null && result.error?.code === 'ETIMEDOUT',
  };
}

function parseJsonOutput(stdout) {
  if (!stdout || typeof stdout !== 'string') {
    return null;
  }
  try {
    const lines = stdout.trim().split('\n');
    for (const line of lines.reverse()) {
      if (line.startsWith('{')) {
        return JSON.parse(line);
      }
    }
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
}

function observeIdentity(output) {
  const observed = {
    model: null,
    provider: null,
    runtime: null,
    version: null,
  };

  for (const coordinate of ['model', 'provider', 'runtime']) {
    const value = output?.[coordinate];
    if (
      typeof value === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9._:/@#-]{0,511}$/.test(value)
      && !/(?:api[_-]?key|password|passwd|secret|bearer|token=)/i.test(value)
    ) observed[coordinate] = value;
  }
  if (typeof output?.version === 'string' && output.version.length > 0 && output.version.length <= 128) {
    observed.version = output.version;
  }

  return observed;
}

function compareIdentity(resolved, observed) {
  const mismatches = [];
  const coordinates = [
    ['model', 'resolved_model_ref'],
    ['provider', 'resolved_provider_ref'],
    ['runtime', 'resolved_runtime_ref'],
  ];
  for (const [observedKey, resolvedKey] of coordinates) {
    if (!resolved?.[resolvedKey] || !observed?.[observedKey] || resolved[resolvedKey] !== observed[observedKey]) {
      mismatches.push(observedKey);
    }
  }

  return {
    match: mismatches.length === 0,
    mismatches,
  };
}

function proveEffectiveConfig({ projectedConfig, invocation, environment, executablePath, agentName, processRunner }) {
  if (!invocation?.cwd || !environment || !agentName || invocation.profile !== agentName) {
    return { effective_config: null, capability_evidence: probeCapabilities() };
  }
  const processOptions = { cwd: invocation.cwd, environment, processRunner };
  const observedConfig = observeConfig(executablePath, processOptions);
  const agentConfig = observeAgentConfig(executablePath, agentName, processOptions);

  const effectiveConfig = buildEffectiveConfig({
    projectedConfig,
    invocation,
    environment,
    observedConfig,
    agentConfig,
  });

  const capabilityEvidence = probeCapabilities();

  return {
    effective_config: effectiveConfig,
    capability_evidence: capabilityEvidence,
  };
}

function createOpenCodeCLIAdapter(options = {}) {
  const {
    executablePath: customExecutable,
    versionCheck = true,
    timeoutMs = 30000,
    processRunner = spawnSync,
  } = options;

  let cachedExecutable = null;
  let cachedVersion = null;

  function discover() {
    if (cachedExecutable && cachedVersion) {
      return { executable: cachedExecutable, version: cachedVersion };
    }

    const executable = customExecutable || findExecutable();
    if (!executable) {
      throw new OpenCodeCLIError('OPENCODE_NOT_FOUND');
    }

    const version = discoverVersion(executable, { processRunner });
    if (!version) {
      throw new OpenCodeCLIError('OPENCODE_VERSION_UNSUPPORTED');
    }

    if (versionCheck && !isVersionSupported(version)) {
      throw new OpenCodeCLIError('OPENCODE_VERSION_UNSUPPORTED');
    }

    cachedExecutable = executable;
    cachedVersion = version;

    return { executable, version };
  }

  function getObservedConfig({ cwd, environment } = {}) {
    if (!cwd || !environment) return null;
    const { executable } = discover();
    return observeConfig(executable, { cwd, environment, processRunner });
  }

  function getCapabilities() {
    discover();
    return CAPABILITY_MATRIX;
  }

  function effectiveConfigProbe({ projected_config, invocation, environment, agent_name }) {
    const { executable } = discover();
    return proveEffectiveConfig({
      projectedConfig: projected_config,
      invocation,
      environment,
      executablePath: executable,
      agentName: agent_name,
      processRunner,
    });
  }

  function invoke({ cwd, agent, model, message, format = 'json', timeout = timeoutMs, environment }) {
    const { executable, version } = discover();

    const result = invokeOpenCode({
      executablePath: executable,
      cwd,
      agent,
      model,
      message,
      format,
      timeoutMs: timeout,
      environment,
      processRunner,
    });

    if (result.timedOut) {
      throw new OpenCodeCLIError('ADAPTER_TIMEOUT', 'FAILED');
    }

    if (result.exitCode !== 0) {
      throw new OpenCodeCLIError('ADAPTER_INVOCATION_FAILED', 'FAILED');
    }

    const output = parseJsonOutput(result.stdout);
    if (!output) {
      throw new OpenCodeCLIError('MALFORMED_ADAPTER_OUTPUT', 'FAILED');
    }

    return {
      output,
      exitCode: result.exitCode,
      startedAt: result.startTime,
      finishedAt: result.endTime,
      version,
    };
  }

  return Object.freeze({
    id: ADAPTER_ID,
    version: ADAPTER_VERSION,
    discover,
    getObservedConfig,
    getCapabilities,
    effectiveConfigProbe,
    invoke,
  });
}

module.exports = {
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
  observeAgentConfig,
  probeCapabilities,
  normalizePermissionRules,
  buildEffectiveConfig,
  invokeOpenCode,
  parseJsonOutput,
  observeIdentity,
  compareIdentity,
  proveEffectiveConfig,
  createOpenCodeCLIAdapter,
};
