# docs/research

## Propósito

Este directorio alberga **investigación activa**: material de apoyo que informa trabajo en curso pero que **no tiene carácter normativo**. No constituye política, ni guía vinculante, ni Source of Truth.

## Precedencia

Según [ADR-001 §1](../decisions/ADR-001-document-authority-and-layout.md), `docs/research/` tiene **precedencia 6**. Si existe contradicción con cualquier documento de mayor precedencia (ADR, SOURCE_OF_TRUTH, TASK aceptada, guía), prevalece el documento de mayor precedencia.

## Criterios de ciclo de vida

### Ingreso

Un documento ingresa a `docs/research/` cuando:
- Representa una **hipótesis, exploración o investigación en curso**.
- Aún no ha sido promovido a capa canónica (ADR, TASK, WP Plan).
- No ha sido degradado a archivo.

### Egreso (promoción)

Un documento sale de `docs/research/` por **promoción** cuando:
- Se accepta un **ADR** que formaliza la decisión de investigación.
- Se crea una **TASK** o **WP Plan** que incorpora los hallazgos de forma vinculante.
- El Developer acepta la promoción explícitamente.

### Egreso (degradación)

Un documento sale de `docs/research/` por **degradación** cuando:
- La investigación quedó obsoleta o fue abandonada.
- Se traslada a `docs/archive/` mediante TASK documental explícita con ownership que cubra ambas rutas.

## Inventario actual

| Archivo | Descripción |
|---|---|
| `semantic-retrieval.md` | Investigación sobre recuperación semántica y pipelines de indexación. Ubicación definitiva tras el movimiento ejecutado por WP2 (ver [ADR-001 §3](../decisions/ADR-001-document-authority-and-layout.md)). |
| `opencode-orca-agent-operations.md` | Investigación sobre operaciones de agentes OpenCode y Orca. |
| `temporary-ox-alpha-free-line.md` | Documento temporal sobre línea alpha libre de Ox. |

## Nota sobre reclasificación WP2

El archivo `semantic-retrieval.md` se encuentra en su ubicación definitiva dentro de `docs/research/` tras el movimiento canónico ejecutado por WP2 (`FF-AI-DOC-002`). No requiere reubicación adicional.

## Nota

Este README fue creado por [FF-AI-DOC-005](../tasks/FF-AI-DOC-005/TASK.md) (Wave 3, WP5 Research Archive) para consolidar la gobernanza documental.
