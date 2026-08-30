---
document_id: TOF-RESEARCH-WORKFLOW-CONTEXT-OBSERVATIONS-001
status: derived
authority: non_normative
type: research-evidence
updated: 2026-08-30
repository_cutoff: c6ab71fc4bdbecce9f657d37bae695dd483c5d3d
derived_evidence_cutoff: 2026-08-30
---

# Workflow and Context Observations

## Status and authority

This annex is derived research and evidence. It preserves observations and
their limits; it does not define policy, lifecycle states, permissions, or
acceptance. [Source of Truth](../SOURCE_OF_TRUTH.md) remains the navigation and
precedence index. The competent canonical sources remain governing, especially
[Task Lifecycle](../task-lifecycle.md),
[Architecture](../architecture.md),
[Operational Architecture](../operational-architecture.md),
[Context Strategy](../context-strategy.md),
[Current State](../current-state.md), and the
[Implementation Roadmap](../implementation-roadmap.md). The accepted
[Milestone Plan](../milestones/tecnotron-operational-foundation-v1/PLAN.md)
governs its own scope and sequence.

For this documentation unit, the
[TASK](../tasks/TOF-WO-001/TASK.md) authorizes the result and its
[task PLAN](../tasks/TOF-WO-001/PLAN.md) defines the execution strategy. This
annex replaces none of those sources, a SPEC, a WP PLAN, `RESULT.md`,
`REVIEW.md`, or a Developer decision.

## Evidence basis and limits

The repository cutoff is Tecnotron-ai
`c6ab71fc4bdbecce9f657d37bae695dd483c5d3d`, observed on 2026-08-30. Canonical
documents were read at that cutoff. Volatile implementation boundaries were
checked by static source inspection of:

- [Agent MVP composition](../../src/agent-mvp/index.js);
- [ContextPackager](../../src/core/context-packager.js);
- [Agent Runtime](../../src/agent-runtime/index.js);
- [Run Store](../../src/core/run-store.js).

No product test, build, provider, model, launcher, or runtime execution was
performed to produce this annex. Therefore an implementation claim below means
that primary source supports the stated, narrow behavior at the cutoff. It does
not by itself prove current integration, deployment, authorization, or
operational availability.

The authorized devBrain bundle and its seven capsules were read as derived
evidence with `source_cutoff: 2026-08-30`. They supplied observations and
questions, not product authority. Their document status does not establish
implementation. A contradiction is resolved in favor of the competent
Tecnotron-ai source, and every volatile devBrain statement remains
`verify_repo` until checked against primary evidence.

## Claim vocabulary

| Class | Meaning in this annex |
| --- | --- |
| `observed` | Directly inspected in an identified source at the stated cutoff. |
| `implemented` | Supported narrowly by primary source or executable evidence. |
| `integrated` | Connected in the specifically named effective flow; no broader integration is implied. |
| `available` | Exposed and usable through the operation explicitly identified. |
| `planned` | Backed by a competent accepted plan but not claimed as implemented. |
| `research` | Derived or exploratory evidence without product authority. |
| `gap` | Missing or unresolved evidence; not proof of definitive absence. |
| `boundary` | An authority, ownership, or scope limit. |
| `verify_repo` | A volatile claim requiring fresh primary verification at the relevant cutoff. |

Static presence, implementation, integration, and operational availability are
separate claims. A document status, activity, `DONE`, or a derived snapshot is
not a substitute for this classification.

## Workflow observations

| Observation | Class | Evidence and limit |
| --- | --- | --- |
| The usable documentation path is manual and task-scoped: resolve authority, receive a prepared worktree and contract, edit within scope, validate, record evidence, obtain independent review when required, and stop for Developer acceptance. | `available` + `boundary` | Available through direct repository and Git operations under the TASK contract; it is not evidence of an automated runner. See [Task Lifecycle](../task-lifecycle.md). |
| Contract, execution progress, observed evidence, deterministic validation, semantic review, terminal acceptance, integration, and cleanup answer different questions. | `boundary` | Canonical lifecycle ownership and the [Milestone Plan](../milestones/tecnotron-operational-foundation-v1/PLAN.md) keep these dimensions independent. |
| `PASS` records only the result covered by a check. It is neither independent review nor acceptance. | `boundary` | [Task Lifecycle](../task-lifecycle.md) defines validation outcomes and gives the Developer terminal acceptance authority. |
| `PENDING_ACCEPTANCE` means available implementation and validation evidence await a Developer decision; it does not imply integration. | `boundary` | Canonical lifecycle meaning; the applicable TASK may impose additional review gates. |
| A derived handoff or progress snapshot can help resume work but cannot invent task state or become a new canonical contract. | `research` + `boundary` | Preserved from devBrain; effective persistence and handoff contracts remain `verify_repo`. |

The Developer retains terminal acceptance. A favorable validation or review can
inform that decision but cannot make it. Integration and cleanup occur only
through separately authorized lifecycle actions after the applicable gate.

## Context observations

