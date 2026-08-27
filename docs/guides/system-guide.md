---
document_id: FFAI-GUIDE-SYSTEM
status: canonical
machine_context: false
version: 1.0
updated: 2026-08-26
owner: fitflow-ai
type: guide
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[decisions/ADR-001-document-authority-and-layout]]"
  - "[[architecture/system-architecture]]"
  - "[[architecture/operational-architecture]]"
  - "[[architecture/task-lifecycle]]"
  - "[[guides/orca-task-cycle]]"
  - "[[architecture/agent-role-contracts]]"
---

# System Guide — FitFlow-ai

Esta guía es la puerta de entrada explicativa ("front door") para desarrolladores
y agentes que operan en FitFlow-ai. Su objetivo es ayudarte a **navegar** y
**operar** el sistema, no a definir reglas.

> **Regla de oro (ADR-001 §2):** toda guía es meramente explicativa. No crea,
> modifica ni anula estados de lifecycle, criterios de aceptación, reglas de
> precedencia, contratos ejecutables ni decisiones ADR. Si esta guía contradice
> una capa superior (contratos, ADRs, SOURCE_OF_TRUTH, TASK/RESULT/REVIEW
> aceptados), gana la capa superior.

Si llegas aquí por una tarea concreta, empieza en **Quick Start**; si quieres
entender la arquitectura, ve a **Architecture Overview**; si buscas un documento
específico, usa **Documentation Map**.

---

## 1. Quick Start (5 minutos)

**¿Qué es FitFlow-ai?** Es el repositorio que contiene la arquitectura genérica
del AI Core, el tooling, la estrategia de contexto y los contratos operativos.
Opera *sobre* FitFlow (el producto) sin crear una dependencia de producto
inversa. Ambos son repositorios Git independientes.

**La única regla que necesitas recordar al principio:** cuando dos documentos
discrepan, gana el de mayor precedencia. La lista exacta vive en
[SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) y en
[ADR-001 §1](decisions/ADR-001-document-authority-and-layout.md); esta guía solo
la resume.

**Mapa rápido "quiero hacer X → lee Y":**

| Quiero... | Empieza en |
|---|---|
| Saber qué documento manda si hay conflicto | `docs/SOURCE_OF_TRUTH.md` |
| Entender la arquitectura estable del AI Core | `docs/architecture/system-architecture.md` |
| Entender responsabilidades operativas y límites | `docs/architecture/operational-architecture.md` |
| Saber cómo avanza y se acepta una tarea | `docs/architecture/task-lifecycle.md` |
| Ejecutar una tarea con el adapter Orca (worktrees, runs) | `docs/guides/orca-task-cycle.md` |
| Conocer capacidades y límites de los roles de agente | `docs/architecture/agent-role-contracts.md` |
| Ver el estado real de implementación | `docs/current-state.md` |
| Ver la secuencia de trabajo planificado | `docs/implementation-roadmap.md` |

**Cómo fluye una tarea (vista de avión):** una tarea se define en
`docs/tasks/*/TASK.md` (con `PLAN.md`), se implementa dentro de un worktree
acotado a sus *ownership keys*, se valida de forma determinista, pasa por una
revisión independiente, y solo el **Developer** la acepta y autoriza la
integración. El detalle vive en `task-lifecycle.md` y la operación con Orca en
`orca-task-cycle.md`.

**Cómo encontrar cualquier documento:** el índice determinista es
`docs/SOURCE_OF_TRUTH.md`. Cada documento canónico lleva `related:` (links
explícitos tipo `[[...]]`) y frontmatter portable; Obsidian es solo una proyección
para el Developer, no la fuente.

---

## 2. Architecture Overview

Esta sección explica los **invariantes** del sistema. No son sugerencias: son
afirmaciones estables del AI Core que ninguna guía, herramienta ni proveedor
cambian por sí solos. La fuente es
[system-architecture.md](architecture/system-architecture.md).

**Invariantes clave:**

