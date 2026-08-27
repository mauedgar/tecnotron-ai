---
document_id: FFAI-ROADMAP-001
status: canonical
machine_context: true
version: 3.0
updated: 2026-08-26
---

# Secuencia de implementacion

## Jerarquía de planificación

```text
Roadmap (este documento)
  └── Milestone
        └── Wave
              └── Work Package (WP)
                    └── Task
```

Cada nivel tiene un **gate de aceptación** propio. Un milestone se cierra solo
cuando todos sus WPs están `DONE`. Un WP se cierra solo cuando todas sus tasks
están `DONE`. Las tasks siguen el lifecycle definido en `task-lifecycle.md`.

## Milestone: document-governance-v1

Baseline: `main@41088a4`, `tooling@c88c174`. Integration target: `tooling`.
Promotion target: `main`.

### Wave 1 — Authority Reconciliation

| WP | Task | Entregable | Estado |
|---|---|---|---|
| WP1: Authority Reconciliation | `FF-AI-DOC-001` | ADR-001, lifecycle 5d, milestone, 6 WP Plans, SoT | `DONE` |

### Wave 2 — Document Topology + Planning Hierarchy

| WP | Task | Entregable | Estado |
|---|---|---|---|
| WP2: Document Topology | `FF-AI-DOC-002` | 6 movimientos + links + SoT | `IN_PROGRESS` |
| WP3: Planning Hierarchy | `FF-AI-DOC-003` | Jerarquía, plantillas, gates | `IN_PROGRESS` |

### Wave 3 — System Guide + Research Archive

| WP | Task | Entregable | Estado |
|---|---|---|---|
| WP4: System Guide | `FF-AI-DOC-004` | `docs/guides/system-guide.md` | `PLANNED` |
| WP5: Research Archive | `FF-AI-DOC-005` | Consolidación archive/research | `PLANNED` |

### Wave 4 — Document Conformance

| WP | Task | Entregable | Estado |
|---|---|---|---|
| WP6: Document Conformance | `FF-AI-DOC-006` | Validación conformancia completa | `PLANNED` |

## Follow-up: Agent Profiles MVP (Post-Foundation)

Habilitado tras aceptación e integración de `FF-AI-DOC-001`. **NO es
prerrequisito** de WP2–WP6.

| Task | Entregable | Estado | Gate |
|---|---|---|---|
| `FF-AI-AGENT-001` | Contratos 7 roles + matriz perfiles (docs-only) | `DONE` | PR #12, merge `3d5d8b8` |
| `FF-AI-AGENT-002` | Conformance documental de perfiles mínimos | `DONE` | PR #15, merge `6c1effd` |
| `FF-AI-AGENT-003` | Perfiles manuales OpenCode y distribución global | `DONE` | PR #20 + #23 |
| `FF-AI-ORCA-001` | Boundary y guía de ejecución del adapter Orca | `DONE` | PR #22 |

## Pre-foundation tasks (DONE)

| Orden | Task | Entregable | Estado |
|---:|---|---|---|
| 0 | `FF-AI-VNEXT-001` | baseline vNext | `DONE` |
| 1 | `FF-AI-VNEXT-002` | doctor y compatibilidad sin installs | `DONE` |
| 2 | `FF-AI-VNEXT-003` | contracts Zod y registries loaders | `DONE` |
| 3 | `FF-AI-VNEXT-004` | State Machine, events JSONL y SQLite | `DONE` |
| 4 | `FF-AI-VNEXT-005` | Project Profile y adapters GitHub/OpenSpec | `DONE` |
| 5 | `FF-AI-VNEXT-006` | ContextPackager v2 | `DONE` |
| 6 | `FF-AI-VNEXT-007` | Router, Model Resolver y FinOps | `DONE` |
| 7 | `FF-AI-VNEXT-008` | Explorer y Agent Runtime conformance | `DONE` |
| 8 | `FF-AI-VNEXT-009` | Agent MVP y documentation sync | `DONE` |

## Backlog

| Task | Entregable | Estado |
|---|---|---|
| `FF-AI-VNEXT-010` | fitness functions y Workflow Observer | `BACKLOG` |
| `FF-AI-VNEXT-011+` | retrieval, MCP y Temporal tras sus gates | `PLANNED` |
