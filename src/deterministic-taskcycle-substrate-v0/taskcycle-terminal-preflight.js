'use strict';

// Pure, opt-in pre-initialization terminal-path compatibility guard.
// This module does not initialize, mutate, or grant Product authority.
const { validateTaskCycleInitializationRequest } = require('./taskcycle-initialization');
const { REQUIRED_PENDING_IDS } = require('./taskcycle-post-phase1-lifecycle');

const LEGACY_IDS = Object.freeze(['implementation', ...REQUIRED_PENDING_IDS]);
const CONSUMERS = Object.freeze({
  LEGACY_FIXED_NINE: Object.freeze({
    source_path: 'src/deterministic-taskcycle-substrate-v0/taskcycle-post-phase1-lifecycle.js',
    source_blob: '176daa642301a80181578da04f88a6ccd1d01d6b',
  }),
  EXACT_ORIGINAL_OBLIGATIONS: Object.freeze({
    source_path: 'src/deterministic-taskcycle-substrate-v0/taskcycle-closure-compatibility.js',
    source_blob: '4575fec875dd27dacfbad34d46c6f213bee7e5c7',
  }),
});

function same(a, b) {
  return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((x, i) => x === b[i]);
}
function result(reason, ids, consumer, kind = 'BLOCKED') {
  return Object.freeze({
    status: kind,
    effect_state: 'NONE',
    reason,
    terminal_consumer: consumer ?? null,
    original_obligation_ids: [...ids],
    State_Kernel_direct_calls: 0,
    creates_authority: false,
    durable_effects: 0,
    requires_competent_external_binding_observation: true,
  });
}

/**
 * Call before durable initialization or any irreversible effect reliant on
 * terminal-path compatibility. This reports contract compatibility only,
 * never semantic validity, review quality or Developer acceptance.
 *
 * observed_binding must originate from a competent separate Git/blob
 * observation. As with every caller-supplied evidence ref, this guard checks
 * correspondence but does not authenticate the reference's provenance.
 */
function preflightTaskCycleTerminalPath({ initialization_request, terminal_consumer, observed_binding } = {}) {
  const ids = Array.isArray(initialization_request?.obligations)
    ? initialization_request.obligations.map(o => o?.id) : [];
  const invalid = validateTaskCycleInitializationRequest(initialization_request);
  if (invalid) return result('INITIALIZATION_CONTRACT_INVALID:' + invalid, ids, terminal_consumer?.kind);

  if (!terminal_consumer || typeof terminal_consumer !== 'object'
      || !Object.prototype.hasOwnProperty.call(CONSUMERS, terminal_consumer.kind)) {
    return result('TERMINAL_CONSUMER_UNQUALIFIED', ids, terminal_consumer?.kind);
  }

  const profile = CONSUMERS[terminal_consumer.kind];
  if (terminal_consumer.source_path !== profile.source_path
      || terminal_consumer.source_blob !== profile.source_blob
      || !observed_binding || observed_binding.source_path !== profile.source_path
      || observed_binding.source_blob !== profile.source_blob
      || typeof observed_binding.evidence_ref !== 'string'
      || !observed_binding.evidence_ref.trim()) {
    return result('TERMINAL_CONSUMER_BINDING_UNVERIFIED', ids, terminal_consumer.kind);
  }
  if (!same(terminal_consumer.obligation_refs, ids)) {
    return result('TERMINAL_CONSUMER_OBLIGATION_REFS_MISMATCH', ids, terminal_consumer.kind);
  }
  if (terminal_consumer.kind === 'LEGACY_FIXED_NINE' && !same(ids, LEGACY_IDS)) {
    return result('LEGACY_FIXED_NINE_INCOMPATIBLE_WITH_ORIGINAL_SET', ids, terminal_consumer.kind);
  }
  return result('TERMINAL_PATH_COMPATIBLE_ON_VERIFIED_INPUTS', ids, terminal_consumer.kind, 'PASS');
}

module.exports = {
  LEGACY_IDS, CONSUMERS, preflightTaskCycleTerminalPath,
};
