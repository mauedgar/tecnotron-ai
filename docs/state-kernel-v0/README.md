# Tecnotron State Kernel V0 — candidate implementation

TaskCycle: `TASKCYCLE-TECNOTRON-OPERATIONAL-BOOTSTRAP-W1-STATE-KERNEL-V0-001`.
Responsibility: `MATERIALIZE_TECNOTRON_STATE_KERNEL_V0`.
This is a candidate for independent review, not an adopted replacement for the current canonical documentation.

## Boundaries

Four separate aggregate contracts are validated with Zod: Milestone, TaskCycle, Operation and ExecutionAttempt. Each has its own state vocabulary and transition table. Operation points to its TaskCycle; ExecutionAttempt points to its Operation. Reverse relationships are derived on inspection. An attempt's `outcome` is separate from `state`; `UNKNOWN` after dispatch means the effect requires explicit reconciliation. A new attempt against the same operation is rejected while any prior attempt is unresolved. No execution routing, provider logic or recipes are implemented.

TaskCycle obligations are explicit identifiers with `PENDING` or `SATISFIED` status and optional required authority reference. The resolver reports unresolved IDs and conditionally legal next states. `PENDING_ACCEPTANCE` and `CLOSED` require all declared obligations satisfied; closing additionally requires a supplied, declared authority reference and a terminal disposition reference. The presence of a reference does not itself establish a real-world authority grant; callers must supply competent authority externally. No specific acceptance, review, integration or publication obligation is silently invented. The returned `legal_next` lists states that satisfy currently stored obligation conditions; transitions requiring authority or result input still require those inputs on execution.

## Configured home and file classes

The absolute `TECNOTRON_HOME` is supplied to the CLI (`--home`) or constructor. It is a storage configuration, not a semantic aggregate ID. Initialization creates `state/`, `evidence/`, `artifacts/`, `workspaces/` and `cache/`. The latter four are reserved storage classes in V0; this implementation does not populate an evidence database or portable artifact registry.

`state/kernel-v0/HEAD.json` is the sole atomic commit pointer. It selects an immutable generation directory containing `state.json` (current snapshot) and `events.ndjson` (the full append-oriented transition history). A new generation is written and synced completely before atomic replacement of HEAD. Old generations remain unchanged; readers use only the generation selected by HEAD. Each event contains the post-transition aggregate, sequence, predecessor hash and its own hash. On read, hashes, the event chain, aggregate revisions, and a replayed complete snapshot are checked against HEAD. A rejected mutation publishes neither snapshot nor event. A `writer.lock` directory serializes writers; a stale lock fails closed and requires deliberate inspection. The caller supplies the expected global revision for every mutation. Orphan staged generations after abrupt process termination are not authoritative; cleanup is a later explicit maintenance operation.

This design relies on local filesystem rename and durability guarantees. It does not provide a distributed state backend, transactional writes across unrelated filesystems, malicious-user tamper resistance, or automatic crash recovery. Keeping complete immutable generations makes history growth quadratic in the number of events; compaction/migration is deferred. A failure after the HEAD replacement but before the directory sync is reported as `UNKNOWN_EFFECT_REQUIRES_RECONCILIATION` and must be inspected; no blind retry. The store deliberately does not silently delete an existing lock or repair malformed state.

## Commands

`node src/state-kernel-v0/cli.js --home ABSOLUTE_PATH --command StateInit`

All other commands accept `--request JSON` when arguments are needed. The mutators require `expected_revision` from `StateInspect` or `StateVerify`: `TaskCycleCreate`, `TaskCycleSatisfy`, `TaskCycleTransition`, `OperationCreate`, `OperationTransition`, `AttemptStart`, `AttemptRecord`, `MilestoneCreate`, `MilestoneTransition`. The read commands are `StateInspect`, `StateVerify`, `StateRender`, `TaskCycleInspect` and `TaskCycleObligations`. Errors print a structured `code` and `detail` to stderr and exit nonzero. Stable primary error codes are `INVALID_TRANSITION`, `STALE_REVISION`, `MALFORMED_STATE`, `MISSING_REQUIRED_AUTHORITY`, `UNSATISFIED_OBLIGATION`, and `UNKNOWN_EFFECT_REQUIRES_RECONCILIATION`; malformed requests also use `INVALID_CONTRACT` or `INVALID_REQUEST`.

Example request for `TaskCycleCreate`:

```json
{"expected_revision":0,"id":"TC-EXAMPLE","responsibility":"EXAMPLE","obligations":[{"id":"VALIDATION","authority_ref":null}],"authority_refs":[{"kind":"AUTHORITY","id":"DEVELOPER-RULING"}]}
```

`StateRender` is a deterministic read-only Markdown projection. It does not write `docs/current-state.md`. The latter currently has canonical status under `docs/SOURCE_OF_TRUTH.md`; only a separate Developer adoption can change that authority relationship. No migration from historical markdown, TASK files, Git refs or previous run state is inferred. A future adoption needs a bounded mapping/reconciliation decision and an independently reviewed integration.

Typed references distinguish an authority, evidence, portable artifact and Git object; SHA-256 is an optional exact file identity, Git OID is a separate Git identity, and neither establishes semantic equivalence or authority. Relative locations cannot encode a developer-machine path.

## Validation and deferred debt

The focused V0 tests use Node's built-in test runner; `npm test` includes them alongside the existing suite. `npm ci --ignore-scripts --no-audit --no-fund` was performed only in the isolated worktree, under the Developer's explicit dependency-install authorization. No lockfile or dependency version was changed. Tests exercise process restart, CAS, fail-before-commit, malformed state, tampered events, unknown reconciliation, obligation gates, independent lifecycle vocabularies and deterministic projection. Three existing repository tests are skipped by their own preexisting conditions.

Deferred technical debt: test the rename/sync durability guarantees on the intended Windows filesystem before adoption; specify a controlled recovery protocol for orphan generations and stale writer locks; consider a bounded compaction strategy as history grows; add a migration/adoption decision for historical `docs/current-state.md`. These do not authorize Wave 2, WP003-WU01, integration or publication.
