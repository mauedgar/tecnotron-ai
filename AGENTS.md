---
document_id: TEC-AGENTS-001
status: canonical
owner: tecnotron-ai
machine_context: true
version: 3.0
updated: 2026-08-30
---
# Reglas de Tecnotron-ai

- Tecnotron-ai es un sistema de desarrollo independiente. El `Developer` es el
  orquestador real y conserva la autoridad de aceptación terminal.
- Resolver el root de Tecnotron-ai desde el contexto de ejecución explícito o
  el Project Profile activo; no inferir el checkout activo mediante paths
  relativos entre worktrees.
- Leer `AGENTS.md`, `docs/SOURCE_OF_TRUTH.md`, el Project Profile activo y la
  TASK antes de actuar; el índice de source of truth resuelve la precedencia.
- Escribir por defecto solo dentro de Tecnotron-ai.
- Toda tarea de escritura usa un Git worktree acotado a la TASK, salvo excepción
  explícita; los worktrees de tarea son normalmente efímeros.
- Tratar cualquier repositorio externo como read-only, salvo TASK explícita y
  ownership vigente.
- Depender de ports y contratos; no importar runtimes de otros sistemas.
- Aplicar deterministic-first: usar mecanismos deterministas cuando entreguen
  la misma evidencia o resultado.
- No instalar ni actualizar dependencias sin decisión del `Developer`.
- No usar `python/.venv_tools` como entorno oficial; solo para discovery o
  reutilización temporal autorizada.
- No indexar secretos, entornos, archive, source material, caches, storage,
  exports, logs ni runs.
- No declarar una capacidad funcional sin comando y evidencia `PASS`.
- No promover docs, runs ni TASK a `DONE`; el `Developer` conserva la autoridad
  de aceptación terminal.
- El `Implementer` no administra el Task Lifecycle ni su bookkeeping
  administrativo.
- Los runtimes de agentes, proveedores de workspace, sistemas de planificación,
  bases de datos y empaquetadores son implementaciones reemplazables, no
  arquitectura ni source of truth.
- `repo-packager` empaqueta; `Explorer` decide.
- Paid API permanece disabled y el riesgo alto queda bloqueado.
- El proveedor de workspace controla workspace y sesión; Git worktree provee
  aislamiento. Ninguna de esas responsabilidades pertenece al Agent CLI ni al
  AI Core.

## Upper LC — OpenCode V2 actor surface (2026-10-24)

The nine previous `.opencode/agents/*.md` agents are immutable historical
projections under `docs/archive/opencode-agent-profiles-v1/`, not current
OpenCode agents. Do not revive their V1 `permission: deny` frontmatter as a
V2 runtime binding or route work to those IDs.

The current project-scoped V2 agents are `ulc-implementer` (reusable,
primary, **deny-all without an exact execution binding**) and `ulc-reviewer`
(disabled unless Product Control separately selects and qualifies that
independent review binding). The built-ins `build`, `plan`, `general`, and `explore` are
disabled by project config. `opencode.json` uses V2 `agents` and ordered
`permissions`; validate the **actual effective runtime config**, model and
auth before launch, and do not fall back silently to built-in `build`.

All per-task read and write scopes, context, validation commands, owner and
Operation/ExecutionAttempt are supplied by the exact runtime/TaskCycle binding;
no issue-specific paths belong in the reusable agent definition. The active
#34 kernel-free TaskCycle's source boundaries remain governed by Product Control. This profile
maintenance is independent, does not dispatch its Phase 1, and cannot expand
the two-file write-set. Do not use State Kernel in the active process; its
physical cleanup and Beads adoption remain separate.

The existing `src/adapters/opencode-cli.js` has a tested OpenCode v1
compatibility boundary. The V2 actor definitions are **not** evidence of
adapter/launcher compatibility, runtime permissions, full test PASS,
independent review or Developer candidate acceptance. Preserve these gates.
