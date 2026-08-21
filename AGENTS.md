---
document_id: FFAI-AGENTS-001
status: canonical
machine_context: true
version: 2.1
updated: 2026-08-21
---

# Reglas de FitFlow-ai

- Resolver el root de FitFlow desde el contexto Orca o el Project Profile; no
  asumir que un path relativo entre worktrees representa al checkout activo.
- Leer `AGENTS.md` y `docs/SOURCE_OF_TRUTH.md` de FitFlow, el Project Profile
  activo y la TASK.
- Escribir por defecto solo dentro de `FitFlow-ai`.
- Tratar FitFlow como read-only salvo TASK explicita y ownership vigente.
- Depender de ports y contratos; no importar runtime de backend/frontend.
- No instalar o actualizar dependencias sin decision del desarrollador.
- No usar `scripts/.venv_tools` como entorno oficial; solo discovery/reuso
  temporal autorizado.
- No indexar secretos, entornos, archive, source material, caches, storage,
  exports, logs o runs.
- No declarar una capacidad funcional sin comando y evidencia `PASS`.
- No promover docs, runs ni TASK a `DONE`; esa autoridad es del desarrollador.
- OpenCode, GitHub, OpenSpec, SQLite, Repomix y proveedores son adapters.
- `repo-packager` empaqueta; Explorer decide.
- Paid API permanece disabled y riesgo alto queda bloqueado.
- Orca controla workspace y sesion; Git worktree provee aislamiento. Ninguna de
  esas responsabilidades pertenece al Agent CLI ni al AI Core.
