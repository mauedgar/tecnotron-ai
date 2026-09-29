---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TOF-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001-PLAN
artifact_kind: TASK_PLAN
owner: tecnotron-ai
scope: Local execution strategy for ESTABLISH_BOUNDED_TYPESCRIPT_STRICT_RECIPE_INVOCATION_CONTRACT_CORE
revision: "1.0"
authority_refs:
  - ref: DEVELOPER-AUTHORIZE-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-CORE-20260929
    revision: "2026-09-29"
relations:
  - relation: executes
    target:
      ref: TOF-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001
      revision: "1.0"
---

# Local PLAN: PRE-WU02 TC1 TypeScript Recipe Contract Core

This PLAN executes only the bounded [TASK](TASK.md). It does not add Product
behavior or authority.

## Sequence and Gates

1. Verify fresh canonical/local Git identities, clean state, Project Profile,
   State Kernel competence, exact TaskCycle absence, dependency/build/test
   prerequisites, and Linux-only operations before mutation.
2. Create one isolated candidate worktree from the authorized baseline. Create
   the exact TaskCycle with seven pending obligations and transition it from
   `READY` to `ACTIVE` using fresh global-revision CAS.
3. Preserve the recorded boundary characterization. Stop instead of broadening
   into Recipes, State Kernel, adapters, unrelated contracts, or all tests.
4. Add a bounded strict TypeScript build whose committed emitted CommonJS files
   retain the current runtime paths. Keep untyped owners behind structural ports
   and retain Zod parse/validation at runtime boundaries.
5. Encode current identities and impossible states with branded identifiers,
   discriminated unions, strict nullability, readonly port inputs, exhaustive
   status handling and schema-derived types. Add compile-time negative
   assertions without replacing runtime negative tests.
6. Run strict typecheck, deterministic build/correspondence, focused typed-core
   tests, relevant runtime tests, contracts package validation, workspace
   verification and the full regression suite using existing native scripts.
7. Correct only bounded defects and rerun affected gates. Treat unavailable
   checks as `UNAVAILABLE`, unexecuted checks as `NOT_RUN`, and any ambiguous
   effect as `UNKNOWN` requiring reconciliation.
8. Satisfy only `IMPLEMENTATION` and `VALIDATION` using fresh State Kernel CAS
   after their evidence exists. Leave the TaskCycle `ACTIVE` with all later
   obligations pending.
9. Freeze exactly one candidate commit whose parent is the authorized baseline.
   Verify commit/tree/path identities and a clean worktree.
10. Invoke `materialize_frozen_review_interface@v0` on a competent Linux
    execution surface to create one immutable interface for
    `IND-REVIEW-TECNOTRON-PRE-WU02-TC1-TYPESCRIPT-RECIPE-CONTRACT-CORE-001`.
    Do not execute Independent Review.
11. Produce the exact external result artifact with terminal disposition
    `TC1_PHASE1_FROZEN_READY_FOR_INDEPENDENT_REVIEW`, or one authorized blocker
    disposition, then stop.

## Validation Preflight

- Dependency source of truth: `package.json` plus `package-lock.json`; use
  deterministic `npm ci` after the authorized lockfile change.
- Static commands: `npm run typecheck`, `npm run build`, and generated-file
  correspondence against Git.
- Focused runtime command: `npm run test:typed-core`.
- Public package commands: `npm run contracts:check` and package mode tests.
- Full regression command: `npm test`.
- Linux is required only for State Kernel directory fsync and integrated review
  Recipe lifecycle execution. Ordinary Git, npm, Node, tsc and tests use native
  execution.
- Expected runtime is emitted CommonJS JavaScript on Node.js; no runtime
  TypeScript transpiler is permitted.

## Handoff Boundary

The RESULT and review output remain outside the candidate so they can name its
immutable commit and tree. The package is transport, not authority. Independent
Review, Developer acceptance, integration, publication, lifecycle closure, TC2,
WU02 and broader TypeScript migration remain pending or deferred.
