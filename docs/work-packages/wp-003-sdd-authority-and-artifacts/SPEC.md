---
document_id: TOF-WP-003-SPEC-001
status: candidate
materialization_status: CANDIDATE_DRAFT
owner: tecnotron-ai
type: work-package-spec
version: 1.0
updated: 2026-09-23
machine_context: true
milestone_id: tecnotron-operational-foundation-v1
work_package_id: WP-003
spec_gate: WP-003_SPEC_ACCEPTANCE
acceptance_status: NOT_REQUESTED
implementation_authority: NOT_GRANTED
related:
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[task-lifecycle]]"
  - "[[SOURCE_OF_TRUTH]]"
  - "[[capability-map]]"
---

# SPEC WP-003: SDD Authority and Artifacts

## 1. Estado, autoridad y lenguaje normativo

Esta SPEC candidata define el comportamiento esperado y las fronteras de autoridad
del modelo SDD de WP-003. No afirma aceptación del Developer y no autoriza la
implementación de WP-003, la materialización de su WP PLAN ni TASKs de implementación.
La precedencia aplicable es:

1. decisiones competentes del Developer para este milestone y esta responsabilidad;
2. contratos y ADRs canónicos vigentes para invariantes, schemas e interoperabilidad;
3. esta SPEC, una vez aceptada, para comportamiento esperado de WP-003;
4. el Milestone Plan aceptado para secuencia, scope y ownership;
5. Task Lifecycle para lifecycle lógico vigente;
6. Current State para realidad de implementación confirmada;
7. Source of Truth como índice de navegación, sin autoridad conductual propia.

Los términos **DEBE**, **NO DEBE** y **PUEDE** son normativos. Ejemplos y fixtures
conceptuales no reemplazan los requisitos RF/RNF.

## 2. Problema, objetivo y resultado

WP-003 debe eliminar ambigüedad entre requisitos, planificación, asignación,
estrategia local, evidencia, review y aceptación. Un archivo conveniente, índice,
runtime, provider o conversación no puede crear una autoridad paralela.

El resultado es un modelo donde cada artefacto tiene responsabilidad exclusiva,
relaciones validables y una frontera explícita entre autoridad esperada y evidencia
observada, preservando al Developer como autoridad terminal.

## 3. Non-goals

Esta SPEC no implementa ADRs, WP PLAN, TASKs, task PLANs, templates, schemas
ejecutables ni lint. Tampoco implementa `tecnotron-task-lifecycle/v1`, WP-004,
recipes, declarative TaskCycle runtime, GitHub Projects, reporting, WP-005,
WP-006, rediseños de AGENTS.md/OpenCode/ExecutionSurfacePort, efectos FitFlow o
promoción a `main`.

Puede declarar requisitos que una implementación posterior de WP-003 deba hacer
validables, pero no materializa esa implementación.

## 4. Modelo de autoridad por artefacto

| Artefacto / actor | Responsabilidad autoritativa | Prohibición |
| --- | --- | --- |
| `SPEC` | WHAT, comportamiento esperado y requisitos RF/RNF | No define solución técnica ni autoriza ejecución por sí sola. |
| `WP PLAN` | HOW, solución técnica y descomposición | No cambia silenciosamente comportamiento de la SPEC. |
| `TASK` | Asignación acotada y autorizada de requisitos | No duplica la SPEC ni amplía el WP PLAN. |
| task `PLAN` | Estrategia local para ejecutar una TASK | No amplía la TASK ni redefine requisitos. |
| `RESULT` | Evidencia observada y referencias reproducibles | No reescribe expectativas ni oculta fallos. |
| `REVIEW` | Evaluación independiente de candidato congelado | No implementa, corrige ni muta el candidato. |
| Developer | Aceptación terminal y rulings de excepción | No se infiere de provider o ejecución. |
| Doc_Curator | Escritura documental bajo ownership explícito | No crea autoridad autónoma. |
| Validator | Validación determinista | No realiza aceptación terminal. |
| Reviewer | Review semántica independiente | No implementa ni acepta terminalmente. |
| `SOURCE_OF_TRUTH` | Navegación y precedencia | No es segunda autoridad conductual. |
| Current State | Realidad de implementación confirmada | No convierte planificación en comportamiento aceptado. |
| Roadmap / Milestone PLAN | Macro-secuencia y planificación | No reemplaza SPECs ni contratos. |
| Guide | Explicación derivada | No crea política normativa. |
| Archive / histórico | Provenance y recuperación | No recupera autoridad vigente automáticamente. |

Una herramienta, runtime, modelo, provider, workspace, cache, índice derivado o
conversación puede transportar trabajo, pero no adquiere autoridad por conveniencia.

## 5. Metadata mínima y relaciones validables

Toda materialización posterior DEBE permitir validar como mínimo identidad estable
del artefacto, tipo, owner competente, scope, revisión o versión identificable y
referencias explícitas a la autoridad de la que deriva.

La relación mínima DEBE ser trazable:

