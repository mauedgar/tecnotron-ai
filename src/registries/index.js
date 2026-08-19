'use strict';

const path = require('path');
const { loadRegistry, listRegistries, RegistryLoadError } = require('./registry');
const { Orchestrator } = require('./schemas/orchestrator');
const { RoleRegistry } = require('./schemas/roles');
const { ModelRegistry } = require('./schemas/models');
const { ProjectProfile } = require('./schemas/project-profile');
const { FinOps } = require('./schemas/finops');

const DEFAULT_CONFIG_DIR = path.resolve(__dirname, '..', '..', '..', 'FitFlow', '.ai', 'config');

const REGISTRY_SCHEMAS = {
  'orchestrator.yaml': Orchestrator,
  'roles.yaml': RoleRegistry,
  'models.yaml': ModelRegistry,
  'project-profile.yaml': ProjectProfile,
  'finops.yaml': FinOps,
};

function loadRegistries(configDir = DEFAULT_CONFIG_DIR, names) {
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
      loaded[name] = loadRegistry(filePath, schema);
    } catch (err) {
      errors.push(err);
    }
  }
  if (errors.length) {
    throw new RegistryLoadError(errors.map((e) => e.message).join('\n'));
  }
  return loaded;
}

function loadRegistryFile(name, configDir = DEFAULT_CONFIG_DIR) {
  const schema = REGISTRY_SCHEMAS[name];
  if (!schema) throw new RegistryLoadError(`no schema registered for ${name}`);
  return loadRegistry(path.join(configDir, name), schema);
}

module.exports = { loadRegistries, loadRegistryFile, REGISTRY_SCHEMAS, RegistryLoadError, DEFAULT_CONFIG_DIR };
