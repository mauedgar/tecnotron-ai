'use strict';

const decisions = {
  COMPLETE: { action: 'PROCEED', reason_code: 'CONTEXT_COMPLETE' },
  PARTIAL: { action: 'ESCALATE', reason_code: 'CONTEXT_PARTIAL' },
  EMPTY: { action: 'BLOCK', reason_code: 'CONTEXT_EMPTY' },
};

function decideContext(contextResult) {
  const decision = decisions[contextResult.status];
  if (!decision) {
    throw new Error(`Unsupported context status: ${contextResult.status}`);
  }

  return {
    ...decision,
    missing_evidence_ids: contextResult.missing_evidence_ids,
  };
}

module.exports = { decideContext };
