'use strict';

const { spawnSync } = require('child_process');

class OpenSpecCliError extends Error {
  constructor(message, code = 'OPENSPEC_UNAVAILABLE') {
    super(message);
    this.name = 'OpenSpecCliError';
    this.code = code;
  }
}

class OpenSpecCliClient {
  constructor({ cwd, command = 'openspec', timeoutMs = 30000, spawn = spawnSync, platform = process.platform, commandShell = process.env.ComSpec || 'cmd.exe' }) {
    if (!cwd) throw new OpenSpecCliError('OpenSpec cwd is required', 'INVALID_OPENSPEC_CONFIG');
    if (!/^[A-Za-z0-9_.:/\\-]+$/.test(command)) throw new OpenSpecCliError('OpenSpec command is invalid', 'INVALID_OPENSPEC_CONFIG');
    this.cwd = cwd;
    this.command = command;
    this.timeoutMs = timeoutMs;
    this.spawn = spawn;
    this.platform = platform;
    this.commandShell = commandShell;
  }

  _readJson(args) {
    const useCommandShell = this.platform === 'win32';
    const executable = useCommandShell ? this.commandShell : this.command;
    const commandArgs = useCommandShell ? ['/d', '/s', '/c', [this.command, ...args].join(' ')] : args;
    const result = this.spawn(executable, commandArgs, {
      cwd: this.cwd,
      encoding: 'utf8',
      windowsHide: true,
      timeout: this.timeoutMs,
    });
    if (result.error) throw new OpenSpecCliError(result.error.message);
    if (result.status !== 0) {
      throw new OpenSpecCliError((result.stderr || result.stdout || 'OpenSpec command failed').trim());
    }
    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new OpenSpecCliError('OpenSpec returned non-JSON output', 'INVALID_OPENSPEC_OUTPUT');
    }
  }

  listChanges() {
    const result = this._readJson(['list', '--changes', '--json']);
    if (!Array.isArray(result.changes)) throw new OpenSpecCliError('OpenSpec list response has no changes array', 'INVALID_OPENSPEC_OUTPUT');
    return result.changes.map((change) => ({
      id: change.name,
      title: change.title || change.name,
      summary: change.summary || null,
      status: change.status || null,
    }));
  }

  readChange(changeId) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(changeId || '')) {
      throw new OpenSpecCliError('OpenSpec change id is invalid', 'INVALID_OPENSPEC_CHANGE_ID');
    }
    const delta = this._readJson(['show', changeId, '--json', '--type', 'change', '--no-interactive', '--deltas-only']);
    return { id: changeId, title: delta.title || changeId, status: delta.status || null, delta };
  }
}

module.exports = { OpenSpecCliClient, OpenSpecCliError };
