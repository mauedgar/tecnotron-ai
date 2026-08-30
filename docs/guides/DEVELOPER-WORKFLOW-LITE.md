---
document_id: TOF-GUIDE-DEVELOPER-WORKFLOW-LITE-001
status: derived
authority: non_normative
type: operational-guide
updated: 2026-08-30
---

# Developer Workflow Lite

## Purpose and authority

This is a derived, non-normative guide to the manual workflow currently usable
for a bounded Tecnotron-ai task. It explains how to apply existing contracts; it
does not create states, permissions, gates, artifacts, or acceptance rules.

[Source of Truth](../SOURCE_OF_TRUTH.md) controls navigation and precedence.
Use the competent canonical source for each subject:

- [Task Lifecycle](../task-lifecycle.md) for logical states, ownership,
  worktrees, acceptance, integration, and cleanup;
- [Architecture](../architecture.md) and
  [Operational Architecture](../operational-architecture.md) for stable
  boundaries and replaceable responsibilities;
- [Context Strategy](../context-strategy.md) for evidence retrieval and context
  delivery;
- [Current State](../current-state.md) for confirmed implementation reality;
- [Implementation Roadmap](../implementation-roadmap.md) and the active
  [Milestone Plan](../milestones/tecnotron-operational-foundation-v1/PLAN.md)
  for sequence and planned work.

The applicable SPEC, WP PLAN, TASK, task PLAN, RESULT, REVIEW, and Developer
decision retain authority for the concrete unit. If this guide differs from a
competent source, follow the competent source and correct the guide later.

## What is usable now

The usable path is a manual, task-scoped workflow over an explicitly prepared
Git worktree. Deterministic commands handle identity and objective checks;
reasoning handles implementation and semantic review. No end-to-end TASK runner
is assumed.

The current Agent MVP is not an end-to-end TASK runner. The presence of library
components, role or model registries, Runtime contracts, Run Store primitives,
or tests does not establish an available profile, launcher, real provider,
active materializer, general Validator, Execution Observation, workflow
persistence, or complete operational command. Treat each such volatile claim as
`verify_repo` until primary evidence at the relevant cutoff supports it.

## Manual workflow

### 1. Resolve authority and the task contract

1. Start at [Source of Truth](../SOURCE_OF_TRUTH.md).
2. Read the canonical documents competent for the task subject.
3. Read the accepted SPEC and WP PLAN when the TASK points to them.
4. Read the complete TASK and task PLAN. Confirm requirements, repository,
   branch, base, worktree, required inputs, write scope, no-touch paths,
   validation, review gate, stop conditions, and terminal authority.
5. Resolve the active Project Profile through the declared execution
   environment. Do not infer repository roots from sibling directories.

The TASK is the execution authorization. A planning proposal, roadmap row,
derived guide, devBrain capsule, or generated context package is not a substitute.

### 2. Confirm the prepared environment

Use the exact preflight required by the TASK. At minimum, compare the resolved
repository root, branch, HEAD/base relationship, and worktree identity with the
Developer-ready contract, and record pre-existing changes before editing.

Do not recreate the environment, switch branches, alter another worktree, or
attribute existing changes to the TASK unless explicitly authorized. A mismatch
in repository, branch, base, ownership, or write scope is a stop condition.

### 3. Gather bounded context

1. Read required inputs from their original authorized paths.
2. Prefer canonical navigation and deterministic retrieval before broader
   lexical, semantic, or manual exploration.
3. Expand context only to resolve a concrete gap and within the TASK's budget.
4. Preserve source, cutoff, omissions, contradictions, and fallback used.
5. Keep read/discovery scope separate from write scope.

A Task Context Pack is optional, task-scoped, and derived. Use one on demand
when context must cross an access, isolation, transport, or reproducibility
boundary. A repo-local executor can instead read authorized sources directly.
ContextPackager does not require every TASK to produce a portable Task Context
Pack. devBrain capsules and Briefs remain outside automatic TASK execution and
are not Task Context Packs.

### 4. Execute within the closed scope

Implement only the authorized result. Record progress and the next execution
step in the task PLAN when the contract permits lifecycle-artifact updates.
Discovery of a relevant file does not grant permission to modify it.

Keep claims narrow:

- `observed`: inspected at a stated source and cutoff;
- `implemented`: supported by primary source or executable evidence;
- `integrated`: connected in the named effective flow;
- `available`: usable through the named operation;
- `planned`: backed by a competent accepted plan;
- `research`: exploratory or derived, without product authority;
- `gap`: evidence is unresolved or missing;
- `boundary`: authority, ownership, or scope limit;
- `verify_repo`: requires fresh primary verification.

