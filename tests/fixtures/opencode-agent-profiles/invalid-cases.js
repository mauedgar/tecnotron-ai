'use strict';

const cases = [
  { name: 'unknown profile', target: 'profile', path: ['profile_id'], value: 'unknown' },
  { name: 'legacy profile', target: 'profile', path: ['profile_id'], value: 'coder' },
  { name: 'tenth profile', target: 'profile', path: ['profile_id'], value: 'tenth_profile' },
  { name: 'routing role binding', target: 'profile', path: ['role'], value: 'implementer' },
  { name: 'model binding', target: 'frontmatter', path: ['model'], value: 'provider/model' },
  { name: 'provider binding', target: 'profile', path: ['provider'], value: 'provider' },
  { name: 'runtime binding', target: 'profile', path: ['runtime'], value: 'opencode' },
  { name: 'permission widening', target: 'frontmatter', path: ['permission'], value: 'allow' },
  { name: 'shell enablement', target: 'frontmatter', path: ['permission'], value: { bash: 'allow' } },
  { name: 'delegation', target: 'profile', path: ['security', 'delegation'], value: 'allowed' },
  { name: 'subagents', target: 'profile', path: ['security', 'subagents'], value: 'allowed' },
  { name: 'task spawning', target: 'profile', path: ['security', 'task_spawning'], value: 'allowed' },
  { name: 'non-zero subagent depth', target: 'profile', path: ['security', 'subagent_depth'], value: 1 },
  { name: 'paid API enablement', target: 'profile', path: ['security', 'paid_api'], value: 'enabled' },
  { name: 'permissive empty allowlist', target: 'profile', path: ['security', 'empty_allowlists'], value: 'unrestricted' },
  { name: 'unknown permission mapping', target: 'profile', path: ['semantic_permissions', 'web'], value: 'unknown' },
  { name: 'tool broadening', target: 'profile', path: ['capabilities', 'tools', 'allow'], value: ['extra-tool'] },
  { name: 'skill broadening', target: 'profile', path: ['capabilities', 'skills', 'allow'], value: ['extra-skill'] },
  { name: 'MCP broadening', target: 'profile', path: ['capabilities', 'mcp', 'allow'], value: ['server'] },
  { name: 'plugin broadening', target: 'profile', path: ['capabilities', 'plugins', 'allow'], value: ['plugin'] },
  { name: 'indirect capability broadening', target: 'profile', path: ['capabilities', 'indirect', 'allow'], value: ['adapter'] },
  { name: 'global config dependence', target: 'profile', path: ['global_config'], value: 'required' },
  { name: 'personal config dependence', target: 'profile', path: ['personal_config'], value: 'required' },
];

module.exports = { cases };
