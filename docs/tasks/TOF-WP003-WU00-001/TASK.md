---
document_id: TOF-TASK-WP003-WU00-001
status: READY
materialization_status: MATERIALIZED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-09-23
machine_context: true
task_id: TOF-WP003-WU00-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU00-AUTHORITY-CONTRACT-FOUNDATION-001
responsibility: MATERIALIZE_WP003_AUTHORITY_AND_CONTRACT_FOUNDATION
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-003
work_units: [WP003-WU-00]
repository: mauedgar/tecnotron-ai
integration_branch: tools
task_branch: candidate/wp003-wu00-authority-contract-foundation-001
task_base: e36dc17415b3781c1fe545e38e00620444460140
scope_fit: FIT
assignment_authority: ADV-TECNOTRON-DEVELOPMENT-001
authorization_ref: TASKCYCLE-TECNOTRON-WP003-WU00-AUTHORITY-CONTRACT-FOUNDATION-001
implementation_authority: WU00_ONLY
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
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
ownership:
  terminal_acceptance: Developer
  semantics: Architect
  writing: Doc_Curator
  validation: deterministic Validator
  independent_review: Reviewer
write_scope:
  - docs/tasks/TOF-WP003-WU00-001/TASK.md
  - docs/tasks/TOF-WP003-WU00-001/PLAN.md
  - docs/adr/ADR-WP003-SDD-AUTHORITY.md
  - docs/contracts/tecnotron-sdd-artifacts-v1.md
---

# TASK TOF-WP003-WU00-001: authority/contract foundation

## Assignment and authority

Materialize only `WP003-WU-00` from the [accepted WP PLAN](../../work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md)
§17, under the [accepted SPEC](../../work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md).
This TASK records the explicit Developer handoff identified above, selected by
`ADV-TECNOTRON-DEVELOPMENT-001`; neither the advisory name nor this file creates
authority independently of that handoff. Its transport extract must accompany
the external review package. The SPEC/WP PLAN frozen frontmatter records their
earlier proposal state; their acceptance is established by the competent
handoff and the canonical predecessor's milestone/current-state records. Do not
rewrite either accepted input to reconcile those snapshots.

`READY` is the bounded assignment snapshot, not observed implementation,
validation, review, acceptance or closure. This assignment authorizes execution
through an immutable review candidate only. It does not accept that candidate.
The broader `TOF-W2-001` milestone proposal is not activated or adopted here.

## Boundaries and traceability

The assigned RF references above resolve exclusively in the accepted SPEC;
the ADR and policy trace each without copying a replacement requirement set.
SPEC §§4–5 and 7–11 also constrain identity, ownership, edge cases, evidence,
review, historical adoption and lifecycle separation. This SPEC defines no
numbered RNF requirements; none are invented or renumbered by this TASK.

The deliverables are one implementation ADR and one versioned policy **design**
with a machine-readable vocabulary embedded in the policy. The TASK and local
PLAN follow existing repository documentation conventions, not a claim that the
future SDD parser already exists. Only the four paths in `write_scope` may
change in the candidate. TASK materialization precedes implementation.

No `src/`, exports, templates, product fixtures, lint, dependency files, existing
contracts, accepted SPEC/PLAN, indexes, Current State or milestone files change.
There is no WU-01–WU-04 implementation, WP-004/WP-005 initialization, execution
optimization bundle, FitFlow effect, provider management, integration,
publication, `main` promotion, automatic retry engine or next-work selection.

## Acceptance criteria for the implementation handoff

| ID | Criterion | Required evidence |
| --- | --- | --- |
| AC-01 | Exact canonical predecessor and accepted input identities established before edits. | Remote ref, local commit/tree and input blob evidence. |
| AC-02 | One TASK assigns RF-201–RF-207 within WU-00 and four exact paths. | This snapshot, isolated worktree association and final diff. |
| AC-03 | ADR derives architecture choices from SPEC/WP PLAN without changing precedence or behavior. | ADR decision/source mapping and implementer semantic assessment; independent review remains required. |
| AC-04 | Versioned policy defines identity, types, owner, scope, authority/requirement references, relations and evidence dimensions coherently. | Policy vocabulary parses, internal references are consistent, and all rows trace accepted sources. |
| AC-05 | SPEC=WHAT, WP PLAN=HOW, TASK=assignment and task PLAN=local strategy remain distinct. | Policy relation table and ADR, traced to RF-203/RF-204/RF-206. |
| AC-06 | No convenience authority, authoritative defaults, silent repair, historical promotion or inferred Developer acceptance. | Policy failure dispositions and RF-207 mapping. |
| AC-07 | RF-201 edge cases, stable RF/RNF identity, split/READY exclusion, frozen REVIEW and preserved RESULT failures are represented. | Policy obligations and traceability; no claim of runtime enforcement. |
| AC-08 | Existing JavaScript/Zod/YAML conventions assessed for the future executable contract. | ADR comparison of current contracts and explicit deferred implementation boundary. |
| AC-09 | Focused deterministic document checks and `git diff --check` pass. | Reproducible read-only checks and raw logs bound to the final content. |
| AC-10 | Accepted inputs unchanged and all forbidden scope absent. | Exact changed-path allowlist and base/candidate comparison. |
| AC-11 | One immutable candidate and self-contained review package exist. | Commit/tree/parent, patch, source snapshots, validation and limitations; no review or acceptance inferred. |

## Execution, validation and stop boundary

Use the [local PLAN](PLAN.md). The Work harness may perform the explicitly
authorized repository operations, bounded edits/corrections, checks and freeze.
It does not become product architecture or terminal authority. Operations use
the explicit repository root and task worktree; no consumer Project Profile is
needed or synthesized for this documentation-only Tecnotron assignment.

Focused validation assesses this foundation's document structure, traceability
and scope. WP PLAN §19's executable parser, fixture, template and lint gates
remain obligations of their later work units, not implemented features of WU-00.
Semantic alignment is an implementer assessment with citations, not a claim of
deterministic proof or independent review. An unavailable check stays unavailable.

Execution evidence and the review package are external to the candidate's four
files; they do not become product policy. Do not materialize a `REVIEW.md`
before an independent reviewer exists, mark this TASK `DONE`, update canonical
bookkeeping, or infer approval from a test result.

Stop on baseline drift, contract conflict, ambiguity requiring new authority,
behavior change, or WU-01+ work. Otherwise converge within scope and stop at
`WP003_WU00_AUTHORITY_CONTRACT_FOUNDATION_FROZEN_FOR_INDEPENDENT_REVIEW`.
