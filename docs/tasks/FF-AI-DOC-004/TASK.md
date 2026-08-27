---
document_id: FFAI-TASK-DOC-004
status: canonical
machine_context: true
version: 1.0
created: 2026-08-26
owner: fitflow-ai
type: workflow
criticality: low
risk: low
priority: P1
work_package: WP4-system-guide
wave: 3
milestone: document-governance-v1
dependency_gate: WP2_layout_materialized
ownership_keys:
  - "doc:docs/tasks/FF-AI-DOC-004/TASK.md"
  - "doc:docs/tasks/FF-AI-DOC-004/PLAN.md"
  - "doc:docs/guides/system-guide.md"
validation: NOT_RUN
developer_acceptance: PENDING
integration:
  status: NOT_INTEGRATED
lifecycle_status: READY
related:
  - "[[work-packages/system-guide/PLAN]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[architecture/task-lifecycle]]"
  - "[[guides/orca-task-cycle]]"
---

# Task FF-AI-DOC-004: System Guide

## Identification Table

| Dimension | Value |
|---|---|
| `document_id` | FFAI-TASK-DOC-004 |
| `status` | canonical |
| `work_package` | WP4-system-guide |
| `wave` | 3 |
| `validation` | NOT_RUN |
| `developer_acceptance` | PENDING |
| `integration.status` | NOT_INTEGRATED |
| `lifecycle_status` | READY |

## Objetivo

Materializar la guía canónica de navegación y operación `docs/guides/system-guide.md` como puerta de entrada explicativa ("front door") para desarrolladores y agentes que operan en FitFlow-ai.

Debe interconectar los conceptos de AI Core orchestration layer, navegación documental (SoT, ADRs, WPs, Tasks), el Task Lifecycle, el adapter operativo Orca, los perfiles de agente y los contratos Zod/registries v3, sin introducir nueva policy y manteniendo la autoridad explicativa subordinada a las capas superiores.

## Ownership Keys (3 paths exactos)

1. `docs/tasks/FF-AI-DOC-004/TASK.md`
2. `docs/tasks/FF-AI-DOC-004/PLAN.md`
3. `docs/guides/system-guide.md`

## Frontera (Boundaries)

### In Scope
- Creación y redacción de `docs/guides/system-guide.md`.
- Explicación de arquitectura, navegación, ciclo de vida, adapter Orca, perfiles y contratos.
- Validación determinista con `git diff --check` y verificación de alcance.

### Out of Scope
- **No crear policy nueva**: la policy vinculante reside exclusivamente en ADRs, `architecture/task-lifecycle.md` y contratos.
- **No tocar `docs/SOURCE_OF_TRUTH.md`**: la indexación final de la ruta concreta corresponde a WP6.
- **No modificar** `docs/research/**`, `docs/archive/**`, `src/**`, `tests/**`, `FitFlow/**`, `.opencode/**`.
- **No alterar** contratos ni esquemas ejecutables.

## Criterios de Aceptación (ACs)

1. **Estructura completa de la guía**:
   - Quick Start (resumen introductorio de 5 min).
   - Architecture Overview (invariantes, límites entre AI Core y FitFlow).
   - Documentation Map (SoT, precedencia de autoridad, cómo encontrar documentos).
   - Task Lifecycle Cheatsheet (estados, 5 dimensiones, gates, dirty-state classification).
   - Contracts Reference (schemas Zod, roles v3, models v3).
   - Tooling & Providers (herramientas intercambiables vs contratos fijos).
   - Cross-repo Boundaries (`FF_PROJECT_*`, Project Profile, ausencia de paths hardcodeados).
   - Common Pitfalls (ambient_dirty, no promover DONE sin gate, guías ≠ policy).

2. **Separación conceptual explícita**:
   - `architecture/task-lifecycle.md`: define la máquina de estados lógica, reglas y gates.
   - `guides/orca-task-cycle.md`: define el procedimiento operativo con Orca (worktrees, runs, workers, terminal visible).
   - Perfiles de agente (`.opencode/agents/`): capacidades y límites por rol que reciben contexto acotado; no administran el lifecycle.

3. **Regla de oro de gobernanza (ADR-001 §1)**:
   - Toda guía es puramente explicativa.
   - No contiene términos normativos impositivos (`MUST`, `SHALL`, `REQUIRED`) salvo que cite textualmente una fuente canónica superior.

4. **Coexistencia documental**:
   - Reconoce la existencia y propósito de `docs/guides/orca-task-cycle.md` como guía operativa especializada.

5. **Validación determinista**:
   - `git diff --check` PASS.
   - `git status --short` muestra modificaciones limitadas estrictamente a los 3 ownership keys.

## Comandos de Validación

```bash
# 1. Validación de formato y whitespace
git diff --check

# 2. Verificación de scope exacto (solo los 3 ownership keys)
git status --short

# 3. Comprobación de ausencia de lenguaje normativo no autorizado
grep -E "\b(MUST|SHALL|REQUIRED)\b" docs/guides/system-guide.md || true
```

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Inyección de policy nueva en la guía | Verificación estricta de lenguaje normativo y validación contra ADR-001 |
| Duplicación de contenido con arquitectura | La guía provee resúmenes y enlaces directos a los documentos canónicos en lugar de clonar su texto |
| Conflictos con WP5 (paralelismo Wave 3) | Ownership disjunto: WP4 solo posee `docs/guides/system-guide.md`; WP5 solo posee READMEs de research/archive |

## Stop Conditions

Detener la ejecución inmediatamente si:
- Se requiere introducir una regla que no emane de ADR-001, `task-lifecycle.md` o contratos ejecutables.
- Se intenta modificar `docs/SOURCE_OF_TRUTH.md` o cualquier archivo fuera de los 3 ownership keys.
- Se detecta contradicción entre la arquitectura y el contenido propuesto.

## Delegación y Roles

- **Architect**: Materializa esta TASK y su PLAN con boundaries y gates.
- **Coder**: Redacta `docs/guides/system-guide.md` dentro de los ownership keys asignados.
- **Reviewer**: Realiza la revisión semántica independiente y emite veredicto en `REVIEW.md`.
- **Developer**: Ejerce la autoridad terminal de aceptación en el gate de la task.
