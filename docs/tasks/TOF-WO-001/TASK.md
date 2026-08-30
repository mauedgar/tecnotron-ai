---
document_id: TOF-TASK-WO-001
status: ACCEPTED
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-08-30
machine_context: true
task_id: TOF-WO-001
milestone_id: tecnotron-operational-foundation-v1
work_package_id: null
milestone_relation: supporting_documentation_only
execution_readiness: ACCEPTED
integration_target: tools
task_branch: feat/TOF-WO-001
task_base: c6ab71fc4bdbecce9f657d37bae695dd483c5d3d
review_result: PASS
accepted_at: 2026-08-30
accepted_by: Developer
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-TOF-WO-001
complexity: medium
criticality: medium
scope_fit: FIT
context_budget:
  class: medium
  policy: canonical_sources_plus_authorized_derived_evidence
  expansion_limit: 2
required_capabilities:
  - documentation
  - workflow_analysis
  - evidence_classification
  - link_validation
  - independent_review
ownership:
  terminal_acceptance: Developer
  implementation: Doc_Curator_or_authorized_Implementer
  independent_review: Reviewer
target_terminal_state: PENDING_ACCEPTANCE
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[tasks/TOF-WO-001/PLAN]]"
---

# TASK TOF-WO-001: Workflow Observations and Developer Workflow Lite

## 1. Objective

Produce exactly two derived, non-normative documents from canonical
Tecnotron-ai sources and the authorized reconciled devBrain evidence:

1. `docs/research/WORKFLOW-CONTEXT-OBSERVATIONS.md`, an annex that preserves
   workflow, context, and execution observations together with their evidence
   limits.
2. `docs/guides/DEVELOPER-WORKFLOW-LITE.md`, an operational guide to the manual
   workflow that is currently usable.

This TASK authorizes documentation only. It does not start a milestone Work
Package, define a new lifecycle, or implement any runtime capability.

## Developer acceptance

El Developer otorgo aceptacion terminal el 2026-08-30 tras review independiente
`PASS`. Autorizo el commit local y la integracion local por squash en `tools`.
`.opencode/package-lock.json` queda excluido por estar fuera de scope; push y
cleanup permanecen no autorizados.

## 2. Authority and precedence

Resolve each claim by subject authority in this order:

1. `docs/SOURCE_OF_TRUTH.md` for canonical navigation and precedence.
2. The canonical document competent for the subject, especially
   `docs/task-lifecycle.md`,
   `docs/milestones/tecnotron-operational-foundation-v1/PLAN.md`,
   `docs/current-state.md`, `docs/architecture.md`,
   `docs/operational-architecture.md`, `docs/context-strategy.md`, and
   `docs/implementation-roadmap.md`.
3. This `TASK.md` for authorization, requirements, targets, and scope, then this
   task `PLAN.md` for execution strategy.
4. Direct source and deterministic evidence at the recorded `task_base` for
   volatile implementation or availability claims.
5. The authorized devBrain files as derived evidence only.

devBrain is not canonical authority. A contradiction is resolved in favor of
the competent Tecnotron-ai source. Historical or derived wording must not be
copied automatically, promoted to policy, or used to repair canonical sources.

## 3. Required inputs

### Canonical and primary repository inputs

- `AGENTS.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/task-lifecycle.md`
- `docs/milestones/tecnotron-operational-foundation-v1/PLAN.md`
- `docs/current-state.md`
- `docs/architecture.md`
- `docs/operational-architecture.md`
- `docs/context-strategy.md`
- `docs/implementation-roadmap.md`
- the relevant implementation and tests at
  `c6ab71fc4bdbecce9f657d37bae695dd483c5d3d` when a volatile claim requires
  source verification

The active Project Profile must be resolved through the execution environment
and read only as required by `AGENTS.md`. It does not authorize a FitFlow write
or make FitFlow content part of either deliverable.

### Authorized derived inputs

- `C:/Proyectos-Web/devBrain/Tecnotron-ai/README.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/MANIFEST.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/COVERAGE_MATRIX.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/01-workflow-spec-task-cycle.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/02-execution-architecture.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/03-context-and-retrieval-pipeline.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/04-evidence-observation-evaluation.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/05-routing-models-finops.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/06-obsidian-and-control-planes.md`
- `C:/Proyectos-Web/devBrain/Tecnotron-ai/Capsules/07-future-pipelines.md`

These files are read-only evidence. devBrain remains outside automatic TASK
execution and must not be written by this TASK.

## 4. Deliverable contracts

### 4.1 Workflow and context observations annex

`docs/research/WORKFLOW-CONTEXT-OBSERVATIONS.md` must:

- identify itself as derived research/evidence, not policy;
- preserve observations about workflow, context, and execution;
- state the evidence source, cutoff, limitations, and unresolved verification
  for material claims;
- separate observed, implemented, integrated, and available;
- classify volatile claims and point to competent sources instead of presenting
  stale snapshots as current truth;
- avoid extensive duplication of devBrain.

### 4.2 Developer Workflow Lite guide

`docs/guides/DEVELOPER-WORKFLOW-LITE.md` must:

- identify itself as a derived, non-normative guide;
- explain the manual workflow currently usable from contract and preparation
  through execution, validation, independent review when required, and
  Developer acceptance;
- distinguish contract, progress, evidence, review, acceptance, integration,
  and cleanup;
- link to canonical sources for governing details rather than recreating them;
- avoid describing planned automation as an available operation.

