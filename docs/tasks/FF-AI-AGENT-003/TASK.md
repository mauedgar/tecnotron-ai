---
document_id: FFAI-TASK-AGENT-003
status: canonical
machine_context: true
version: 1.4
updated: 2026-08-26
owner: fitflow-ai
type: workflow
criticality: medium
risk: medium
priority: P1
work_package: opencode-manual-profiles
wave: 1
dependency_gate: AGENT002_satisfied
validation: PASS
review_verdict: ACCEPT
developer_acceptance: ACCEPTED
integration:
  status: NOT_INTEGRATED
  pull_request: https://github.com/mauedgar/tecnotron-ai/pull/20
lifecycle_status: ACCEPTED
orchestration:
  run_id: run_9eb35245e53f
  task_id: task_cfa38b865814
ownership_keys:
  - "doc:docs/work-packages/opencode-manual-profiles/PLAN.md"
  - "doc:docs/tasks/FF-AI-AGENT-003/TASK.md"
  - "doc:docs/tasks/FF-AI-AGENT-003/PLAN.md"
  - "doc:docs/tasks/FF-AI-AGENT-003/VALIDATION.md"
  - "doc:docs/tasks/FF-AI-AGENT-003/REVIEW.md"
  - "doc:docs/tasks/FF-AI-AGENT-003/RESULT.md"
  - "doc:docs/research/opencode-orca-agent-operations.md"
  - "doc:docs/architecture/agent-profile-conformance.md"
  - "doc:docs/architecture/agent-role-contracts.md"
  - "doc:docs/architecture/agent-profile-matrix.md"
  - "doc:docs/decisions/ADR-001-document-authority-and-layout.md"
  - "doc:docs/task-lifecycle.md"
  - "doc:docs/SOURCE_OF_TRUTH.md"
  - "doc:docs/current-state.md"
  - "doc:docs/implementation-roadmap.md"
  - "config:.opencode/agents/planner_ai.md"
  - "config:.opencode/agents/architect.md"
  - "config:.opencode/agents/explorer.md"
  - "config:.opencode/agents/coder_a.md"
  - "config:.opencode/agents/coder_b.md"
  - "config:.opencode/agents/coder_strong_a.md"
  - "config:.opencode/agents/reviewer.md"
  - "config:.opencode/agents/doc_curator.md"
  - "config:.opencode/agents/prompt_generator.md"
  - "config:.opencode/agents/developer_superuser.md"
  - "config:.opencode/package.json"
  - "config:.opencode/package-lock.json"
  - "tool:scripts/opencode/install-global-agents.ps1"
related:
  - "[[tasks/FF-AI-AGENT-003/PLAN]]"
  - "[[work-packages/opencode-manual-profiles/PLAN]]"
  - "[[architecture/agent-role-contracts]]"
  - "[[architecture/agent-profile-conformance]]"
  - "[[research/opencode-orca-agent-operations]]"
---

# Task FF-AI-AGENT-003: OpenCode Manual Profiles

## Objetivo

Reemplazar el mock inline de agentes por perfiles OpenCode versionados y
verificables, disponibles globalmente mediante enlaces individuales. Los ocho
roles habilitados derivan su comportamiento de contratos canonicos; solo sus
bindings de modelo observados se conservan desde la configuracion global actual.

Crear ademas dos perfiles primarios exclusivos del Developer:

- `prompt_generator`: transforma objetivo, scope, evidencia y gates en prompts
  reproducibles; read-only y sin autoridad de ejecucion.
- `developer_superuser`: coordinacion amplia y delegacion manual, sin bypass de
  `deny`, prompts de permiso, Task Lifecycle ni aceptacion humana.

## Baseline y Task Start

- Base: `tooling@141174bbef6ae68af37b225714b4f3dafabe66d0`.
- Worktree Orca: `FF-AI-AGENT-003`.
- Branch: `mauedgar/FF-AI-AGENT-003`.
- Orca Run: `run_9eb35245e53f`.
- Orca orchestration task: `task_cfa38b865814`.
- `FF-AI-AGENT-001` y `002`: `DONE`, `ACCEPTED`, `INTEGRATED`.
- `.opencode/package.json` y `.opencode/package-lock.json` son metadata
  administrada por Orca/OpenCode. El Developer decidio versionar su actualizacion
  observada junto con esta task; no se clasifican como dirty ajeno.

