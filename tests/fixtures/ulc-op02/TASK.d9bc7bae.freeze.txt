---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-ULC-OP02-ACTOR-CONTEXT-CONSUMER-001
artifact_kind: TASK
owner: tecnotron-ai
scope: QUALIFY_EXISTING_ACTOR_PORTABLE_HANDOFF_CONTEXT_FRESH_CONSUMER
revision: "2026-10-11-001"
authority_refs:
  - ref: DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11
    revision: "2026-10-11"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11
    revision: "2026-10-11"
requirement_refs:
  - source: {ref: DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11, revision: "2026-10-11"}
    id: RF-ULC-OP02-001
  - source: {ref: DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11, revision: "2026-10-11"}
    id: RF-ULC-OP02-002
  - source: {ref: DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11, revision: "2026-10-11"}
    id: RF-ULC-OP02-003
assignment_authority_ref:
  ref: DEVELOPER-TECNOTRON-BETA-ISSUE-RESOLUTION-GRANT-2026-10-11
  revision: "2026-10-11"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: c875ef7c14ac95d8fa80f617cd36b86978290f99
  tree: 467151f16353970514d485eab0ef731052bac465
write_scope:
  - tests/contract/ulc-op02-fresh-actor-context-consumer.test.js
acceptance_criteria:
  - "AC-01: Reobserve Product tools exact baseline and the candidate TASK carrier parent/tree before any lifecycle effect; never infer authority from an issue label or provider Ready."
  - "AC-02: Reuse existing agent profile registry and ContextPackager without modifying their canonical schemas, source files, TC Core or State Kernel."
  - "AC-03: Demonstrate one bounded fresh-context consumer with exact Product/SOT/Task/actor authority references, a concrete evidence requirement set and COMPLETE/PARTIAL/EMPTY deterministic coverage."
  - "AC-04: Preserve semantic caller action-sufficiency distinct from ContextPackager mechanical coverage; fail closed on material missing evidence, stale/contradictory inputs, unsupported Actor permissions, drift or out-of-scope access."
  - "AC-05: Test negative fixtures for missing grant, missing required evidence, insufficient budget and denied execution/write permissions; the evaluator must not invent Product authority, acceptance or a new general actor runtime."
  - "AC-06: If a real fresh harness input binding is required to claim portable multi-harness consumption, qualify the exact provider input and native session separately; do not claim model-view equivalence on merely complete file hashes."
  - "AC-07: Preserve separate deterministic validation, original freeze/Independent Review, candidate-specific Developer acceptance, Phase 2, effect reconciliation and close; IR003-F001 remains permanently attached to #32, not this TaskCycle."
  - "AC-08: No new persistence/index/queue, general actor orchestrator, automatic task-board Ready/Done or State Kernel migration; one narrow test path is the only Phase1 write scope."
relations:
  - relation: follows
    target: {ref: docs/implementation-roadmap.md, revision: "2026-10-09"}
---

# Beta ULC-OP-02 — real fresh Actor/context consumer, bounded TaskCycle

## Developer selection and source boundaries

Developer instruction in the current `TECNOTRON_BETA_RUN_001` continuation dated 2026-10-11: "Todos los issues estan autorizados para resolver, pero hay que reconciliar si hace falta antes de iniciarlos." This is direct authorization to reconcile, select and work on scoped Product issues; **not automatic acceptance/Phase2 or permission to violate the Product lifecycle**. This TASK projects that instruction rather than supplying an independent Developer signature.

Issue: https://github.com/mauedgar/tecnotron-ai/issues/33 (ULC-OP-02), P0, selected by Product Control after reconciling issue #31 (planning Parent only), #32 (active BLOCKED IR003-F001), #34 (future P1 independent Actions/feedback), and #35 (conditional dependent Parent). The issue body is stale `NOT_READY` from its original cutoff; this newer explicit Developer selection authorizes **this exact one bounded Task only**. Do not assert a GitHub Projects Ready field, mutate unrelated issues or create a second #32.

TaskCycle: `TASKCYCLE-TECNOTRON-ULC-OP02-ACTOR-CONTEXT-CONSUMER-001`.
Responsibility: `QUALIFY_EXISTING_ACTOR_PORTABLE_HANDOFF_CONTEXT_FRESH_CONSUMER`.
Canonical baseline: `mauedgar/tecnotron-ai:tools@c875ef7c14ac95d8fa80f617cd36b86978290f99` tree `467151f16353970514d485eab0ef731052bac465`.

## Existing owners and boundaries

- `docs/SOURCE_OF_TRUTH.md`, `docs/architecture-knowledge-ownership-baseline.md` §16.1, `docs/context-strategy.md` §4, §6, §16 and `docs/task-lifecycle.md`.
- `src/registries/agent-profiles.js` and `src/registries/schemas/agent-profiles.js`: existing nine profiles; permission defaults deny; no extra actors or auto-subagents.
- `src/core/context-packager.js`: deterministic materialization/coverage from caller-declared requirements; does not own semantic sufficiency.
- Technical binding facts: `ts-execution-transport@f15af1bc38f44d9092bbf71fcf262c6dc6afbd27` is experimental, without Product effect or full-complex-input proof; `IR003-F001` is scoped to #32. Do not launch a model by silently asserting provider conformance.

## DoD and gate order

1. TASK carrier with exact baseline and single changed path.
2. One kernel-free TC initialization projection with distinct id, nine pending obligations; do not reinitialize other TCs.
3. Phase1: build only `tests/contract/ulc-op02-fresh-actor-context-consumer.test.js` exercising existing registry/context semantics and negative cases; before claiming full real-harness portability, bind a fresh scoped consumer with an independently verifiable native input and permission receipt, else report qualification limitation.
4. Run focused and promotion-grade repo validation against exact candidate Git OIDs. No silent rewriting of source modules when test exposes a real gap: stop and return to Control for new scope.
5. Freeze exact candidate for **fresh independent semantic review**, then distinct Developer acceptance and separately authorized Phase2 with live ref guards. This 2026-10-11 issue-resolution grant is **not** a pre-signed unconditional Developer acceptance receipt.

No Phase2, Product integration, issue closure, automatic #34 launch or review substitution in this TASK. Initial obligations: implementation, promotion_grade_validation, exact_candidate, frozen_review_interface, independent_review, Developer_acceptance, Phase_2, effect_reconciliation, logical_close.