- FitFlow y FitFlow-ai son repositorios independientes; FitFlow-ai opera sobre
  FitFlow sin dependencia de producto inversa.
- Los contratos portables de proyecto, repositorio y root preceden a cualquier
  integración específica de herramienta.
- El Git worktree es el límite de aislamiento para tareas de escritura; los
  worktrees de task son normalmente efímeros.
- Orca es el control plane actual de workspace y sesión, y es **reemplazable**.
- OpenCode es el Agent Runtime preferido actual, y es **intercambiable**.
- Los providers de modelo solo aportan inferencia.
- Las implementaciones de tooling no definen arquitectura ni source of truth.
- `Developer` conserva la autoridad terminal; `Coder` es la familia lógica de
  implementación y no administra el Task Lifecycle.

**Límite AI Core ↔ FitFlow** (detalle en
[operational-architecture.md §13](architecture/operational-architecture.md)):

- FitFlow conserva el producto, su Project Profile, TASK, runs, ADR y
  configuración específica.
- FitFlow-ai conserva la arquitectura del AI Core, tooling, políticas de
  contexto, adapters y contratos operativos.
- FitFlow-ai *puede* operar sobre FitFlow; FitFlow *no* debe ganar una
  dependencia de producto sobre FitFlow-ai solo para simplificar tooling.

**Dónde vive la arquitectura:** `docs/architecture/` agrupa los documentos
canónicos (system, operational, task-lifecycle, context-strategy,
development-pipeline-adapter, orca-adapter-contract, agent-role-contracts,
agent-profile-matrix, agent-profile-conformance). Esta guía no los reemplaza; los
enlaza.

---

## 3. Documentation Map

**Precedencia de autoridad (resumen navegable de ADR-001 §1 / SOURCE_OF_TRUTH):**
cuando dos documentos discrepan, el de mayor precedencia gana. El árbitro de
navegación es `SOURCE_OF_TRUTH.md`, no una capa de policy adicional.

1. **Contratos y schemas ejecutables** (`src/contracts/`, `src/registries/schemas/`)
   — única fuente vinculante para validación runtime y compile-time.
2. **ADRs y políticas canónicas** (`docs/decisions/ADR-*.md`,
   `docs/architecture/task-lifecycle.md`, `context-strategy.md`,
   `operational-architecture.md`) — gobiernan decisiones arquitectónicas,
   lifecycle, contexto y límites operativos.
3. **SOURCE_OF_TRUTH e índices** (`docs/SOURCE_OF_TRUTH.md`) — índice de
   navegación determinista y regla de contradicción; no introduce policy propia.
4. **TASK/RESULT/REVIEW aceptados** (`docs/tasks/FF-AI-*/...` con `status: canonical`)
   — evidencia y scope vinculante por tarea aceptada.
5. **Guías** (derivadas, p.ej. esta) — explicativas, no introducen policy.
6. **Investigación** (`docs/research/`) — material de apoyo, no normativo.
7. **Archivo y source-material** (`docs/archive/...`) — histórico, no canónico,
   excluido por defecto.

**Cómo encontrar un documento:**

- Empieza siempre por el índice `docs/SOURCE_OF_TRUTH.md` (tabla de documentos
  canónicos + referencia no canónica).
- Sigue los `related:` de cada documento (links `[[...]]` explícitos).
- Usa el frontmatter portable (`document_id`, `status`, `type`, `updated`) para
  filtrar y verificar canonicidad.
- No asumas que un documento es canónico por su carpeta: la ubicación física no
  determina autoridad (ADR-001 §2 alternativas rechazadas).

**Tipos de documento y dónde viven:**

| Tipo | Raíz | Nota |
|---|---|---|
| ADRs (decisiones) | `docs/decisions/` | Política canónica |
| Milestone Plans | `docs/milestones/*/PLAN.md` | Agrupa WPs |
| Work Package Plans | `docs/work-packages/*/PLAN.md` | Unidad de ejecución |
| Task artifacts | `docs/tasks/*/TASK.md`, `PLAN.md`, `RESULT.md`, `REVIEW.md` | Ownership keys por task |
| Guías | `docs/guides/` | Explicativas (esta guía) |
| Investigación | `docs/research/` | No normativo |
| Archivo / source-material | `docs/archive/` | Histórico, no canónico |

