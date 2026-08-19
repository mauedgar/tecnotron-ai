---
document_id: FFAI-AGENTS-001
status: canonical
machine_context: true
version: 2.0
updated: 2026-08-18
---

# Reglas de FitFlow-ai

- Leer `../FitFlow/AGENTS.md`, `../FitFlow/docs/SOURCE_OF_TRUTH.md`, Project
  Profile v2 y la TASK.
- Escribir por defecto solo dentro de `FitFlow-ai`.
- Tratar `../FitFlow` como read-only salvo TASK explicita y ownership vigente.
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
