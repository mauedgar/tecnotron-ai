'use strict';

const { spawnSync } = require('child_process');

class RepoPackagerAdapterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RepoPackagerAdapterError';
  }
}

function createRepoPackagerMaterializer({ root, scriptPath, pythonCommand = 'python', timeoutMs = 30000, spawn = spawnSync }) {
  if (!root || !scriptPath) throw new RepoPackagerAdapterError('root and scriptPath are required');

  return ({ budget_tokens, requested_paths = [], requested_evidence = [] }) => {
    if (requested_paths.length === 0) {
      return { provider: 'repo-packager', evidence: [], omitted_paths: [], quality_status: 'CURRENT' };
    }
    const result = spawn(pythonCommand, [
      scriptPath,
      'exact',
      '--root', root,
      '--paths', requested_paths.join(','),
      '--budget', String(budget_tokens),
    ], { encoding: 'utf8', windowsHide: true, timeout: timeoutMs });
    if (result.error) throw new RepoPackagerAdapterError(result.error.message);
    if (result.status !== 0) throw new RepoPackagerAdapterError((result.stderr || result.stdout || 'repo-packager failed').trim());

    let output;
    try {
      output = JSON.parse(result.stdout);
    } catch {
      throw new RepoPackagerAdapterError('repo-packager returned non-JSON output');
    }
    if (!Array.isArray(output.evidence) || !Array.isArray(output.omitted_paths)) {
      throw new RepoPackagerAdapterError('repo-packager returned an invalid exact result');
    }

    const requirementsByPath = new Map(requested_evidence.filter((item) => item.path).map((item) => [item.path, item]));
    return {
      provider: output.provider || 'repo-packager',
      evidence: output.evidence.map((item) => ({
        evidence_id: requirementsByPath.get(item.path)?.evidence_id || `path:${item.path}`,
        path: item.path,
        content: item.content,
      })),
      omitted_paths: output.omitted_paths,
      quality_status: 'CURRENT',
    };
  };
}

function createCompositeMaterializer({ repositoryMaterializer, virtualEvidence = [], virtualPaths = [] }) {
  const virtualByPath = new Map(virtualEvidence.map((item) => [item.path, item]));
  const knownVirtualPaths = new Set([...virtualPaths, ...virtualByPath.keys()]);
  return (request) => {
    const repositoryPaths = request.requested_paths.filter((item) => !knownVirtualPaths.has(item));
    const repositoryRequirements = request.requested_evidence.filter((item) => !item.path || !knownVirtualPaths.has(item.path));
    const repositoryResult = repositoryMaterializer({
      ...request,
      requested_paths: repositoryPaths,
      requested_evidence: repositoryRequirements,
    });
    const includedVirtual = request.requested_paths.map((item) => virtualByPath.get(item)).filter(Boolean);
    const includedVirtualPaths = new Set(includedVirtual.map((item) => item.path));
    const missingVirtual = request.requested_paths.filter((item) => knownVirtualPaths.has(item) && !includedVirtualPaths.has(item));
    const evidenceByPath = new Map([...repositoryResult.evidence, ...includedVirtual].map((item) => [item.path, item]));
    return {
      provider: includedVirtual.length ? 'repo-packager+openspec' : repositoryResult.provider,
      evidence: request.requested_paths.map((item) => evidenceByPath.get(item)).filter(Boolean),
      omitted_paths: [...repositoryResult.omitted_paths, ...missingVirtual],
      quality_status: 'CURRENT',
    };
  };
}

module.exports = { RepoPackagerAdapterError, createRepoPackagerMaterializer, createCompositeMaterializer };