El layout objetivo completo está documentado en
[ADR-001 §3](decisions/ADR-001-document-authority-and-layout.md).

---

## 4. Task Lifecycle Cheatsheet

El lifecycle de una tarea es una máquina de estados **lógica** definida en
[architecture/task-lifecycle.md](architecture/task-lifecycle.md). Esta sección es
un resumen para operar; la fuente normativa es ese documento (y ADR-001 §5).

### 4.1 Las cinco dimensiones de estado (independientes)

Cada Task canónica lleva cinco dimensiones ortogonales, no un solo enum:

| Dimensión | Valores | Nota breve |
|---|---|---|
| `validation` | `PASS` \| `FAIL` \| `UNAVAILABLE` \| `NOT_RUN` | Evidencia determinista; `UNAVAILABLE` ≠ `PASS` |
| `review_verdict` | `ACCEPT` \| `ACCEPT_WITH_NON_BLOCKING_FINDINGS` \| `CHANGES_REQUIRED` \| *(ausente antes de review)* | No se inventa `PENDING` |
| `developer_acceptance` | `PENDING` \| `ACCEPTED` \| `REJECTED` | Autoridad terminal del Developer; no se infiere |
| `integration` | `NOT_INTEGRATED` \| `INTEGRATED` (con `target` y `sha`) | Gestionado por Task Lifecycle |
| `lifecycle_status` | `DISCOVERED` \| `READY` \| `STARTED` \| `WORKING` \| `VALIDATED` \| `PENDING_ACCEPTANCE` \| `ACCEPTED` \| `INTEGRATING` \| `DOC_SYNC` \| `DONE` \| `CLEANUP` | Secuencia canónica abajo |

### 4.2 Secuencia canónica de `lifecycle_status`

```text
DISCOVERED → READY → STARTED → WORKING → VALIDATED → PENDING_ACCEPTANCE
   → (Developer gate: ACCEPTED) → INTEGRATING → DOC_SYNC → DONE → CLEANUP
```

Una implementación concreta puede usar nombres de estado propios del proveedor,
pero debe preservar el significado semántico de estas transiciones.

### 4.3 El gate `DONE`

`DONE` solo se alcanza cuando las cinco dimensiones están alineadas:
`validation PASS` + `review_verdict != CHANGES_REQUIRED` + `developer_acceptance
ACCEPTED` + `integration INTEGRATED` + `DOC_SYNC` completado. Tres observaciones
prácticas que repite `task-lifecycle.md`:

- un `merge` de git no prueba aceptación;
- un `reviewer ACCEPT` no hace `DONE`;
- una aceptación sin integración no hace `DONE`.

### 4.4 La tríada: state machine, procedimiento operativo y perfiles

Esta guía aclara la separación entre tres artefactos que a menudo se confunden:

- **Máquina de estados — `architecture/task-lifecycle.md`:** define la lógica
  pura (estados, 5 dimensiones, gates, worktree policy, dirty-state). No ejecuta
  nada; es la especificación del lifecycle.
- **Procedimiento operativo — `guides/orca-task-cycle.md`:** explica cómo se
  ejecuta una tarea *con el adapter Orca actual* (preflight, worktree, run/DAG,
  workers, terminal visible, release, validación y Developer gate, Git
  post-aceptación, cleanup). Una "Orca Task" representa una fase supervisada, no
  todo el lifecycle canónico. Esta guía reconoce explícitamente a
  `orca-task-cycle.md` como la guía operativa especializada; se complementan, no
  se reemplazan.
