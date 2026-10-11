---
contract_version: tecnotron-sdd-artifacts/v1
document_id: TEC-TC-ULC-OP01-CONDITIONED-ACCEPTANCE-001
artifact_kind: TASK
owner: tecnotron-ai
scope: QUALIFY_CONDITIONED_DEVELOPER_ACCEPTANCE_AND_PHASE2_PREFLIGHT
revision: "2026-10-10-001"
authority_refs:
  - ref: DEVELOPER-TECNOTRON-BETA-ULC-OP01-GRANT-2026-10-10
    revision: "2026-10-10"
coverage:
  kind: competent_exception
  exception_ref:
    ref: DEVELOPER-TECNOTRON-BETA-ULC-OP01-GRANT-2026-10-10
    revision: "2026-10-10"
requirement_refs:
  - source: {ref: DEVELOPER-TECNOTRON-BETA-ULC-OP01-GRANT-2026-10-10, revision: "2026-10-10"}
    id: RF-ULC-OP01-001
  - source: {ref: DEVELOPER-TECNOTRON-BETA-ULC-OP01-GRANT-2026-10-10, revision: "2026-10-10"}
    id: RF-ULC-OP01-002
  - source: {ref: DEVELOPER-TECNOTRON-BETA-ULC-OP01-GRANT-2026-10-10, revision: "2026-10-10"}
    id: RF-ULC-OP01-003
assignment_authority_ref:
  ref: DEVELOPER-TECNOTRON-BETA-ULC-OP01-GRANT-2026-10-10
  revision: "2026-10-10"
initialization_anchor:
  repository: mauedgar/tecnotron-ai
  branch: tools
  commit: c875ef7c14ac95d8fa80f617cd36b86978290f99
  tree: 467151f16353970514d485eab0ef731052bac465
write_scope:
  - src/deterministic-taskcycle-substrate-v0/conditioned-acceptance-preflight.js
  - src/deterministic-taskcycle-substrate-v0/index.js
  - tests/deterministic-taskcycle-substrate-v0/conditioned-acceptance-preflight.test.js
acceptance_criteria:
  - "AC-01: Exact repository/commit/tree/parent and same subject across validations, frozen review and independent verdict; no inferred equivalence."
  - "AC-02: Independently authenticated prospective Developer grant with specific TaskCycle, baseline and write/effect ceilings; PASS must never create authority."
  - "AC-03: Deterministic validation PASS and competent fresh independent semantic review PASS with no blocking findings."
  - "AC-04: Fail closed on UNKNOWN, material drift, wrong write-set, grant missing/mismatched, scope expansion, incomplete evidence or unauthorized permission."
  - "AC-05: Pure acceptance eligibility preflight; separate Developer acceptance receipt and Phase 2 preflight with ref correspondence; no self-acceptance."
  - "AC-06: Negative tests for absent grant, FAIL/BLOCKED review, wrong SHA/parent, failure, UNKNOWN, drift, write scope and forged acceptance."
  - "AC-07: No new lifecycle machine, new Product authority store, general orchestration, kernel migration, or OpenCode v2 integration."
relations:
  - relation: follows
    target:
      ref: docs/implementation-roadmap.md
      revision: "2026-10-09"
---

# Beta ULC-OP-01 — conditioned acceptance bounded qualification

## Assignment and authority

TaskCycle: `TASKCYCLE-TECNOTRON-ULC-OP01-CONDITIONED-ACCEPTANCE-001`.
Responsibility: `QUALIFY_CONDITIONED_DEVELOPER_ACCEPTANCE_AND_PHASE2_PREFLIGHT`.
Issue: https://github.com/mauedgar/tecnotron-ai/issues/32; #33 remains a separate future consumer.

The Developer's direct 2026-10-10 instruction in `TECNOTRON_BETA_RUN_001` authorizes selecting this bounded task, a prospective **conditional** Developer acceptance and Phase 2, but **only** after all required exact-identity validation, competent fresh independent semantic review, no scoped UNKNOWN/drift, separate candidate-specific acceptance receipt, and guarded Phase 2. The current chat instruction is the original Developer grant source; this TASK is a scoped projection, **not** a forged independent signature or post-review acceptance. Any Product contract requirement not satisfied by that grant stops effects.

Baseline: `mauedgar/tecnotron-ai:tools@c875ef7c14ac95d8fa80f617cd36b86978290f99`, tree `467151f16353970514d485eab0ef731052bac465`.

## Responsibility and scope

Add one caller-invoked, effect-free guard within the existing deterministic TaskCycle substrate. It checks declared evidence and exact corresponding observations for conditioned *eligibility*, never emits `GRANTED` or effects. Phase 2 eligibility additionally requires a distinct, observed Developer-acceptance receipt and the exact live Git preflight. Existing Product Control independently verifies authority provenance and reviewer independence; untrusted booleans cannot themselves prove those facts.

Only three source/test paths in the frontmatter may be changed as implementation. This TASK carrier is the separate initialization artifact. No #33 changes, board automation, new acceptance authority service, TC Core redesign, default reviewer transport, arbitrary model runtime or receipt store.

## Gate order and obligations

`TASK carrier → kernel-free TC initialization → bounded Phase 1 → required tests/validation → exact candidate + frozen interface → fresh independent review → conditional Developer receipt → guarded Phase 2 → effect reconciliation → logical close`.

All obligations remain pending until observed; no synthetic terminal result. An existing same-chat analysis may inform implementation but is never the fresh independent review. A frozen reviewer package must declare exact immutable subject and exhaustive input inventory.

## Stop and autonomy

One bounded repair is allowed where the Developer grant, original write set and current baseline remain valid; correction creates a new frozen subject/review ID and preserves findings. Stop on nondelegable authority, review FAIL/BLOCKED after available repair, insufficient independent reviewer binding, changed security permissions, grant scope conflict, drift, or unresolved `UNKNOWN`. No automatic retry of a prior model/Git effect.

Consumer: future #33 only after this TaskCycle is competently closed or an explicit later Product Control disposition; no automatic TaskCycle creation for #33.
