'use strict';

const { ContextPackagerResult } = require('../contracts/context-packager');

const ESTIMATOR_LIMITATION = 'Character count divided by four is an approximation and can differ from the target model tokenizer.';

function unique(values) {
  return [...new Set(values.filter((value) => value))];
}

function defaultTokenizer() {
  return {
    name: 'characters_divided_by_4',
    exact: false,
    limitation: ESTIMATOR_LIMITATION,
    count(text) {
      return text.length === 0 ? 0 : Math.ceil(text.length / 4);
    },
  };
}

function normalizeMaterialization(result, provider) {
  return {
    provider: result.provider || provider,
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    omittedPaths: Array.isArray(result.omitted_paths) ? result.omitted_paths : [],
    qualityStatus: result.quality_status || 'CURRENT',
  };
}

class ContextPackager {
  constructor({ materializer, fallbackMaterializer = null, tokenizer = defaultTokenizer() }) {
    if (typeof materializer !== 'function') throw new TypeError('materializer must be a function');
    if (fallbackMaterializer !== null && typeof fallbackMaterializer !== 'function') throw new TypeError('fallbackMaterializer must be a function');
    if (!tokenizer || typeof tokenizer.count !== 'function' || typeof tokenizer.name !== 'string' || typeof tokenizer.exact !== 'boolean') {
      throw new TypeError('tokenizer must provide name, exact, and count');
    }
    if (!tokenizer.exact && !tokenizer.limitation) throw new TypeError('estimated tokenizer requires a limitation');
    this.materializer = materializer;
    this.fallbackMaterializer = fallbackMaterializer;
    this.tokenizer = tokenizer;
  }

  package({ budget_tokens, requested_paths = [], requested_evidence = [] }) {
    if (!Number.isInteger(budget_tokens) || budget_tokens < 0) throw new TypeError('budget_tokens must be a non-negative integer');
    const requirements = requested_evidence.map((evidence) => ({ required: true, ...evidence }));
    const paths = unique([...requested_paths, ...requirements.map((evidence) => evidence.path)]);
    const primary = normalizeMaterialization(this.materializer({ budget_tokens, requested_paths: paths, requested_evidence: requirements }), 'primary');
    const primaryMissing = this.missingRequirements(requirements, primary.evidence);
    const fallbackReason = primary.qualityStatus === 'STALE' ? 'STALE_EVIDENCE'
      : primary.qualityStatus === 'CONTRADICTORY' ? 'CONTRADICTORY_EVIDENCE'
        : primaryMissing.length ? 'MISSING_EVIDENCE' : null;
    const raw = [...primary.evidence];
    let fallback = { used: false, provider: null, reason: null };
    const providers = [primary.provider];

    if (fallbackReason && this.fallbackMaterializer) {
      // Stale or contradictory material is never allowed to consume the primary-source budget.
      const delivered = fallbackReason === 'MISSING_EVIDENCE' ? this.selectWithinBudget(raw, budget_tokens).tokens : 0;
      const fallbackRequirements = fallbackReason === 'MISSING_EVIDENCE' ? primaryMissing : requirements;
      const fallbackResult = normalizeMaterialization(this.fallbackMaterializer({
        budget_tokens: Math.max(0, budget_tokens - delivered),
        requested_paths: unique(fallbackRequirements.map((evidence) => evidence.path)),
        requested_evidence: fallbackRequirements,
      }), 'fallback');
      const fallbackIds = new Set(fallbackResult.evidence.map((evidence) => evidence.evidence_id));
      raw.splice(0, raw.length, ...raw.filter((evidence) => !fallbackIds.has(evidence.evidence_id)), ...fallbackResult.evidence);
      primary.omittedPaths.push(...fallbackResult.omittedPaths);
      providers.push(fallbackResult.provider);
      fallback = { used: true, provider: fallbackResult.provider, reason: fallbackReason };
    }

    const selected = this.selectWithinBudget(raw, budget_tokens);
    const includedIds = unique(selected.evidence.map((evidence) => evidence.evidence_id));
    const missing = this.missingRequirements(requirements, selected.evidence);
    const omittedEvidence = requirements.filter((requirement) => !includedIds.includes(requirement.evidence_id));
    const includedPaths = unique(selected.evidence.map((evidence) => evidence.path));
    const omittedPaths = unique([
      ...primary.omittedPaths,
      ...paths.filter((path) => !includedPaths.includes(path)),
    ]);
    const status = missing.length === 0 && selected.evidence.length > 0 ? 'COMPLETE'
      : selected.evidence.length > 0 ? 'PARTIAL' : 'EMPTY';
    const telemetry = {
      budget_tokens,
      tokens_delivered: selected.tokens,
      requested_paths: paths,
      included_paths: includedPaths,
      omitted_paths: omittedPaths,
      requested_evidence_ids: requirements.map((evidence) => evidence.evidence_id),
      included_evidence_ids: includedIds,
      missing_evidence_ids: missing.map((evidence) => evidence.evidence_id),
      coverage_status: status,
      fallback_used: fallback.used,
      retrieval_provider: unique(providers),
      tokenizer: {
        name: this.tokenizer.name,
        exact: this.tokenizer.exact,
        limitation: this.tokenizer.exact ? null : this.tokenizer.limitation,
      },
    };
    return ContextPackagerResult.parse({
      status,
      requested_evidence: requirements,
      included_evidence: selected.evidence,
      omitted_evidence: omittedEvidence,
      budget_tokens,
      tokens_delivered: selected.tokens,
      retrieval_providers: telemetry.retrieval_provider,
      fallback,
      coverage_status: status,
      missing_evidence_ids: telemetry.missing_evidence_ids,
      telemetry,
    });
  }

  missingRequirements(requirements, evidence) {
    const included = new Set(evidence.map((item) => item.evidence_id));
    return requirements.filter((requirement) => requirement.required && !included.has(requirement.evidence_id));
  }

  selectWithinBudget(evidence, budget) {
    const selected = [];
    let tokens = 0;
    const seen = new Set();
    for (const item of evidence) {
      if (!item || typeof item.evidence_id !== 'string' || typeof item.content !== 'string' || seen.has(item.evidence_id)) continue;
      const itemTokens = this.tokenizer.count(item.content);
      if (!Number.isInteger(itemTokens) || itemTokens < 0) throw new TypeError('tokenizer count must return a non-negative integer');
      if (tokens + itemTokens > budget) continue;
      selected.push({ evidence_id: item.evidence_id, path: item.path || null, content: item.content });
      seen.add(item.evidence_id);
      tokens += itemTokens;
    }
    return { evidence: selected, tokens };
  }
}

module.exports = { ContextPackager, defaultTokenizer, ESTIMATOR_LIMITATION };
