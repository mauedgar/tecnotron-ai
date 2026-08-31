---
status: canonical
owner: tecnotron-ai
type: workflow
updated: 2026-08-30
version: 3.1
related:
  - "[[operational-architecture]]"
  - "[[context-strategy]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Task Lifecycle de Tecnotron-ai

## 1. Propósito

Definir el lifecycle de una tarea acotada de desarrollo o documentación desde
su entrada de planificación hasta su integración y cleanup.

Tecnotron-ai es un sistema de desarrollo independiente. El lifecycle prioriza
la orquestación determinista y elimina del rol `Implementer` la administración
repetitiva de Git y GitHub. El `Developer` es el orquestador real y conserva la
autoridad de aceptación terminal.

## 2. Principio

La administración de tareas es determinista siempre que sea posible.

El trabajo semántico pertenece al rol de razonamiento apropiado. Las
transiciones mecánicas de estado, las operaciones Git y las actualizaciones de
providers pertenecen al Task Lifecycle.

## 3. Lifecycle

```text
DISCOVERED
    |
READY
    |
STARTED
    |
WORKING
    |
VALIDATED
    |
PENDING_REVIEW
    |
Independent review PASS
    |
PENDING_ACCEPTANCE
    |
Developer gate
    |
ACCEPTED
    |
INTEGRATING
    |
DONE
    |
CLEANUP
```

Una implementación concreta puede usar nombres de estado específicos de un
provider, pero debe preservar el significado semántico de estas transiciones.
Un review `FAIL` devuelve el trabajo a corrección; cuando la corrección y su
validación terminan, el estado es nuevamente `PENDING_REVIEW`. No puede usarse
`PENDING_ACCEPTANCE` antes de que un nuevo review independiente produzca
`PASS`.

### 3.1 Dimensiones de estado y autoridad

El diagrama es navegación, no una variable única. Cada ejecución debe registrar
por separado estas dimensiones, sin inferir una a partir de otra:

| Dimensión | Qué registra | Ejemplos de valores |
| --- | --- | --- |
| Estado del contrato TASK | Snapshot autoritativo materializado en `TASK.md`; solo su owner determinista o un ruling competente puede superseder su autorización. | `READY`, `NOT_STARTED`, autorización declarada |
| Estado de materialización | Existencia y preparación de branch, worktree y artefactos contractuales. | `NOT_MATERIALIZED`, `MATERIALIZED` |
| Estado de implementación | Progreso observado del trabajo semántico. | `NOT_STARTED`, `WORKING`, `IMPLEMENTED`, `CORRECTED` |
| Resultado de validación | Resultado de checks deterministas; no es review ni aceptación. | `PASS`, `FAIL`, `NOT_RUN`, `UNAVAILABLE` |
| Veredicto de review | Resultado independiente y versionado de cada ciclo. | `NOT_RUN`, `PASS`, `FAIL` |
| Estado de handoff a review | Implementación validada que requiere review o re-review independiente. | `PENDING_REVIEW` |
| Aceptación del Developer | Decisión terminal posterior a un review `PASS`. | `PENDING_ACCEPTANCE`, `ACCEPTED`, `REJECTED`, `REVISION_REQUESTED` |
| Integración | Operaciones que incorporan el cambio en `integration_branch`. | `NOT_STARTED`, `INTEGRATING`, `INTEGRATED`, `FAILED` |
| Publicación | Exposición deliberada de artefactos o cambios fuera de la integración local. | `NOT_STARTED`, `PUBLISHED`, `FAILED` |
| Cierre | Disposición final de la TASK y cleanup autorizado. | `OPEN`, `DONE`, `CLEANUP_COMPLETE` |

Un ruling posterior puede autorizar una corrección sin reescribir el snapshot de
`TASK.md`; la evidencia debe citar el ruling y mostrar ambos valores, no fingir
que el contrato original nunca existió. Un `FAIL` de review permanece como
evidencia del ciclo correspondiente aunque un ciclo posterior quede
`PENDING_REVIEW` o alcance `PASS`.

