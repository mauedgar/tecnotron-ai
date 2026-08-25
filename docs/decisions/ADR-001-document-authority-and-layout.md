---
document_id: FFAI-ADR-001
status: canonical
machine_context: true
version: 1.2
updated: 2026-08-25
accepted_by: Developer
accepted_at: 2026-08-25
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[implementation-roadmap]]"
  - "[[current-state]]"
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
---

# ADR-001: Document Authority, Precedence, and Target Layout

## Contexto

FitFlow-ai ha acumulado documentación en múltiples capas (arquitectura, tareas, roadmap, investigación, guías, archivo) sin una regla de precedencia explícita ni un layout objetivo declarado. Esto genera ambigüedad cuando los documentos discrepan y dificulta la navegación determinista.

## Decisión

### 1. Precedencia de autoridad (orden estricto, mayor a menor)

1. **Contratos y schemas ejecutables** (Zod, JSON Schema en `src/contracts/`, `src/registries/schemas/`) — son la única fuente vinculante para validación en tiempo de ejecución y compile-time.
2. **ADRs y políticas canónicas** (`docs/decisions/ADR-*.md`, `docs/task-lifecycle.md`, `docs/context-strategy.md`, `docs/operational-architecture.md`) — gobiernan decisiones arquitectónicas, lifecycle, estrategia de contexto y límites operativos.
3. **SOURCE_OF_TRUTH e índices** (`docs/SOURCE_OF_TRUTH.md`) — índice de navegación determinista y regla de contradicción; no introduce policy propia.
4. **TASK/RESULT/REVIEW aceptados** (`docs/tasks/FF-AI-*/TASK.md`, `RESULT.md`, `REVIEW.md` con `status: canonical`) — evidencia y scope vinculante por tarea aceptada.
5. **Guías** (derivadas, p.ej. `docs/guides/system-guide.md` futura) — explicativas, no introducen policy; si una guía contradice una capa superior, gana la capa superior.
6. **Investigación** (`docs/research/`) — material de apoyo, no normativo.
7. **Archivo y source-material** (`docs/archive/source-material/`, `docs/archive/`) — histórico; puede curarse/moverse bajo TASK documental explícita; sigue no canónico y excluido por defecto.

**Regla de contradicción:** Cuando dos documentos discrepen, gana el de mayor precedencia en esta lista. `SOURCE_OF_TRUTH.md` es el árbitro de navegación, no una capa de policy adicional.

### 2. Guías no introducen policy

Cualquier documento clasificado como *guía* (ubicado en `docs/guides/`) es meramente explicativo. No puede crear, modificar ni anular:
- Estados de lifecycle
- Criterios de aceptación
- Reglas de precedencia
- Contratos ejecutables
- Decisiones ADR

### 3. Layout objetivo (target layout)

La estructura objetivo de `docs/` es:

```
docs/
├── decisions/                              # ADRs canónicos
│   └── ADR-001-document-authority-and-layout.md
├── milestones/                             # Milestone Plans canónicos
│   └── document-governance-v1/
│       └── PLAN.md
├── work-packages/                          # Work Package Plans canónicos
│   ├── authority-reconciliation/
│   │   └── PLAN.md
│   ├── document-topology/
│   │   └── PLAN.md
│   ├── planning-hierarchy/
│   │   └── PLAN.md
│   ├── system-guide/
│   │   └── PLAN.md
│   ├── research-archive/
│   │   └── PLAN.md
│   └── document-conformance/
│       └── PLAN.md
├── tasks/                                  # Task artifacts (TASK, PLAN, RESULT, REVIEW)
│   ├── FF-AI-DOC-001/
│   │   ├── TASK.md
│   │   └── PLAN.md
│   ├── FF-AI-VNEXT-008/
│   ├── FF-AI-VNEXT-009/
│   └── ...
├── guides/                                 # Guías canónicas
│   └── system-guide.md
├── research/                               # Investigación activa (no canónica)
│   └── semantic-retrieval.md               # (movido desde indexing-pipeline.md)
├── archive/                                # Histórico; puede curarse por TASK explícita
│   ├── source-material/
│   └── ...
├── SOURCE_OF_TRUTH.md                      # Índice de precedencia y navegación
├── current-state.md                        # Realidad de implementación confirmada
├── implementation-roadmap.md               # Secuenciación de trabajo planificado
├── compatibility-baseline.md               # Baseline de compatibilidad observada
└── architecture/
    ├── system-architecture.md              # (movido desde architecture.md)
    ├── operational-architecture.md         # (movido desde operational-architecture.md)
    ├── context-strategy.md                 # (movido desde context-strategy.md)
    ├── task-lifecycle.md                   # (movido desde task-lifecycle.md)
    └── development-pipeline-adapter.md     # (movido desde development-pipeline-adapter.md)
```

