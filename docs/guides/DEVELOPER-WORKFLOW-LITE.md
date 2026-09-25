---
document_id: TOF-GUIDE-DEVELOPER-WORKFLOW-LITE-001
status: superseded-derived
superseded_by: docs/milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md
authority: non_normative
type: operational-guide
updated: 2026-09-25
---

# Developer Workflow Lite — historical derived guide

This guide is retained in place as provenance. It is **not** the current primary
workflow description and does not create states, permissions, gates, artifacts,
or acceptance rules.

For current work start at:

- [Source of Truth](../SOURCE_OF_TRUTH.md);
- [Operational Architecture](../operational-architecture.md);
- [Task Lifecycle](../task-lifecycle.md) for transitional repository/process
  policy;
- [Current State](../current-state.md);
- [Implementation Roadmap](../implementation-roadmap.md);
- the [active pre-alpha milestone](../milestones/tecnotron-prealpha-normalization-and-integral-cycle-v1/PLAN.md);
- the applicable accepted SPEC/PLAN/TASK and explicit Developer authority.

The current target cycle is:

```text
SPEC / accepted Product responsibility
-> PLAN
-> bounded TASK decomposition
-> Phase 1 semantic implementation
-> deterministic validation
-> frozen candidate
-> independent semantic review
-> Developer acceptance
-> deterministic Phase 2A
-> deterministic Phase 2B
```

This sequence is not a universal scalar state machine. State Kernel,
Operational Spine, and reconciliation own their respective post-bootstrap
boundaries. A future reusable Context Package Recipe and reusable Independent
Review specification remain deferred; their absence does not authorize
reconstructing hidden chat history or turning generated context into Product
authority.

Historical manual worktree-centric details remain available in Git history and
accepted predecessor artifacts. They are intentionally not maintained as a
second active workflow during pre-alpha normalization.
