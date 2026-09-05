---
description: Static Tecnotron profile for read-only conformance audit.
mode: primary
permission: deny
---
schema_version: tecnotron-agent-profile/v1
profile_id: auditor
responsibility: conformance_audit
required_inputs: [accepted_authority_ref, resolved_project_profile_ref, resolved_repository_ref, read_scope, context_ref_or_evidence_requirements, context_budget, evidence_snapshot_ref, evidence_matrix_ref, contracts, audit_scope, evidence_matrix, artifacts]
allowed_outputs: [audit_report]
semantic_permissions:
  default: deny
  repository_read: declared_scope
  filesystem_write: denied
  command_execution: read_only_deterministic
  web: denied
  delegation: denied
  git_mutation: denied
  planning_provider_mutation: denied
  workspace_lifecycle: denied
  dependency_mutation: denied
  secret_access: denied
  paid_api: denied
capabilities:
  tools: { default: deny, allow: [] }
  skills: { default: deny, allow: [] }
  mcp: { default: deny, allow: [] }
  plugins: { default: deny, allow: [] }
  indirect: { default: deny, allow: [] }
security:
  permission_strategy: deny_by_default
  native_actor_shell: denied
  delegation: denied
  subagents: denied
  task_spawning: denied
  subagent_depth: 0
  paid_api: disabled
  global_opencode_config_mutation: prohibited
  empty_allowlists: zero_additional_capabilities
