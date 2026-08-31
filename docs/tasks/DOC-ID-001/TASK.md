---
document_id: TEC-TASK-DOC-ID-001
status: READY
owner: tecnotron-ai
type: task
version: 1.0
updated: 2026-08-30
machine_context: true
task_id: DOC-ID-001
milestone_id: tecnotron-operational-foundation-v1
work_package_id: null
milestone_relation: canonical_maintenance_before_WP_001
repository: tecnotron-ai
integration_branch_parameter: integration_branch
integration_branch: tools
task_branch: feat/DOC-ID-001
task_base: 631679d39499c001fab923da585e665765aad35a
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-DOC-ID-001
execution_status: NOT_STARTED
implementation_authorized: false
target_terminal_state: PENDING_ACCEPTANCE
cross_repo_authority: UNRESTRICTED
primary_targets:
  - AGENTS.md
  - docs/SOURCE_OF_TRUTH.md
  - docs/task-lifecycle.md
discovered_targets: []
generated_write_scope: []
execution_resolution:
  model: openai/gpt-5.6-sol
  reasoning_effort: high
  binding: execution_only
  stable_profile_identity: false
ownership:
  terminal_acceptance: Developer
  materialization: Architect
  implementation: Implementer
  independent_review: Reviewer
related:
  - "[[SOURCE_OF_TRUTH]]"
  - "[[task-lifecycle]]"
  - "[[milestones/tecnotron-operational-foundation-v1/PLAN]]"
  - "[[tasks/DOC-ID-001/PLAN]]"
---

# TASK DOC-ID-001: identidad canónica y rama de integración parametrizable

## 1. Objetivo

Reparar la identidad canónica de Tecnotron-ai y corregir el contrato documental
de integración sin implementar todavía perfiles, automatización Git ni una
política lifecycle nueva.

La implementación futura debe resolver tres defectos confirmados:

1. `AGENTS.md` conserva identidad e instrucciones residuales de FitFlow dentro
   de Tecnotron-ai.
2. `docs/SOURCE_OF_TRUTH.md` conserva identidad u ownership textual de FitFlow
   donde debe expresar autoridad propia de Tecnotron-ai.
3. `docs/task-lifecycle.md` fija `tooling` como rama universal en vez de resolver
   una rama de integración parametrizable.

El concepto canónico es `integration_branch`. Su valor vigente para
`tecnotron-operational-foundation-v1` es `tools`; ese valor no se convierte en
una constante universal del lifecycle.

## 2. Autoridad y precedencia

Esta TASK materializa el ruling del Developer para `cycle_001`. Ante conflicto,
la precedencia aplicable a esta reparación es:

1. rulings explícitos del Developer;
2. esta `TASK.md` para autorización, requisitos y scope;
3. `PLAN.md` para estrategia de ejecución;
4. la tabla de autoridad por materia de `docs/SOURCE_OF_TRUTH.md` en todo lo que
   no sea precisamente el defecto de identidad u ownership que esta TASK debe
   reparar;
5. evidencia directa del repositorio en `task_base`.

La reparación debe preservar la función de `docs/SOURCE_OF_TRUTH.md` como índice
determinista de navegación y precedencia. No debe sustituirla con una autoridad
paralela.

## 3. Identidad de ejecución

```yaml
repository: tecnotron-ai
integration_branch_parameter: integration_branch
integration_branch: tools
task_branch: feat/DOC-ID-001
task_base: 631679d39499c001fab923da585e665765aad35a
worktree: C:/Users/maued/orca/workspaces/Tecnotron-ai/feat-DOC-ID-001
implementation_authorized: false
```

El modelo `openai/gpt-5.6-sol` y `reasoning_effort: high` son una resolución de
ejecución para esta unidad. No forman parte de la identidad estable de ningún
perfil, rol o contrato.

## 4. Relación con el milestone

`DOC-ID-001` es mantenimiento canónico previo a WP-001. No es WP-001, WP-004,
formalización de `audited_task_cycle`, implementación de perfiles,
implementación de scripts Git ni cierre de G5.

La TASK no cambia el plan del milestone ni materializa uno de sus candidate
TASKs. Corrige precondiciones documentales para que una ejecución posterior no
herede identidad o semántica de integración incorrectas.

## 5. Scope de implementación futura

### Primary targets

La implementación queda limitada inicialmente a:

```yaml
primary_targets:
  - AGENTS.md
  - docs/SOURCE_OF_TRUTH.md
  - docs/task-lifecycle.md
```

Los tres paths son targets esperados, no una prohibición basada en fronteras de
repositorio. `cross_repo_authority` es `UNRESTRICTED`: se pueden inspeccionar
fuentes de cualquier repositorio para verificar identidad, ownership y
consistencia.

### Targets adicionales

No se identificó un target adicional indispensable durante la materialización:

```yaml
discovered_targets: []
```

Si la ejecución descubre un cambio adicional indispensable, debe detener la
edición de ese path y registrar primero una propuesta de scope con path, defecto,
evidencia, necesidad y efecto sobre validación. La expansión requiere decisión
explícita del Developer; no puede inferirse de la ubicación del repositorio.

### Artefactos lifecycle

`PLAN.md` y `RESULT.md` pueden actualizarse solo para registrar progreso y
evidencia de esta TASK. `REVIEW.md` pertenece exclusivamente al Reviewer
independiente. Los artefactos históricos bajo `docs/tasks/TOF-WO-001/` son
inmutables para esta TASK.

## 6. Fronteras obligatorias

