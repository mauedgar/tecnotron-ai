'use strict';

const path = require('path');
const { loadRegistry } = require('./registry');
const {
  AGENT_PROFILE_REGISTRY_VERSION,
  AgentProfileRegistry,
} = require('./schemas/agent-profiles');

function loadAgentProfiles(filePath = path.join(__dirname, 'agent-profiles.yaml')) {
  return loadRegistry(filePath, AgentProfileRegistry, {
    version: AGENT_PROFILE_REGISTRY_VERSION,
    versionError: 'UNSUPPORTED_AGENT_PROFILE_REGISTRY_VERSION',
  });
}

module.exports = { loadAgentProfiles };
