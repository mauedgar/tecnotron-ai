---
document_id: FFAI-RETRIEVAL-001
status: planned
machine_context: true
version: 2.1
updated: 2026-08-21
---

# Retrieval semantico

No forma parte del MVP inicial. El primer uso sera producir candidatos para
Explorer despues de estabilizar docs, contracts, ContextPackager y golden evals.

Una implementacion futura puede usar LlamaIndex TypeScript y Qdrant detras de
ports. Embedding, collection layout y thresholds se deciden por evaluacion. No
se usan para routing critico ni como Source of Truth.

Los seeds actuales en `data/derived/structure/` son historicos y stale hasta
regeneracion con baseline/fingerprint vNext.

FitFlow-ai posee esta arquitectura generica. FitFlow solo debe conservar su
corpus, exclusiones, feature flags y decisiones de producto. Reducir contexto y
tokens sigue siendo prioridad, subordinada a evidencia suficiente, calidad,
privacidad y menor retrabajo.