- Tecnotron-ai se describe como sistema de desarrollo independiente.
- El ingreso de contexto se expresa de forma agnóstica respecto de su fuente.
- No se introducen referencias, imports, resolución ni dependencias hacia un
  plano privado externo que no es visible para Tecnotron-ai.
- Se eliminan instrucciones residuales que asignen a FitFlow la identidad,
  root, write scope u ownership canónico de Tecnotron-ai.
- Las referencias históricas legítimas solo pueden conservarse cuando su
  materia lo exige y no crean identidad, autoridad o dependencia operativa.
- No se instala ni actualiza ninguna dependencia.
- No se modifica código funcional, schemas, contratos ejecutables, perfiles,
  registries, scripts Git ni automatización lifecycle.
- No se modifica ningún artefacto histórico de `TOF-WO-001`.
- No se formaliza ni declara disponible `audited_task_cycle`.

## 7. Generated writes

Una escritura generada por Orca pertenece al scope de la TASK, pero requiere un
gate del Developer antes de cualquier disposición. Si Orca modifica
`.opencode/package-lock.json`, `RESULT.md` debe registrar:

```yaml
generated_write_scope:
  - path: .opencode/package-lock.json
    producer_observed: <producer>
    cause: <cause>
    hash_before: <sha256>
    hash_after: <sha256>
    diff: <summary_or_reference>
    validation: <PASS|FAIL|UNAVAILABLE|NOT_RUN>
    disposition: PENDING_DEVELOPER_GATE
```

No se presume exclusión, inclusión en el commit principal, checkpoint ni commit
separado. La TASK y el Developer gate determinan esa disposición. No existe un
requisito automático de commit separado.

## 8. Requisitos verificables

- [ ] `req-1`: Los tres primary targets expresan una identidad inequívoca de
      Tecnotron-ai.
- [ ] `req-2`: No quedan instrucciones residuales de FitFlow que gobiernen la
      identidad, root, write scope u ownership canónico de Tecnotron-ai.
- [ ] `req-3`: Los primary targets no mencionan ni dependen de un plano privado
      externo excluido por el ruling, y el ingreso de contexto es
      source-agnostic.
- [ ] `req-4`: `docs/SOURCE_OF_TRUTH.md` conserva navegación, autoridad por
      materia y reglas de precedencia sin crear una fuente paralela.
- [ ] `req-5`: `docs/task-lifecycle.md` usa `integration_branch` como concepto
      parametrizable para resolución, inicio e integración de branches.
- [ ] `req-6`: `tools` queda registrado como valor vigente del milestone
      `tecnotron-operational-foundation-v1`.
- [ ] `req-7`: Ningún texto convierte `tools` en constante universal del
      lifecycle ni conserva `tooling` como baseline activa.
- [ ] `req-8`: No se formaliza, implementa ni declara disponible
      `audited_task_cycle`.
- [ ] `req-9`: Ningún archivo bajo `docs/tasks/TOF-WO-001/` cambia.
- [ ] `req-10`: La documentación está en español.
- [ ] `req-11`: Código, campos, estados e identificadores están en inglés.
- [ ] `req-12`: Links, nombres de documentos y terminología son consistentes y
      todos los links relativos modificados resuelven.
- [ ] `req-13`: `git diff --check` finaliza con exit code `0`.
- [ ] `req-14`: Un Reviewer independiente completa la revisión semántica en
      `REVIEW.md` sin escribir producto ni aceptar la TASK.
- [ ] `req-15`: Después de implementación, validación disponible y review, el
      resultado final queda en `PENDING_ACCEPTANCE` hasta decisión del Developer.

## 9. Validación y evidencia requeridas

`RESULT.md` debe mapear cada `req-*` a evidencia observada y uno de `PASS`,
`FAIL`, `UNAVAILABLE` o `NOT_RUN`. La ejecución debe incluir:

- inspección directa de los tres primary targets;
- comparación del diff completo con `task_base`;
- allowlist de cambios contra primary targets, artefactos lifecycle permitidos y
  generated writes registrados;
- búsqueda determinista de identidad residual, ownership incorrecto, baseline
  `tooling`, hardcoding universal de `tools` y dependencias externas prohibidas;
- validación de links relativos modificados;
- confirmación de que `docs/tasks/TOF-WO-001/**` no cambió;
- `git diff --check`;
- review semántica independiente.

La validación documental no requiere tests de producto, builds, ejecución de
providers ni llamadas a modelos. Esas comprobaciones se registran como
`NOT_RUN`, no como `PASS`, salvo que un cambio de scope aprobado las vuelva
necesarias.

## 10. Stop conditions

Detener y solicitar ruling del Developer si:

- la identidad o precedencia no puede repararse dentro del scope declarado;
- un target adicional resulta indispensable;
- una fuente competente exige dependencia operativa de un plano externo
  excluido por el ruling;
- sería necesario modificar comportamiento, schema, contrato, perfil, registry,
  script Git, automatización lifecycle o artefactos históricos de TOF-WO-001;
- aparece una escritura generada sin productor, causa o hashes verificables;
- la independencia del Reviewer no está disponible;
- una validación requerida falla o no puede ejecutarse y no existe disposición
  del Developer.

## 11. Estado de materialización

La branch y el worktree están preparados, pero la implementación no está
autorizada. El Implementer debe recibir autorización posterior y detenerse en
`PENDING_ACCEPTANCE`; no puede hacer commit, push, squash, integración,
publicación ni cleanup por inferencia.
