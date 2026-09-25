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
Stage B — canonical repository normalization                CURRENT
    ↓
Stage C — complete canonical WP003 SDD
    WU01 — deterministic parser / relation validator
    WU02 — templates + positive/negative fixture corpus
    WU03 — fail-closed CLI/lint
    WU04 — reinterpret smallest adoption/conformance delta
    ↓
Stage D — post-bootstrap operational maturation decision
    only demonstrated residual debt
    ↓
Stage E — one integral real-cycle proof
    ↓
ready to evaluate parallel development
```

## WP003 disposition

WP003 remains canonical and incomplete. Preserve the accepted
[SPEC](work-packages/wp-003-sdd-authority-and-artifacts/SPEC.md),
[PLAN](work-packages/wp-003-sdd-authority-and-artifacts/PLAN.md), SDD contract,
and ADR without semantic rewrite.

```yaml
WP003:
  canonical: true
  WU00: CLOSED_PASS
  WU01_WU03: STILL_REQUIRED
  WU04: REINTERPRET_AFTER_WU01_WU03
  RF_201_RF_207: UNCHANGED
```

No Stage-B documentation state initializes WU01 or grants its implementation
authority.

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

These are not hidden acceptance criteria for WP003 or Stage B.
