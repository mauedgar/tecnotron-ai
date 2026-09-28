---
document_id: TEC-ROADMAP-001
status: canonical
machine_context: true
version: 4.0
updated: 2026-09-25
owner: tecnotron-ai
---

# Implementation Roadmap — Tecnotron

This roadmap is current planning navigation, not independent implementation or
acceptance authority. Accepted SPECs/PLANs and explicit Developer rulings remain
competent for their bounded responsibilities.

## Active milestone

[Pre-Alpha Normalization and Integral Development Cycle](milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md)

```text
Stage A — historical reconciliation                         PASS
Stage B — canonical repository normalization                PASS
    ↓
Stage C — complete canonical WP003 SDD                      EXIT RECONCILIATION
    WU01 — deterministic parser / relation validator        CLOSED_PASS
    WU02 — templates + positive/negative fixture corpus     CLOSED_PASS
    WU03 — fail-closed CLI/lint                             CLOSED_PASS
    WU04 — adoption/conformance disposition                 NO_IMPLEMENTATION_REQUIRED
    ↓
Stage D — post-bootstrap operational maturation decision    NOT ENTERED
    residual debt only under later competent reconciliation
    ↓
Stage E — one integral real-cycle proof                     NOT ENTERED
    ↓
ready to evaluate parallel development
```

## WP003 disposition

WP003 remains canonical. Preserve the accepted
[SPEC](work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md),
[PLAN](work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md), SDD contract,
and ADR without semantic rewrite.

```yaml
WP003:
  canonical: true
  WU00: CLOSED_PASS
  WU01: CLOSED_PASS
  WU02: CLOSED_PASS
  WU03: CLOSED_PASS
  WU04: NO_IMPLEMENTATION_REQUIRED
  status: COMPLETE_SUBJECT_TO_STAGE_C_EXIT
  RF_201_RF_207: UNCHANGED
```

Deterministic Phase-2 recipe maturation is `CLOSED_PASS` and is already-matured
input for later competent residual-debt reconciliation. Stage D is not entered.

## Historical predecessor disposition

The accepted `tecnotron-operational-foundation-v1` plan and completed WP000–002
artifacts remain provenance. They are not deleted or rewritten to pretend they
always matched the post-bootstrap model.

Historical WP004/WP005 are evidence inputs only:

```yaml
historical_WP004:
  mechanical_resume: false
historical_WP005:
  mechanical_resume: false
```

If later cycle evidence demonstrates a real residual operational responsibility,
Stage D may define a new post-bootstrap WP with its own SPEC/PLAN. It must not
revive a historical implementation merely because the old roadmap listed it.

## Explicitly deferred

- documentation baseline cleanup until BETA;
- Context Package Recipe;
- reusable Independent Review spec/template and package/result mechanics;
- Observer / fitness optimization;
- MCP;
- semantic retrieval;
- Temporal / generalized orchestration;
- task-management provider selection;
- permanent harness selection or model/provider optimization;
- parallelization infrastructure before the integral-cycle proof.

These are not hidden acceptance criteria for WP003 or Stage C.
