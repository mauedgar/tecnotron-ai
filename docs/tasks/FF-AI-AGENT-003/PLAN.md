---
document_id: FFAI-PLAN-AGENT-003
status: canonical
machine_context: true
version: 1.2
updated: 2026-08-26
task_ref: FFAI-TASK-AGENT-003
work_package: opencode-manual-profiles
wave: 1
criticality: medium
owner: fitflow-ai
related:
  - "[[tasks/FF-AI-AGENT-003/TASK]]"
  - "[[work-packages/opencode-manual-profiles/PLAN]]"
  - "[[research/opencode-orca-agent-operations]]"
---

# Plan FF-AI-AGENT-003: OpenCode Manual Profiles

## Fases

### Fase 0: Preflight

- Confirmar worktree administrado por Orca, branch, base y dirty state.
- Confirmar Run/task Orca y cinco dimensiones de lifecycle.
- Inventariar config global sin copiar secretos ni promoverla a source of truth.

### Fase 1: Evidencia de plataforma

- Registrar capacidades observadas de OpenCode 1.18.23 y Orca CLI.
- Separar comandos reutilizables de responsabilidades de AI Core.
- Mantener preflight/postflight/Temporal como investigacion diferida.

### Fase 2: Perfiles

- Crear los ocho perfiles derivados de contratos canonicos.
- Crear `prompt_generator` y `developer_superuser` como primary-only.
- Aplicar la linea zero-cost por rol demostrada mediante invocacion acotada.
- Materializar `coder_strong_a` como escalamiento explicito con ceiling MEDIUM.

### Fase 3: Distribucion global

- Implementar instalador PowerShell con dry-run y fail-closed.
- Enlazar archivos individuales para coexistir con `codebase-memory*.md`.
- Rechazar fuentes en worktrees efimeros y destinos no administrados.
- No editar config global hasta Developer gate.

### Fase 4: Validacion

```bash
git diff --check
git diff --name-only
opencode agent list
```

- Validar frontmatter permitido y modos de cada perfil.
- Validar que perfiles read-only tengan `edit: deny`.
- Validar que ningun perfil use auto-approval o permiso global irrestricto.
- Ejecutar instalador en dry-run desde el worktree: debe rechazar activacion.
- Verificar discovery de proyecto e invocaciones zero-cost acotadas.
- Tras integracion en checkout estable y gate global, verificar enlaces y
  discovery global desde un repositorio distinto como postflight.
- Evaluar el diff solo sobre ownership; `.opencode/package*.json` es ambient
  dirty preexistente y no pertenece a esta task.

### Fase 5: Review y aceptacion

- Review semantico independiente obligatorio.
- Developer decide mutacion global y aceptacion del diff.
- Integracion a `tooling`, DOC_SYNC y cleanup permanecen separados.

## Evidencia inicial

- `orca worktree current --json`: worktree Orca confirmado.
- `orca orchestration run-create`: `run_9eb35245e53f`.
- `orca orchestration task-create`: `task_cfa38b865814`.
- `opencode --version`: `1.18.23`.
- `opencode agent --help`: soporta `create` y `list`.
- `orca automations list --json`: cero automations configuradas.
- `orca orchestration run-current --json`: no existia Run antes de esta task.
- Ruling Developer 2026-08-26: Ox Alpha queda temporalmente `UNAVAILABLE`; el
  informe no es fuente de verdad y se aplica la linea zero-cost observada por
  uso. Se habilitan `planner_ai` y `coder_strong_a`, este ultimo con ceiling
  MEDIUM y sin fallback ni ranking.