- **Perfiles de agente — `.opencode/agents/`:** describen capacidades y límites
  por rol, y reciben contexto acotado. No administran el lifecycle: el rol
  `coder_*` implementa dentro de sus ownership keys; el `reviewer` revisa de forma
  independiente (sin escrituras); el `Developer` retiene la aceptación terminal.
  El catálogo y los contratos de rol viven en
  `architecture/agent-role-contracts.md`.

### 4.5 Clasificación de dirty state

Tres categorías mutuamente excluyentes para cambios en el worktree (detalle en
task-lifecycle.md §17):

| Categoría | Definición | Trato |
|---|---|---|
| `task_dirty` | Cambios deliberados dentro del scope de la task actual | Se commitean tras acceptance gate + validación |
| `ambient_dirty` | Cambios fuera del scope o sin correlación con la task | No restaurar ni descartar silenciosamente; clasificar y pedir decisión al Developer antes de integrar |
| `unexpected_dirty` | Cambios desconocidos en producto/contratos/otro owner | Investigar; no commitear hasta resolver |

---

## 5. Contracts Reference

Los **contratos y schemas ejecutables** son la capa de mayor precedencia
(SOURCE_OF_TRUTH §1, ADR-001 §1). Son la única fuente vinculante para validación
en runtime y compile-time. Esta guía solo los señala; no los redefine.

**Superficie de contratos en `src/contracts/`:** esquemas ejecutables (Zod / JSON
Schema) que validan identidad de runtime, routing, estado de runs, resolución de
modelos, empaquetado de contexto y contratos de tarea. Los archivos allí presentes
(`route.js`, `task.js`, `run-state.js`, `run-event.js`, `model-resolution.js`,
`context-packager.js`, `runtime-identity.js`, `validation.js`,
`validate-package.js`, `common.js`, `index.js`) forman esa superficie
ejecutable; el detalle y la validez los da el código fuente, no esta guía.

**Registries en `src/registries/schemas/`:**

- `roles.js` — **role registry v3**: contiene los role IDs actuales y la política
  de routing determinista fija. La v2 no está soportada.
- `models.js` — **model registry v3**: eligibilidad de modelo explícita y metadatos
  de selección determinista. La v2 no está soportada.
- `project-profile.js` — perfil de proyecto (resolución portable de roots, ver
  Cross-repo Boundaries).
- `orchestrator.js` — esquemas del orquestador.
- `finops.js` — esquemas de finops.

El significado *semántico* de los roles (inputs, outputs, límites, autoridad) se
documenta en `architecture/agent-role-contracts.md`; los registries son la fuente
ejecutable de los IDs y la selección. ADR-001 §9.government separa explícitamente
role contract, manual profile, runtime-selectable role, model binding, skill/tool
binding y task-specific permissions: los *bindings* concretos (modelo, skill,
tool, adapter) son reemplazables sin cambiar el contrato del rol.

---

## 6. Tooling & Providers

El principio rector es *replaceable ownership* (operational-architecture.md §2/§3):
cada capacidad operativa tiene un owner explícito, un límite de
entrada/salida claro, una implementación reemplazable y sin ownership oculto sobre
otra capa. **La herramienta implementa la capacidad, pero no se vuelve arquitectura
ni source of truth.**

| Capacidad | Implementación actual | Naturaleza |
|---|---|---|
| Control plane de workspace/sesión | **Orca** | Reemplazable; no es architectural SoT |
| Agent Runtime | **OpenCode** | Intercambiable; no posee workspace/Git/lifecycle/SoT |
| Inferencia de modelo | Providers (local/cloud) | Solo inferencia; cambiar provider no cambia repos, topología, lifecycle ni docs |
| Planning / integración | **GitHub** (Issues, Projects, PR, Actions) | Proveedor reemplazable; no es arquitectura de producto |
| Navegación para Developer | **Obsidian** | Proyección sobre Markdown; no SoT ni dependencia runtime |
| Empaquetado / índices derivados | Repomix, SQLite, OpenSpec, code-intelligence | Implementaciones reemplazables, no arquitectura |

