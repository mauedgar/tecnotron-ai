---
document_id: FFAI-COMPAT-001
status: canonical
machine_context: true
version: 3.2
updated: 2026-08-24
---

# Baseline de compatibilidad

| Componente | Observacion 2026-08-21 | Decision |
| --- | --- | --- |
| Orca | runtime `1.4.185`; worktrees FitFlow-ai/FitFlow y Folder Workspace visibles | control de workspace/sesion; Folder Workspace no aisla escritura |
| Git | `2.39.0`; `tooling` es el baseline de integracion activo | nuevas tasks desde `origin/tooling`; `main` recibe solo hitos por PR `tooling` a `main` con merge commit |
| Node | `22.18.0` | disponible |
| npm | `11.19.0` | disponible |
| Repomix | `1.18.0` | disponible; mantener sin upgrade |
| repo-packager | reparado, PR #2 merged; tests 4/4 PASS | integrado en `tooling`; conformance v2 queda en `VNEXT-006` |
| OpenCode CLI | `1.18.21`; ejecuta esta sesion bajo Orca | runtime actual intercambiable; adapter/conformance pending |
| Otros Agent CLI | soportados por Orca como runtimes externos | no declarar conformance del AI Core sin tests propios |
| OpenSpec CLI | `1.9.0` | adapter de lectura acotada implementado |
| GitHub CLI | `2.97.0`; PR #2 verificable | adapter mecanico e idempotente implementado |
| Python | `3.13.6` del sistema ejecuto tests de repo-packager | `scripts/.venv_tools` no es entorno oficial |
| SQLite | dependencias declaradas en `package.json`; Run Store implementado | validacion local bloqueada sin dependencias instaladas |

Evidencia ejecutada desde este worktree:

- doctor y adapters: 10/10 `PASS`;
- `npm pack --dry-run` de `@mauedgar/contracts` repetido: `PASS`, integrity
  estable y exports CJS/ESM declarados;
- repo-packager: 4/4 `PASS`;
- contracts, registries, core y smoke CJS/ESM: 20/20 `PASS`; `zod` y `yaml`
  estan disponibles en el entorno local;
- doctor real con `FF_PROJECT_ROOT`: `PASS`; Project Profile y roots activos
  se resuelven sin path hermano. `repo-packager` queda `UNREACHABLE` si no
  existe el entorno discovery reutilizable.

Adaptar ContextPackager al contrato v2 corresponde a `FF-AI-VNEXT-006`.
