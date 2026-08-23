---
document_id: FFAI-AGENTS-001
status: canonical
machine_context: true
version: 2.2
updated: 2026-08-21
---
# Reglas de FitFlow-ai

- Resolver el root de FitFlow desde el contexto Orca o el Project Profile; no
asumir que un path relativo entre worktrees representa al checkout activo.
- Leer `AGENTS.md`, `docs/SOURCE_OF_TRUTH.md`, el Project Profile activo y la
TASK antes de actuar; el indice de source of truth resuelve precedencia.
- Escribir por defecto solo dentro de `FitFlow-ai`.
- Toda tarea de escritura usa un Git worktree acotado a la task salvo excepcion
explicita; los worktrees de task son normalmente efimeros.
- Tratar FitFlow como read-only salvo TASK explicita y ownership vigente.
- Depender de ports y contratos; no importar runtime de backend/frontend.
- Aplicar deterministic-first: usar mecanismos deterministas cuando entreguen
la misma evidencia o resultado.
- No instalar o actualizar dependencias sin decision del `Developer`.
- No usar `scripts/.venv_tools` como entorno oficial; solo discovery/reuso
temporal autorizado.
- No indexar secretos, entornos, archive, source material, caches, storage,
exports, logs o runs.
- No declarar una capacidad funcional sin comando y evidencia `PASS`.
- No promover docs, runs ni TASK a `DONE`; el `Developer` tiene la autoridad de
aceptacion terminal.
- `Coder` no administra el Task Lifecycle ni su bookkeeping administrativo.
- OpenCode, Orca, GitHub, OpenSpec, SQLite, Repomix y proveedores son
implementaciones reemplazables, no arquitectura ni source of truth.
- `repo-packager` empaqueta; Explorer decide.
- Paid API permanece disabled y riesgo alto queda bloqueado.
- Orca controla workspace y sesion; Git worktree provee aislamiento. Ninguna de
esas responsabilidades pertenece al Agent CLI ni al AI Core.