**Los seis movimientos aprobados para alcanzar el layout objetivo** (registrados aquí, **no se ejecutan en esta task**; corresponden a `FF-AI-DOC-002` Wave 2):

1. `docs/architecture.md` → `docs/architecture/system-architecture.md`
2. `docs/operational-architecture.md` → `docs/architecture/operational-architecture.md`
3. `docs/context-strategy.md` → `docs/architecture/context-strategy.md`
4. `docs/task-lifecycle.md` → `docs/architecture/task-lifecycle.md`
5. `docs/development-pipeline-adapter.md` → `docs/architecture/development-pipeline-adapter.md`
6. `docs/indexing-pipeline.md` → `docs/research/semantic-retrieval.md`

La guía futura se crea en `docs/guides/system-guide.md` (WP4).

### 4. Jerarquía de planificación: Roadmap → Milestone → WP → Task

- **Roadmap** (`implementation-roadmap.md`): Secuenciación macro de trabajo planificado.
- **Milestone** (`docs/milestones/*/PLAN.md`): Agrupa WPs con baseline, target de integración, target de promoción, y gate de Developer.
- **Work Package** (`docs/work-packages/*/PLAN.md`): Unidad de ejecución con resultado acotado, frontera, owner, dependencias, riesgos, paralelismo, task asociada, y gate de Developer.
- **Task** (`docs/tasks/*/TASK.md`): Ejecución concreta con ownership keys, ACs, y delegación de roles.

### 5. Dimensiones de estado independientes (por Task)

Cada Task canónica lleva **cinco dimensiones independientes** (no un solo enum):

| Dimensión | Valores permitidos | Notas |
|---|---|---|
| `validation` | `PASS` \| `FAIL` \| `UNAVAILABLE` \| `NOT_RUN` | Evidencia determinista; `UNAVAILABLE` ≠ `PASS` |
| `review_verdict` | `ACCEPT` \| `ACCEPT_WITH_NON_BLOCKING_FINDINGS` \| `CHANGES_REQUIRED` \| *(ausente/no emitido antes de review)* | No inventar `PENDING`; antes del review puede no existir |
| `developer_acceptance` | `PENDING` \| `ACCEPTED` \| `REJECTED` | Autoridad terminal; no se infiere |
| `integration` | `NOT_INTEGRATED` \| `INTEGRATED` (siempre con `target` y `sha` cuando `INTEGRATED`) | Gestionado por Task Lifecycle |
| `lifecycle_status` | `DISCOVERED` \| `READY` \| `STARTED` \| `WORKING` \| `VALIDATED` \| `PENDING_ACCEPTANCE` \| `ACCEPTED` \| `INTEGRATING` \| `DOC_SYNC` \| `DONE` \| `CLEANUP` | Secuencia canónica (ver `task-lifecycle.md`) |

**Reglas clave:**
- `review_verdict` puede estar **ausente** antes de que se emita el review; no se inventa un valor `PENDING`.
- `developer_acceptance` **no se infiere** de `validation PASS` ni de `review_verdict ACCEPT`.
- `merge` (git) **no prueba** aceptación; `reviewer ACCEPT` **no hace** `DONE`; `aceptación sin integración` **no hace** `DONE`.
- `DONE` solo tras: `validation PASS` + `review_verdict != CHANGES_REQUIRED` + `developer_acceptance ACCEPTED` + `integration INTEGRATED` + `DOC_SYNC` completado.

