---
document_id: TEC-PY-RUNTIME-315-CANDIDATE-001
status: candidate_not_canonical
owner: TECNOTRON_BETA_RUN_001_Product_Control
evidence_cutoff: 2026-11-02
scope: Tecnotron_Python_workloads_only
supersedes_as_proposal: TECNOTRON-PYTHON-RUNTIME-BASELINE-20261102-001_3_14_TARGET
Product_effect: NONE
TaskCycle_effect: NONE
---

# Python 3.15.x — candidato de baseline arquitectónico de Tecnotron

## Decisión Developer y límites

El Developer seleccionó el 2 de noviembre de 2026 considerar **Python 3.15.x** como objetivo de normalización de los nuevos componentes Python y aprovechar las capacidades nuevas mientras Tecnotron es inicial. Esto sustituye **la preferencia estratégica preliminar** por Python 3.14, **no** sustituye los runtimes congelados, la adopción competente de Product, el contrato de una TaskCycle ni la evidencia de validación.

**Selección técnica del candidato:** CPython **3.15.2** (release estable y de seguridad del 25 de octubre de 2026), variante GIL estándar; ampliar a la última patch 3.15.x mediante CI y revisiones de compatibilidad verificadas. El soporte del lenguaje se extiende hasta octubre de 2031. `uv` 0.13.6 soporta y distribuye CPython 3.15.2; un soporte de uv no prueba por sí solo compatibilidad de cada paquete.

**Estado de este documento:** propuesta en rama aislada, **no incorporación a `tools` ni a `docs/SOURCE_OF_TRUTH.md`**. Su integración canónica requiere los contratos vigentes, candidato exacto, validación/IR y aceptación Developer competente. Esta propuesta no inicia otra TaskCycle, no cambia Upper LC, no elimina State Kernel, no incluye Beads, no selecciona automáticamente otra responsabilidad.

## Baseline candidato — nuevas implementaciones Python

- Para *nuevos componentes Python* que no dependan de runtimes históricamente congelados: usar `3.15.2` como objetivo de implementación, tests y CI desde la primera iteración, con `uv` por entorno/workspace y `pyproject.toml` + `uv.lock` cuando existan dependencias.
- Anclar intérprete real en `.python-version` por **componente**, no imponerlo al nivel raíz de Tecnotron: el núcleo de Tecnotron es actualmente **Node 22/TypeScript**, y la carpeta legacy `python/requirements.txt` utiliza C-extensions y paquetes específicos de Windows. Evitar mutar el Python global y evitar compartir `.venv` entre Product/Control/ejecución.
- Declarar `requires-python = \">=3.15,<3.16\"` solo en componentes nuevos que realmente se validaron como Python-3.15-only; no ampliar falsamente dependencias existentes. Para herramientas reutilizables multi-runtime definir rangos basados en la matriz testada, no en la preferencia estratégica.
- Preferir código del lenguaje/stdlib cuando simplifique responsabilidades concretas y medir impacto antes de adoptar `lazy import`, `frozendict`, `sentinel`, Tachyon o la ABI `abi3t`. La ABI de extensiones free-threaded, el JIT experimental y el intérprete sin GIL son pistas separadas opt-in, no el default Product.
- Reutilizar las operaciones ya existentes de CI, Git y Review, no crear otra capa/orquestador o scheduler de entornos.

## Evidencia original de compatibilidad real (solo experimental)

- Laboratorio `mauedgar/ts-execution-lab:experiment/python315-baseline-20261102-001@17e7dc92300fd08280d8ebba0691ca85c62394f5`, tree `6a3b9e109b96397dc7eefe63adf6496ab4d9ff9d`.
- **Un único GitHub Actions run**, id `41469300277`, intento 1, job `125358343062`, conclusión `success`; validación exacta en **CPython 3.15.2** con `lazy import` + `frozendict` smoke PASS, y **19/19 pruebas** de código Python/SQLite: Domain 13/13, Operator 5/5, E2E 1/1. Github URL: https://github.com/mauedgar/ts-execution-lab/actions/runs/41469300277.
- Sujetos inmutables del experimento: Domain `mauedgar/ts-execution-lab@2aab8ed12525e3a85b044120c8d5e4d19a083fcf`, tree `beba803123c1d5008721a126894a20e73a680bbc`; Operator **anterior** `@d161f86006440f09a900ad0620a6ed5199ff69e9`, tree `e80e8c6bdda7e5fd983c5a2149e9fa4ae86f4a42`; Parent E2E `@39571b53cbc83eecdb3fef3839328a35a6145a6f`; contrato Attendance V0 blob `2e939672a8401154289ea94aab83194f689247f0`. Es evidencia de compatibilidad de los tests del experimento, no de conformidad H6, ni IR003, ni aceptación o Phase 2.
- Condiciones no acreditadas: stacks completos Tecnotron Python legacy en Windows/WSL/Linux, instalación de wheel/ABI compilado, reemplazo de env Python externo, integraciones con otras tecnologías, CI de un candidato nuevo Operator ya reparado, tests de concurrencia free-threaded y pruebas de productividad/arranque reales. Documentar errores/fallos por componente sin depreciar artificialmente Python 3.12 y 3.11 vigentes.

