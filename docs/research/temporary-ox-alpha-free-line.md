---
document_id: FFAI-RESEARCH-OX-ALPHA-FREE-LINE
status: research
machine_context: true
version: 1.1
updated: 2026-08-26
owner: fitflow-ai
type: research
authority: non-canonical
---

# Temporary Ox Alpha Free Line

## Status and purpose

This document is active research, not model policy or executable configuration. It proposes a zero-incremental-cost replacement line while Ox Alpha is unavailable during its launch phase. Promotion into a Project Profile, `models.yaml`, resource pools, or routing rules requires an explicit task and Developer decision.

The current project phase permits providers that may retain data or train on prompts because the repository is treated as open source and contains no relevant secrets. This assumption must be reviewed before real databases, personal data, credentials, customer data, or confidential business information enter FitFlow.

## Developer ruling and observed usage

This report is not a source of truth for active bindings. Current catalog data,
published cost and bounded execution take precedence over candidate tables.

Observed on 2026-08-26:

- `opencode/big-pickle`: active, published input/output/cache cost zero; completed
  a bounded semantic review with concrete findings.
- `opencode/hy3-free`: active, published input/output/cache cost zero; completed
  a bounded evidence-retrieval task. CLI primary-mode fallback was observed when
  invoked with a subagent-only profile, which is a profile-mode issue rather than
  a model failure.
- `opencode/mimo-v2.5-free`: active, published input/output/cache cost zero;
  completed a bounded mechanical profile/installer conformance check with PASS.
- `opencode/nemotron-3-ultra-free`: active and zero-cost, but did not complete the
  bounded architecture check within 600 seconds; it is excluded from the active
  line until latency is acceptable.
- `opencode/gpt-5-nano`: active but published cost is non-zero; it is ineligible
  while paid API remains disabled.
- `opencode/glm-4.7-free`, `opencode/minimax-m2.1-free` and
  `opencode/kimi-k2.5-free`: absent from the current OpenCode catalog.

Active zero-cost bindings derived from that usage:

```text
planner_ai, architect, coder_a, coder_strong_a, reviewer -> opencode/big-pickle
explorer, doc_curator -> opencode/hy3-free
coder_b -> opencode/mimo-v2.5-free
```

`coder_strong_a` is enabled by a later Developer ruling but retains a MEDIUM
ceiling. No observed model enables HIGH delegation or automatic fallback.

## Non-negotiable constraints

- `paid_api_enabled: false`.
- `incremental_budget_usd: 0`.
- A positive account balance is not an eligible resource class and must not be consumed.
- OpenRouter candidates must have current effective pricing of zero. A paid model does not become free because the account purchased credits.
- OpenCode Zen candidates must be explicitly listed as free in current Zen pricing.
- No candidate may exceed the role criticality ceiling or relax capability, trust, resource-class, or access-mode requirements.
- Availability, model IDs, pricing, and promotional periods must be checked again when injected into registries.
- `openrouter/free` is excluded from normal deterministic selection because it chooses a model dynamically. It is suitable only for manual emergency experimentation.

## Confirmed account and catalog facts

### OpenRouter

Official limits on 2026-08-26:

- Less than USD 10 purchased all time: 20 requests/minute and 50 free requests/day.
- At least USD 10 purchased all time: 20 requests/minute and 1000 free requests/day.
- The threshold is based on credits purchased all time. It increases free request quota; it does not make paid models free.
- OpenRouter reserves the right to expire unused credits after one year.

The 2026-08-26 `/api/v1/models` snapshot contained 417 models. Twenty had zero pricing in every published pricing field: 17 explicit `:free` variants, two audio-only Lyria previews, and `openrouter/free`. Ox Alpha was absent by ID, name, and description.

### OpenCode Zen

Zen currently lists these relevant zero-priced models: Big Pickle, Hy3 Free, MiMo-V2.5 Free, Nemotron 3 Ultra Free, Nemotron 3.5 Lightning Free, and Muse Spark 1.2 Contributor Free. They are promotional and available for a limited, unspecified period. Zen does not publish a numeric free quota comparable to OpenRouter's 20 RPM / 1000 RPD in the reviewed documentation.

Zen states that its models are tested and served through provider configurations selected for coding agents. That is useful provider-level evidence, but it is not a FitFlow benchmark. Models sharing a family name between Zen and OpenRouter must not be assumed to be the same endpoint or serving configuration without runtime identity evidence.

## Corrections to initial candidate IDs