### 6. `opencode.json` — Historical origin y ownership

- **Historical origin:** `UNKNOWN/PRE-EXISTING` — el archivo existía en el worktree antes de la instrumentación de task lifecycle; no es atribuible a una task específica ni a un agente.
- **Owner del repo:** `Tecnotron-ai` (repo `opencode` configuration).
- **Domain:** Agent tooling configuration (CLI settings, schema reference).
- **Authority:** **No arquitectura**, **no source of truth** para FitFlow-ai, **no scope automático** para tasks de FitFlow.
- **Política:** Cualquier cambio en `opencode.json` requiere autorización explícita del Developer en la task correspondiente; no se incluye por defecto en scope de tasks de FitFlow.

### 7. `.opencode/package*.json` — `ambient_dirty` policy

- **Definición:** Cambios ambientales pre-existentes en el worktree que no son causados por la task actual, no deben ser leídos como causa, no deben editarse, no deben restaurarse, y **no se incluyen en scope/evidencia** de la task.
- **No se commitean automáticamente** por el Task Cycle; requieren decisión explícita del Developer si deben integrarse.
- **Clasificación de dirty (ruling):**
  - `task_dirty`: Cambios deliberados dentro del scope de la task actual.
  - `ambient_dirty`: Cambios automáticos de OpenCode/Orca/tooling; conocidos durante MVP: `.opencode/package.json`, `.opencode/package-lock.json`.
  - `unexpected_dirty`: Cambios desconocidos en producto/contratos/otro owner; investigar, no commitear.

### 8. Cross-repo boundary y source-material

- **Cross-repo boundary:** FitFlow-ai no asume ubicación física de otros repositorios (AI Core, FitFlow product, Tecnotron). La resolución portable de roots pertenece al Project Profile (`FF_PROJECT_*`). No hay paths hardcodeados cross-repo en contratos ni código canónico.
- **Source-material:** `docs/archive/source-material/` contiene material de diseño previo. Puede curarse/moverse bajo TASK documental explícita; sigue **no canónico** y **excluido por defecto**. No se indexa como source of truth.

### 9. Gobierno de roles, contexto, capacidades, skills y modelos

Este ADR materializa y promueve normativamente el **Developer ruling** aprobado explícitamente desde `docs/archive/source-material/roles-and-context-governance-source-material.md`. El source material permanece **no canónico** (precedencia 7, excluido por defecto); este ADR es la promoción normativa vinculante de dicho ruling.

Este ADR establece separaciones normativas que rigen cualquier trabajo futuro sobre agentes/perfiles:

**9.1 Separaciones explícitas**

| Concepto | Definición | Autoridad |
|---|---|---|
| **role contract** | Identidad estable de responsabilidad: inputs, outputs, límites y autoridad. | Contrato vinculante; no depende de LLM ni perfil. |
| **manual OpenCode profile** | Adapter/perfil invocado manualmente; no implica runtime selectable. | Configuración de herramienta; fuera de scope productivo. |
| **runtime-selectable role** | Rol registrado y seleccionable por componentes productivos. | Requiere integración/conformance explícita y gate Developer. |
| **model binding** | Asignación reemplazable de modelo a rol. | No confiere identidad ni autoridad del rol. |
| **skill/tool binding** | Implementación reemplazable de capacidades. | Binding concreto; no define el contrato del rol. |
| **task-specific permissions** | Allowlist/ownership/paths del TASK/PLAN. | Más estrecha que capacidades generales del rol. |

**9.2 Contexto**

- **Minimum sufficient/verifiable**: El contexto se gobierna por `Context Strategy` y el TASK; no repo dump.
- **Source fallback**: Si falta evidencia, se declara y se escala; no se inventa.
- **Modelos/skills no deciden autoridad**: La autoridad deriva del role contract y del Developer gate.

