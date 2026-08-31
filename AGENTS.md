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
