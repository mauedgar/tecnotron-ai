---
document_id: FFAI-PLAN-AGENT-001
status: canonical
machine_context: true
version: 1.0
updated: 2026-08-25
task_ref: FFAI-TASK-AGENT-001
work_package: agent-profiles-mvp
wave: 1
criticality: medium
owner: fitflow-ai
related:
  - "[[tasks/FF-AI-AGENT-001/TASK]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
  - "[[milestones/document-governance-v1/PLAN]]"
---

# Plan FF-AI-AGENT-001: Agent Role Contracts and Profile Matrix

## Fases

### Fase 1: Preparación y validación de prerequisitos

- Verificar worktree limpio: `git status` → clean.
- Confirmar gate habilitación: `FF-AI-DOC-001` foundation artifacts accepted + integrated en `tooling` (PR10 `51821e2`, PR11 `c30646f`).
- Leer ADR-001 §9, source material (provenance), task-lifecycle, operational-architecture, context-strategy.
- No leer/escribir FitFlow.

### Fase 2: Crear 5 archivos nuevos

1. `docs/work-packages/agent-profiles-mvp/PLAN.md` — WP Plan (ya creado en esta ejecución).
2. `docs/tasks/FF-AI-AGENT-001/TASK.md` — Task definition (ya creado en esta ejecución).
3. `docs/tasks/FF-AI-AGENT-001/PLAN.md` — Este archivo.
4. `docs/architecture/agent-role-contracts.md` — 7 role contracts normativos (creado inicialmente como `draft`; aceptado y promovido a `canonical` el 2026-08-25).
5. `docs/architecture/agent-profile-matrix.md` — Matriz 7 roles + deferred (creada inicialmente como `draft`; aceptada y promovida a `canonical` el 2026-08-25).

### Fase 3: Actualizar 4 archivos existentes

6. `docs/SOURCE_OF_TRUTH.md` — Añadir WP, TASK001 y ambos architecture docs; AGENT002 solo proposed en WP, sin link a task inexistente.
7. `docs/current-state.md` — DOC001 done; Agent Profiles WP active, AGENT001 `DONE`/`ACCEPTED`/`INTEGRATED`, AGENT002 proposed/not created; explícitamente no profiles/registry/runtime capability.
8. `docs/implementation-roadmap.md` — Sección follow-up con 001 `DONE` y 002 `PROPOSED`, gate serial satisfecho para materializar su TASK/PLAN con Developer gate propio.
9. `docs/milestones/document-governance-v1/PLAN.md` — Actualizar Follow-up: WP materialized active tras gate; link; statuses; no parte WP1–WP6.

### Fase 4: Validación determinista (comandos git)

Ejecutar en orden y reportar resultado:

```bash
# 1. Verificar worktree limpio antes de empezar
git status

# 2. Verificar diff limpio (sin whitespace errors)
git diff --check

# 3. Listar archivos tracked modificados (deben ser exactamente 4)
git diff --name-only

# 4. Listar archivos untracked nuevos (deben ser exactamente 5)
git ls-files --others --exclude-standard

# 5. Verificar staged area vacía (clean worktree)
git diff --cached --name-only

# 6. Buscar extensiones/paths prohibidos en cambios
git diff --name-only | grep -E "(src/|tests/|FitFlow/|opencode\.json|\.opencode/|package\.json|package-lock\.json)" || echo "OK: no prohibited paths in tracked changes"
git ls-files --others --exclude-standard | grep -E "(src/|tests/|FitFlow/|opencode\.json|\.opencode/|package\.json|package-lock\.json)" || echo "OK: no prohibited paths in new files"
```

### Fase 5: Reporte final

Reportar salida de todos los comandos de validación. No hacer `git add/commit/push`. No crear `RESULT.md` ni `REVIEW.md` en esta ejecución.

## Validación Determinista

- **Comandos válidos en git**: Todos los comandos de Fase 4 son comandos git estándar.
- **Tracked modificados esperados**: 4 archivos (SOURCE_OF_TRUTH, current-state, implementation-roadmap, milestone PLAN).
- **Untracked nuevos esperados**: 5 archivos (WP PLAN, TASK, PLAN, agent-role-contracts, agent-profile-matrix).
- **Staged**: Debe estar vacío (worktree clean al inicio, sin `git add`).
- **Búsquedas de prohibidos**: Deben retornar "OK" (sin matches).

## Ownership

- **Planner**: WP Plan y TASK (fase 1-2).
- **Architect**: Contratos y matriz — define fronteras, ACs, ownership (fase 2).
- **Coder**: Implementa los 9 archivos (fases 2-3).
- **Reviewer**: Review independiente read-only (fase posterior, requiere Developer gate).
- **Doc Curator**: Normalización formato, navegación, metadata, enlaces (parte de implementación fase 2-3).

## Reviewer Required

Sí. Review semántico independiente requerido antes de Developer acceptance. El Reviewer recibe fuentes, diff, ACs y resultados; no el razonamiento privado del Coder. Produce findings, gaps y veredicto. No corrige producto.

## Notas

- No se incluye fase RESULT/REVIEW en esta ejecución (se ejecutan en ciclo posterior tras Developer gate).
- `coder_strong_a` y roles post-MVP: sección Deferred en matriz, no en contratos iniciales.
- LLM bindings: observaciones only, non-canonical (matriz `model_binding=UNSPECIFIED/NON_CANONICAL`).
- No fallback, ranking, registries, executable profiles, model policy.
- Source material solo provenance.

## Evidencia Observada

- `git diff --check`: PASS.
- Scope: 4 tracked modificados + 5 untracked nuevos, exactamente los 9 ownership keys.
- Staged area: vacía.
- Paths prohibidos: ninguno.
- Review independiente: `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; las dos aclaraciones no bloqueantes fueron aplicadas.
- Developer gate: `ACCEPTED` el 2026-08-25; ambos architecture docs promovidos de `draft` a `canonical`.
- Integración: PR #12, merge `3d5d8b85a316233eae029963a3f5d14400fcd7fc` en `tooling`.
- `DOC_SYNC`: completado por el cierre posterior a integración; `lifecycle_status: DONE`.