## Matriz propuesta por consumidor (no migración automática)

| Consumidor / autoridad | Real / contrato vigente | Target declarado | Acción competente |
| --- | --- | --- | --- |
| Tecnotron nuevos scripts/servicios Python | Por diseño inicial | **3.15.2 estándar** | Componentes nuevos con test nativo y locks propios; no mutar Node/Kernel |
| Tecnotron Python legacy tooling | `python/requirements.txt` en `tools@bc9e60b9cad79037b40c298d5c9a84f17a33d909`; soporte 3.15 sin calificar | Evaluación hacia 3.15.x | Resolver deps nativas por plataforma, bootstrap reproducible, IR |
| H6 Attendance `mauedgar/tecnotron-ai#35` | **3.12 stdlib** congelado en Attendance V0 | **conservar 3.12** durante actual TaskCycle; 3.15 solamente matriz experimental | No cambiar V0, grants ni owners. Operador corregido sin commit; antes de IR003 recuperar publicación Git permitida |
| FitFlow `develop@c15bdefc766dfa42fa2b5b86b679ed3bf0f5a47d` | Docker/CI **3.11**, PR #46 propone `>=3.11,<3.14` | 3.15 como hipótesis, no decisión FitFlow | Solo `FITFLOW_CONTROL` puede adoptar: renovar deps/uv lock, compatibilidad con DB/HTTP/E2E, decidir aceptación por su ciclo |
| TS Execution Engineering / Lab | Runner Node22 y herramientas según experimento | Python 3.15 en experimentos nuevos expresamente seleccionados | No reescribir historia ni sustituir receipts originales |

## DoD de calificación reutilizando gates existentes (no nuevos gates)

1. Capturar Product/TaskCycle competente, branch/commit/tree, actor, write scope y dependencias antes de cambiar el baseline de cada implementación; no promulgar `READY` ni resultados de experimentos como autoridad.
2. Reutilizar `uv` instalado y versionado: `uv python install 3.15.2`; en componentes nuevos `uv python pin 3.15.2`; `uv lock --check`, `uv sync --locked`; activar pruebas Windows, WSL/Linux CI y Docker cuando existan esos targets. No ejecutar instalaciones globales/alterar la workstation desde una doc propuesta.
3. Ejecutar tests reales sobre commits fuente exactos: lint/type/unit/integration, migraciones/concurrencia, errores, reinicio E2E; comparar benchmark de arranque/lazy imports con una versión estable anterior solo si se utiliza esa mejora. Verificar native wheels de `numpy`, `scipy`, `psycopg2`, `pywin32` y demás desde `python/requirements.txt` por cada OS.
4. Obtener IR semántica independiente sobre **candidato específico congelado**; luego, si procede, solicitar aceptación Developer competente y ejecutar únicamente Phase 2 autorizada. No atribuir aceptación a esta propuesta ni a un run experimental.
5. Preservar ruta de reversión/documentación: intérprete anterior/lock exacto hasta efecto confirmado, sin arreglar un bloqueo Product independiente con una migración Python no relacionada.

## Fuente y precedencia

SOT: `mauedgar/tecnotron-ai:tools@bc9e60b9cad79037b40c298d5c9a84f17a33d909`, tree `e6be65e0c3d9aca074218b2fff92e6d42fc76141`, `docs/SOURCE_OF_TRUTH.md` blob `dd8d34a7e3ef3094805d014f9e59741d2c553957`. Historical proposal Python 3.14 `mauedgar/ts-execution-transport@135155b2b4f5acbc65d4e3c52f9b146e8eecebc0:handoffs/TECNOTRON-PYTHON-RUNTIME-BASELINE-20261102-001/DECISION_CANDIDATE.md`. This candidate **revises the proposal**, not retroactively the original 3.14 document or its decision provenance.

External primary references: https://www.python.org/downloads/release/python-3152/ ; https://devguide.python.org/versions/ ; https://docs.python.org/3.15/whatsnew/3.15.html ; https://docs.astral.sh/uv/reference/policies/python/ ; https://github.com/astral-sh/uv/releases/tag/0.13.6 .
