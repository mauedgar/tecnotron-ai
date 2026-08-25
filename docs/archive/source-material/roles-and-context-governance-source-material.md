---
document_id: TECNOTRON-SOURCE-ROLES-CONTEXT-001
title: Roles, contexto, modelos y gobierno operativo — material de diseño
type: source_material
status: draft
authority: non_canonical
scope: tecnotron-ai
updated_at: 2026-08-24
---

# Roles, contexto, modelos y gobierno operativo

## 1. Propósito y autoridad

Este documento conserva las decisiones, hipótesis y criterios de diseño usados para preparar el gobierno de roles y contexto de Tecnotron-ai.

No es una fuente canónica, no habilita roles, no modifica políticas de ejecución y no reemplaza contratos, registries, ADRs, Task Lifecycle ni documentación indexada por `SOURCE_OF_TRUTH.md`.

Sus afirmaciones se clasifican como:

- **APROBADO:** decisión explícita del Developer que debe tratarse como constraint en la planificación posterior.
- **OBSERVADO:** comportamiento visto en la práctica, todavía sin validación suficiente para convertirse en política.
- **PROPUESTO:** diseño recomendado sujeto a revisión y aprobación.
- **DIFERIDO:** trabajo deliberadamente fuera del MVP actual.
- **DESCONOCIDO:** no existe evidencia suficiente.

Ante contradicción, prevalecen las fuentes canónicas del repositorio.

## 2. Objetivo del diseño

El sistema busca reducir contexto y costo sin perder control arquitectónico mediante:

1. trabajo acotado por tasks y máquina de estados;
2. separación entre planificación, exploración, implementación, validación, revisión y aceptación;
3. evidencia mínima suficiente en lugar de contexto indiscriminado;
4. selección explícita de roles, modelos, herramientas y skills;
5. permisos y límites aplicados por configuración/runtime, no sólo por prompts;
6. aceptación terminal reservada al Developer;
7. trazabilidad suficiente para el MVP, sin construir todavía observabilidad exhaustiva.

## 3. Capas que no deben confundirse

### 3.1 Autoridad humana

**APROBADO.** El Developer conserva:

- aprobación de Milestone Plans y waves;
- confirmación de una task como `READY`;
- rulings de arquitectura y excepciones;
- aceptación terminal;
- promoción a `DONE`;
- autorización de integración y promoción de ramas.

Un asistente del Developer puede preparar información o ejecutar operaciones autorizadas, pero no hereda autoridad terminal.

### 3.2 Componentes deterministas

**APROBADO.** Router, Model Resolver, FinOps, State Machine y Validator son componentes/políticas deterministas. No necesitan personalidad ni system prompt de LLM.

### 3.3 Perfiles manuales de OpenCode

**APROBADO.** Planner, Architect, Explorer, Coders, Reviewer y Doc Curator pueden existir como perfiles manuales para operar el workflow antes de su automatización completa.

La existencia de un perfil manual no significa que Router/Model Resolver pueda seleccionarlo ni que Agent Runtime pueda ejecutarlo.

Todo perfil manual deberá distinguir, como mínimo:

| Propiedad | Significado |
| --- | --- |
| `profile_kind` | Tipo de adapter/perfil, por ejemplo `manual_opencode_profile` |
| `manual_invocation` | Si puede invocarse manualmente |
| `runtime_selectable` | Si los componentes productivos pueden seleccionarlo |
| `runtime_integration` | Estado real de integración automática |
| `terminal_authority` | Siempre `none` para perfiles de modelo |

### 3.4 Roles futuros del runtime

**DIFERIDO.** Los roles posteriores al MVP pueden registrarse como catálogo conceptual, pero no deben recibir todavía prompts, modelos, skills, permisos ni claims de ejecución.

## 4. Jerarquía de planificación

**APROBADO.** La jerarquía prevista es:

```text
Roadmap
└── Milestone PLAN
    ├── Work Package PLAN A
    │   ├── Executable Task 1
    │   └── Executable Task 2
    └── Work Package PLAN B
        └── Executable Task 3
```

### Milestone Plan

Owned por Developer + Planner. Define objetivo, baseline, límites, Work Packages, waves, gates y criterio de promoción a `main`.

### Work Package Plan

Owned inicialmente por Planner. Define resultado acotado, frontera arquitectónica, dependencias, ownership, presupuesto de contexto, paralelismo, riesgos y propuesta de tasks.

### Executable Task

Materializada por Architect después de la aprobación de una wave. La carpeta esperada es:

```text
docs/tasks/<task-id>/
├── TASK.md
├── PLAN.md
├── RESULT.md
└── REVIEW.md
```

`TASK.md` es el contrato de scope; `PLAN.md`, la estrategia; `RESULT.md`, la evidencia observada; `REVIEW.md`, el review independiente.

## 5. Fronteras de roles del MVP manual

### Developer Planner

- Interpreta Roadmap y Milestone Plan.
- Propone Work Packages, waves y prioridades.
- Prepara decisiones para el Developer.
- No acepta ni promueve por sí solo.

### Architect

- Convierte Work Packages aprobados en TASK/PLAN ejecutables.
- Decide fronteras, ownership y contratos de trabajo.
- Consume evidencia curada y pide exploración focalizada cuando falta una pieza concreta.
- No vuelve a explorar todo el repositorio por defecto.
- No implementa producto durante planificación.
- No acepta una task.

### Explorer

- Sólo lectura.
- Localiza evidencia, símbolos, consumidores, referencias y fuentes.
- Evalúa cobertura y declara faltantes.
- No decide autoridad ni arquitectura.
- No afirma inexistencia basándose exclusivamente en un índice.
- Produce un Evidence Pack mínimo, no un dump del repositorio.

### Coder A

- Implementación principal de complejidad/criticidad media dentro del techo autorizado.
- Trabaja con TASK, PLAN, ownership y AC explícitos.
- Aplica TDD cuando la task lo exige.
- No amplía scope ni administra integración terminal.

### Coder B

- Cambios mecánicos o de baja criticidad.
- No toma decisiones arquitectónicas.
- Debe detenerse ante ambigüedad semántica.

### Coder Strong A

- **PROPUESTO/NO CERRADO.** Representa escalamiento para trabajo complejo sólo si se demuestra una diferencia operativa verificable respecto de Coder A.
- El nombre no prueba mayor capacidad y no debe derivarse de un modelo observado.
- Puede permanecer sin activación específica hasta que exista un caso real.

### Reviewer

- Revisión semántica independiente y sólo lectura.
- Recibe fuentes, diff, AC y resultados; no el razonamiento privado del Coder.
- Produce findings, gaps y veredicto.
- No corrige producto.
- La independencia depende de sesión/contexto separados; usar otro modelo es opcional, no definitorio.

### Doc Curator

- Escritura limitada a documentación autorizada.
- Normaliza formato, navegación, metadata y enlaces.
- No decide autoridad ni convierte research/guías en canonical.

### Validator

- Componente determinista, no un rol de criterio semántico.
- Ejecuta verificaciones definidas y distingue `PASS`, `FAIL`, `UNAVAILABLE` y `NOT_RUN`.

## 6. Contratos de entrega

**PROPUESTO.** Los contratos de salida deben definirse antes que las personalidades de los prompts.

| Rol | Entrega mínima |
| --- | --- |
| Planner | Milestone Plan, Work Package Plans, dependencias y rulings pendientes |
| Architect | TASK/PLAN ejecutables, ownership, AC, gates y stop conditions |
| Explorer | Evidence Pack con paths, símbolos, cobertura, estado del índice y faltantes |
| Coder | diff, archivos, tests, evidencia, límites y `UNAVAILABLE` reales |
| Reviewer | findings por severidad, AC gaps, scope, arquitectura y veredicto |
| Doc Curator | cambios documentales, enlaces afectados, drift y clasificación |
| Developer | aprobaciones, excepciones, aceptación y decisiones terminales |

