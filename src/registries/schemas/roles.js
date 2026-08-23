'use strict';

const { z } = require('zod');
const { TaskType, TaskArea, TaskRisk } = require('../../contracts/task');
const { ExecutionRequirements } = require('../../contracts/route');

const ROLE_REGISTRY_VERSION = 'fitflow-role-registry/v3';
const ROUTING_POLICY_ID = 'fitflow-routing-policy/v1';

const RoleEntry = z
  .object({
    status: z.enum(['active', 'disabled', 'active_specification', 'conditional_specification']),
    actor_type: z.enum(['developer', 'model', 'deterministic', 'hybrid']),
    writes_product: z.union([z.boolean(), z.literal('docs_only')]),
    terminal_authority: z.boolean().optional(),
    deterministic_first: z.boolean().optional(),
    allowed_skills: z.array(z.string()).optional(),
    criticality_ceiling: z.enum(['low', 'medium', 'high']).optional(),
    require_independent_execution: z.boolean().optional(),
    promotion_authority: z.boolean().optional(),
  })
  .strict();

const RuleMatch = z
  .object({
    task_type: TaskType.optional(),
    area: TaskArea.optional(),
    risk: TaskRisk.optional(),
  })
  .strict();

const RoutingRule = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_-]*$/),
    precedence: z.number().int().min(0),
    match: RuleMatch,
    role: z.string().min(1),
    requirements: ExecutionRequirements,
  })
  .strict();

const RoutingPolicy = z
  .object({
    id: z.literal(ROUTING_POLICY_ID),
    matching_order: z.tuple([z.literal('task_type'), z.literal('area'), z.literal('risk')]),
    rules: z.array(RoutingRule).min(1),
  })
  .strict();

function rulesOverlap(left, right) {
  return ['task_type', 'area', 'risk'].every((field) => !left.match[field] || !right.match[field] || left.match[field] === right.match[field]);
}

const RoleRegistry = z
  .object({
    schema_version: z.literal(ROLE_REGISTRY_VERSION),
    roles: z.record(z.string().min(1), RoleEntry),
    disabled_roles: z.array(z.string().min(1)),
    routing_policy: RoutingPolicy,
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set();
    for (const [index, rule] of value.routing_policy.rules.entries()) {
      if (ids.has(rule.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['routing_policy', 'rules', index, 'id'], message: 'DUPLICATE_RULE_ID' });
      }
      ids.add(rule.id);
      const role = value.roles[rule.role];
      if (!role) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['routing_policy', 'rules', index, 'role'], message: 'ROLE_NOT_FOUND' });
      } else if (role.actor_type !== 'model') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['routing_policy', 'rules', index, 'role'], message: 'ROLE_NOT_MODEL_EXECUTABLE' });
      } else if (role.status === 'disabled' || value.disabled_roles.includes(rule.role)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['routing_policy', 'rules', index, 'role'], message: 'ROLE_DISABLED' });
      }
    }
    for (let left = 0; left < value.routing_policy.rules.length; left += 1) {
      for (let right = left + 1; right < value.routing_policy.rules.length; right += 1) {
        const a = value.routing_policy.rules[left];
        const b = value.routing_policy.rules[right];
        if (a.precedence === b.precedence && rulesOverlap(a, b)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['routing_policy', 'rules', right], message: 'AMBIGUOUS_MATCH' });
        }
      }
    }
  });

module.exports = {
  ROLE_REGISTRY_VERSION,
  ROUTING_POLICY_ID,
  RoleEntry,
  RoutingRule,
  RoutingPolicy,
  RoleRegistry,
  rulesOverlap,
};
