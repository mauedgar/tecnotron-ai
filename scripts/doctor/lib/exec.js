'use strict';

const { execFile, spawn } = require('child_process');

function run(executable, args, opts = {}) {
  return new Promise((resolve) => {
    const isWindowsShim = process.platform === 'win32' && /\.(cmd|bat)$/i.test(executable);
    const options = Object.assign(
      { encoding: 'utf8', timeout: 15000, windowsHide: true },
      opts
    );
    let stdout = '';
    let stderr = '';
    let child;
    if (isWindowsShim) {
      const quoted = /[\s"]/.test(executable) ? `"${executable.replace(/"/g, '\\"')}"` : executable;
      child = spawn(quoted, args, Object.assign({}, options, { shell: true }));
    } else {
      child = spawn(executable, args, options);
    }
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (error) => {
      resolve({ error, stdout: String(stdout), stderr: String(stderr), code: error.code });
    });
    child.on('close', (code) => {
      resolve({ error: code === 0 ? null : new Error('exit ' + code), stdout: String(stdout), stderr: String(stderr), code });
    });
    if (options.timeout) {
      setTimeout(() => { try { child.kill(); } catch (_e) { /* noop */ } }, options.timeout);
    }
  });
}

function resolveWindowsExtension(candidate) {
  if (process.platform !== 'win32' || !candidate) return candidate;
  const ext = require('path').extname(candidate);
  if (ext) return candidate;
  const pathext = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').map((e) => e.toLowerCase());
  const probe = require('fs');
  for (const e of pathext) {
    const withExt = candidate + e;
    try {
      probe.accessSync(withExt);
      return withExt;
    } catch (_err) {
      // keep probing
    }
  }
  return candidate;
}

function firstLine(stdout) {
  const line = String(stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line || null;
}

function parseVersion(stdout) {
  const line = firstLine(stdout);
  if (!line) return null;
  const match = line.match(/(\d+\.\d+(\.\d+)?)/);
  return match ? match[1] : null;
}

module.exports = { run, firstLine, parseVersion, resolveWindowsExtension };
