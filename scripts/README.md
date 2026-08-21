# Scripts

El entrypoint implementado es `scripts/doctor/bin/ffai-doctor.js`. La CLI
unificada `ffai` para run/sync/observe permanece futura.

```text
scripts/
  doctor/  # implementado
  run/     # pendiente
  sync/    # pendiente
  observe/ # pendiente
```

El empaquetador canonico vive en
`<FitFlow-ai-root>/.opencode/skills/repo-packager/`. La reparacion esta integrada
y sus tests pasan. Doctor aun busca la ubicacion historica en FitFlow; corregir
ese consumer requiere resolver roots en `FF-AI-VNEXT-005`. La adaptacion a
`ContextPackagerPort` v2 pertenece a `FF-AI-VNEXT-006`.

No instalar dependencias como efecto de discovery. Los entrypoints deben
funcionar en Windows PowerShell y CI, usar stdout JSON y stderr diagnostico.