**9.3 Capacidades y bindings**

- Las **capacidades** son contratos estables (inputs, outputs, precondiciones, postcondiciones).
- Los **bindings** concretos (modelo, skill, tool, adapter) son reemplazables sin cambiar el contrato.

**9.4 Asignaciones actuales de LLM**

- Son **observaciones**, **NO** benchmark, ranking ni policy.
- No fallback automático por rol: `unavailable` → `UNAVAILABLE` → Developer override manual registrado.
- No cambios de registries, ranking ni perfiles ejecutables en esta fase.

**9.5 Catálogo inicial para futuro WP (solo referencia)**

| Rol | Estado |
|---|---|
| `planner_ai` | Propuesto |
| `architect` | Propuesto |
| `explorer` | Propuesto |
| `coder_a` | Propuesto |
| `coder_b` | Propuesto |
| `reviewer` | Propuesto |
| `doc_curator` | Propuesto |
| `coder_strong_a` | **DEFERRED** (post-MVP) |
| Otros post-MVP | **DEFERRED** |

**9.6 Future Work Package `Agent Profiles MVP`**

- Se crea **solo DESPUÉS** de que los artefactos de fundación de `FF-AI-DOC-001` (ADR-001, Milestone, 6 WP Plans, TASK/PLAN DOC001, SoT actualizado, task-lifecycle actualizado, cierre 009) sean **Developer-accepted y integrados en `tooling`**.
- Los 6 WP Plans son artefactos creados por DOC001; la **ejecución/completación/integración de WP2–WP6 NO es prerrequisito** para habilitar este WP futuro. Evitar implicar que el milestone completo deba cerrarse.
- **Tasks propuestas futuras** (requieren nuevo TASK/gate; no se crean ahora):
  - `FF-AI-AGENT-001`: Contratos y matriz de perfiles.
  - `FF-AI-AGENT-002`: Perfiles mínimos y conformance.
- La task 002 **no tiene autorización presente** para modificar OpenCode.

## Consecuencias

- Todas las tasks de documentación (`FF-AI-DOC-*`) deben referenciar este ADR para precedencia y layout.
- `SOURCE_OF_TRUTH.md` se actualiza para indexar este ADR, el Milestone, los 6 WPs, y la Task `FF-AI-DOC-001`, y para registrar la regla de precedencia exacta.
- `task-lifecycle.md` se actualiza para materializar las 5 dimensiones de estado, la secuencia canónica, y la clasificación `ambient_dirty` del ruling.
- No se ejecutan movimientos de archivos en esta task; la ejecución corresponde a `FF-AI-DOC-002` (WP2) y waves posteriores.
- `opencode.json` permanece como `UNKNOWN/PRE-EXISTING`; cualquier futura modificación requiere gate de Developer explícito.
- `.opencode/package*.json` permanecen `ambient_dirty`; no se tocan en esta task.

## Alternativas consideradas

- **Precedencia por fecha:** Rechazada — la fecha no refleja autoridad semántica.
- **Precedencia por carpeta:** Rechazada — la ubicación física no determina autoridad.
- **Enum único de estado:** Rechazada — colapsa dimensiones ortogonales (validación, review, aceptación, integración) y oculta gates.
- **Ejecutar movimientos ahora:** Rechazada — los movimientos requieren ownership explícito y gate de Developer por wave; esta task solo funda la autoridad.

## Referencias

- `docs/SOURCE_OF_TRUTH.md` (índice actualizado tras este ADR)
- `docs/task-lifecycle.md` (dimensiones y lifecycle actualizados tras este ADR)
- `docs/milestones/document-governance-v1/PLAN.md` (milestone que agrupa los 6 WPs)
- `docs/work-packages/*/PLAN.md` (6 WP Plans)
- `docs/tasks/FF-AI-DOC-001/TASK.md` (task de fundación + Wave 1)
- `docs/archive/source-material/roles-and-context-governance-source-material.md` (source material con ruling Developer aprobado; no canónico)
