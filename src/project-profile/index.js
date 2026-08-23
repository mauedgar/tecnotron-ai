'use strict';

const fs = require('fs');
const path = require('path');

const PROFILE_RELATIVE_PATH = path.join('.ai', 'config', 'project-profile.yaml');

class ProjectResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectResolutionError';
  }
}

function existingDirectory(candidate, label) {
  if (!candidate || !fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) {
    throw new ProjectResolutionError(`${label} no es un directorio disponible: ${candidate || '(sin valor)'}`);
  }
  return path.resolve(candidate);
}

function readProfile(profilePath) {
  if (!fs.existsSync(profilePath)) {
    throw new ProjectResolutionError(`Project Profile no encontrado: ${profilePath}`);
  }
  const source = fs.readFileSync(profilePath, 'utf8');
  try {
    const YAML = require('yaml');
    const { ProjectProfile } = require('../registries/schemas/project-profile');
    const validated = ProjectProfile.safeParse(YAML.parse(source));
    if (!validated.success) throw new ProjectResolutionError(`Project Profile invalido: ${validated.error.message}`);
    return validated.data;
  } catch (err) {
    if (err instanceof ProjectResolutionError) throw err;
    // Doctor no instala dependencias: valida los campos que necesita para discovery.
    const value = (key) => {
      const match = source.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, 'm'));
      return match && match[1].replace(/^['"]|['"]$/g, '');
    };
    const profile = { schema_version: value('schema_version'), project_id: value('project_id'), roots: { product: value('product'), ai_core: value('ai_core') } };
    if (profile.schema_version !== 'fitflow-project-profile/v1' || !profile.project_id || !profile.roots.product || !profile.roots.ai_core) {
      throw new ProjectResolutionError('Project Profile invalido o no verificable sin dependencias');
    }
    return profile;
  }
}

/**
 * Resuelve roots desde informacion declarada, nunca desde topologia de worktrees.
 * La ruta del perfil identifica el checkout de producto activo; sus campos roots
 * son fallbacks para ejecuciones fuera de un worktree de producto.
 */
function resolveProject(options = {}) {
  const aiCoreRoot = existingDirectory(
    options.aiCoreRoot || process.env.FF_AI_CORE_ROOT || path.resolve(__dirname, '..', '..'),
    'Root de FitFlow-ai'
  );
  const explicitProjectRoot = options.projectRoot || process.env.FF_PROJECT_ROOT;
  const explicitProfilePath = options.profilePath || process.env.FF_PROJECT_PROFILE;
  const profilePath = explicitProfilePath
    ? path.resolve(explicitProfilePath)
    : explicitProjectRoot
      ? path.join(path.resolve(explicitProjectRoot), PROFILE_RELATIVE_PATH)
      : null;
  const profile = readProfile(profilePath || path.join(aiCoreRoot, PROFILE_RELATIVE_PATH));
  const projectRoot = existingDirectory(
    explicitProjectRoot || (profilePath && path.resolve(profilePath, '..', '..', '..')) || profile.roots.product,
    'Root de FitFlow'
  );
  const resolvedProfilePath = path.join(projectRoot, PROFILE_RELATIVE_PATH);
  if (!fs.existsSync(resolvedProfilePath)) {
    throw new ProjectResolutionError(`El root de FitFlow no contiene su Project Profile: ${resolvedProfilePath}`);
  }

  return Object.freeze({
    projectId: profile.project_id,
    profile,
    profilePath: resolvedProfilePath,
    projectRoot,
    aiCoreRoot,
    repositories: Object.freeze({ fitflow: projectRoot, 'fitflow-ai': aiCoreRoot }),
    configDir: path.join(projectRoot, '.ai', 'config'),
    contractsDir: path.join(projectRoot, '.ai', 'contracts', 'v2'),
  });
}

module.exports = { PROFILE_RELATIVE_PATH, ProjectResolutionError, resolveProject };