## 4. Distribución de responsabilidades

### Deterministic Task Lifecycle

Responsabilidades:

- leer metadata de la tarea;
- resolver la identidad del repositorio;
- resolver el parámetro `integration_branch` desde la autoridad aplicable;
- crear o seleccionar la rama de la tarea;
- crear el worktree acotado a la tarea;
- registrar la asociación entre tarea y worktree;
- actualizar el estado de la tarea en el provider;
- verificar limpieza Git y rama esperada;
- ejecutar checks deterministas configurados antes de la integración;
- hacer commit después de la aceptación cuando la política lo permita;
- hacer push;
- crear o actualizar el Pull Request;
- vincular la tarea y el Pull Request;
- actualizar campos de GitHub Project;
- limpiar el worktree acotado a la tarea cuando la política de integración lo
  permita.

### Implementer

Responsabilidades:

- implementación;
- razonamiento acotado a la tarea;
- cambios de código o documentación;
- validación específica de la implementación;
- reporte de evidencia.

El `Implementer` no administra rutinariamente GitHub Project ni el bookkeeping
del lifecycle.

### Reviewer

Realiza la revisión semántica independiente cuando la política de la tarea la
requiere. El `Reviewer` no escribe código de producto.

### Validator

Realiza la validación determinista.

El role registry conserva la autoridad sobre los identificadores y permisos
concretos de roles.

### Developer

Responsabilidades:

- orquestación real del trabajo;
- autoridad de aceptación terminal;
- decisiones de arquitectura;
- overrides excepcionales;
- rechazo o aceptación del trabajo antes de la integración cuando existe un
  gate.

## 5. Política de worktrees

Una tarea de escritura posee un Git worktree acotado a la tarea por cada
repositorio que modifica.

Los worktrees de tarea son normalmente efímeros. No deben persistir solo para
compensar limitaciones de cache o indexing de otra herramienta.

Una tarea multi-repo puede usar worktrees coordinados, uno en cada repositorio,
correlacionados por la misma identidad de tarea. Un workspace de carpetas puede
coordinar lectura y contexto entre repositorios, pero no reemplaza los
worktrees.

## 6. Contrato de inicio de tarea

Entrada conceptual:

```yaml
task_id: string
repository: logical-repository-id
integration_branch: logical-or-git-ref
task_branch: logical-or-git-ref
write_scope:
  - path-or-repository
```

Salida conceptual:

```yaml
task_id: string
integration_branch: resolved-git-ref
task_branch: resolved-git-ref
worktree_root: path
base_commit: sha
provider_state: STARTED
```

`integration_branch` es un parámetro resuelto desde la autoridad de proyecto,
milestone o TASK aplicable. La rama de tarea comienza desde el commit resuelto
de `integration_branch`; el lifecycle no fija un nombre universal para esa
rama.

La resolución de proyecto, repositorio y root usa la infraestructura portable
definida por el Project Profile y sus contratos relacionados. El Task Lifecycle
no hardcodea paths hermanos específicos de una workstation.

## 7. Contrato de trabajo

El `Implementer` recibe:

- contenido de la tarea;
- criterios de aceptación;
- worktree resuelto;
- scope de escritura permitido;
- referencia de contexto, paquete de contexto o acceso a retrieval;
- comandos o política de validación relevantes para la tarea.

El ingreso de contexto es source-agnostic: cualquier fuente o adapter compatible
puede suministrarlo mediante una referencia explícita sin adquirir autoridad ni
crear una dependencia operativa. El `Implementer` no debe reconstruir la
topología del workspace ni el estado del provider de planificación.

## 8. Contrato de validación

La evidencia de validación distingue:

- `PASS`;
- `FAIL`;
- `NOT_RUN`;
- `UNAVAILABLE`.

Una herramienta o dependencia no disponible no puede reportarse como `PASS`.
La validación determinista específica de la tarea debe ejecutarse antes de la
aceptación cuando sea viable.

## 9. Gate de aceptación

