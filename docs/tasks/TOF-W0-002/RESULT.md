---
document_id: TOF-RESULT-W0-002
status: ACCEPTED
task_id: TOF-W0-002
updated: 2026-08-29
terminal_acceptance: Developer
accepted_at: 2026-08-29
accepted_by: Developer
---

# RESULT TOF-W0-002

## Resultado

Se implemento resolucion fail-closed para coordenadas explicitas de proyecto,
se configuro la inyeccion reproducible de los tres `FF_*` desde el workspace de
FitFlow y se demostro conformidad positiva y negativa desde un worktree Orca
nuevo. No se cambiaron schemas, contratos, registries, routing, producto ni
politica de lifecycle.

El resultado queda en `PENDING_ACCEPTANCE`. Las validaciones deterministas son
`PASS`; el Reviewer independiente permanece `UNAVAILABLE` y debe completar
`REVIEW.md` antes de la aceptacion terminal.

## Baselines, estado previo y ownership

| Repositorio | Baseline y checkout inicial | Cambios preexistentes preservados | Ownership TOF-W0-002 |
| --- | --- | --- | --- |
| FitFlow | `develop@ff71ae28c9b2e33c8e87f5c0b53af88f1d562dfe`; `C:/Proyectos-Web/FitFlow` | `M .ai/config/README.md`, `M .ai/config/project-profile.yaml`, `M .cbmignore` | `orca.yaml` y seccion de inyeccion en `.ai/config/README.md` |
| Tecnotron-ai | `tools@30b90acc60bb88384ad61061a494bc7c4fc67a59`; `C:/Proyectos-Web/Tecnotron-ai`; `ahead 2` | `M tests/contract/registries.test.js`, `M tests/integration/routing.test.js`, resultados TOF-W0-001 sin trackear | `src/project-profile/index.js`, `scripts/doctor/tests/project-resolution.test.js` y evidencia TOF-W0-002 |

El ruling del Developer autorizo ejecucion directa desde `tools` y escritura
directa en FitFlow sin branch o worktree separado. Ningun cambio preexistente se
sobrescribio. Los worktrees usados solo para el smoke fueron efimeros y se
eliminaron junto con sus branches de fixture al terminar.

La integracion de cada repositorio permanece independiente y requiere aceptacion
del Developer. El rollback FitFlow elimina solo `defaultTabs` y la seccion de
inyeccion agregada al README; el rollback Tecnotron-ai revierte solo resolver,
test nuevo y evidencia TOF-W0-002. Ninguno incluye `.cbmignore`, Profile o tests
preexistentes de TOF-W0-001.

## Cambios implementados

- FitFlow `orca.yaml`: `defaultTabs[].command` exporta
  `FF_PROJECT_ROOT` desde el cwd del worktree, deriva `FF_PROJECT_PROFILE` e
  identifica el checkout `tools` mediante `FF_AI_CORE_ROOT`.
- FitFlow `.ai/config/README.md`: documenta ownership, `--setup skip`, la
  superficie `orca terminal create` cuando la politica local no autoejecuta
  comandos versionados y la prohibicion de convertirla en configuracion global.
- Tecnotron-ai `src/project-profile/index.js`: opciones de Root/Profile forman
  un conjunto con precedencia sobre coordenadas de entorno heredadas; Root y
  Profile deben coincidir y la ausencia de ambos falla cerrada.
- Tecnotron-ai `scripts/doctor/tests/project-resolution.test.js`: cubre opciones
  y entorno validos, Profile explicito, precedencia, conflicto, roots no
  disponibles, Profile ausente, valores stale y ausencia total de coordenadas.

El Project Profile no recibio paths de worktree. Su cambio visible corresponde
al trabajo preexistente TOF-W0-001 y conserva roots de checkouts principales.

## Evidencia TDD y resolver

| Estado | Comando | Evidencia |
| --- | --- | --- |
| `PASS` | RED: `node --test scripts/doctor/tests/project-resolution.test.js` antes del cambio | 3 pass, 4 fail por precedencia, conflicto y fail-closed faltantes; no por dependencias |
| `PASS` | `node --test scripts/doctor/tests/project-resolution.test.js scripts/doctor/tests/doctor.test.js` | 15/15 |
| `PASS` | Casos negativos dentro del suite focalizado | root de producto no disponible, AI Core no disponible, Profile ausente, Root/Profile en conflicto, stale y sin coordenadas: rechazo estable |

## Inyeccion y fresh-worktree smoke

Orca `1.4.190` reconocio la superficie versionada real mediante su parser
instalado y materializo `defaultTabs[0]` al crear un worktree nuevo. El smoke uso
`--setup skip`; no leyo `.env`, no instalo dependencias y no ejecuto setup de
producto. La politica local reporto `runCommands: false`, por lo que no se cambio
esa politica: se inicio la terminal por la superficie documentada
`orca terminal create --title "AI Core" --command <defaultTabs[0].command>`.