```text
accepted SPEC
  -> WP PLAN deriva HOW y referencia RF/RNF
  -> TASK asigna un subconjunto autorizado de RF/RNF
  -> task PLAN deriva solo de esa TASK
  -> RESULT registra evidencia observada para esa TASK/revisión
  -> REVIEW evalúa un candidato inmutable y su validación
  -> Developer decide aceptación o excepción
```

SPEC conserva RF/RNF estables. WP PLAN referencia la SPEC y requisitos cubiertos.
TASK identifica autoridad de asignación y RF/RNF asignados. RESULT y REVIEW
identifican el objeto exacto evaluado y evidencia relevante.
Una referencia puede ser ID estable, path versionado, commit, hash u otra identidad
reproducible adecuada al owner. La forma concreta pertenece a implementación posterior;
la semántica de identidad y trazabilidad pertenece a esta SPEC.

## 6. Requisitos funcionales aceptados

### RF-201 — SPEC obligatoria o excepción justificada

Toda capacidad debe tener una SPEC aprobada antes de adquirir comportamiento normativo,
salvo que una autoridad competente registre explícitamente una excepción justificada.
La excepción NO DEBE inferirse de ausencia de SPEC, conveniencia o material histórico.
Debe indicar scope y rationale; si ninguna autoridad vigente ya la cubre, requiere
ruling del Developer.

Una unidad puramente mecánica que materializa o verifica comportamiento ya aceptado no
se convierte por ello en capacidad independiente y puede operar bajo la SPEC dueña.

### RF-202 — IDs RF/RNF estables

Los requisitos normativos deben usar IDs estables `RF-*` o `RNF-*`. Un ID aceptado no
se renumera por preferencia editorial, no se reutiliza con otra semántica y no se borra
perdiendo provenance. Un requisito superseded o retirado conserva identidad y relación
explícita con su reemplazo o disposición.

### RF-203 — WP PLAN define HOW

Un WP PLAN define solución técnica, orden, descomposición, gates y estrategia. Debe
derivar de la SPEC competente y no puede crear, eliminar ni cambiar comportamiento
esperado. Si descubre que el comportamiento debe cambiar, detiene la derivación afectada
y devuelve ese cambio al ciclo de SPEC.

### RF-204 — TASK asigna requisitos sin duplicar la SPEC

Una TASK autoriza una responsabilidad acotada y asigna RF/RNF mediante referencias
estables. Puede expresar criterios locales de aceptación y restricciones de ejecución
para verificar la asignación, pero no copiar, reinterpretar o modificar la SPEC como
segunda autoridad conductual.

### RF-205 — `scope_fit: split_required` bloquea READY

Cuando una autoridad competente declara `scope_fit: split_required`, la unidad no puede
alcanzar `READY` hasta dividirse competentemente en unidades con autorización, requisitos,
ownership y criterios de aceptación inequívocos. Cambiar solo una etiqueta de provider
no satisface este requisito.

### RF-206 — Cambio de comportamiento primero actualiza la SPEC

Todo cambio de comportamiento esperado debe actualizar y obtener aprobación de la SPEC
competente antes de que WP PLAN, TASK o task PLAN materialicen ese cambio. RESULT o
Current State pueden demostrar divergencia observada, pero no la normalizan como nueva
expectativa.

### RF-207 — No existen autoridades de conveniencia paralelas

`design.md`, `tasks.md`, `apply` o cualquier equivalente no tienen autoridad canónica
por nombre o expectativa de herramienta. Pueden existir como vistas derivadas solo si
referencian autoridad competente y no introducen requisitos, decisiones, permisos o
estados normativos propios.

La misma regla aplica a prompts, chats, dashboards, provider fields, runtime outputs,
AGENTS.md, skills, índices derivados y paquetes de contexto.

## 7. Casos de borde obligatorios

### 7.1 TASK que constituye una capacidad independiente

Si una TASK deja de asignar requisitos existentes y pasa a definir una capacidad reusable,
un contrato nuevo o comportamiento no cubierto por SPEC aceptada, esa porción no puede
avanzar como simple TASK. Debe identificarse como capacidad independiente y satisfacer
RF-201 antes de `READY`, o recibir excepción competente y explícita. La TASK original no
adquiere autoridad de SPEC por contener la idea.

### 7.2 Requisito mecánico que no necesita SPEC propia

Un requisito mecánico no necesita SPEC independiente cuando solo implementa, materializa
o valida comportamiento ya autorizado y conserva trazabilidad hacia la SPEC dueña. Puede
incluir wiring determinista, un archivo derivado o un check estructural siempre que no
introduzca semántica observable nueva, permisos, invariantes, estados válidos,
interoperabilidad o política.

Si existe duda sobre si es mecánico o conductual, falla cerrado: no se crea excepción
implícita y se requiere resolución por autoridad competente.
## 8. Semántica de validación posterior

La implementación futura de WP-003 debe poder validar deterministicamente cuando sea
suficiente:

- metadata mínima requerida por tipo de artefacto;
- estabilidad y unicidad de IDs RF/RNF;
- relaciones permitidas entre SPEC, WP PLAN, TASK, task PLAN, RESULT y REVIEW;
- referencia explícita a autoridades y revisiones competentes;
- patrones prohibidos de autoridad paralela;
- `scope_fit: split_required` incompatible con `READY`;
- candidato inmutable como input de REVIEW;
- preservación de fallos observados en RESULT;
- separación entre validación, review, aceptación, integración, publicación y cierre.

