'use strict';

const { TaskRoutingInput } = require('../contracts/task');
const { RouteDecision } = require('../contracts/route');
const { RoleRegistry, ROLE_REGISTRY_VERSION } = require('../registries/schemas/roles');

const CRITICALITY = { low: 0, medium: 1, high: 2 };

class RoutingInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoutingInputError';
    this.code = 'INVALID_TASK_ROUTING_INPUT';
  }
}

function blocked(reason_code) {
  return RouteDecision.parse({ status: 'BLOCKED', reason_code, role: null, requirements: null });
}

function issueReason(issues) {
  const reasons = issues.map((issue) => issue.message);
  return [
    'AMBIGUOUS_MATCH',
    'ROLE_NOT_FOUND',
    'ROLE_NOT_MODEL_EXECUTABLE',
    'ROLE_DISABLED',
  ].find((reason) => reasons.includes(reason)) || 'ROUTING_POLICY_UNAVAILABLE';
}

function matches(rule, task) {
  return ['task_type', 'area', 'risk'].every((field) => rule.match[field] === undefined || rule.match[field] === task[field]);
}

function routeTask(taskInput, roleRegistry) {
  const task = TaskRoutingInput.safeParse(taskInput);
  if (!task.success) throw new RoutingInputError(task.error.message);
  if (roleRegistry?.schema_version !== ROLE_REGISTRY_VERSION) return blocked('UNSUPPORTED_ROLE_REGISTRY_VERSION');

  const parsedRegistry = RoleRegistry.safeParse(roleRegistry);
  if (!parsedRegistry.success) return blocked(issueReason(parsedRegistry.error.issues));
  const registry = parsedRegistry.data;
  const candidates = registry.routing_policy.rules
    .filter((rule) => matches(rule, task.data))
    .sort((left, right) => left.precedence - right.precedence || left.id.localeCompare(right.id));
  if (candidates.length === 0) return blocked('NO_MATCHING_RULE');
  if (candidates.length > 1 && candidates[0].precedence === candidates[1].precedence) return blocked('AMBIGUOUS_MATCH');

  const selected = candidates[0];
  const role = registry.roles[selected.role];
  if (!role) return blocked('ROLE_NOT_FOUND');
  if (role.actor_type !== 'model') return blocked('ROLE_NOT_MODEL_EXECUTABLE');
  if (role.status === 'disabled' || registry.disabled_roles.includes(selected.role)) return blocked('ROLE_DISABLED');
  if (role.criticality_ceiling && CRITICALITY[role.criticality_ceiling] < CRITICALITY[selected.requirements.criticality]) {
    return blocked('CRITICALITY_INCOMPATIBLE');
  }
  return RouteDecision.parse({
    status: 'ROUTED',
    reason_code: 'ROLE_SELECTED',
    role: selected.role,
    requirements: selected.requirements,
  });
}

module.exports = { RoutingInputError, routeTask, matches };
