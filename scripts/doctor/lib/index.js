'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { run, firstLine, parseVersion, resolveWindowsExtension } = require('./exec');
const { resolveProject, ProjectResolutionError } = require('../../../src/project-profile');


function exists(candidate) {
  if (!candidate) return false;
  try {
    return fs.existsSync(candidate);
  } catch (_err) {
    return false;
  }
}

async function which(command) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'where' : 'which';
    execFile(shell, [command], { windowsHide: true }, (error, stdout) => {
      if (error || !stdout) return resolve(null);
    const first = String(stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    resolve(resolveWindowsExtension(first) || null);
    });
  });
}

const TOOLS = [
  {
    id: 'node',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'npm',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'python',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'git',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'gh',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'openspec',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'repomix',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
  {
    id: 'opencode',
    versionArgs: ['--version'],
    describe: (r) => ({ version: parseVersion(r.stdout), raw: firstLine(r.stdout) }),
  },
];

async function probeTool(tool) {
  const executable = await which(tool.id);
  if (!executable) {
    return {
      id: tool.id,
      available: false,
      executable: null,
      status: 'UNAVAILABLE',
      capabilities: [],
      version: null,
      raw: null,
    };
  }
  const result = await run(executable, tool.versionArgs);
  const desc = tool.describe(result);
  return {
    id: tool.id,
    available: result.code === 0,
    executable,
    status: result.code === 0 ? 'AVAILABLE' : 'UNREACHABLE',
    capabilities: [],
    version: desc.version,
    raw: desc.raw,
  };
}

async function probeRepoPackager(resolution) {
  const aiCoreRoot = resolution.aiCoreRoot;
  const venvPython = path.join(aiCoreRoot, 'python', '.venv_tools', 'Scripts', 'python.exe');
  const packScript = path.join(aiCoreRoot, '.opencode', 'skills', 'repo-packager', 'scripts', 'pack.py');
  const scriptExists = exists(packScript);
  const venvExists = exists(venvPython);
  if (!scriptExists) {
    return {
      id: 'repo-packager',
      available: false,
      executable: null,
      status: 'UNAVAILABLE',
      capabilities: [],
      version: null,
      raw: null,
      reason: 'SKILL_SCRIPT_MISSING',
    };
  }
  if (!venvExists) {
    return {
      id: 'repo-packager',
      available: false,
      executable: packScript,
      status: 'UNREACHABLE',
      capabilities: [],
      version: null,
      raw: null,
      reason: 'VENV_TOOLS_MISSING',
    };
  }
  const result = await run(venvPython, [packScript, '--help'], { timeout: 20000 });
  return {
    id: 'repo-packager',
    available: result.code === 0,
    executable: packScript,
    status: result.code === 0 ? 'AVAILABLE' : 'UNREACHABLE',
    capabilities: result.code === 0 ? ['context_packaging'] : [],
    version: null,
    raw: firstLine(result.stdout) || firstLine(result.stderr),
  };
}

async function probeLibreOffice() {
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      ]
    : ['/usr/bin/soffice', '/usr/bin/libreoffice'];
  const found = candidates.find(exists);
  if (!found) {
    return {
      id: 'libreoffice',
      available: false,
      executable: null,
      status: 'UNAVAILABLE',
      capabilities: [],
      version: null,
      raw: null,
    };
  }
  const result = await run(found, ['--version']);
  return {
    id: 'libreoffice',
    available: result.code === 0,
    executable: found,
    status: result.code === 0 ? 'AVAILABLE' : 'UNREACHABLE',
    capabilities: result.code === 0 ? ['docx_render'] : [],
    version: parseVersion(result.stdout),
    raw: firstLine(result.stdout),
  };
}

function probeProjectProfile(resolution) {
  const configDir = resolution.configDir;
  const profile = resolution.profilePath;
  const contractsDir = resolution.contractsDir;
  return {
    id: 'project-profile',
    available: exists(profile),
    executable: profile,
    status: exists(profile) ? 'AVAILABLE' : 'UNAVAILABLE',
    capabilities: exists(profile) ? ['profile_read'] : [],
    version: null,
    raw: null,
    derived: {
      config_dir_exists: exists(configDir),
      contracts_v2_dir_exists: exists(contractsDir),
      contracts_v2_schemas: exists(contractsDir)
        ? fs.readdirSync(contractsDir).filter((f) => f.endsWith('.schema.json')).length
        : 0,
    },
  };
}

async function collect(options) {
  const results = [];
  for (const tool of TOOLS) {
    results.push(await probeTool(tool));
  }
  let resolution;
  try {
    resolution = resolveProject(options);
  } catch (err) {
    if (!(err instanceof ProjectResolutionError)) throw err;
    results.push({ id: 'project-profile', available: false, executable: null, status: 'UNAVAILABLE', capabilities: [], version: null, raw: null, reason: err.message });
    return results;
  }
  results.push(await probeRepoPackager(resolution));
  results.push(await probeLibreOffice());
  results.push(probeProjectProfile(resolution));
  Object.defineProperty(results, 'resolution', { value: resolution });
  return results;
}

function summarize(results) {
  const available = results.filter((r) => r.status === 'AVAILABLE').length;
  const unavailable = results.filter((r) => r.status === 'UNAVAILABLE').length;
  const unreachable = results.filter((r) => r.status === 'UNREACHABLE').length;
  return { available, unavailable, unreachable, total: results.length };
}

module.exports = { collect, summarize, TOOLS };
