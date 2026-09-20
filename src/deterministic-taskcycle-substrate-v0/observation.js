'use strict';

const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { evaluateMechanicalPostcondition } = require('./contracts');

function sha256Buffer(buffer) {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function observeExplicitProcess({ command, args = [], cwd, env = process.env }) {
  if (typeof command !== 'string' || command.trim() === '') throw new Error('EXPLICIT_COMMAND_REQUIRED');
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) throw new Error('EXPLICIT_ARGUMENT_ARRAY_REQUIRED');
  if (typeof cwd !== 'string' || cwd.trim() === '') throw new Error('EXPLICIT_CWD_REQUIRED');

  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', windowsHide: true });
  return {
    command,
    args: [...args],
    cwd,
    started: !result.error,
    exit_code: typeof result.status === 'number' ? result.status : null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? { name: result.error.name || 'Error', message: result.error.message || String(result.error) } : null,
  };
}

function verifyMechanicalPostcondition(input) {
  return evaluateMechanicalPostcondition(input);
}

module.exports = { sha256Buffer, sha256File, observeExplicitProcess, verifyMechanicalPostcondition };
