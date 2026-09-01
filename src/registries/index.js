'use strict';

const path = require('path');
const { loadRegistry, listRegistries, RegistryLoadError } = require('./registry');
const { Orchestrator } = require('./schemas/orchestrator');
const { RoleRegistry } = require('./schemas/roles');
const { ModelRegistry, MODEL_REGISTRY_VERSION } = require('./schemas/models');
const { ProjectProfile } = require('./schemas/project-profile');
const { FinOps } = require('./schemas/finops');
const { ROLE_REGISTRY_VERSION } = require('./schemas/roles');
const { AgentProfileRegistry } = require('./schemas/agent-profiles');
const { loadAgentProfiles } = require('./agent-profiles');

const REGISTRY_SCHEMAS = {
  'orchestrator.yaml': Orchestrator,
  'roles.yaml': RoleRegistry,
  'models.yaml': ModelRegistry,
  'project-profile.yaml': ProjectProfile,
  'finops.yaml': FinOps,
};

const VERSION_REQUIREMENTS = {
  'models.yaml': { version: MODEL_REGISTRY_VERSION, versionError: 'UNSUPPORTED_MODEL_REGISTRY_VERSION' },
  'roles.yaml': { version: ROLE_REGISTRY_VERSION, versionError: 'UNSUPPORTED_ROLE_REGISTRY_VERSION' },
};

function defaultConfigDir() {
  return require('../project-profile').resolveProject().configDir;
}

function loadRegistries(configDir = defaultConfigDir(), names) {
  const targets = names || listRegistries(configDir);
  const loaded = {};
  const errors = [];
  for (const name of targets) {
    const filePath = path.join(configDir, name);
    const schema = REGISTRY_SCHEMAS[name];
    if (!schema) {
      errors.push(new RegistryLoadError(`no schema registered for ${name}`));
      continue;
    }
    try {
      loaded[name] = loadRegistry(filePath, schema, VERSION_REQUIREMENTS[name]);
    } catch (err) {
      errors.push(err);
    }
  }
  if (errors.length) {
    throw new RegistryLoadError(errors.map((e) => e.message).join('\n'));
  }
  return loaded;
}

function loadRegistryFile(name, configDir = defaultConfigDir()) {
  const schema = REGISTRY_SCHEMAS[name];
  if (!schema) throw new RegistryLoadError(`no schema registered for ${name}`);
  return loadRegistry(path.join(configDir, name), schema, VERSION_REQUIREMENTS[name]);
}

module.exports = {
  loadRegistries,
  loadRegistryFile,
  REGISTRY_SCHEMAS,
  VERSION_REQUIREMENTS,
  RegistryLoadError,
  defaultConfigDir,
  AgentProfileRegistry,
  loadAgentProfiles,
};
