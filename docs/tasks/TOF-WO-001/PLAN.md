---
document_id: TOF-PLAN-WO-001
status: ACCEPTED
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-08-30
machine_context: true
task_id: TOF-WO-001
task_base: c6ab71fc4bdbecce9f657d37bae695dd483c5d3d
task_branch: feat/TOF-WO-001
complexity: medium
criticality: medium
scope_fit: FIT
context_budget:
  class: medium
  policy: canonical_first_then_bounded_derived_evidence
  expansion_limit: 2
dependencies:
  - developer_ready_environment
  - canonical_sources_at_task_base
  - authorized_devBrain_evidence
ownership:
  terminal_acceptance: Developer
  implementation: Doc_Curator_or_authorized_Implementer
  independent_review: Reviewer
gates:
  - canonical_precedence
  - closed_write_scope
  - claim_classification
  - deterministic_validation
  - independent_review
target_terminal_state: PENDING_ACCEPTANCE
related:
  - "[[tasks/TOF-WO-001/TASK]]"
---
# PLAN TOF-WO-001

## Strategy

Work canonical-first and claim-by-claim. Use devBrain only after the competent
Tecnotron-ai sources have established authority, current implementation state,
and lifecycle boundaries. Produce the smallest two documents that satisfy the
TASK; prefer links and concise synthesis over copied source text.

The branch, worktree, and `task_base` are already prepared. Revalidate their
declared identity before writing, but do not recreate or broaden the environment.

## Execution progress observed 2026-08-30

- [x] Phase 0: worktree, branch, HEAD, merge-base, Project Profile, required

  inputs, and pre-existing status were verified.
- [x] Phase 1: canonical and primary-source claim boundaries were checked at

  `c6ab71fc4bdbecce9f657d37bae695dd483c5d3d`; devBrain was treated only as
  derived evidence.
- [x] Phase 2: the derived observations annex was created within scope.
- [x] Phase 3: the non-normative manual workflow guide was created within scope.
- [x] Phase 4: direct inspection, link resolution, semantic-marker checks,

  changed-file attribution, whitespace checks, and `git diff --check` were
  executed and recorded in `RESULT.md`.
- [x] Phase 5: an independently authorized Reviewer completed semantic review
  with verdict `PASS`; `REVIEW.md` remains reviewer-owned.

The Developer subsequently granted terminal acceptance and authorized a local
feature commit plus squash integration into `tools`. Push and cleanup remain
deferred. Acceptance does not by itself claim that integration has occurred.

## Phase 0: Execution gate and source map

1. Read `AGENTS.md`, `TASK.md`, this PLAN, Source of Truth, the active Milestone
 Plan, Task Lifecycle, and the Project Profile resolved by the environment.
2. Confirm current branch `feat/TOF-WO-001`, worktree root, and
 `task_base=c6ab71fc4bdbecce9f657d37bae695dd483c5d3d`.
3. Confirm the only implementation targets are:
 `docs/research/WORKFLOW-CONTEXT-OBSERVATIONS.md` and
 `docs/guides/DEVELOPER-WORKFLOW-LITE.md`.
4. Record any pre-existing changes without overwriting or attributing them.

Gate: environment and required inputs match `TASK.md`. Stop on mismatch.

## Phase 1: Canonical claim matrix

1. Build a working matrix of subject, competent source, claim, evidence cutoff,
 and classification.
2. Verify lifecycle and authority claims against Source of Truth, Task
 Lifecycle, Milestone Plan, architecture, and operational architecture.
3. Verify implementation claims against Current State and direct source/tests
 when volatility requires it.
4. Keep implementation, integration, and operational availability separate.
5. Mark unresolved or derived-only assertions as `research`, `gap`, or
 `verify_repo`; do not infer them from absence or document status.

Gate: every material statement planned for either document has a competent
source and classification.

## Phase 2: Derived observations annex

1. Create `docs/research/WORKFLOW-CONTEXT-OBSERVATIONS.md` with explicit derived
 status, source cutoff, authority boundary, and evidence limitations.
2. Organize observations around workflow, context, execution, evidence, and
 control-plane boundaries without reproducing all seven devBrain capsules.
3. Preserve explicit gaps and `verify_repo` claims.
4. Link governing statements to canonical repository documents.
5. State that devBrain remains outside automatic TASK execution.

Gate: `req-1`, `req-2`, `req-4`, `req-6`, `req-7`, and `req-8` are visibly
covered by concise, source-attributed content.

## Phase 3: Developer Workflow Lite guide

1. Create `docs/guides/DEVELOPER-WORKFLOW-LITE.md` as a derived,
 non-normative operational guide.
2. Describe the currently usable manual path: resolve authority and task
 contract, use the Developer-prepared task environment, gather bounded
 context, execute within write scope, validate, obtain independent review
 when required, and stop for Developer acceptance.
3. Separate TASK/PLAN contract and progress from RESULT evidence, REVIEW, the
 Developer decision, integration, and cleanup.
4. Explain optional Task Context Pack usage without requiring a portable pack
 from ContextPackager.
5. Do not present Agent MVP, profiles, launcher, Observation, or workflow
 persistence as an available end-to-end workflow.

Gate: `req-1`, `req-3`, `req-5`, `req-6`, `req-7`, and `req-8` are covered
without defining new policy.

## Phase 4: Deterministic validation and RESULT

1. Inspect both target files against every `req-*` item.
2. Resolve every repository-relative Markdown link and record the check.
3. Compare changed paths with the two target files and permitted task lifecycle
 artifacts; fail on any other implementation path.
4. Run `git diff --check`.
5. Confirm no functional code, schema, configuration, provider, registry,
 package file, FitFlow file, or devBrain file changed.
6. Update `RESULT.md` with actual commands, outputs, limitations, changed files,
 and the requirement-to-evidence matrix. Do not invent evidence.

Gate: all available deterministic checks are accurately reported as `PASS`,
`FAIL`, `NOT_RUN`, or `UNAVAILABLE`.

## Phase 5: Independent review and handoff

1. Provide the TASK, PLAN, targets, RESULT, and full diff to an independent
 Reviewer.
2. The Reviewer alone records findings and verdict in `REVIEW.md`.
3. Resolve blocking findings within the existing write scope, then re-run the
 affected checks and request delta review.
4. Leave implementation and evidence at `PENDING_ACCEPTANCE` after review.
5. Do not commit, push, open a PR, merge, squash, integrate, promote, or clean up
 the worktree without a subsequent Developer decision and lifecycle action.

Gate: independent review is complete and the Developer-ready evidence package
is accurate. `PASS` and a favorable review do not imply acceptance.

## Planned validation matrix


| Validation                                              | Expected handling                                   |
| ------------------------------------------------------- | --------------------------------------------------- |
| Required authority and precedence statements            | `PASS` required                                     |
| Observed/implemented/integrated/available separation    | `PASS` required                                     |
| Contract/progress/evidence/review/acceptance separation | `PASS` required                                     |
| Canonical relative links                                | All resolve                                         |
| devBrain duplication and authority boundary             | No extensive duplication; derived status explicit   |
| Volatile claim classification                           | Source, cutoff, and class present where applicable  |
| Changed-file allowlist                                  | Only targets and permitted task lifecycle artifacts |
| Functional/package/config/schema/provider/registry diff | Empty                                               |
| `git diff --check`                                      | `PASS` required                                     |
| Independent semantic review                             | `PASS`; recorded in `REVIEW.md`                     |
| Provider, model, launcher, or runtime execution         | `NOT_RUN`; prohibited                               |
| Developer disposition before integration                | `ACCEPTED`                                          |