Do not infer `integrated` or `available` from static presence or
`implemented`. Do not infer implementation from `DONE`, document status, or a
derived snapshot.

### 5. Validate deterministically

Run the TASK-specific deterministic checks that are feasible, then inspect the
result against every requirement. Record each check as exactly one of `PASS`,
`FAIL`, `NOT_RUN`, or `UNAVAILABLE`.

`PASS` proves only the behavior covered by that check. It does not mean semantic
review passed, the Developer accepted the result, or integration occurred. An
unavailable dependency or prohibited operation must not be reported as `PASS`.

### 6. Record evidence in RESULT

Update `RESULT.md` with observed commands, outputs, changed files, requirement
mapping, limitations, deviations, and unresolved checks. Preserve negative or
contradictory evidence rather than rewriting it to match the plan.

RESULT reports evidence; it is not the progress checklist, independent review,
Developer decision, integration record, or event log.

### 7. Obtain independent review when required

When the TASK, accepted SPEC, risk, or lifecycle requires independent review,
provide the Reviewer the contract, plan, targets, RESULT, and complete diff.
Only the independent Reviewer writes findings and a verdict in `REVIEW.md`.

Resolve blocking findings within the existing scope, re-run affected checks,
and request the applicable delta review. A self-check cannot replace required
independence, and a favorable verdict does not constitute acceptance.

### 8. Stop for Developer acceptance

After implementation and available validation, and after required review when
authorized, report `PENDING_ACCEPTANCE`. The Developer alone accepts, rejects,
requests revision, or explicitly disposes of an allowed unavailable check.

Do not equate completion, `PASS`, a favorable review, or
`PENDING_ACCEPTANCE` with acceptance. Do not commit, push, create a PR, merge,
or integrate unless the applicable contract and a later Developer decision
authorize those actions.

### 9. Keep integration and cleanup separate

After acceptance, authorized deterministic lifecycle operations may verify the
expected worktree and base, commit, push, create or update a PR, integrate into
the declared target, synchronize state, and record evidence. The integration
target comes from the competent active task and milestone contract; do not
hardcode a historical branch name.

Integration must be observed before it is claimed. Cleanup is a later,
separate action and must preserve canonical source, accepted history, unrelated
state, and evidence required by policy.

## Artifact boundaries

| Artifact or action | Purpose | Does not establish |
| --- | --- | --- |
| SPEC | Stable expected behavior and requirements when applicable | Implementation progress or evidence |
| WP PLAN | Technical solution, decomposition, dependencies, and gates | TASK authorization |
| TASK | Scope, requirements, ownership, and execution authorization | Successful implementation |
| Task PLAN | Local strategy, progress, next step, and blockers | Observed requirement satisfaction |
| RESULT | Requirement-to-evidence mapping and observed outcomes | Independent review or acceptance |
| Deterministic validation | Reproducible covered checks | Semantic review or acceptance |
| REVIEW | Independent findings and verdict when required | Developer acceptance |
| Developer decision | Terminal acceptance or rejection | Integration unless separately authorized and observed |
| Integration | Verified incorporation into the declared target | Cleanup or milestone promotion |
| Cleanup | Removal of task-local ephemeral state when permitted | Permission to delete canonical or unrelated state |

## Stop conditions

Stop and request a Developer ruling when the baseline or contract mismatches,
canonical sources conflict materially without a precedence resolution, required
primary evidence is unavailable for a volatile claim, the write scope must
expand, an unauthorized repository or functional change is needed, a required
review cannot be performed, or a validation failure cannot be resolved within
scope.

## Handoff checklist

- Environment identity matches the Developer-ready contract.
- Pre-existing changes are recorded and preserved.
- Only authorized implementation and lifecycle artifacts changed.
- Every requirement maps to observed evidence and an allowed status.
- Repository-relative links and task-specific deterministic checks were run.
- `git diff --check` was run and its actual result recorded.
- Functional, package, schema, configuration, provider, and registry changes
  are absent from the TASK-attributed diff unless explicitly authorized.
- Required independent review is recorded as completed, `NOT_RUN`, or
  `UNAVAILABLE` without inventing a verdict.
- The result stops at `PENDING_ACCEPTANCE`; the Developer retains terminal
  authority.