Neither document replaces `docs/SOURCE_OF_TRUTH.md`,
`docs/task-lifecycle.md`, a SPEC, WP PLAN, TASK, task PLAN, RESULT, REVIEW, or a
Developer decision.

## 5. Required claim boundaries

Both documents must preserve these statements or their unambiguous equivalent:

- Agent MVP is not an end-to-end TASK runner.
- Operational profiles, a deterministic launcher, Execution Observation, and
  workflow persistence are not presented as implemented or available by this
  documentation TASK.
- Static presence, implementation, integration, and operational availability
  are separate claims and require separate evidence.
- `PASS` records only the covered validation result; it is not acceptance.
- The Developer retains terminal acceptance authority.
- A Task Context Pack is optional, task-scoped, derived, and used on demand.
- ContextPackager does not require every TASK to produce a portable Task
  Context Pack.
- devBrain, its capsules, and its Briefs remain outside automatic TASK
  execution.

When repository evidence supports a narrower fact, such as the presence of a
library component or storage primitive, wording must not broaden it into an
integrated workflow, available runner, or end-to-end persistence claim.

## 6. Claim classification

Use explicit source and cutoff for volatile assertions. At minimum distinguish:

- `observed`: directly inspected at a stated source and cutoff;
- `implemented`: supported by primary source or executable evidence;
- `integrated`: connected in the relevant effective flow;
- `available`: exposed and currently usable through the stated operation;
- `planned`: backed by a competent accepted plan but not implemented;
- `research`: exploratory or derived evidence without product authority;
- `gap`: unresolved question or missing evidence;
- `boundary`: authority, ownership, or scope limit;
- `verify_repo`: volatile claim requiring fresh primary verification.

Do not use document status, `DONE`, activity, or a derived snapshot as a
substitute for one of these claims.

## 7. Closed implementation write scope

The implementer may create or modify only:

```yaml
implementation_write_scope:
  - docs/research/WORKFLOW-CONTEXT-OBSERVATIONS.md
  - docs/guides/DEVELOPER-WORKFLOW-LITE.md
```

No navigation or index update is authorized. The two parent directories may be
created only as part of creating these target files; do not create empty
directories.

Lifecycle evidence is separate from implementation scope:

- the implementer may update `TASK.md`, `PLAN.md`, and `RESULT.md` only as the
  current lifecycle requires;
- `REVIEW.md` belongs exclusively to the independent Reviewer;
- a scope expansion requires a new explicit Developer authorization.

## 8. Out of scope and no-touch

- functional code, schemas, contracts, configuration, providers, registries,
  package files, dependency changes, runtime behavior, and tests of unrelated
  functionality;
- any FitFlow write;
- any devBrain write;
- Source of Truth, lifecycle, Milestone Plan, Current State, Roadmap, or other
  canonical policy edits;
- profiles, launcher, Observation, persistence, Workflow Observer, retrieval,
  MCP, Temporal, ranking, or FinOps implementation;
- recovery or reuse of historical content without a fresh, explicit ruling;
- commit, push, PR, merge, squash, integration, or promotion.

## 9. Verifiable requirements

- [ ] `req-1`: Both targets state authority, precedence, derived status, and the
      canonical sources that remain governing.
- [ ] `req-2`: The annex records observations and evidence limits without
      promoting devBrain or a static snapshot to canonical truth.
- [ ] `req-3`: The guide describes only the manual workflow currently usable
      and does not imply end-to-end automation.
- [ ] `req-4`: Observed, implemented, integrated, available, planned, research,
      gap, boundary, and `verify_repo` claims are used consistently.
- [ ] `req-5`: Contract, progress, evidence, deterministic validation,
      independent review, Developer acceptance, integration, and cleanup remain
      distinct.
- [ ] `req-6`: Agent MVP, profiles, launcher, Observation, persistence, `PASS`,
      and Developer authority are represented within the boundaries in section
      5.
- [ ] `req-7`: Task Context Pack and ContextPackager are represented within the
      boundaries in section 5.
- [ ] `req-8`: devBrain stays outside automatic TASK execution and no extensive
      devBrain content is duplicated.
- [ ] `req-9`: All relative links resolve to existing canonical files or to one
      of the two targets in the final worktree.
- [ ] `req-10`: The diff contains no functional change and no implementation
      file outside the two-target write scope.
- [ ] `req-11`: Deterministic checks and independent review are recorded, and
      the implementer stops at `PENDING_ACCEPTANCE`.

## 10. Validation and evidence

The final `RESULT.md` must map every `req-*` item to evidence and one of
`PASS`, `FAIL`, `NOT_RUN`, or `UNAVAILABLE`. Required checks are:

- direct inspection of both target files;
- deterministic resolution of every repository-relative link;
- allowlist comparison of changed files against the two targets and permitted
  lifecycle artifacts;
- `git diff --check`;
- confirmation that package files, schemas, configuration, providers,
  registries, functional code, FitFlow, and devBrain are unchanged;
- independent semantic review in `REVIEW.md`.

Validation and review do not accept the TASK. After implementation and review,
the reported terminal state is `PENDING_ACCEPTANCE` until the Developer decides.

## 11. Stop conditions

Stop and request a Developer ruling if canonical sources conflict on a material
claim, a target path cannot be used, a valid link requires an unauthorized
index edit, a functional or cross-repository change is needed, historical
content would need promotion, a volatile claim lacks sufficient primary
evidence, review independence is unavailable, or the closed write scope would
be exceeded.
