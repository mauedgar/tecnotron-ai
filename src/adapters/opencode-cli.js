'use strict';

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const ADAPTER_ID = 'opencode-cli';
const ADAPTER_VERSION = '2.2.1';
const SUPPORTED_OPENCODE_VERSIONS = Object.freeze(['1.18.29', '1.18.31']);
const SUPPORTED_OPENCODE_VERSION = '1.18.31';
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

const SYSTEM_ENV_ALLOWLIST = Object.freeze([
  'PATH',
  'LANG',
  'LC_ALL',
  'TMPDIR',
  'SystemRoot',
  'WINDIR',
  'ComSpec',
  'PATHEXT',
  'TEMP',
  'TMP',
]);


const SECRET_NAME = /(?:api[_-]?key|token|secret|password|passwd|credential|cookie|authorization|private[_-]?key)/i;
const SECRET_VALUE = /(?:bearer\s+|-----BEGIN [A-Z ]*PRIVATE KEY-----|api[_-]?key\s*[=:]|token\s*[=:]|secret\s*[=:]|password\s*[=:])/i;
const IDENTITY_OVERRIDE_NAME = /(?:^|_)(?:MODEL|PROVIDER|RUNTIME|ACTOR)(?:_|$)|^(?:ANTHROPIC|OPENAI|GOOGLE|GROQ|MISTRAL|COHERE)_/i;
const CONFIG_OVERRIDE_NAME = /^(?:OPENCODE_CONFIG|OPENCODE_CONFIG_DIR|OPENCODE_CONFIG_CONTENT|XDG_CONFIG_HOME|HOME|USERPROFILE|APPDATA)$/i;