Cuando exista lint, debe fallar cerrado frente a metadata obligatoria ausente, tipo
desconocido, relación no permitida, ID inestable o autoridad ambigua. No debe inventar
defaults autoritativos, reparar silenciosamente conflictos ni promover histórico.

### 8.1 Fixtures positivos mínimos

La implementación futura debe incluir al menos:

1. SPEC aceptada -> WP PLAN trazado -> TASK con subconjunto RF/RNF -> task PLAN contenido
   -> RESULT -> REVIEW sobre candidato exacto;
2. unidad mecánica trazada a una SPEC dueña sin SPEC independiente;
3. excepción RF-201 explícita, competente y limitada a su scope.
### 8.2 Fixtures negativos mínimos

Debe rechazar al menos:

1. WP PLAN o TASK que introduce comportamiento no presente en SPEC;
2. TASK que reproduce SPEC y modifica su significado;
3. `scope_fit: split_required` marcado `READY`;
4. cambio de comportamiento materializado solo en PLAN/TASK;
5. `design.md`, `tasks.md`, `apply` o equivalente como autoridad autónoma;
6. REVIEW que muta candidato o usa identidad distinta de la congelada;
7. RESULT reescrito para convertir fallo observado en PASS;
8. histórico o índice derivado usado como autoridad sin adopción competente;
9. metadata o relación ambigua completada por conveniencia.

## 9. Compatibilidad con Task Lifecycle y WP-004

`docs/task-lifecycle.md` continúa como autoridad lógica vigente. Esta SPEC no reemplaza
sus estados, worktree policy, gates ni responsabilidades y no define
`tecnotron-task-lifecycle/v1`.

Permanecen separadas las dimensiones de TASK contract, materialización, implementación,
validación, review, aceptación del Developer, integración, publicación y cierre. No se
colapsan en un único provider status ni se infieren unas de otras.

WP-004 podrá automatizar o formalizar lifecycle futuro usando estas semánticas, pero esa
implementación y sus transiciones quedan fuera de WP-003 SPEC.
## 10. Ownership, review y aceptación

La semántica de WP-003 pertenece a Developer y Architect dentro de autoridad competente.
Doc_Curator materializa documentación solo bajo ownership explícito y no adquiere
autoridad para decidir comportamiento por escribirla.

Validator aplica checks deterministas y reporta `PASS`, `FAIL`, `NOT_RUN` o `UNAVAILABLE`
según evidencia. No acepta trabajo. Reviewer evalúa semánticamente un candidato congelado
y evidencia versionada, permanece read-only y no corrige el candidato. Developer conserva
aceptación terminal y rulings de excepción.

Review `PASS` no equivale a aceptación del Developer. Aceptación del Developer no equivale
por sí sola a integración, publicación, cierre ni autorización de implementación.

## 11. Cambio, supersession y material histórico

Una SPEC aceptada solo cambia mediante un ciclo competente que preserve identidad y
provenance. Cuando una revisión supersede semántica anterior, la relación debe ser
explícita; no se reescribe historia para aparentar que el estado previo nunca existió.

Material histórico puede informar recuperación o provenance. Solo vuelve a gobernar cuando
una autoridad actual competente lo adopta explícitamente. Capability Map y SOURCE_OF_TRUTH
pueden señalar esa disposición, pero no realizar la adopción por sí mismos.

## 12. Criterios de aceptación de esta SPEC

El candidato es suficiente para review solo si puede demostrarse:
- RF-201 a RF-207 presentes con identidad y significado preservados;
- los dos casos de borde obligatorios resueltos explícitamente;
- fronteras SPEC / WP PLAN / TASK / task PLAN / RESULT / REVIEW inequívocas;
- Developer como autoridad terminal y Doc_Curator sin autoridad autónoma;
- Validator determinista y Reviewer independiente sin aceptación ni implementación;
- metadata y relaciones suficientes para una implementación posterior validable;
- fixtures positivos/negativos y lint fail-closed definidos como obligaciones futuras;
- compatibilidad con Task Lifecycle vigente sin absorber WP-004;
- separación current/historical y ausencia de autoridad paralela;
- ningún efecto FitFlow, source-code, template, lint, WP-004 o `main`.
No se declara `PASS` para checks no ejecutados o no disponibles.

## 13. Handoff a implementación posterior

Después de aceptación explícita del Developer, el WP PLAN de WP-003 podrá decidir HOW
materializar ADRs, policy, templates, schemas, fixtures y lint necesarios para cumplir
esta SPEC. Esa planificación debe derivar de RF-201–RF-207 y de estas fronteras sin
convertir este documento en un plan técnico.

Cualquier necesidad de cambiar un contrato o ADR canónico existente, ampliar el scope a
WP-004/WP-005/WP-006, o introducir una autoridad nueva requiere una responsabilidad y
ruling competentes separados.