## 7. Skills, herramientas y permisos

### Principio de capas

**APROBADO.** No se debe pegar el catálogo completo de herramientas en cada system prompt.

```text
Capacidad del rol
→ binding de skills/herramientas disponible
→ subconjunto habilitado por TASK/PLAN
→ enforcement real de permisos/runtime
```

### Capacidades estables

Los contratos de roles deberían expresar capacidades como:

- `code-discovery`;
- `context-materialization`;
- `external-docs`;
- `workspace-control`;
- `delegation`;
- `test-driven-development`;
- `ui-validation`;
- `token-observability`.

Los nombres concretos de skills son bindings reemplazables. Entre los bindings observados actualmente se encuentran `codebase-memory`, `repo-packager`, `find-docs`, `find-skills`, `orca-cli`, `orchestration`, `test-driven-development` y `opencode-token-monitor`.

### Criterios de uso

- Codebase Memory localiza estructura; no define verdad, autoridad ni vigencia.
- repo-packager materializa contexto temático; no crea documentación canónica.
- `find-skills` se usa sólo ante una capacidad ausente y con autorización, no como rutina de cada worker.
- Orca administra workspace/sesión; no reemplaza Git ni las fuentes canónicas.
- El token monitor aporta telemetría; no define por sí solo un gate.
- Los permisos deben impedir operaciones no autorizadas aunque el prompt falle.

### Registro de herramientas

**DIFERIDO.** No se necesita todavía un `tools.yaml` adicional si una matriz de capacidades, los permisos efectivos de OpenCode y el TASK/PLAN ya determinan el uso permitido. Un Tool Registry machine-readable se justificará cuando el runtime seleccione herramientas automáticamente.

## 8. Modelos como variable operativa

### Principio

**APROBADO.** El modelo es un binding operativo y reemplazable. No define la identidad, autoridad ni frontera del rol.

Las asignaciones usadas manualmente hasta ahora son observaciones de disponibilidad y utilidad circunstancial. Hubo además bloqueos de código y condiciones cambiantes. Por eso:

- no constituyen benchmark;
- no prueban capacidad;
- no establecen ranking;
- no deben fijar criticality o trust;
- no se usarán como métricas reales de los perfiles;
- no deben copiarse como política canónica.

### Metadata futura mínima

Cuando se formalice la selección, convendrá separar:

| Dimensión | Ejemplos |
| --- | --- |
| Identidad | provider, model ID exacto, versión/fecha observada |
| Disponibilidad | available, unavailable, rate-limited, unknown |
| Acceso | local, included, quota, free external, paid |
| Confianza | experimental, standard, trusted |
| Techo | low, medium, high según evidencia aprobada |
| Evidencia | tareas observadas, suite, fecha, limitaciones |
| Binding | rol/perfil al que se asignó provisionalmente |

### Fallback

**APROBADO para el MVP.** No habrá fallback automático por rol.

La configuración general `model`/`small_model`/default no equivale a una cadena específica por rol. Ante fallo del modelo asignado:

```text
modelo no disponible
→ UNAVAILABLE
→ Developer decide retry o cambio manual
→ se registra el override utilizado
```

Un selector/fallback futuro deberá respetar trust, criticality, costo, independencia y reproducibilidad, y no podrá competir con la autoridad del Model Resolver.

## 9. Gobierno de contexto

### Principios aprobados

- Contexto mínimo suficiente, no repositorio completo.
- Explorer consulta por módulo, Work Package o evidencia requerida.
- Architect recibe Evidence Pack y sólo pide expansión por un faltante concreto.
- Coder recibe TASK, PLAN, AC, archivos y contratos relevantes.
- Reviewer reconstruye evidencia desde fuentes/diff/resultados; no recibe el transcript del Coder.
- Archive/source-material queda fuera de la indexación cotidiana.
- Investigación profunda puede usar una indexación opt-in separada.

