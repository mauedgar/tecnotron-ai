---
status: canonical
owner: fitflow-ai
type: context-policy
updated: 2026-08-21
related:
  - "[[operational-architecture]]"
  - "[[task-lifecycle]]"
  - "[[architecture]]"
  - "[[current-state]]"
  - "[[implementation-roadmap]]"
---

# Context Strategy

## 1. Purpose

Define how FitFlow-ai retrieves, selects, verifies, measures, and materializes context for development agents.

## 2. Objective

> Deliver the minimum sufficient and verifiable context required to solve and validate the task correctly.

Minimum token count is not the objective.

Token reduction is valuable only when required evidence is preserved.

## 3. Deterministic-first retrieval

Prefer deterministic retrieval before LLM-driven exploration whenever the same evidence can be obtained reliably.

Default escalation order:

```text
canonical metadata / index
    |
explicit document relations
    |
structural code intelligence
    |
lexical search
    |
semantic retrieval
    |
direct source read
    |
broader exploration
```

The exact order may vary by evidence type, but broader or more expensive retrieval must not be the default when narrower deterministic evidence is sufficient.

## 4. Context ownership

### ContextPackager

Owns:
- what evidence is required for the task;
- retrieval orchestration;
- context budget policy;
- sufficiency status;
- fallback policy;
- context telemetry.

ContextPackager does not become source of truth.

### CodeIntelligencePort

Owns the abstract capability to obtain code intelligence such as:
- structural search;
- symbol relationships;
- architecture summaries;
- call/dependency traversal;
- impact information;
- coverage information where supported.

The port must not expose a specific vendor as architecture.

A current implementation candidate is Codebase-Memory, subject to explicit evaluation.

### Canonical documentation retrieval

Canonical Markdown should support deterministic navigation using:
- frontmatter;
- source-of-truth indexes;
- explicit links;
- index-to-drill-down navigation;
- textual search.

Obsidian may expose these relationships to the Developer but is not required by the retrieval architecture.

### Semantic document retrieval

Embeddings/vector retrieval may be used for unstructured documentation when deterministic navigation is insufficient.

Semantic retrieval must not be added merely because it is available.

### repo-packager

Owns context materialization.

Responsibilities include:
- package requested evidence;
- exclusions and sensitive-path filtering;
- token budget enforcement;
- requested/included/omitted reporting;
- `COMPLETE`, `PARTIAL`, or `EMPTY`;
- exact-source expansion for selected paths.

repo-packager does not decide whether the task has sufficient evidence.

Its existing custom graph/PageRank responsibility is a candidate for retirement only after the Code Intelligence evaluation demonstrates a superior replacement.

## 5. Source fallback

No derived index or retrieval provider is assumed complete.

When evidence is:
- `PARTIAL`;
- contradictory;
- stale;
- below required coverage;
- missing an expected target;

the workflow must escalate toward a more primary source.

Conceptual fallback:

```text
derived metadata/index
-> structural retrieval
-> semantic/lexical retrieval
-> direct source
-> broader repository exploration
```

The ContextPackager records whether fallback occurred.

## 6. Context result contract

A context result should expose content plus structured metadata.

Conceptual shape:

```yaml
status: COMPLETE | PARTIAL | EMPTY
budget_tokens: integer
tokens_delivered: integer

requested:
  paths: []
  evidence_ids: []

included:
  paths: []
  evidence_ids: []

omitted:
  paths: []
  evidence_ids: []

retrieval:
  providers: []
  fallback_used: boolean

coverage:
  status: COMPLETE | PARTIAL | UNKNOWN
  expected_evidence_ids: []
  missing_evidence_ids: []
```

Exact schemas belong to implementation contracts.

## 7. Immediate deterministic telemetry

Telemetry should be introduced early because current tasks are bounded enough to establish a useful baseline.

Initial metrics should not require an evaluation framework or judge LLM:

```text
tokens_delivered
budget_tokens
requested_paths
included_paths
omitted_paths
requested_evidence_ids
included_evidence_ids
missing_evidence_ids
coverage_status
fallback_used
retrieval_provider
```

Where an exact tokenizer is available for the target model, use it.

Otherwise the estimator and its limitations must be explicit.

## 8. Task outcome correlation

Context metrics become more useful when correlated with Task Lifecycle results.

A run may later associate:

```text
context metrics
+
validation outcome
+
review outcome
+
Developer acceptance
```

This supports comparison of context strategies without making token count the only optimization target.

## 9. Evaluation strategy

Evaluation frameworks are implementation candidates, not architectural dependencies.

Before programming generic retrieval metrics, evaluate existing maintained tools against the required cases.

Candidate categories currently include:
- retrieval precision/recall evaluation;
- context relevance;
- response groundedness/faithfulness;
- assertion/threshold testing;
- token/cost reporting.

Framework candidates such as Ragas and Promptfoo must be evaluated before adoption.

Prefer deterministic metrics when ground-truth identifiers or exact evidence sets make them possible.

Examples:

```text
omitted_evidence
= expected_evidence_ids - included_evidence_ids

coverage_status
= deterministic comparison against expected scope

fallback_used
= explicit runtime flag
```

A judge LLM must not replace an exact deterministic comparison.

## 10. Code-intelligence evaluation

A Code Intelligence implementation is accepted through a task-oriented benchmark, not feature count.

For representative FitFlow/FitFlow-ai tasks compare:
- relevant paths/symbols recovered;
- false positives;
- false negatives;
- context tokens delivered;
- retrieval latency;
- tool calls when meaningful;
- downstream validation result.

The first planned comparison is between:
- current repo-packager graph/PageRank-assisted selection;
- Code Intelligence provider + repo-packager as materializer.

If the external provider wins with acceptable reliability, remove or reduce redundant custom graph responsibilities rather than keep both permanently.

## 11. Embedding boundary

Initial ownership:

```text
source code
-> Code Intelligence first

canonical structured docs
-> deterministic metadata/link navigation first

unstructured textual knowledge
-> semantic retrieval when justified

selected exact evidence
-> repo-packager materialization
```

External vectorization of source code should exist only if a measured retrieval gap remains after Code Intelligence evaluation.

## 12. Derived-state lifecycle

These are derived and rebuildable:
- code-intelligence indexes;
- embeddings;
- retrieval caches;
- repo packages;
- token metrics;
- temporary search outputs.

Each adapter that creates derived state owns:
- creation;
- refresh;
- invalidation;
- cleanup;
- rebuild behavior.

Derived-state limitations must not redefine Git worktree policy.

## 13. Documentation metadata

Canonical Markdown may expose portable metadata useful to both Developer navigation and deterministic retrieval:

```yaml
status: canonical | planned | superseded | archived
owner: fitflow-ai | fitflow
type: architecture | workflow | context-policy | state | roadmap | reference
updated: YYYY-MM-DD
related:
  - "[[document]]"
```

The exact allowed values should be lintable.

Obsidian is one consumer of this metadata, not its owner.

## 14. New-tool gate

Do not add another context tool because it is interesting or feature-rich.

A candidate must answer:
- what reproducible gap does it solve;
- which existing layer owns the capability;
- whether it replaces or reduces something;
- whether it creates duplicate source/index ownership;
- whether it supports current repository/worktree constraints;
- whether resource use is controllable;
- whether its benefit can be measured.

If existing capabilities cover the case adequately, no new tool is added.

## 15. Planned implementation sequence

```text
portable project/root contracts
    |
minimal deterministic context telemetry
    |
ContextPackager v2
    |
Code Intelligence adapter pilot
    |
A/B retrieval benchmark
    |
repo-packager simplification if justified
    |
evaluation framework adoption only if a remaining gap exists
```
