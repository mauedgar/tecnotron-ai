---
document_id: FFAI-PLAN-AGENT-002
status: canonical
machine_context: true
version: 1.1
updated: 2026-08-25
task_ref: FFAI-TASK-AGENT-002
work_package: agent-profiles-mvp
wave: 2
criticality: medium
owner: fitflow-ai
related:
  - "[[tasks/FF-AI-AGENT-002/TASK]]"
  - "[[work-packages/agent-profiles-mvp/PLAN]]"
  - "[[architecture/agent-profile-conformance]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-matrix]]"
---

# Plan FF-AI-AGENT-002: Minimal Profile Conformance

## Fases

### Fase 1: Gate y fuentes

- Confirmar AGENT001 `DONE` + `ACCEPTED` + `INTEGRATED` y DOC_SYNC.
- Leer ADR-001 §9, role contracts, profile matrix, task-lifecycle, context-strategy y operational-architecture.
- Confirmar que OpenCode, runtime, registries, manifests y FitFlow quedan fuera de scope.

### Fase 2: Especificación

- Crear `docs/architecture/agent-profile-conformance.md` como `draft`.
- Definir descriptor mínimo, proyecciones de siete roles, permisos efectivos, discovery/invocation evidence, delegación y handoff.
- Declarar unknowns y estados no verificados sin inferir capacidades runtime.

### Fase 3: Sincronización documental

- Materializar TASK/PLAN.
- Actualizar WP, SoT, current-state, roadmap y milestone para reflejar AGENT002 `WORKING`.
- Mantener AGENT001 cerrado y los perfiles manuales como propuestas no ejecutables.

### Fase 4: Validación determinista

```bash
git diff --check
git diff --name-only
git ls-files --others --exclude-standard
test -z "$(git diff --name-only -- src tests FitFlow opencode.json .opencode package.json package-lock.json)"
test -z "$(git ls-files --others --exclude-standard -- src tests FitFlow opencode.json .opencode package.json package-lock.json)"
```

Expected: cinco tracked modificados, tres nuevos, cero paths prohibidos.

### Fase 5: Review y aceptación

- Reviewer independiente recibe TASK, PLAN, fuentes, diff y evidencia.
- Coder resuelve findings dentro del scope; Reviewer reevalúa si son bloqueantes.
- Developer decide aceptación y promoción de `agent-profile-conformance.md` de `draft` a `canonical`.
- Integración y DOC_SYNC ocurren en ciclos posteriores; no declarar `DONE` antes.

## Reviewer Required

Sí. Review semántico independiente obligatorio antes de aceptación Developer.

## Evidencia Observada

- Scope exacto: 3 nuevos + 5 modificados.
- `git diff --check`: PASS.
- Paths prohibidos: ninguno.
- Claims runtime `VERIFIED`: ninguno.
- `.opencode`, registries y executable profiles: sin cambios.
- Project Profile: `UNAVAILABLE`; no es required_missing y no se usó para afirmar capacidades.
- Review independiente (re-ejecutado en HEAD con handoff incluido): `ACCEPT_WITH_NON_BLOCKING_FINDINGS`; AC1–AC12 PASS, sin findings bloqueantes.
- Developer ruling (2026-08-25): `ACCEPTED`; inclusión autorizada del commit de handoff `a485430` (`docs/archive/prompt/FF-AI-AGENT-002/2026-08-25-start.md`) en el PR de integración.
- Developer acceptance: `ACCEPTED`; el draft se promueve a `canonical` en esta ejecución. Integración y DOC_SYNC ocurren en ciclos posteriores; no declarar `DONE` antes.