class OpenCodeSurfaceError extends Error {
  constructor(reasonCode, status = 'FAILED', started = false, details = null) {
    super(reasonCode);
    this.name = 'OpenCodeSurfaceError';
    this.reasonCode = reasonCode;
    this.status = status;
    this.started = started;
    this.details = details;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function digestValue(value) {
  const json = JSON.stringify(stableValue(value));
  return `sha256:${crypto.createHash('sha256').update(json).digest('hex')}`;
}

function safeDetail(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).slice(0, 512);
  if (SECRET_VALUE.test(text)) return '[REDACTED_SECRET_LIKE_DETAIL]';
  return text;
}

function findExecutable({ platform = process.platform, locatorRunner = spawnSync } = {}) {
  const locator = platform === 'win32' ? 'where.exe' : 'which';
  const result = locatorRunner(locator, ['opencode'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
    shell: false,
  });
  if (result.status !== 0 || !result.stdout?.trim()) return null;
  const candidates = result.stdout.trim().split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  if (platform !== 'win32') return candidates[0] || null;
  return candidates.find((entry) => /\.exe$/i.test(entry))
    || candidates.find((entry) => /\.cmd$/i.test(entry))
    || candidates[0]
    || null;
}

function resolveOpenCodeCommand(executablePath, {
  platform = process.platform,
  readFileSync = fs.readFileSync,
  existsSync = fs.existsSync,
} = {}) {
  if (typeof executablePath !== 'string' || !executablePath || /[\r\n\0"]/u.test(executablePath)) {
    throw new OpenCodeSurfaceError('OPENCODE_NOT_FOUND', 'UNAVAILABLE');
  }
  if (platform !== 'win32' || !/\.cmd$/i.test(executablePath)) {
    return { command: executablePath, prefixArgs: [] };
  }

  let shim;
  try {
    shim = readFileSync(executablePath, 'utf8');
  } catch {
    throw new OpenCodeSurfaceError('OPENCODE_NOT_FOUND', 'UNAVAILABLE');
  }

  const targets = [...shim.matchAll(/"%dp0%\\([^"\r\n]+)"\s+%\*/gi)];
  const relativeTarget = targets.at(-1)?.[1];
  if (!relativeTarget || relativeTarget.split(/[\\/]/).some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new OpenCodeSurfaceError('OPENCODE_COMMAND_UNPROVABLE', 'UNAVAILABLE');
  }

  const pathImpl = platform === 'win32' ? path.win32 : path;
  const target = pathImpl.resolve(pathImpl.dirname(executablePath), relativeTarget.replaceAll('\\', pathImpl.sep));
  if (!existsSync(target)) throw new OpenCodeSurfaceError('OPENCODE_NOT_FOUND', 'UNAVAILABLE');
  if (/\.exe$/i.test(target)) return { command: target, prefixArgs: [] };
  return { command: process.execPath, prefixArgs: [target] };
}

function discoverVersion(executablePath, {
  syncRunner = spawnSync,
  platform = process.platform,
  readFileSync = fs.readFileSync,
  existsSync = fs.existsSync,
} = {}) {
  const resolved = resolveOpenCodeCommand(executablePath, { platform, readFileSync, existsSync });
  const result = syncRunner(resolved.command, [...resolved.prefixArgs, '--version'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10000,
    shell: false,
  });
  if (result.status !== 0 || result.error) return null;
  const match = String(result.stdout || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function isVersionSupported(version) {
  return SUPPORTED_OPENCODE_VERSIONS.includes(version);
}

function normalizeScopeList(value, name) {
  if (!Array.isArray(value)) throw new OpenCodeSurfaceError(`${name}_INVALID`, 'BLOCKED');
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item || item.includes('\0') || path.isAbsolute(item)) {
      throw new OpenCodeSurfaceError(`${name}_INVALID`, 'BLOCKED');
    }
    const normalized = item.replaceAll('\\', '/');
    if (normalized.split('/').some((segment) => segment === '..')) {
      throw new OpenCodeSurfaceError(`${name}_INVALID`, 'BLOCKED');
    }
    out.push(normalized);
  }
  return [...new Set(out)].sort();
}

function sanitizeEnvironment(systemEnvironment = {}, requestedVariables = {}) {
  if (!requestedVariables || typeof requestedVariables !== 'object' || Array.isArray(requestedVariables)) {
    throw new OpenCodeSurfaceError('ENVIRONMENT_INPUT_INVALID', 'BLOCKED');
  }

  const result = {};
  for (const name of SYSTEM_ENV_ALLOWLIST) {
    const value = systemEnvironment[name];
    if (typeof value === 'string' && value && !SECRET_VALUE.test(value)) {
      result[name] = value;
    }
  }

  for (const [name, value] of Object.entries(requestedVariables)) {
    if (
      typeof value !== 'string'
      || !value
      || SECRET_NAME.test(name)
      || SECRET_VALUE.test(value)
      || IDENTITY_OVERRIDE_NAME.test(name)
      || CONFIG_OVERRIDE_NAME.test(name)
    ) {
      throw new OpenCodeSurfaceError('ENVIRONMENT_VARIABLE_DENIED', 'BLOCKED', false, name);
    }
    result[name] = value;
  }

  return Object.freeze(Object.fromEntries(Object.keys(result).sort().map((key) => [key, result[key]])));
}

function buildDirectPermissionProjection({
  readScopes = [],
  writeScopes = [],
  webAllowed = false,
} = {}) {
  const normalizedReadScopes = normalizeScopeList(readScopes, 'READ_SCOPE');
  const normalizedWriteScopes = normalizeScopeList(writeScopes, 'WRITE_SCOPE');

  if (typeof webAllowed !== 'boolean') {
    throw new OpenCodeSurfaceError('WEB_CAPABILITY_DECLARATION_INVALID', 'BLOCKED');
  }

  const read = { '*': 'deny' };
  for (const scope of normalizedReadScopes) read[scope] = 'allow';

  const edit = { '*': 'deny' };
  for (const scope of normalizedWriteScopes) edit[scope] = 'allow';

  return Object.freeze({
    read: Object.freeze(read),
    edit: Object.freeze(edit),
    webfetch: webAllowed ? 'allow' : 'deny',
    websearch: webAllowed ? 'allow' : 'deny',
    external_directory: 'deny',
  });
}

function buildDirectPermissionProjectionRules({
  readScopes = [],
  writeScopes = [],
  webAllowed = false,
} = {}) {
  const projection = buildDirectPermissionProjection({ readScopes, writeScopes, webAllowed });
  const rules = [];

  for (const [permission, value] of Object.entries(projection)) {
    if (typeof value === 'string') {
      rules.push({ permission, pattern: '*', action: value });
      continue;
    }
    for (const [pattern, action] of Object.entries(value)) {
      rules.push({ permission, pattern, action });
    }
  }

  return rules;
}

function buildInlineConfig({
  actorId,
  readScopes,
  writeScopes,
  webAllowed = false,
} = {}) {
  if (typeof actorId !== 'string' || !actorId) {
    throw new OpenCodeSurfaceError('ACTOR_IDENTITY_REQUIRED', 'BLOCKED');
  }

  const directPermissionProjection = buildDirectPermissionProjection({
    readScopes: readScopes || [],
    writeScopes: writeScopes || [],
    webAllowed,
  });

  // Project only the portable direct read/write/web/repository-containment
  // dimensions. Skills, MCP, plugins and other harness capabilities are not
  // re-authored here; their authority remains external harness conformance.
  return Object.freeze({
    autoupdate: false,
    share: 'disabled',
    agent: Object.freeze({
      [actorId]: Object.freeze({
        permission: directPermissionProjection,
      }),
    }),
  });
}

function createIsolation({
  systemEnvironment,
  requestedVariables,
  inlineConfig,
  fsApi = fs,
  osApi = os,
  pathApi = path,
} = {}) {
  const root = fsApi.mkdtempSync(pathApi.join(osApi.tmpdir(), 'tecnotron-opencode-'));
  const configHome = pathApi.join(root, 'config-home');
  const appData = pathApi.join(root, 'appdata');
  const configDir = pathApi.join(root, 'opencode-dir');
  fsApi.mkdirSync(configHome, { recursive: true });
  fsApi.mkdirSync(appData, { recursive: true });
  fsApi.mkdirSync(configDir, { recursive: true });

  const base = sanitizeEnvironment(systemEnvironment, requestedVariables);
  const environment = {
    ...base,
    HOME: root,
    USERPROFILE: root,
    XDG_CONFIG_HOME: configHome,
    APPDATA: appData,
    OPENCODE_CONFIG_DIR: configDir,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(inlineConfig),
    OPENCODE_DISABLE_AUTOUPDATE: 'true',
    OPENCODE_AUTO_SHARE: 'false',
  };

  return Object.freeze({
    root,
    environment: Object.freeze(environment),
    inlineConfig,
    cleanup() {
      fsApi.rmSync(root, { recursive: true, force: true });
    },
  });
}

function defaultKillTree(child, { platform = process.platform, syncRunner = spawnSync } = {}) {
  if (!child || !child.pid) return;
  if (platform === 'win32') {
    syncRunner('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000,
      shell: false,
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try { child.kill('SIGTERM'); } catch {}
  }
}

function runOpenCodeProcess(executablePath, args, {
  cwd,
  environment,
  timeoutMs = 30000,
  signal,
  processSpawner = spawn,
  killTree = defaultKillTree,
  platform = process.platform,
  syncRunner = spawnSync,
  readFileSync = fs.readFileSync,
  existsSync = fs.existsSync,
} = {}) {
  const resolved = resolveOpenCodeCommand(executablePath, { platform, readFileSync, existsSync });

  return new Promise((resolve, reject) => {
    const startedAt = new Date().toISOString();
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let aborted = false;

    const child = processSpawner(
      resolved.command,
      [...resolved.prefixArgs, ...args],
      {
        cwd,
        env: environment,
        shell: false,
        windowsHide: true,
        detached: platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve({
        ...result,
        stdout,
        stderr,
        startedAt,
        finishedAt: new Date().toISOString(),
        timedOut,
        aborted,
      });
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(error);
    };

    const append = (current, chunk) => {
      const next = current + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > MAX_OUTPUT_BYTES) {
        killTree(child, { platform, syncRunner });
        throw new OpenCodeSurfaceError('ADAPTER_OUTPUT_LIMIT_EXCEEDED', 'FAILED', true);
      }
      return next;
    };

    child.stdout?.on('data', (chunk) => {
      try { stdout = append(stdout, chunk); } catch (error) { fail(error); }
    });
    child.stderr?.on('data', (chunk) => {
      try { stderr = append(stderr, chunk); } catch (error) { fail(error); }
    });

    child.once('error', fail);
    child.once('close', (code, signalName) => {
      finish({ exitCode: code, signal: signalName });
    });

    const onAbort = () => {
      aborted = true;
      killTree(child, { platform, syncRunner });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child, { platform, syncRunner });
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function parseJsonOutput(stdout) {
  if (typeof stdout !== 'string' || !stdout.trim()) return null;
  const trimmed = stdout.trim();
  try {
    const value = JSON.parse(trimmed);
    return Array.isArray(value) ? value : [value];
  } catch {}

  const events = [];
  for (const line of trimmed.split(/\r?\n/).filter(Boolean)) {
    try {
      events.push(JSON.parse(line));
    } catch {
      return null;
    }
  }
  return events.length ? events : null;
}

function normalizedPermissionRules(agentConfig) {
  const rules = agentConfig?.permission;
  if (!Array.isArray(rules)) return null;
  const out = [];
  for (const rule of rules) {
    if (
      !rule
      || typeof rule !== 'object'
      || typeof rule.permission !== 'string'
      || typeof rule.pattern !== 'string'
      || !['allow', 'deny', 'ask'].includes(rule.action)
    ) return null;
    out.push({
      permission: rule.permission,
      pattern: rule.pattern,
      action: rule.action,
    });
  }
  return out;
}

function summarizeHarnessCapabilities(resolvedConfig, agentConfig) {
  const rules = normalizedPermissionRules(agentConfig);
  const permissionNames = rules
    ? [...new Set(rules.map((rule) => rule.permission))].sort()
    : [];

  const mcp = resolvedConfig?.mcp;
  const mcpEntries = mcp && typeof mcp === 'object' && !Array.isArray(mcp)
    ? Object.keys(mcp).sort()
    : [];

  const plugins = resolvedConfig?.plugin ?? resolvedConfig?.plugins ?? [];
  const pluginCount = Array.isArray(plugins) ? plugins.length : null;

  return Object.freeze({
    permission_names: Object.freeze(permissionNames),
    mcp_entries: Object.freeze(mcpEntries),
    plugin_count: pluginCount,
    observed_not_authorized: true,
  });
}


function pathPatternContainedInRoot(pattern, root) {
  if (typeof pattern !== 'string' || !pattern || typeof root !== 'string' || !root) return false;

  const normalizedPattern = pattern.replaceAll('\\', '/');
  if (normalizedPattern.split('/').includes('..')) return false;

  const wildcardIndex = normalizedPattern.search(/[*?]/u);
  const rawStaticPrefix = wildcardIndex === -1
    ? normalizedPattern
    : normalizedPattern.slice(0, wildcardIndex);
  const prefixHasDirectoryBoundary = /\/+$/u.test(rawStaticPrefix);
  const staticPrefix = rawStaticPrefix.replace(/\/+$/u, '');

  if (!staticPrefix || !path.isAbsolute(staticPrefix)) return false;

  const normalizedRoot = path.resolve(root).replaceAll('\\', '/').replace(/\/+$/u, '');
  const normalizedPrefix = path.resolve(staticPrefix).replaceAll('\\', '/').replace(/\/+$/u, '');

  const caseFold = process.platform === 'win32'
    ? (value) => value.toLowerCase()
    : (value) => value;

  const rootValue = caseFold(normalizedRoot);
  const prefixValue = caseFold(normalizedPrefix);

  if (prefixValue === rootValue) {
    // A wildcard immediately after the root text can match siblings sharing
    // that textual prefix (for example <root>-escape). Wildcard-bearing
    // patterns are root-contained only when the wildcard follows an explicit
    // directory separator. Exact root without a wildcard remains contained.
    return wildcardIndex === -1 || prefixHasDirectoryBoundary;
  }

  return prefixValue.startsWith(`${rootValue}/`);
}

function classifyTrailingDirectRule(rule, {
  readScopes,
  writeScopes,
  webAllowed,
  isolationRoot,
} = {}) {
  if (rule.action === 'deny') {
    return Object.freeze({ classification: 'SAFELY_NARROWER_DENY', non_broadening: true });
  }

  if (rule.action === 'ask') {
    return Object.freeze({ classification: 'INTERACTIVE_EXPANSION_UNPROVABLE', non_broadening: false });
  }

  if (rule.action !== 'allow') {
    return Object.freeze({ classification: 'UNKNOWN_ACTION', non_broadening: false });
  }

  if (rule.permission === 'read' && readScopes.includes(rule.pattern)) {
    return Object.freeze({ classification: 'DUPLICATE_AUTHORIZED_READ_ALLOW', non_broadening: true });
  }

  if (rule.permission === 'edit' && writeScopes.includes(rule.pattern)) {
    return Object.freeze({ classification: 'DUPLICATE_AUTHORIZED_EDIT_ALLOW', non_broadening: true });
  }

  if (
    ['read', 'edit', 'external_directory'].includes(rule.permission)
    && pathPatternContainedInRoot(rule.pattern, isolationRoot)
  ) {
    return Object.freeze({ classification: 'RUNTIME_ISOLATION_ROOT_ONLY', non_broadening: true });
  }

  if (
    ['webfetch', 'websearch'].includes(rule.permission)
    && webAllowed
    && rule.pattern === '*'
  ) {
    return Object.freeze({ classification: 'DUPLICATE_AUTHORIZED_WEB_ALLOW', non_broadening: true });
  }

  return Object.freeze({ classification: 'MATERIAL_DIRECT_PERMISSION_EXPANSION', non_broadening: false });
}

function assertEffectivePermissionBoundary({
  agentConfig,
  readScopes,
  writeScopes,
  webAllowed,
  isolationRoot = null,
}) {
  const rules = normalizedPermissionRules(agentConfig);
  if (!rules) {
    throw new OpenCodeSurfaceError('EFFECTIVE_PERMISSION_UNPROVABLE', 'BLOCKED');
  }

  const expectedProjection = buildDirectPermissionProjectionRules({
    readScopes,
    writeScopes,
    webAllowed,
  });

  // OpenCode v1 permission rules are ordered and the last matching rule wins.
  // We therefore prove that the invocation-scoped projection occurs intact in
  // the effective direct-rule sequence and then classify every later direct
  // rule. Earlier harness/project rules are overridden by the projection.
  // Later rules are allowed only when they are deterministically narrower,
  // exact duplicate authorized allows, or confined to the isolated runtime
  // root created by this adapter.
  const directPermissionNames = new Set([
    '*',
    'read',
    'edit',
    'webfetch',
    'websearch',
    'external_directory',
  ]);
  const effectiveDirectRules = rules.filter(
    (rule) => directPermissionNames.has(rule.permission),
  );

  let projectionStart = -1;
  for (let start = 0; start <= effectiveDirectRules.length - expectedProjection.length; start += 1) {
    const slice = effectiveDirectRules.slice(start, start + expectedProjection.length);
    if (JSON.stringify(slice) === JSON.stringify(expectedProjection)) {
      projectionStart = start;
    }
  }

  const diagnosticBase = {
    proof_semantics: 'ORDERED_LAST_MATCH_SEMANTIC_CONFORMANCE',
    expected_projection: expectedProjection,
    effective_direct_rules: effectiveDirectRules,
    projection_start: projectionStart,
  };

  if (projectionStart < 0) {
    throw new OpenCodeSurfaceError(
      'EFFECTIVE_PERMISSION_UNPROVABLE',
      'BLOCKED',
      false,
      JSON.stringify({
        ...diagnosticBase,
        reason: 'projected-direct-rules-not-observed-intact',
      }),
    );
  }

  const projectionEnd = projectionStart + expectedProjection.length;
  const trailingRules = effectiveDirectRules.slice(projectionEnd);
  const trailingClassification = trailingRules.map((rule) => ({
    rule,
    ...classifyTrailingDirectRule(rule, {
      readScopes,
      writeScopes,
      webAllowed,
      isolationRoot,
    }),
  }));

  const material = trailingClassification.filter((entry) => !entry.non_broadening);
  if (material.length > 0) {
    throw new OpenCodeSurfaceError(
      'EFFECTIVE_PERMISSION_BROADENING',
      'BLOCKED',
      false,
      JSON.stringify({
        ...diagnosticBase,
        projection_end: projectionEnd,
        trailing_rules: trailingClassification,
        material_rules: material,
      }),
    );
  }

  return Object.freeze({
    effective_permission_digest: digestValue(rules),
    requested_permission_digest: digestValue({
      read_scope: readScopes,
      write_scope: writeScopes,
      web: webAllowed,
    }),
    direct_permission_conformance: Object.freeze({
      proof_semantics: 'ORDERED_LAST_MATCH_SEMANTIC_CONFORMANCE',
      read_allow_patterns: Object.freeze([...readScopes]),
      edit_allow_patterns: Object.freeze([...writeScopes]),
      web_allowed: webAllowed,
      external_directory_allowed: false,
      projection_rule_count: expectedProjection.length,
      projection_start: projectionStart,
      trailing_rule_count: trailingRules.length,
      trailing_rule_classification: Object.freeze(trailingClassification),
    }),
    non_broadening: true,
  });
}

function assertAuthorizationPermissionBinding(request, surfaceInput) {
  const authorization = request?.authorization;
  if (
    !authorization
    || typeof authorization !== 'object'
    || authorization.disposition !== 'AUTHORIZED'
    || !Array.isArray(authorization.effect_constraints)
  ) {
    throw new OpenCodeSurfaceError('AUTHORIZATION_CONTEXT_INVALID', 'BLOCKED');
  }

  const constraints = authorization.effect_constraints;
  const writeEffects = constraints.filter(
    (entry) => entry
      && typeof entry === 'object'
      && ['repository_write', 'filesystem_write'].includes(entry.effect)
      && typeof entry.scope === 'string'
      && entry.scope,
  );

  if (surfaceInput.writeScopes.length > 0 && writeEffects.length === 0) {
    throw new OpenCodeSurfaceError('WRITE_EFFECT_NOT_AUTHORIZED', 'BLOCKED');
  }

  return Object.freeze({
    authority_reference: authorization.authority_reference,
    effect_constraints_digest: digestValue(constraints),
    write_effect_constraints: Object.freeze(
      writeEffects.map((entry) => Object.freeze({ effect: entry.effect, scope: entry.scope })),
    ),
    requested_permission_digest: digestValue({
      read_scope: surfaceInput.readScopes,
      write_scope: surfaceInput.writeScopes,
      web: surfaceInput.webAllowed,
    }),
  });
}

function validateOpenCodeEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return false;

  const recognized = new Set([
    'step_start',
    'step_finish',
    'text',
    'reasoning',
    'tool_use',
    'error',
  ]);

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const hasPartIdentity = (part, sessionID) => isRecord(part)
    && typeof part.id === 'string' && part.id
    && typeof part.messageID === 'string' && part.messageID
    && typeof part.sessionID === 'string' && part.sessionID === sessionID;

  for (const event of events) {
    if (!isRecord(event)) return false;
    if (typeof event.type !== 'string' || !recognized.has(event.type)) return false;
    if (!Number.isFinite(event.timestamp)) return false;
    if (typeof event.sessionID !== 'string' || !event.sessionID) return false;

    if (event.type === 'error') {
      if (!isRecord(event.error) || typeof event.error.name !== 'string' || !event.error.name) return false;
      continue;
    }

    if (!hasPartIdentity(event.part, event.sessionID)) return false;

    if (event.type === 'text' || event.type === 'reasoning') {
      if (event.part.type !== event.type) return false;
      if (typeof event.part.text !== 'string') return false;
      continue;
    }

    if (event.type === 'tool_use') {
      if (event.part.type !== 'tool') return false;
      if (typeof event.part.callID !== 'string' || !event.part.callID) return false;
      if (typeof event.part.tool !== 'string' || !event.part.tool) return false;
      if (!isRecord(event.part.state)) return false;
      if (!['completed', 'error'].includes(event.part.state.status)) return false;
      continue;
    }

    const expectedPartType = event.type === 'step_start' ? 'step-start' : 'step-finish';
    if (event.part.type !== expectedPartType) return false;
  }

  return true;
}

function assertEffectiveConfig({
  resolvedConfig,
  agentConfig,
  readScopes = [],
  writeScopes = [],
  webAllowed = false,
  isolationRoot = null,
}) {
  if (!resolvedConfig || typeof resolvedConfig !== 'object' || Array.isArray(resolvedConfig)) {
    throw new OpenCodeSurfaceError('EFFECTIVE_CONFIG_UNPROVABLE', 'BLOCKED');
  }
  if (resolvedConfig.autoupdate !== false) {
    throw new OpenCodeSurfaceError('EFFECTIVE_CONFIG_AUTOUPDATE_UNPROVABLE', 'BLOCKED');
  }
  if (!['disabled', false].includes(resolvedConfig.share)) {
    throw new OpenCodeSurfaceError('EFFECTIVE_CONFIG_SHARING_UNPROVABLE', 'BLOCKED');
  }
  if (!agentConfig || typeof agentConfig !== 'object' || Array.isArray(agentConfig)) {
    throw new OpenCodeSurfaceError('EFFECTIVE_AGENT_CONFIG_UNPROVABLE', 'BLOCKED');
  }

  const permissionConformance = assertEffectivePermissionBoundary({
    agentConfig,
    readScopes,
    writeScopes,
    webAllowed,
    isolationRoot,
  });

  return Object.freeze({
    resolved_config_digest: digestValue(resolvedConfig),
    agent_config_digest: digestValue(agentConfig),
    proof: 'PROJECT_SCOPED_EFFECTIVE_CONFIG_OBSERVATION',
    capability_observation: summarizeHarnessCapabilities(resolvedConfig, agentConfig),
    permission_conformance: permissionConformance,
  });
}

function normalizeSurfaceInput(request) {
  const input = request?.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OpenCodeSurfaceError('SURFACE_INPUT_REQUIRED', 'BLOCKED');
  }

  if (typeof input.cwd !== 'string' || !path.isAbsolute(input.cwd)) {
    throw new OpenCodeSurfaceError('SURFACE_CWD_INVALID', 'BLOCKED');
  }

  if (input.profile_id !== undefined && input.profile_id !== request.resolved_execution.actor_id) {
    throw new OpenCodeSurfaceError('ACTOR_IDENTITY_MISMATCH', 'BLOCKED');
  }

  const message = Array.isArray(input.message)
    ? input.message
    : (typeof input.message === 'string' ? [input.message] : null);
  if (!message || message.length === 0 || message.some((item) => typeof item !== 'string' || !item)) {
    throw new OpenCodeSurfaceError('SURFACE_MESSAGE_INVALID', 'BLOCKED');
  }

  const envInput = input.environment ?? { inherit: false, variables: {} };
  if (
    !envInput
    || typeof envInput !== 'object'
    || envInput.inherit !== false
    || (envInput.variables !== undefined && (typeof envInput.variables !== 'object' || Array.isArray(envInput.variables)))
  ) {
    throw new OpenCodeSurfaceError('ENVIRONMENT_INHERIT_DENIED', 'BLOCKED');
  }

  const permissions = input.permissions;
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new OpenCodeSurfaceError('SURFACE_PERMISSIONS_REQUIRED', 'BLOCKED');
  }

  const readScopes = normalizeScopeList(permissions.read_scope || [], 'READ_SCOPE');
  const writeScopes = normalizeScopeList(permissions.write_scope || [], 'WRITE_SCOPE');
  const webAllowed = permissions.web === true;

  const contextFiles = normalizeScopeList(input.context_files || [], 'CONTEXT_FILES');
  for (const relative of contextFiles) {
    const absolute = path.resolve(input.cwd, relative);
    const relativeCheck = path.relative(input.cwd, absolute);
    if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
      throw new OpenCodeSurfaceError('CONTEXT_FILE_OUTSIDE_CWD', 'BLOCKED');
    }
  }

  return Object.freeze({
    cwd: input.cwd,
    message: Object.freeze([...message]),
    environmentVariables: Object.freeze({ ...(envInput.variables || {}) }),
    readScopes: Object.freeze(readScopes),
    writeScopes: Object.freeze(writeScopes),
    webAllowed,
    contextFiles: Object.freeze(contextFiles),
    timeoutMs: Number.isInteger(input.timeout_ms) && input.timeout_ms > 0 ? input.timeout_ms : 30000,
  });
}

function validateResolvedIdentity(request, runtimeId) {
  const resolved = request?.resolved_execution;
  if (!resolved || typeof resolved !== 'object') {
    throw new OpenCodeSurfaceError('RESOLVED_IDENTITY_REQUIRED', 'BLOCKED');
  }
  if (resolved.runtime_id !== runtimeId) {
    throw new OpenCodeSurfaceError('RUNTIME_IDENTITY_MISMATCH', 'BLOCKED');
  }
  if (typeof resolved.actor_id !== 'string' || !resolved.actor_id) {
    throw new OpenCodeSurfaceError('ACTOR_IDENTITY_REQUIRED', 'BLOCKED');
  }
  if (typeof resolved.model_id !== 'string' || !resolved.model_id) {
    throw new OpenCodeSurfaceError('MODEL_IDENTITY_REQUIRED', 'BLOCKED');
  }
  if (resolved.provider_id) {
    const providerFromModel = resolved.model_id.includes('/') ? resolved.model_id.split('/')[0] : null;
    if (!providerFromModel || providerFromModel !== resolved.provider_id) {
      throw new OpenCodeSurfaceError('PROVIDER_MODEL_IDENTITY_MISMATCH', 'BLOCKED');
    }
  }
  return resolved;
}

function outcome(request, status, started, reason, extras = {}) {
  return {
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    started,
    ...(reason ? { reason } : {}),
    evidence_refs: [],
    ...extras,
  };
}

function buildInvocationArgs(request, surfaceInput) {
  const args = [
    'run',
    '--agent',
    request.resolved_execution.actor_id,
    '--model',
    request.resolved_execution.model_id,
    '--format',
    'json',
    '--dir',
    surfaceInput.cwd,
  ];

  for (const relative of surfaceInput.contextFiles) {
    args.push('--file', relative);
  }

  args.push('--', ...surfaceInput.message);
  return args;
}

function parseCommandJson(result, reasonCode) {
  if (result.exitCode !== 0 || result.timedOut || result.aborted) {
    throw new OpenCodeSurfaceError(reasonCode, 'BLOCKED');
  }
  const parsed = parseJsonOutput(result.stdout);
  if (!parsed || parsed.length !== 1 || typeof parsed[0] !== 'object' || Array.isArray(parsed[0])) {
    throw new OpenCodeSurfaceError(reasonCode, 'BLOCKED');
  }
  return parsed[0];
}

function createOpenCodeCLIAdapter(options = {}) {
  const {
    executablePath: customExecutable,
    runtimeId = ADAPTER_ID,
    systemEnvironment = process.env,
    syncRunner = spawnSync,
    processRunner = runOpenCodeProcess,
    locatorRunner = spawnSync,
    platform = process.platform,
    readFileSync = fs.readFileSync,
    existsSync = fs.existsSync,
    fsApi = fs,
    osApi = os,
    pathApi = path,
  } = options;

  let cachedDiscovery = null;

  function discover() {
    if (cachedDiscovery) return cachedDiscovery;
    const executable = customExecutable || findExecutable({ platform, locatorRunner });
    if (!executable) throw new OpenCodeSurfaceError('OPENCODE_NOT_FOUND', 'UNAVAILABLE');
    const version = discoverVersion(executable, {
      syncRunner,
      platform,
      readFileSync,
      existsSync,
    });
    if (!version) throw new OpenCodeSurfaceError('OPENCODE_VERSION_UNAVAILABLE', 'UNAVAILABLE');
    if (!isVersionSupported(version)) {
      throw new OpenCodeSurfaceError('OPENCODE_VERSION_UNSUPPORTED', 'UNAVAILABLE', false, version);
    }
    cachedDiscovery = Object.freeze({ executable, version, runtime_id: runtimeId });
    return cachedDiscovery;
  }

  async function probe({
    cwd,
    actorId,
    environmentVariables = {},
    readScopes = [],
    writeScopes = [],
    webAllowed = false,
    timeoutMs = 15000,
    signal,
  }) {
    const discovery = discover();
    const inlineConfig = buildInlineConfig({ actorId, readScopes, writeScopes, webAllowed });
    const isolation = createIsolation({
      systemEnvironment,
      requestedVariables: environmentVariables,
      inlineConfig,
      fsApi,
      osApi,
      pathApi,
    });

    try {
      const common = {
        cwd,
        environment: isolation.environment,
        timeoutMs,
        signal,
      };
      const resolvedConfigResult = await processRunner(discovery.executable, ['debug', 'config'], common);
      const agentConfigResult = await processRunner(discovery.executable, ['debug', 'agent', actorId], common);
      const resolvedConfig = parseCommandJson(resolvedConfigResult, 'EFFECTIVE_CONFIG_PROBE_FAILED');
      const agentConfig = parseCommandJson(agentConfigResult, 'EFFECTIVE_AGENT_CONFIG_PROBE_FAILED');
      const proof = assertEffectiveConfig({
        resolvedConfig,
        agentConfig,
        readScopes,
        writeScopes,
        webAllowed,
        isolationRoot: isolation.root,
      });
      return Object.freeze({
        discovery,
        isolation,
        proof,
        resolvedConfig,
        agentConfig,
      });
    } catch (error) {
      isolation.cleanup();
      throw error;
    }
  }

  return Object.freeze({
    id: ADAPTER_ID,
    version: ADAPTER_VERSION,
    runtimeId,
    discover,
    probe,
  });
}

function createOpenCodeExecutionSurface(options = {}) {
  const adapter = createOpenCodeCLIAdapter(options);
  const { processRunner = runOpenCodeProcess } = options;

  return Object.freeze({
    id: ADAPTER_ID,

    async execute(request) {
      let probeResult = null;
      try {
        const identity = validateResolvedIdentity(request, adapter.runtimeId);
        const surfaceInput = normalizeSurfaceInput(request);
        const permissionBinding = assertAuthorizationPermissionBinding(request, surfaceInput);

        probeResult = await adapter.probe({
          cwd: surfaceInput.cwd,
          actorId: identity.actor_id,
          environmentVariables: surfaceInput.environmentVariables,
          readScopes: surfaceInput.readScopes,
          writeScopes: surfaceInput.writeScopes,
          webAllowed: surfaceInput.webAllowed,
          timeoutMs: Math.min(surfaceInput.timeoutMs, 15000),
        });

        const args = buildInvocationArgs(request, surfaceInput);
        const runResult = await processRunner(
          probeResult.discovery.executable,
          args,
          {
            cwd: surfaceInput.cwd,
            environment: probeResult.isolation.environment,
            timeoutMs: surfaceInput.timeoutMs,
          },
        );

        if (runResult.timedOut) {
          return outcome(request, 'CANCELLED', true, 'OPENCODE_TIMEOUT', {
            result: {
              surface_id: ADAPTER_ID,
              surface_version: probeResult.discovery.version,
            },
          });
        }
        if (runResult.aborted) {
          return outcome(request, 'CANCELLED', true, 'OPENCODE_ABORTED', {
            result: {
              surface_id: ADAPTER_ID,
              surface_version: probeResult.discovery.version,
            },
          });
        }
        if (runResult.exitCode !== 0) {
          return outcome(request, 'FAILED', true, 'OPENCODE_EXIT_NONZERO', {
            result: {
              surface_id: ADAPTER_ID,
              surface_version: probeResult.discovery.version,
              stderr: safeDetail(runResult.stderr),
            },
          });
        }

        const events = parseJsonOutput(runResult.stdout);
        if (!events) {
          return outcome(request, 'FAILED', true, 'MALFORMED_ADAPTER_OUTPUT', {
            result: {
              surface_id: ADAPTER_ID,
              surface_version: probeResult.discovery.version,
            },
          });
        }
        if (!validateOpenCodeEvents(events)) {
          return outcome(request, 'FAILED', true, 'OUTPUT_CONTRACT_VIOLATION', {
            result: {
              surface_id: ADAPTER_ID,
              surface_version: probeResult.discovery.version,
            },
          });
        }

        const evidence = {
          surface_id: ADAPTER_ID,
          surface_version: probeResult.discovery.version,
          runtime_id: identity.runtime_id,
          actor_id: identity.actor_id,
          model_id: identity.model_id,
          provider_id: identity.provider_id ?? null,
          config_proof: probeResult.proof,
          authorization_permission_binding: permissionBinding,
          harness_conformance_ref: request.harness_conformance.evidence_ref,
          requested_surface_permissions_digest: digestValue({
            read_scope: surfaceInput.readScopes,
            write_scope: surfaceInput.writeScopes,
            web: surfaceInput.webAllowed,
          }),
          environment_names: Object.keys(probeResult.isolation.environment).sort(),
          invocation_args_digest: digestValue(args),
        };
        const evidenceRef = digestValue(evidence);

        return outcome(request, 'SUCCESS', true, null, {
          result: {
            events,
            execution_surface: evidence,
          },
          evidence_refs: [
            { kind: 'execution-surface-conformance', ref: evidenceRef },
          ],
        });
      } catch (error) {
        if (error instanceof OpenCodeSurfaceError) {
          return outcome(
            request,
            error.status,
            error.started,
            error.reasonCode,
            {
              result: error.details ? { detail: safeDetail(error.details) } : undefined,
            },
          );
        }
        throw error;
      } finally {
        if (probeResult?.isolation) probeResult.isolation.cleanup();
      }
    },
  });
}

module.exports = {
  ADAPTER_ID,
  ADAPTER_VERSION,
  SUPPORTED_OPENCODE_VERSION,
  SUPPORTED_OPENCODE_VERSIONS,
  SYSTEM_ENV_ALLOWLIST,
  OpenCodeSurfaceError,
  digestValue,
  findExecutable,
  resolveOpenCodeCommand,
  discoverVersion,
  isVersionSupported,
  sanitizeEnvironment,
  buildDirectPermissionProjection,
  buildDirectPermissionProjectionRules,
  buildInlineConfig,
  createIsolation,
  runOpenCodeProcess,
  parseJsonOutput,
  assertEffectiveConfig,
  assertEffectivePermissionBoundary,
  pathPatternContainedInRoot,
  classifyTrailingDirectRule,
  assertAuthorizationPermissionBinding,
  validateOpenCodeEvents,
  summarizeHarnessCapabilities,
  normalizeSurfaceInput,
  validateResolvedIdentity,
  buildInvocationArgs,
  createOpenCodeCLIAdapter,
  createOpenCodeExecutionSurface,
};