### Presupuestos

**DIFERIDO.** No se fijan números canónicos antes de obtener observaciones reales con perfiles estables. Los bindings actuales no deben usarse como baseline métrico.

Mientras tanto:

- límites de pasos pueden actuar como guard preventivo;
- token monitoring es telemetría;
- un exceso observado provoca reducción o escalamiento, no afirmaciones de optimización;
- el tokenizer aproximado no debe sostener gates económicos/semánticos duros.

## 10. Delegación

**PROPUESTO para el MVP manual.**

- Planner puede pedir exploración.
- Architect puede delegar Explorer y, después del gate, Coder/Doc Curator.
- Coder no delega por defecto.
- Reviewer no delega correcciones.
- Profundidad máxima: un nivel salvo autorización expresa.
- Toda delegación hereda paths, ownership, prohibiciones, herramientas permitidas, formato y stop conditions.
- No puede haber escritores concurrentes sobre el mismo ownership key.

## 11. Roles considerados pero no creados

**DIFERIDO.** Mantener como catálogo conceptual, sin perfiles activos:

- Security Reviewer;
- Performance Reviewer;
- Migration Engineer;
- Workflow Observer;
- Model Evaluator/Optimizer;
- FinOps Optimizer;
- Retrieval/MCP roles;
- Temporal/workflow workers;
- provider conformance especializado.

Su alta exige una necesidad real, contrato de entrada/salida, permisos, modelo/pool elegible, gate y evidencia de calidad.

## 12. Secuencia de adopción recomendada

### RG-0 — Fuente de diseño

- Conservar este documento como source material.
- Clasificar hechos, decisiones, propuestas y deuda.
- No indexarlo como autoridad cotidiana.

### RG-1 — Contratos mínimos

- Aprobar catálogo de perfiles manuales necesarios.
- Aprobar fronteras, inputs, outputs, permisos y capacidades.
- Declarar estado manual/runtime de cada perfil.
- Resolver si `coder_strong_a` aporta una función distinta.

### Gate del Developer

No crear perfiles ejecutables hasta aprobar RG-1.

### RG-2 — Adapters mínimos

- Crear únicamente perfiles necesarios.
- Mantener políticas comunes breves y compartidas.
- Configurar permisos efectivos y skills bajo demanda.
- No crear roles futuros.

### RG-3 — Conformance y observación

- Verificar descubrimiento/invocación de cada perfil.
- Verificar read-only y ownership de escritura.
- Verificar skills permitidas/denegadas.
- Verificar profundidad de delegación.
- Verificar el formato de los handoffs.
- Registrar steps/contexto sin convertir las primeras observaciones en ranking.

### Continuación

Con RG-1 suficientemente definido, el Architect puede ejecutar la Fase 1A de auditoría documental. La Fase 1B sigue requiriendo otro gate explícito.

## 13. Decisiones todavía abiertas

1. Modos concretos de los perfiles (`primary`, `subagent` o compatibilidad temporal `all`).
2. Forma machine-readable mínima de la matriz rol-capacidad-permisos, si llega a ser necesaria.
3. Esquema exacto del Evidence Pack manual sin duplicar contratos productivos.
4. Diferencia operativa real entre Coder A y Coder Strong A.
5. Cuándo las observaciones de modelos serán suficientes para abrir una task de evaluación/ranking.
6. Diseño futuro de fallback sin duplicar Model Resolver.
7. Presupuestos de contexto por rol después de obtener telemetría comparable.

Ninguna de estas decisiones bloquea la Fase 1A documental si los agentes se invocan manualmente con permisos controlados y sus resultados se verifican contra archivos reales.
