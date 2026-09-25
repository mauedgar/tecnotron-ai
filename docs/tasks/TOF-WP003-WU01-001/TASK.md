---
document_id: TOF-TASK-WP003-WU01-001
status: READY
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-25
machine_context: true
task_id: TOF-WP003-WU01-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU01-DETERMINISTIC-PARSER-RELATION-VALIDATOR-001
responsibility: MATERIALIZE_WP003_DETERMINISTIC_PARSER_AND_RELATION_VALIDATOR
work_package_id: WP-003
work_units: [WP003-WU-01]
repository: mauedgar/tecnotron-ai
integration_branch: tools
task_branch: candidate/wp003-wu01-deterministic-parser-relation-validator-001
task_base: 4f789caf8c02ce68a6dd6980e18e983053addfee
task_base_tree: 122d93dc8b0414e9e8bd7cddd03d0b51df27dddf
scope_fit: FIT
assignment_authority: Developer
authorization_ref: TASKCYCLE-TECNOTRON-WP003-WU01-DETERMINISTIC-PARSER-RELATION-VALIDATOR-001
implementation_authority: WU01_ONLY
implementation_authorized: true
independent_review: NOT_RUN
developer_acceptance: NOT_GRANTED
integration_authority: NOT_GRANTED
publication_authority: NOT_GRANTED
accepted_spec:
  path: docs/work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md
  blob: e44e501944838d368520cd2c6eb37a7ccd878c68
accepted_wp_plan:
  path: docs/work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md
  blob: b13ba1c41c8a8491ccdf2620f6b0692fbaa79399
accepted_contract:
  path: docs/contracts/tecnotron-sdd-artifacts-v1.md
  blob: 82e59a7e253b4e7b416b7e25761b606140d459e8
accepted_adr:
  path: docs/adr/ADR-WP003-SDD-AUTHORITY.md
  blob: 43bfe26ff5b6161baa9038177708dd2db11d84f4
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
write_scope:
  - docs/tasks/TOF-WP003-WU01-001/TASK.md
  - docs/tasks/TOF-WP003-WU01-001/PLAN.md
  - src/contracts/sdd-artifacts.js
  - src/contracts/index.js
  - src/contracts/index.mjs
  - tests/contract/sdd-artifact-authority.test.js
---

# TASK TOF-WP003-WU01-001: deterministic parser and relation validator

## Assignment and authority

Materialize only `WP003-WU-01` from the accepted WP003 PLAN under the accepted
WP003 SPEC and the accepted WU00 contract/ADR foundation. The explicit Developer
handoff identified above authorizes this bounded implementation through one
immutable candidate and external Independent Review package. This TASK records
that assignment; it does not create the authority by documenting it.

`READY` is the assignment state only. It is not implementation evidence,
validation, review, Developer acceptance, integration, publication or closure.
Stage A and Stage B remain terminal and are not reopened.

## Bounded implementation

Implement a strict, read-only parser and deterministic relation validator for
the normalized `tecnotron-sdd-artifacts/v1` representation. It validates declared
structure, identities, references and relationships for:

```text
SPEC -> WP PLAN -> TASK -> task PLAN -> RESULT -> REVIEW
```

The implementation must preserve expected authority, assignment, local strategy,
observed evidence, independent assessment and Developer acceptance as distinct.
It reports structural findings and explicit semantic limitations; it does not
decide semantic sufficiency, real-world owner competence, truthful observations
or Developer acceptance.

Only the six paths in `write_scope` may change. Inline test data is used because
the reusable positive/negative fixture corpus belongs to WU02. No CLI, template,
adoption or lifecycle surface is introduced.

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-01 | Exact baseline commit/tree and accepted SPEC/PLAN/contract/ADR blobs are verified before edits. |
| AC-02 | Parsing accepts object, YAML and Markdown frontmatter without mutation, coercion or authoritative defaults. |
| AC-03 | Required metadata, artifact kind, stable identity and strict unknown-field behavior fail closed. |
| AC-04 | Allowed graph relations resolve exact revisions; missing, unsupported, ambiguous or mismatched relations fail closed. |
| AC-05 | Approved-SPEC and explicit competent-exception coverage remain distinct and never synthesize authority. |
| AC-06 | RF/RNF source identity, existence, duplicate/conflict and bounded TASK subset checks are deterministic. |
| AC-07 | `scope_fit: split_required` blocks `READY`; convenience authority claims are rejected. |
| AC-08 | REVIEW requires exact frozen candidate identity and matching evidence; conflicting RESULT observations are preserved as failure. |
| AC-09 | Exports work in CommonJS and ESM; focused and competent broader tests plus `git diff --check` pass or are truthfully reported. |
| AC-10 | One immutable candidate and one self-contained review package are produced; no review, acceptance or remote effect is performed. |

## Explicit boundaries

No accepted source is rewritten. This TASK does not implement WU02, WU03, WU04,
WP004, WP005, templates, fixture corpus, CLI/lint, Context Package Recipe,
review automation, task management, Phase 2A/2B, integration, publication or
`main` promotion. It does not infer natural-language behavior coverage or repair
invalid inputs.

Stop on baseline drift, conflict requiring a SPEC change, need for lifecycle
policy, or any scope outside this assignment. Otherwise stop at
`TECNOTRON_WP003_WU01_FROZEN_FOR_INDEPENDENT_REVIEW`.