Los inputs de creacion fueron `--name TOF-W0-002-conformance`,
`--base-branch mauedgar/TOF-W0-002-smoke`, `--no-parent` y `--setup skip` sobre
el repo FitFlow registrado. El baseline efimero con la configuracion prospectiva
fue `7395d6ffbd1d0f915083a6644d093620256a3d61`; su branch se elimino despues de
la reproduccion.

Salida sanitizada del resolver en el worktree nuevo:

```json
{
  "keys": "present",
  "projectRoot": "C:/Users/maued/orca/workspaces/FitFlow/TOF-W0-002-conformance",
  "profilePath": "C:/Users/maued/orca/workspaces/FitFlow/TOF-W0-002-conformance/.ai/config/project-profile.yaml",
  "aiCoreRoot": "C:/Proyectos-Web/Tecnotron-ai",
  "projectId": "fitflow"
}
```

Con `FF_PROJECT_ROOT` y `FF_PROJECT_PROFILE` removidos en esa misma terminal, el
resultado sanitizado fue `{"projectInputs":"missing","result":"rejected"}`.
No hubo fallback al checkout principal ni inferencia de un repositorio hermano.

## Conformidad y validacion por repositorio

### FitFlow

| Estado | Validacion | Evidencia |
| --- | --- | --- |
| `PASS` | Parser Orca instalado sobre `orca.yaml` | un `defaultTab`, tres keys reconocidas |
| `PASS` | Fresh-worktree y resolucion | Profile/root del worktree nuevo y AI Core `tools` |
| `PASS` | Profile sin path temporal | `taskWorktreePathInProfile: false` |
| `PASS` | Configuracion activa desde el worktree nuevo | 13/13: Profile v1, role/model v3, FinOps v1, orchestrator v2 y simulaciones declaradas |
| `PASS` | `git diff --check` | exit 0; solo warnings informativos LF/CRLF |
| `NOT_RUN` | Suite funcional de producto | fuera de scope |

### Tecnotron-ai

| Estado | Comando | Evidencia |
| --- | --- | --- |
| `PASS` | Suite focalizada de resolver/doctor | 15/15 |
| `PASS` | `env -u FF_PROJECT_ROOT -u FF_PROJECT_PROFILE -u FF_AI_CORE_ROOT npm test` | 140 pass, 0 fail, 3 skip de integracion externa |
| `PASS` | `FF_PROJECT_ROOT=... FF_PROJECT_PROFILE=... FF_AI_CORE_ROOT=... npm test` | 143/143, 0 skip |
| `PASS` | Integracion desde fresh worktree sobre contract/routing/runtime/agent MVP | 13/13, 0 skip; paid API deshabilitada |
| `PASS` | `git diff --check` | exit 0; solo warnings informativos LF/CRLF |
| `NOT_RUN` | Provider/model execution | prohibido; solo simulaciones declaradas |
| `UNAVAILABLE` | Reviewer independiente | el Implementer no representa autocontrol como revision independiente |

## Requisitos `spec-*`

| Spec | Estado | Evidencia |
| --- | --- | --- |
| spec-1 | `PASS` | Baselines, checkout, estado previo, scope, paths, permisos, validacion, integracion y rollback registrados |
| spec-2 | `PASS` | Orca materializo el comando versionado y la terminal nueva recibio las tres keys sin secretos |
| spec-3 | `PASS` | Salida sanitizada apunta al worktree FitFlow, Profile de ese worktree y checkout `tools` |
| spec-4 | `PASS` | Tests de opciones/entorno, precedencia por conjunto y ausencia de inferencia hermana |
| spec-5 | `PASS` | 13/13 fresh y 143/143 activo cargan las cinco configuraciones; paid API false |
| spec-6 | `PASS` | Casos missing, unavailable, conflict y stale fallan cerrados |
| spec-7 | `PASS` | Profile sin paths temporales y sin cambio de configuracion global |
| spec-8 | `PASS` | Gates FitFlow y Tecnotron-ai reportados por separado con estados permitidos |
| spec-9 | `PASS` | Suites completas pasan; no cambio a `fitflow-*`, Task v2 o lifecycle |
| spec-10 | `UNAVAILABLE` | Pendiente Reviewer independiente en `REVIEW.md` |

## Estado final

`PENDING_ACCEPTANCE`. No se creo commit de entrega ni integracion local porque
el gate independiente sigue pendiente. Los commits efimeros usados solo para
producir el fresh-worktree fueron eliminados con su branch. No se ejecuto
`git push` y no se inicio WP-001.
