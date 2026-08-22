'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

class RegistryLoadError extends Error {
  constructor(message, code = 'REGISTRY_LOAD_FAILED') {
    super(message);
    this.name = 'RegistryLoadError';
    this.code = code;
  }
}

function loadYamlFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return YAML.parse(text);
  } catch (err) {
    throw new RegistryLoadError(`yaml parse failed: ${filePath}: ${err.message}`);
  }
}

function loadRegistry(filePath, schema, options = {}) {
  const raw = loadYamlFile(filePath);
  if (options.version && raw?.schema_version !== options.version) {
    throw new RegistryLoadError(
      `${options.versionError}: ${filePath} requires ${options.version}`,
      options.versionError
    );
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new RegistryLoadError(`registry validation failed: ${filePath}\n${details}`, 'REGISTRY_VALIDATION_FAILED');
  }
  return parsed.data;
}

function listRegistries(configDir) {
  return fs
    .readdirSync(configDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
}

module.exports = { RegistryLoadError, loadYamlFile, loadRegistry, listRegistries };
