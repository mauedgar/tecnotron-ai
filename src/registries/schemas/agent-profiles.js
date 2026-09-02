'use strict';

const { z } = require('zod');

const AGENT_PROFILE_REGISTRY_VERSION = 'tecnotron-agent-profile/v1';
const PROFILE_IDS = [
  'spec_analyst',
  'planner',
  'architect',
  'explorer',
  'implementer',
  'doc_curator',
  'reviewer',
  'researcher',
  'auditor',
];
const COMMON_INPUTS = [
  'accepted_authority_ref',
  'resolved_project_profile_ref',
  'resolved_repository_ref',
  'read_scope',
  'context_ref_or_evidence_requirements',
  'context_budget',
];
const CONDITIONAL_INPUTS = {
  execution_profiles: ['task_authorization_ref', 'write_scope_if_writer'],
  researcher: ['research_authorization_ref'],
  reviewer: ['change_snapshot_ref', 'validation_evidence_ref'],
  auditor: ['evidence_snapshot_ref', 'evidence_matrix_ref'],
};
const PROFILE_CONTRACTS = {
  spec_analyst: {
    responsibility: 'specification',
    inputs: [...COMMON_INPUTS, 'problem', 'accepted_authorities', 'constraints', 'gaps'],
    outputs: ['spec_proposal'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'denied',
  },
  planner: {
    responsibility: 'execution_planning',
    inputs: [...COMMON_INPUTS, 'accepted_spec', 'milestone', 'dependencies', 'ownership'],
    outputs: ['wp_plan_proposal', 'task_decomposition_proposal'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'denied',
  },
  architect: {
    responsibility: 'technical_architecture',
    inputs: [...COMMON_INPUTS, 'accepted_spec', 'existing_contracts', 'architecture', 'consumers'],
    outputs: ['architecture_proposal', 'adr_proposal'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'denied',
  },
  explorer: {
    responsibility: 'evidence_exploration',
    inputs: [...COMMON_INPUTS, 'evidence_requirements', 'project_profile'],
    outputs: ['context_report'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'denied',
  },
  implementer: {
    responsibility: 'source_implementation',
    inputs: [...COMMON_INPUTS, ...CONDITIONAL_INPUTS.execution_profiles, 'authorized_task', 'task_plan', 'task_worktree', 'write_scope', 'context_reference'],
    outputs: ['implementation_report'],
    filesystemWrite: 'task_owned_source',
    commandExecution: 'task_validation',
    web: 'denied',
  },
  doc_curator: {
    responsibility: 'documentation_materialization',
    inputs: [...COMMON_INPUTS, ...CONDITIONAL_INPUTS.execution_profiles, 'authorized_documentation_task', 'accepted_authorities', 'documentation_write_scope'],
    outputs: ['documentation_report'],
    filesystemWrite: 'task_owned_docs',
    commandExecution: 'task_validation',
    web: 'denied',
  },
  reviewer: {
    responsibility: 'independent_review',
    inputs: [...COMMON_INPUTS, ...CONDITIONAL_INPUTS.reviewer, 'accepted_spec_or_task', 'change_snapshot', 'validation_result'],
    outputs: ['external_review_report'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'denied',
  },
  researcher: {
    responsibility: 'authorized_research',
    inputs: [...COMMON_INPUTS, ...CONDITIONAL_INPUTS.researcher, 'research_question', 'authorized_research_task', 'source_policy'],
    outputs: ['research_report'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'authorized_research_task_only',
  },
  auditor: {
    responsibility: 'conformance_audit',
    inputs: [...COMMON_INPUTS, ...CONDITIONAL_INPUTS.auditor, 'contracts', 'audit_scope', 'evidence_matrix', 'artifacts'],
    outputs: ['audit_report'],
    filesystemWrite: 'denied',
    commandExecution: 'read_only_deterministic',
    web: 'denied',
  },
};

const INPUT_IDS = [...new Set([
  ...COMMON_INPUTS,
  ...Object.values(CONDITIONAL_INPUTS).flat(),
  ...Object.values(PROFILE_CONTRACTS).flatMap(({ inputs }) => inputs),
])];
const RESPONSIBILITY_IDS = PROFILE_IDS.map((id) => PROFILE_CONTRACTS[id].responsibility);
const OUTPUT_IDS = [...new Set(Object.values(PROFILE_CONTRACTS).flatMap(({ outputs }) => outputs))];

const CapabilityAllowlist = z
  .object({
    default: z.literal('deny'),
    allow: z.array(z.string()).max(0).optional().default([]),
  })
  .strict();

const Permissions = z
  .object({
    default: z.literal('deny'),
    repository_read: z.literal('declared_scope'),
    filesystem_write: z.enum(['denied', 'task_owned_source', 'task_owned_docs']),
    command_execution: z.enum(['denied', 'read_only_deterministic', 'task_validation']),
    web: z.enum(['denied', 'authorized_research_task_only']),
    delegation: z.literal('denied'),
    git_mutation: z.literal('denied'),
    planning_provider_mutation: z.literal('denied'),
    workspace_lifecycle: z.literal('denied'),
    dependency_mutation: z.literal('denied'),
    secret_access: z.literal('denied'),
    paid_api: z.literal('denied'),
  })
  .strict();

const AgentProfile = z
  .object({
    responsibility: z.enum(RESPONSIBILITY_IDS),
    required_inputs: z.array(z.enum(INPUT_IDS)).min(1),
    allowed_outputs: z.array(z.enum(OUTPUT_IDS)).min(1),
    subagent_depth: z.literal(0),
    permissions: Permissions,
    tools: CapabilityAllowlist,
    skills: CapabilityAllowlist,
  })
  .strict();

const Profiles = z
  .object(Object.fromEntries(PROFILE_IDS.map((id) => [id, AgentProfile])))
  .strict();

const ConditionalRequiredInputs = z
  .object({
    execution_profiles: z.array(z.enum(INPUT_IDS)),
    researcher: z.array(z.enum(INPUT_IDS)),
    reviewer: z.array(z.enum(INPUT_IDS)),
    auditor: z.array(z.enum(INPUT_IDS)),
  })
  .strict();

function arraysEqual(actual, expected) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function addMismatch(ctx, path, message) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

const AgentProfileRegistry = z
  .object({
    schema_version: z.literal(AGENT_PROFILE_REGISTRY_VERSION),
    common_required_inputs: z.array(z.enum(INPUT_IDS)),
    conditional_required_inputs: ConditionalRequiredInputs,
    profiles: Profiles,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!arraysEqual(value.common_required_inputs, COMMON_INPUTS)) {
      addMismatch(ctx, ['common_required_inputs'], 'COMMON_REQUIRED_INPUTS_MISMATCH');
    }
    for (const [key, expected] of Object.entries(CONDITIONAL_INPUTS)) {
      if (!arraysEqual(value.conditional_required_inputs[key], expected)) {
        addMismatch(ctx, ['conditional_required_inputs', key], 'CONDITIONAL_REQUIRED_INPUTS_MISMATCH');
      }
    }
    for (const id of PROFILE_IDS) {
      const profile = value.profiles[id];
      const expected = PROFILE_CONTRACTS[id];
      if (profile.responsibility !== expected.responsibility) {
        addMismatch(ctx, ['profiles', id, 'responsibility'], 'RESPONSIBILITY_MISMATCH');
      }
      if (!arraysEqual(profile.required_inputs, expected.inputs)) {
        addMismatch(ctx, ['profiles', id, 'required_inputs'], 'REQUIRED_INPUTS_MISMATCH');
      }
      if (!arraysEqual(profile.allowed_outputs, expected.outputs)) {
        addMismatch(ctx, ['profiles', id, 'allowed_outputs'], 'ALLOWED_OUTPUTS_MISMATCH');
      }
      if (profile.permissions.filesystem_write !== expected.filesystemWrite) {
        addMismatch(ctx, ['profiles', id, 'permissions', 'filesystem_write'], 'FILESYSTEM_WRITE_MISMATCH');
      }
      if (profile.permissions.command_execution !== expected.commandExecution) {
        addMismatch(ctx, ['profiles', id, 'permissions', 'command_execution'], 'COMMAND_EXECUTION_MISMATCH');
      }
      if (profile.permissions.web !== expected.web) {
        addMismatch(ctx, ['profiles', id, 'permissions', 'web'], 'WEB_PERMISSION_MISMATCH');
      }
    }
  });

module.exports = {
  AGENT_PROFILE_REGISTRY_VERSION,
  AgentProfileRegistry,
};