| Observation | Class | Evidence and limit |
| --- | --- | --- |
| Minimum sufficient and verifiable evidence is preferred over minimum token count. Deterministic retrieval should precede broader exploration when it can provide equivalent evidence. | `boundary` | Governed by [Context Strategy](../context-strategy.md). |
| `ContextPackager` accepts injected materializers, applies an explicit token budget, reports included and missing evidence, and can invoke a fallback materializer. | `observed` + `implemented` | Static source at [ContextPackager](../../src/core/context-packager.js); this does not identify an active production materializer. |
| Agent MVP invokes an injected `contextPackager.package` before Explorer. | `observed` + `integrated` | Integration is limited to the library composition in [Agent MVP](../../src/agent-mvp/index.js). It does not prove end-to-end context materialization for a TASK. |
| A Task Context Pack is optional, task-scoped, derived, and used on demand when transport, isolation, reproducibility, or an access boundary requires it. | `boundary` | The pack does not replace its sources and is independent of devBrain. |
| ContextPackager participation does not require every TASK to emit a portable Task Context Pack. | `boundary` | Internal or ephemeral context delivery remains valid; portability is a separate requirement. |
| Code intelligence and repo packaging can locate or materialize evidence, but neither decides authority or sufficiency merely by existing. | `boundary` | [Context Strategy](../context-strategy.md) assigns those responsibilities separately. |

devBrain capsules and Briefs remain outside automatic TASK execution. They are
not Task Context Packs, are not required for a TASK, and enter task context only
when the TASK explicitly authorizes them as derived evidence.

## Execution observations

| Subject | Observed or implemented | Integrated | Available | Remaining classification |
| --- | --- | --- | --- | --- |
| Agent MVP | A fail-closed library composition connects routing, model resolution, context packaging, Explorer, and Agent Runtime. | Those stages are connected inside `createAgentMvp`. | Not presented as a TASK runner or complete operational command. | TASK bridge, lifecycle, validation, review, acceptance, and persistence are outside that composition: `gap` + `verify_repo`. |
| Context materialization | ContextPackager accepts a required injected materializer. | Agent MVP consumes an injected ContextPackager-compatible dependency. | No active materializer is claimed by this annex. | Active roots, exclusions, and source delivery: `verify_repo`. |
| Agent Runtime | The runtime contract invokes an injected adapter and normalizes execution identity and a RunEvent. | It is called from the Agent MVP library flow. | A real provider or authorized adapter operation is not claimed. | Provider, allowlist, authorization, and effective launcher: `verify_repo`. |
| Run Store | JSONL/state storage and a SQLite projection are present as source primitives. | The inspected Agent MVP composition does not call Run Store. | End-to-end workflow persistence is not claimed. | Effective persistence and resume flow: `gap` + `verify_repo`. |
| Operational profiles and deterministic launcher | The Milestone Plan specifies future contracts and implementation Work Packages. | Not inferred from role registries or Runtime. | Not presented as available. | `planned`; materialized state remains `verify_repo`. |
| Execution Observation | WP-005 defines a planned observation baseline. | Runtime evidence or Run Store primitives do not establish Observation integration. | Not presented as available. | `planned` + `verify_repo`. |
| General Validator | Deterministic validation is a canonical responsibility. | No general Validator stage is established by the inspected Agent MVP source. | Only task-specific commands can be claimed when actually run. | Executable general port and integration: `gap` + `verify_repo`. |

Agent MVP is therefore an implemented library composition at the stated cutoff,
not an end-to-end TASK runner. A component can be implemented without being
integrated into the relevant operational flow, and an integrated library path
can still lack an available user operation.

## Planned and research boundaries

The Milestone Plan classifies profiles, the deterministic launcher, the
governed task-cycle work, Execution Observation, and later guide/navigation
work as planned Work Packages with their own gates. This annex does not advance
those gates. Model ranking, permanent model bindings, advanced FinOps,
extensive telemetry, new retrieval, MCP, Temporal, and devBrain automation
remain research or later planned work according to their competent sources;
they are not consequences of this documentation TASK.

## Verification register

| Volatile claim | Current treatment | Primary evidence needed before a broader claim |
| --- | --- | --- |
| Real provider or OpenCode execution | `verify_repo` | Active configuration, authorization, command, and observed execution result. |
| Operational profiles and deterministic launcher | `planned` + `verify_repo` | Materialized contracts/configuration plus positive and negative execution evidence. |
| Active context materializer | `verify_repo` | Effective composition and evidence that requested roots and exclusions are applied. |
| Agent MVP as a TASK runner | `gap` + `verify_repo` | An exposed TASK bridge covering lifecycle input through result evidence. |
| Workflow persistence and resume | `gap` + `verify_repo` | Effective calls connecting execution to Run Store/events and a demonstrated resume path. |
| Execution Observation | `planned` + `verify_repo` | Accepted contract, implementation, correlation, persistence, and validation evidence. |
| General Validator | `gap` + `verify_repo` | Executable port, applicable checks, composition, and observed outcomes. |

These entries are evidence limits, not new backlog items. Fresh verification
must use the competent repository source and identify its cutoff.