El modelo operativo en capas
(`Developer → Planning/Task → Task Lifecycle → Workspace → Agent Runtime →
Context → Model Provider → Validation/Integration`) es lógicamente independiente;
las implementaciones cooperan pero no colapsan en un solo runtime. Cambiar una
herramienta no reabre la arquitectura operativa salvo que exista un gap de
capacidad reproducible, un fallo medible del diseño actual, o una reducción clara
de complejidad (operational-architecture.md §16).

---

## 7. Cross-repo Boundaries

FitFlow-ai no asume la ubicación física de otros repositorios (AI Core, FitFlow
product, Tecnotron). La resolución portable de roots pertenece al Project Profile
(`FF_PROJECT_*`). No hay paths hardcodeados cross-repo en contratos ni código
canónico (ADR-001 §8, task-lifecycle.md §18).

- Para resolver el root de FitFlow usa el contexto Orca o el Project Profile; no
  asumas que un path relativo entre worktrees representa al checkout activo.
- El Task Start Contract y el Work Contract reciben `repository` / `base_ref` /
  `worktree_root` ya resueltos; el Task Lifecycle no hardcodea rutas específicas
  de estación de trabajo.
- `docs/archive/source-material/` contiene material de diseño previo: es
  **no canónico** (precedencia 7) y está **excluido por defecto**. Puede
  curarse/moverse bajo una TASK documental explícita, pero no se indexa como
  source of truth.

---

## 8. Common Pitfalls

Errores frecuentes y cómo evitarlos, todos derivados de los documentos canónicos
citados arriba:

- **`ambient_dirty` silencioso:** no restaures ni descartes cambios generados
  fuera del scope de tu task. Clasifícalos y pide decisión al Developer antes de
  integrar (task-lifecycle.md §17).
- **Promover a `DONE` sin gates:** `merge` no prueba aceptación, `reviewer ACCEPT`
  no hace `DONE`, y aceptación sin integración no hace `DONE`. `DONE` exige las
  cinco dimensiones alineadas + aceptación explícita del Developer.
- **Confundir guía con policy:** una guía no añade estados de lifecycle, criterios
  de aceptación, reglas de precedencia, contratos ni decisiones ADR. Evita
  términos normativos impositivos; si citas una fuente superior, hazlo textualmente
  (ADR-001 §2).
- **Hardcodear paths cross-repo:** resuelve roots vía Project Profile
  (`FF_PROJECT_*`); ningún contrato ni código canónico lleva rutas cruzadas fijas.
- **Asumir que un path entre worktrees es el checkout activo:** resuélvelo desde
  Orca o el Project Profile.
- **Tratar una "Orca Task" como todo el lifecycle:** es una fase supervisada (DAG
  corto, ownership disjunto); el lifecycle canónico es `task-lifecycle.md`.
- **Dejar que una limitación de herramienta mueva un límite arquitectónico:**
  resuélvela dentro del adapter/lifecycle que la posee, no cambiando fronteras
  arquitectónicas (operational-architecture.md §7).
- **Inventar `review_verdict: PENDING`:** antes del review esa dimensión puede no
  existir; no se inventa un valor (ADR-001 §5, task-lifecycle.md §4).
- **Inferir `developer_acceptance`:** no se deduce de `validation PASS` ni de
  `review_verdict ACCEPT`; solo el Developer lo decide.
- **Creer que el runtime del rol vive en el contrato de rol:** la ejecutabilidad
  actual pertenece al registry/config en FitFlow; el contrato de rol no la confiere
  (agent-role-contracts.md §Unknown / Executable Authority).

---

### Navegación posterior sugerida

- Arquitectura estable: `docs/architecture/system-architecture.md`
- Responsabilidades operativas: `docs/architecture/operational-architecture.md`
- Lifecycle lógico: `docs/architecture/task-lifecycle.md`
- Ejecución con Orca: `docs/guides/orca-task-cycle.md`
- Contratos de rol: `docs/architecture/agent-role-contracts.md`
- Índice maestro: `docs/SOURCE_OF_TRUTH.md`
