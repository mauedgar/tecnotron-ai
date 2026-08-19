# Scripts previstos

La entrada futura unica es `ffai`, conforme a
`../FitFlow/docs/ai/cli-contract.md`.

```text
scripts/
  doctor/
  run/
  sync/
  observe/
```

El empaquetador canonico vive en
`../FitFlow/.agents/skills/repo-packager/`. AI Core lo invoca mediante
`ContextPackagerPort`; no mantiene una copia.

No crear launchers o entornos antes de `FF-AI-VNEXT-002`. Los entrypoints deben
funcionar en Windows PowerShell y en CI, usar stdout JSON y stderr diagnostico.
