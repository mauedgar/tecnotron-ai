---
document_id: TEC-COMPAT-001
status: canonical
machine_context: true
version: 3.3
updated: 2026-08-30
owner: tecnotron-ai
---

# Baseline de compatibilidad

| Componente | Observación histórica 2026-08-21 | Disposición vigente |
| --- | --- | --- |
| Orca | runtime `1.4.185`; worktrees del entonces denominado FitFlow-ai y de FitFlow, más Folder Workspace, visibles | Control de workspace/sesión; Folder Workspace no aísla escritura. La identidad canónica vigente es Tecnotron-ai. |
| Git | `2.39.0`; `tooling` era el baseline de integración observado | `tooling` queda como referencia histórica. Para `tecnotron-operational-foundation-v1`, el parámetro `integration_branch` tiene el valor `tools`; no es una constante universal. |
| Node | `22.18.0` | disponible |
| npm | `11.19.0` | disponible |
| Repomix | `1.18.0` | disponible; mantener sin upgrade |
| repo-packager | reparado, PR #2 merged; tests 4/4 PASS | integración histórica en `tooling`; conformance v2 registrada en `VNEXT-006` |
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

La adaptación de ContextPackager al contrato v2 correspondió históricamente a
`FF-AI-VNEXT-006`.