`PENDING_REVIEW` significa que la implementación —incluida cualquier corrección
requerida— y la validación disponible están completas, pero todavía falta un
review independiente `PASS`.

`PENDING_ACCEPTANCE` significa que la implementación y la validación disponible
están completas, un review independiente produjo `PASS` y la aceptación del
Developer todavía no fue concedida. No significa integración, publicación ni
cierre.

El `Developer` puede:

- aceptar;
- rechazar;
- solicitar revisión;
- eximir explícitamente un check no crítico no disponible, con justificación.

La finalización del `Implementer` no implica merge automático.

## 10. Contrato de integración

Después de la aceptación, las operaciones deterministas pueden ejecutar:

```text
verify expected task/worktree and integration_branch
-> git diff --check / configured gates
-> commit
-> push
-> create/update PR against integration_branch
-> link task
-> update Project state
```

La integración devuelve la rama de tarea al valor resuelto de
`integration_branch`. Ninguna implementación puede sustituir ese parámetro por
un nombre de rama fijo ni cambiarlo sin la autoridad aplicable.

### 10.1 Valor vigente del milestone

Para `tecnotron-operational-foundation-v1`, el valor vigente de
`integration_branch` es `tools`. Las ramas de tarea de ese milestone comienzan
desde `tools` y se integran en `tools` mediante Pull Requests y worktrees
acotados a la tarea.

`tools` es un valor específico del milestone, no una constante universal del
Task Lifecycle. `main` recibe el milestone aceptado solo mediante una promoción
deliberada. `tooling` es una referencia histórica y no es el baseline activo de
este milestone.

Los mensajes de commit se escriben en español. El Task Lifecycle no debe forzar
silenciosamente merges de historiales no relacionados ni eludir protecciones de
rama.

## 11. Contrato de cleanup

El cleanup puede eliminar:

- el worktree acotado a la tarea;
- artefactos temporales locales de la tarea;
- paquetes de contexto derivados;
- estado derivado de code intelligence que pertenezca explícitamente al
  worktree eliminado y sea seguro descartar.

El cleanup no puede eliminar:

- source canónico;
- historial Git aceptado;
- documentación source of truth reutilizable;
- caches o índices no relacionados.

El cleanup de herramientas derivadas pertenece al adapter propietario de ese
estado.

## 12. Integración con GitHub

GitHub es el provider vigente de planificación e integración.

Las operaciones deterministas deben preferir adapters de GitHub API o `gh` CLI
para:

- Issues;
- Projects;
- Pull Requests;
- labels y fields;
- links y transiciones de estado.

No se requiere un agente LLM o MCP para operaciones mecánicas de GitHub que
puedan expresarse de forma determinista. Si un provider o una implementación
LLM+MCP futura reemplaza una parte del workflow, debe preservar el mismo
contrato de Task Lifecycle.

## 13. Transformación semántica

Puede usarse un modelo cuando una entrada no estructurada deba transformarse
semánticamente, por ejemplo para:

- redactar el título de una tarea;
- normalizar la descripción de una tarea;
- inferir criterios de aceptación propuestos.

La salida del modelo debe validarse contra un schema determinista antes de
escribir en el provider. El modelo no adquiere ownership del Task Lifecycle por
realizar esta transformación.

## 14. Observabilidad

Cada ejecución del lifecycle debe llegar a exponer evidencia estructurada
suficiente para reconstruir:

- ID de tarea;
- repositorio;
- `integration_branch` resuelto;
- rama de tarea;
- commit base;
- worktree;
- transiciones de estado;
- resultados de validación;
- resultado de aceptación;
- referencia de PR o integración;
- resultado de cleanup.

El mecanismo exacto de persistencia es un detalle de implementación.

## 15. Estado de implementación

Este documento define el lifecycle lógico canónico. La automatización del
lifecycle está planificada y debe implementarse solo después de disponer de los
contratos portables de proyecto y root.

La implementación debe permanecer pequeña y usar las capacidades existentes de
Git, GitHub y workspace en lugar de reemplazarlas.