| Initial claim | Current result |
|---|---|
| `z.ai/glm-5.2:free` | Incorrect ID. Use `z-ai/glm-5.2:free`. Context is 256K, not 1M. |
| `openai/gpt-oss-120b:free` | Not present. The current `openai/gpt-oss-120b` is paid and ineligible while FinOps remains zero. |
| `dots-studio/dots3-note-preview:free` | Incorrect ID. Use `dots-studio/dots-3-note-preview:free`. |
| Positive OpenRouter balance makes paid models free | False. Purchased credits only increase the free-model daily quota. |

## Candidate assessment

Scores quoted below are third-party Artificial Analysis metadata exposed by the OpenRouter catalog, not local FitFlow results. Missing values remain unknown rather than inferred.

| Candidate | Provider | Context | Technical signals | Current assessment |
|---|---|---:|---|---|
| `z-ai/glm-5.2:free` | OpenRouter | 256K | Tools, tool choice, reasoning effort, structured output; coding 68.8, agentic 45.7 | Strongest documented free candidate for architecture, complex coding, and semantic review. Primary evaluation target. |
| `hy3-free` | OpenCode Zen | Not published by Zen | Zen-tested coding-agent endpoint; good Explorer responsiveness observed by Developer | Primary Explorer candidate and general secondary. Exact equivalence to paid OpenRouter `tencent/hy3-preview` is not confirmed. |
| `nemotron-3-ultra-free` | OpenCode Zen | Not published by Zen | Zen-tested endpoint; strong reasoning observed by Developer | Primary deep-reasoning secondary. Latency is acceptable under the current quality-first policy but must be measured. |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | OpenRouter | 1M | Tools, tool choice, reasoning effort; coding 49.3, agentic 27.5 | Strong long-context architecture/review fallback. Slower behavior is plausible but not yet benchmarked locally. |
| `minimax/minimax-m3:free` | OpenRouter | 1M | Tools and tool choice; coding 58.6, agentic 36.1 | Strong long-context alternative, especially when 256K is insufficient. |
| `big-pickle` | OpenCode Zen | Not published | Zen-tested stealth model; consistent availability observed by Developer | Preferred stable generalist on Zen, but opaque identity and missing technical metadata prevent a high criticality claim. |
| `nvidia/nemotron-3-super-120b-a12b:free` | OpenRouter | 262K | Tools, tool choice, reasoning effort, structured output; coding 37.7, agentic 8.8 | Structured secondary; lower measured agentic signal than the leading candidates. |
| `nvidia/nemotron-3.5-lightning:free` | OpenRouter | 1M | Tools and tool choice; coding 26.8, agentic 13.8 | Fast-context candidate for discovery and low/medium work, not primary complex architecture. |
| `nemotron-3.5-lightning-free` | OpenCode Zen | Not published | Zen-tested free endpoint | Explorer/coder_b evaluation candidate. Do not assume serving equivalence with OpenRouter. |
| `dots-studio/dots-3-note-preview:free` | OpenRouter | 512K | Tools, tool choice, structured output; no published coding score | Specialist candidate for cross-review and log analysis. Free endpoint declares expiration on 2026-09-30. |
| `mimo-v2.5-free` | OpenCode Zen | Not published | Zen-tested free endpoint | Experimental generalist pending technical and local evidence. |
| `thinkingmachines/inkling-small:free` | OpenRouter | 1M | Tools and reasoning effort, but no tool choice; coding 52.9, agentic 31.9 | Useful manual long-context candidate; absence of tool choice weakens strict agent routing. |
| `thinkingmachines/inkling:free` | OpenRouter | 1M | Tools and reasoning effort, but no tool choice; coding 52.1, agentic 34.1 | Same limitation as Inkling Small; retain as experimental. |
| `minimax/minimax-m2.7:free` | OpenRouter | 196K | Tools and tool choice; coding 52.6, agentic 25.9 | Viable secondary if M3 is unavailable. |
| `cohere/north-mini-code:free` | OpenRouter | 256K | Tools and tool choice; coding 36.5, agentic 3.1 | Coding-focused low-cost worker, not a Core Architect candidate. |
| `poolside/laguna-s-2.1:free` | OpenRouter | 262K | Tools and tool choice; no catalog benchmarks | Experimental coding candidate pending evidence. |
| `google/gemma-4-31b-it:free` | OpenRouter | 262K | Multimodal tools; coding 43.4, agentic 14.4 | General secondary, below purpose-built leading candidates. |

Small, safety-only, XS, and very low coding-signal endpoints are excluded from the temporary operational line: `liquid/lfm-2.5-2.6b:free`, `nvidia/nemotron-3.5-content-safety:free`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, and `poolside/laguna-xs-2.1:free`.

## Proposed temporary line by role

This is an evaluation order, not an activated automatic fallback policy.