## Criterios de aceptacion

1. Existen diez archivos de perfil bajo `.opencode/agents/`: ocho roles
   canonicos y dos perfiles primarios exclusivos del Developer.
2. Los ocho roles usan la linea zero-cost observada mediante invocaciones
   acotadas y el ruling Developer del 2026-08-26:
   `planner_ai`, `architect`, `coder_a`, `coder_strong_a`, `reviewer` ->
   `opencode/big-pickle`;
   `explorer`, `doc_curator` -> `opencode/hy3-free`;
   `coder_b` -> `opencode/mimo-v2.5-free`.
3. Ningun prompt, descripcion o permiso se copia del mock inline como fuente de
   autoridad; se deriva de contratos canonicos y del ceiling de la TASK.
4. `prompt_generator` y `developer_superuser` usan `mode: primary`, no pueden
   ser delegados como subagentes y no ingresan al registry/runtime.
5. `developer_superuser` conserva confirmacion para operaciones riesgosas y no
   usa `permission: allow` global, `--auto` ni reglas que neutralicen denies.
6. `explorer`, `reviewer` y `prompt_generator` son read-only.
7. Coders y Doc Curator declaran que ownership de TASK limita cualquier permiso
   tecnico mas amplio; detienen scope expansion.
8. El instalador crea enlaces por archivo en el directorio global de agentes,
   preserva agentes globales no administrados y rechaza destinos conflictivos.
9. El instalador rechaza como fuente un worktree efimero y ofrece dry-run.
10. La mutacion de `~/.config/opencode/opencode.json` queda fuera de ejecucion
    automatica; el retiro del bloque inline requiere gate explicito y backup.
11. `opencode agent list` demuestra discovery de proyecto y las invocaciones
    acotadas prueban la linea zero-cost. Discovery global enlazada permanece
    como postflight posterior a integracion en checkout estable.
12. `planner_ai` y `coder_strong_a` estan habilitados; Coder Strong A requiere
    escalamiento explicito, conserva ceiling MEDIUM y no habilita delegacion HIGH.
13. El inventario OpenCode/Orca y la nota preflight/postflight quedan en
    investigacion no normativa, sin claims en current-state funcional.
14. No hay cambios en `src/`, `tests/`, registries, FitFlow ni configuracion
    global. Los dos manifests `.opencode` administrados por Orca forman parte del
    ownership explicito.
15. `git diff --check` PASS y el diff task-scoped contiene solo ownership keys.

## Ruling de modelo 2026-08-26

Ox Alpha conserva identidad valida pero esta temporalmente no disponible durante
su lanzamiento. El informe es evidencia de investigacion, no fuente de verdad;
la linea se decide por catalogo con coste cero e invocaciones acotadas observadas.
Planner y Coder Strong A quedan habilitados; Coder Strong A usa Big Pickle solo
para escalamiento explicito de complejidad MEDIUM. Este ruling no activa fallback,
ranking, delegacion HIGH ni autoridad adicional.

## Stop Conditions

- Un enlace resolveria hacia un worktree Orca efimero.
- Un perfil requiere ampliar el techo de su contrato canonico.
- Se intenta convertir un perfil manual en runtime-selectable.
- Se intenta ampliar `coder_strong_a` a HIGH o activar fallback/ranking.
- Aparece un cambio fuera de ownership.

## Gate global aprobado

El Developer acepto el diff y autorizo completar los perfiles operativos el
2026-08-26. Tras integrar el PR en el checkout estable se aplicara esta mutacion
exacta a `C:/Users/maued/.config/opencode/opencode.json`:

1. crear un backup timestamped antes de cualquier escritura;
2. eliminar solo las claves inline `explorer`, `coder_b`, `coder_a`,
   `coder_strong_a`, `reviewer`, `planner_ai`, `architect` y `doc_curator`;
3. preservar los built-ins deshabilitados, permisos globales, providers, modelos
   y toda configuracion no administrada;
4. ejecutar el instalador desde el checkout estable para crear diez enlaces por
   archivo y verificar discovery global.

La aceptacion no declara integracion, links globales ni `DONE`; esos estados se
registran solo despues del PR y del postflight verificable.

PR abierto: https://github.com/mauedgar/tecnotron-ai/pull/20
