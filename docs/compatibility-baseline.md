---
document_id: FFAI-COMPAT-001
status: review_required
machine_context: true
version: 2.0
updated: 2026-08-18
---

# Baseline de compatibilidad

| Componente | Observacion 2026-08-18 | Decision |
| --- | --- | --- |
| Node | `22.18.0` | compatible con requisito conocido de OpenSpec |
| npm | `11.19.0` | registrar en doctor |
| Repomix | `1.18.0` | disponible; mantener sin upgrade |
| repo-packager | ejecuta con `scripts/.venv_tools` | funcional con gaps; no compliant v2 |
| OpenCode CLI | `1.18.18`; modelos LM Studio descubiertos | adapter/conformance pending |
| OpenCode Desktop | disponible para uso manual | fuera del contrato automatizado |
| OpenSpec CLI | `1.9.0`; root no inicializado | bootstrap pending |
| GitHub CLI | `2.97.0`; autenticado | adapter pending |
| GitHub Copilot | credencial visible, sin modelo invocable autorizado | deferred; developer-intermediated |
| Python AI Core | no oficial | decidir en task separada |
| SQLite | `better-sqlite3 13.0.3` smoke PASS en FitFlow; no instalado aun en FitFlow-ai | adoptar en bootstrap del core |

`doctor` debe convertir estas observaciones en evidencia reproducible dentro de
FitFlow-ai: version, path, capabilities y salida exacta, sin instalar nada.
