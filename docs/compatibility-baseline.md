---
document_id: FFAI-COMPAT-001
status: canonical
machine_context: true
version: 3.0
updated: 2026-08-21
---

# Baseline de compatibilidad

| Componente | Observacion 2026-08-21 | Decision |
| --- | --- | --- |
| Orca | runtime `1.4.185`; worktrees FitFlow-ai/FitFlow y Folder Workspace visibles | control de workspace/sesion; Folder Workspace no aisla escritura |
| Git | `2.39.0`; branch de integracion `tooling` | nuevas tasks desde `origin/tooling`; `master` transitoria |
| Node | `22.18.0` | disponible |
| npm | `11.19.0` | disponible |
| Repomix | `1.18.0` | disponible; mantener sin upgrade |
| repo-packager | reparado, PR #2 merged; tests 4/4 PASS | integrado en `tooling`; conformance v2 queda en `VNEXT-006` |
| OpenCode CLI | `1.18.21`; ejecuta esta sesion bajo Orca | runtime actual intercambiable; adapter/conformance pending |
| Otros Agent CLI | soportados por Orca como runtimes externos | no declarar conformance del AI Core sin tests propios |
| OpenSpec CLI | `1.9.0` | bootstrap y adapter pending |
| GitHub CLI | `2.97.0`; PR #2 verificable | adapter pending |
| Python | `3.13.6` del sistema ejecuto tests de repo-packager | `python/.venv_tools` no es entorno oficial |
| SQLite | dependencias declaradas en `package.json`; Run Store implementado | validacion local bloqueada sin dependencias instaladas |

Evidencia ejecutada desde este worktree:

- doctor unit tests: 6/6 `PASS`;
- repo-packager: 4/4 `PASS`;
- contracts, registries y core: `NOT_RUN`; el reviewer no produjo una nueva
  ejecucion reproducible y no se autorizo instalar dependencias;
- doctor real: tools externos disponibles, pero `repo-packager` y Project
  Profile aparecen `UNAVAILABLE` por roots cross-repo stale.

El ultimo punto no invalida la reparacion del empaquetador: demuestra que el
caller de doctor aun busca la ubicacion anterior. Resolver roots portables y
consumidores corresponde a `FF-AI-VNEXT-005`; adaptar ContextPackager al
contrato v2 corresponde a `FF-AI-VNEXT-006`.