| Role/workload | Primary | Secondary | Long-context/deep fallback | Experimental |
|---|---|---|---|---|
| `planner_ai` | GLM 5.2 Free | Big Pickle | Nemotron 3 Ultra / MiniMax M3 | Inkling |
| `architect` | GLM 5.2 Free | Nemotron 3 Ultra | MiniMax M3 | Big Pickle |
| `explorer` | Hy3 Free | Big Pickle | Nemotron 3.5 Lightning | North Mini Code |
| `coder_a` | GLM 5.2 Free | MiniMax M3 | Nemotron 3 Ultra | MiniMax M2.7 |
| `coder_b` | Hy3 Free | Nemotron 3.5 Lightning | North Mini Code | Laguna S |
| `reviewer` | GLM 5.2 Free | Nemotron 3 Ultra | Dots 3 Note Preview | MiniMax M3 |
| `doc_curator` | Hy3 Free | Big Pickle | GLM 5.2 Free | Gemma 4 31B |

`coder_strong_a` remains deferred. No free candidate should be promoted to high-criticality implementation solely from vendor or third-party metadata.

## Proposed replacement decision

Until Ox Alpha returns and passes availability verification:

1. Mark Ox Alpha `unavailable`; preserve its registry identity and prior evidence.
2. Use OpenCode Zen free endpoints first where they have demonstrated operational consistency for the assigned role.
3. Use `z-ai/glm-5.2:free` as the principal documented intelligence replacement for architecture, medium-complexity coding, and review.
4. Use Nemotron 3 Ultra or MiniMax M3 when deep reasoning or 1M context matters more than response speed.
5. Use Hy3 Free for Explorer and lightweight agent work, subject to a reproducible invocation test.
6. Stop with `UNAVAILABLE` if no candidate satisfies all role, capability, criticality, trust, availability, and zero-incremental constraints.

The preferred default is therefore role-specific, not one universal substitute:

```text
architecture/review: GLM 5.2 Free
deep or 1M context: Nemotron 3 Ultra Free, then MiniMax M3 Free
exploration/light work: Hy3 Free
stable Zen generalist: Big Pickle
```

## Latency policy

Current priority is:

```text
intelligence and correctness > provider reliability > agent/tool compatibility > response speed
```

Latency remains a measured operational factor because repeated slow stages can make a task cycle impractical. Nemotron 3 Ultra's observed approximately two-times duration is a Developer observation, not a benchmark. Evaluation should record end-to-acceptable-result time, retries, corrections, tool/JSON failures, and first-pass correctness. A slower model remains preferable when it materially reduces corrections.

## Registry injection requirements

Before adding any candidate to `fitflow-model-registry/v3`, collect:

- Exact `provider`, `runtime_id`, and observed runtime identity.
- Current `availability` and invocation evidence.
- Justified `trust` and `criticality_ceiling`; default to conservative values.
- Verified `capabilities` from a reproducible task, not model description alone.
- `eligible_roles` and `preferred_roles` backed by role-specific evidence.
- Zero-cost `resource_pool`, resource class, access mode, quota, capacity, rate limit, and concurrency state.
- `selection_tier`, `benchmark_status`, and `last_verified`.
- Command and PASS artifact proving discovery/invocation.

Suggested initial status for untested candidates is `availability: available` only when discoverable, `trust: experimental`, conservative criticality, and `benchmark_status: research_only`. Availability must not imply high-quality or high-criticality eligibility.

## Required local evaluation

Use one bounded fixture per relevant role and record:

- Contract and instruction adherence.
- Tool-call correctness and structured-output validity.
- Coding or review correctness against deterministic checks.
- Context completeness and unsupported claims.
- Time to first token and total time to acceptable result.
- Retry count and provider failures.
- Effective runtime identity and zero charged cost.

OpenRouter quota should be verified through `GET /api/v1/key` and a small zero-cost request. OpenCode Zen limits remain unknown until observed or officially documented. No secret or API key belongs in this report or repository evidence.

## Sources checked

- OpenRouter `/api/v1/models`, snapshot retrieved 2026-08-26.
- OpenRouter Limits documentation, retrieved 2026-08-26.
- OpenRouter Free Variant and Free Models Router documentation, retrieved 2026-08-26.
- OpenCode Zen models, pricing, privacy, and deprecation documentation, retrieved 2026-08-26.
- FitFlow AI model registry, role registry, model resolver, FinOps constraints, and `FF-AI-OPS-001` operational-runner tests.

## Remaining unknowns

- Exact free quotas and throttling behavior for each Zen endpoint.
- Whether identically named Zen and OpenRouter models use equivalent checkpoints and serving configurations.
- Local role-specific quality, latency, tool reliability, and runtime identity.
- Promotional end dates except Dots 3 Note Preview's published OpenRouter expiration.
- Ox Alpha return date and final runtime ID.
