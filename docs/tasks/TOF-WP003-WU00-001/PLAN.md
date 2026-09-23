---
document_id: TOF-PLAN-WP003-WU00-001
status: implementation_candidate
owner: tecnotron-ai
type: task-plan
version: 1.0
updated: 2026-09-23
machine_context: true
task_id: TOF-WP003-WU00-001
taskcycle_id: TASKCYCLE-TECNOTRON-WP003-WU00-AUTHORITY-CONTRACT-FOUNDATION-001
task: docs/tasks/TOF-WP003-WU00-001/TASK.md
task_base: e36dc17415b3781c1fe545e38e00620444460140
implementation_authority: WU00_ONLY
requirement_refs: [RF-201, RF-202, RF-203, RF-204, RF-205, RF-206, RF-207]
---

# Local PLAN: authority/contract foundation

This is the execution strategy for [TOF-WP003-WU00-001](TASK.md), contained by
that assignment. The accepted WP PLAN remains the technical decomposition;
this file neither replaces it nor defines new expected behavior.

## Sequence and gates

1. Resolve `mauedgar/tecnotron-ai` directly, freshly verify `tools` at the exact
   TASK base and create one clean isolated task worktree. Record the association
   externally. Read AGENTS, Source of Truth, applicable architecture/lifecycle,
   SPEC/WP PLAN and the current contract conventions. Inspect whether a consumer
   Project Profile is active; do not fabricate one or reach into FitFlow.
2. Materialize exactly one bounded TASK and this local strategy. Preserve the
   source artifacts' immutable proposal metadata and use the competent current
   acceptance/authorization evidence separately. Resolve implementation scope
   from the explicit WU-00 handoff, not from general milestone proposals.
3. Write the ADR at the path selected by WP PLAN §7. Record the existing
   `src/contracts` assessment, decisions, source sections and rejected
   alternatives. Record why implementation of a new parser is not WU-00.
4. Write `tecnotron-sdd-artifacts/v1` as a policy design in one Markdown file,
   with one embedded JSON vocabulary. Define the normalized metadata design,
   relation orientation, requirement/evidence references, fail-closed obligations,
   semantic limits and later adoption boundary. Keep this file the single
   versioned policy projection; do not introduce a second manifest or schema.
5. Run external read-only document checks against the four exact paths:
   metadata presence, JSON syntax and internal consistency, source reference
   resolution, RF inventory, relation/field coverage, no dependency on Work,
   exact diff allowlist, unchanged SPEC/PLAN and whitespace. Use native tooling
   already present; no dependency installation/update or new product validator.
6. Assess each required semantic property against SPEC/WP PLAN with explicit
   source-to-candidate citations. Separate this implementer assessment from
   machine checks. Correct bounded technical/document defects and rerun the
   affected checks without creating another TaskCycle or expanding scope.
7. Reconcile final content, evidence and changed paths; freeze one candidate
   commit with the exact canonical parent. Capture tree, parent and clean
   worktree. Bind validation to those bytes. Record unchanged canonical refs.
8. Materialize an external, self-contained Independent Review package containing
   exact source snapshots, patch, portable Git candidate transport, authority
   extract, TASK/PLAN, traceability, raw validation, reproducible checks and
   limitations. Verify package identities, then stop. No independent review,
   integration, remote publication, cleanup or next-work selection occurs here.

## Applicability of validation

This is a documentation/policy-design candidate. Focused checks must be runnable
without project dependencies or provider state. They verify the foundation's
representation and scope; they do not enforce arbitrary SDD documents, prove
semantic equivalence, or satisfy future parser/template/lint conformance.

The existing application test suite is not a gate for unchanged source under
this TASK. If not run, report it as `NOT_RUN`, including the observed dependency
limitation. Do not install dependencies to make unrelated tests green, label
future gates `PASS`, or interpret a structural check as Developer acceptance.

## Evidence and authority boundaries

The four repository files remain prospective implementation candidates until
competent independent review and explicit Developer acceptance. External RESULT
evidence may record implementation progress but does not mutate the assignment
snapshot or create a lifecycle engine. No universal mutable status is introduced.

Semantic ambiguity, conflict with an existing canonical contract/ADR, accepted
behavior change, material baseline drift or need for WU-01+ terminates at the
authority boundary. Ordinary bounded corrections remain inside this TaskCycle.
