'use strict';

const { z } = require('zod');

const RoleEntry = z
  .object({
    status: z.enum(['active', 'disabled', 'active_specification', 'conditional_specification']),
    actor_type: z.enum(['developer', 'model', 'deterministic', 'hybrid']),
    writes_product: z.union([z.boolean(), z.enum(['docs_only'])]),
    terminal_authority: z.boolean().optional(),
    deterministic_first: z.boolean().optional(),
    allowed_skills: z.array(z.string()).optional(),
    criticality_ceiling: z.enum(['low', 'medium', 'high']).optional(),
    require_independent_execution: z.boolean().optional(),
    promotion_authority: z.boolean().optional(),
  })
  .strict();

const RoleRegistry = z
  .object({
    schema_version: z.literal('fitflow-role-registry/v2'),
    roles: z.record(RoleEntry),
    disabled_roles: z.array(z.string()),
  })
  .strict();

module.exports = { RoleRegistry };
