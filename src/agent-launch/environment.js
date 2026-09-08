'use strict';

const path = require('node:path');
const { AgentLaunchPreflightError, digestValue } = require('./authority');

const SYSTEM_ALLOWLIST = Object.freeze([
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
const MODEL_PROVIDER_OVERRIDE = /(?:^|_)(?:MODEL|PROVIDER)(?:_|$)|^(?:ANTHROPIC|OPENAI|GOOGLE|GROQ|MISTRAL|COHERE)_/i;
const GLOBAL_CONFIG_OVERRIDE = /^(?:OPENCODE_CONFIG|OPENCODE_CONFIG_DIR|XDG_CONFIG_HOME|HOME|USERPROFILE|APPDATA)$/i;
const ROOT_COORDINATE = /(?:^|_)(?:ROOT|CWD|WORKTREE|REPOSITORY)(?:_|$)/i;

function samePath(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function reject(reasonCode) {
  throw new AgentLaunchPreflightError(reasonCode);
}

function resolveTaskInputs(reference, resolver) {
  if (typeof resolver !== 'function') reject('PERMISSION_PROJECTION_UNPROVABLE');
  let snapshot;
  try {
    snapshot = resolver(reference);
  } catch {
    reject('PERMISSION_PROJECTION_UNPROVABLE');
  }
  if (
    !snapshot
    || snapshot.task_scoped_inputs_ref !== reference
    || !snapshot.variables
    || typeof snapshot.variables !== 'object'
    || Array.isArray(snapshot.variables)
    || Object.keys(snapshot).some((key) => !['task_scoped_inputs_ref', 'variables'].includes(key))
  ) {
    reject('PERMISSION_PROJECTION_UNPROVABLE');
  }
  return snapshot.variables;
}

function buildChildEnvironment({
  inherit,
  systemEnvironment = {},
  taskScopedInputsRef = null,
  resolveTaskScopedInputs,
  approvedTaskInputNames = [],
  expectedRoots = {},
} = {}) {
  if (inherit !== false) reject('REQUEST_INVALID');
  const environment = {};
  for (const name of [...SYSTEM_ALLOWLIST].sort()) {
    if (typeof systemEnvironment[name] === 'string' && systemEnvironment[name].length > 0) {
      environment[name] = systemEnvironment[name];
    }
  }

  if (taskScopedInputsRef !== null) {
    const approved = new Set(approvedTaskInputNames);
    const variables = resolveTaskInputs(taskScopedInputsRef, resolveTaskScopedInputs);
    for (const [name, value] of Object.entries(variables)) {
      if (SECRET_NAME.test(name) || typeof value !== 'string' || value.length === 0 || SECRET_VALUE.test(value)) {
        reject('PERMISSION_PROJECTION_DENIED');
      }
      if (MODEL_PROVIDER_OVERRIDE.test(name)) reject('PROFILE_MODEL_BINDING_DENIED');
      if (GLOBAL_CONFIG_OVERRIDE.test(name)) reject('GLOBAL_CONFIG_MUTATION_DENIED');
      if (!approved.has(name)) reject('PERMISSION_PROJECTION_DENIED');
      if (ROOT_COORDINATE.test(name)) {
        if (!Object.hasOwn(expectedRoots, name)) reject('PERMISSION_PROJECTION_UNPROVABLE');
        if (!samePath(value, expectedRoots[name])) reject('PERMISSION_PROJECTION_DENIED');
      }
      environment[name] = value;
    }
  }

  const names = Object.keys(environment).sort();
  const orderedEnvironment = Object.fromEntries(names.map((name) => [name, environment[name]]));
  return Object.freeze({
    inherit: false,
    environment: Object.freeze(orderedEnvironment),
    evidence: Object.freeze({
      names: Object.freeze(names),
      task_scoped_inputs_ref: taskScopedInputsRef,
      environment_digest: digestValue({ kind: 'child-environment', names, values: orderedEnvironment }),
    }),
  });
}

module.exports = { SYSTEM_ALLOWLIST, buildChildEnvironment };
