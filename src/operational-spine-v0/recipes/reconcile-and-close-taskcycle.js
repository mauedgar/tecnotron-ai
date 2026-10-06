'use strict';

const { z } = require('zod');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../contracts');
const { ReferenceSchema } = require('../invocation-contracts');
const { requireTaskCycleLifecycleCapability } = require('../taskcycle-lifecycle-capability');
const { reconcilePostTaskCycle: acceptedReconcilePostTaskCycle } = require('../../self-hosting-reconciliation-v0');

const NonEmpty = z.string().min(1);
const ReconciliationSource = z.enum([
  'independent_review',
  'developer_acceptance',
  'canonical_integration',
  'remote_publication',
  'reconciliation',
]);

const OBLIGATION_COMPETENCE = Object.freeze({
  INDEPENDENT_REVIEW: Object.freeze({
    source: 'independent_review',
    authority_kinds: Object.freeze(['INDEPENDENT_REVIEW']),
  }),
  DEVELOPER_ACCEPTANCE: Object.freeze({
    source: 'developer_acceptance',
    authority_kinds: Object.freeze(['DEVELOPER']),
  }),
  CANONICAL_INTEGRATION: Object.freeze({
    source: 'canonical_integration',
    authority_kinds: Object.freeze(['EFFECT_AUTHORITY']),
  }),
  REMOTE_PUBLICATION: Object.freeze({
    source: 'remote_publication',
    authority_kinds: Object.freeze(['EFFECT_AUTHORITY']),
  }),
  LIFECYCLE_RECONCILIATION: Object.freeze({
    source: 'reconciliation',
    authority_kinds: Object.freeze([]),
  }),
});

const OBLIGATION_IDENTITY_COMPATIBILITY = Object.freeze({
  INDEPENDENT_REVIEW: Object.freeze({
    semantic_kind: 'INDEPENDENT_REVIEW',
    compatibility_class: 'CURRENT_CANONICAL',
  }),
  independent_review: Object.freeze({
    semantic_kind: 'INDEPENDENT_REVIEW',
    compatibility_class: 'HISTORICAL_SUPPORTED',
  }),
  DEVELOPER_ACCEPTANCE: Object.freeze({
    semantic_kind: 'DEVELOPER_ACCEPTANCE',
    compatibility_class: 'CURRENT_CANONICAL',
  }),
  Developer_acceptance: Object.freeze({
    semantic_kind: 'DEVELOPER_ACCEPTANCE',
    compatibility_class: 'HISTORICAL_SUPPORTED',
  }),
  CANONICAL_INTEGRATION: Object.freeze({
    semantic_kind: 'CANONICAL_INTEGRATION',
    compatibility_class: 'CURRENT_CANONICAL',
  }),
  canonical_integration: Object.freeze({
    semantic_kind: 'CANONICAL_INTEGRATION',
    compatibility_class: 'HISTORICAL_SUPPORTED',
  }),
  REMOTE_PUBLICATION: Object.freeze({
    semantic_kind: 'REMOTE_PUBLICATION',
    compatibility_class: 'CURRENT_CANONICAL',
  }),
  remote_publication: Object.freeze({
    semantic_kind: 'REMOTE_PUBLICATION',
    compatibility_class: 'HISTORICAL_SUPPORTED',
  }),
  LIFECYCLE_RECONCILIATION: Object.freeze({
    semantic_kind: 'LIFECYCLE_RECONCILIATION',
    compatibility_class: 'CURRENT_CANONICAL',
  }),
  lifecycle_reconciliation: Object.freeze({
    semantic_kind: 'LIFECYCLE_RECONCILIATION',
    compatibility_class: 'HISTORICAL_SUPPORTED',
  }),
});

function resolveObligationIdentity(storedIdentity) {
  if (!Object.hasOwn(OBLIGATION_IDENTITY_COMPATIBILITY, storedIdentity)) return null;
  const compatibility = OBLIGATION_IDENTITY_COMPATIBILITY[storedIdentity];
  const competenceRule = OBLIGATION_COMPETENCE[compatibility.semantic_kind];
  if (!competenceRule) return null;
  return {
    stored_identity: storedIdentity,
    semantic_kind: compatibility.semantic_kind,
    competence_rule: competenceRule,
    compatibility_class: compatibility.compatibility_class,
  };
}

const CLOSURE_AUTHORITY_SOURCE = 'developer_acceptance';

const ObligationSatisfaction = z.object({
  obligation_id: NonEmpty,
  source: ReconciliationSource,
  remote_expected_status: z.enum(['PUBLISHED', 'NOT_PUBLISHED']).optional(),
  authority_ref: NonEmpty.optional(),
  authority_reference: ReferenceSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.source === 'remote_publication' && !value.remote_expected_status) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remote_expected_status'],
      message: 'remote_publication requires an explicit expected status',
    });
  }
  if (value.source !== 'remote_publication' && value.remote_expected_status !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remote_expected_status'],
      message: 'remote_expected_status is only valid for remote_publication',
    });
  }
  if (value.authority_reference !== undefined && value.authority_ref === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['authority_ref'],
      message: 'authority_reference requires authority_ref',
    });
  }
});

const ReconcileAndCloseTaskCycleInput = z.object({
  expected_state_revision: z.number().int().nonnegative(),
  observations: z.unknown(),
  evidence: z.array(z.unknown()).default([]),
  obligation_satisfactions: z.array(ObligationSatisfaction).default([]),
  closure: z.object({
    authority_ref: NonEmpty,
    disposition_ref: NonEmpty,
  }).strict(),
}).strict();

const ReconcileAndClosePreflightHandoff = z.object({
  schema_version: z.literal('tecnotron-reconcile-close-preflight-handoff/v0'),
  token: NonEmpty,
}).strict();

function receipt(request, {
  status,
  effectState,
  reason,
  output,
  evidenceRefs = request.evidence_refs || [],
}) {
  return RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: `recipe-receipt:${request.execution_attempt_id}:reconcile-and-close-taskcycle`,
    recipe_id: request.recipe_id,
    recipe_version: request.recipe_version,
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    effect_state: effectState,
    ...(reason ? { reason } : {}),
    ...(output !== undefined ? { output } : {}),
    result_refs: [],
    evidence_refs: evidenceRefs,
  });
}

function hasUnreconciledUnknown(lifecycle, taskcycle) {
  return lifecycle.hasUnreconciledExecution(taskcycle.id);
}

function sourceSatisfied(reconciliation, rule, competence) {
  if (!competence || competence.source !== rule.source) return false;
  if (rule.source === 'reconciliation') return reconciliation.disposition === 'RESOLVED';
  const classification = reconciliation.classifications?.[rule.source];
  const fact = reconciliation.observed_facts?.[rule.source];
  if (!classification || classification.status !== 'RESOLVED' || fact === null || fact === undefined) return false;
  switch (rule.source) {
    case 'independent_review':
      return fact.disposition === 'PASS';
    case 'developer_acceptance':
      return fact.disposition === 'ACCEPTED';
    case 'canonical_integration':
      return fact.status === 'INTEGRATED';
    case 'remote_publication':
      return fact.status === rule.remote_expected_status;
    default:
      return false;
  }
}

function reconciledAuthority(reconciliation, evidence, source, allowedKinds) {
  if (!Array.isArray(allowedKinds) || allowedKinds.length === 0) return null;
  const classification = reconciliation.classifications?.[source];
  if (!classification || classification.status !== 'RESOLVED') return null;
  const verified = Array.isArray(classification.verified_evidence)
    ? classification.verified_evidence
    : [];
  if (verified.length === 0) return null;

  let resolvedAuthority = null;
  for (const verifiedRecord of verified) {
    const matches = evidence.filter(record => record?.ref === verifiedRecord.ref);
    if (matches.length !== 1) return null;
    const record = matches[0];
    if (record.sha256 !== verifiedRecord.sha256 || typeof record.artifact_json !== 'string') return null;

    let artifact;
    try {
      artifact = JSON.parse(record.artifact_json);
    } catch {
      return null;
    }
    const competence = artifact?.verification?.authority_competence;
    if (
      !competence ||
      competence.status !== 'ESTABLISHED' ||
      !allowedKinds.includes(competence.kind) ||
      typeof competence.authority_ref !== 'string' ||
      competence.authority_ref.length === 0
    ) {
      return null;
    }
    if (resolvedAuthority !== null && resolvedAuthority !== competence.authority_ref) return null;
    resolvedAuthority = competence.authority_ref;
  }
  return resolvedAuthority;
}

function resolveCompetentRule({ reconciliation, evidence, taskcycle, rule, identity }) {
  const competence = identity?.competence_rule;
  if (!identity || !competence || competence.source !== rule.source || !sourceSatisfied(reconciliation, rule, competence)) {
    return { ok: false, reason: `OBLIGATION_SOURCE_NOT_COMPETENT:${rule.obligation_id}:${rule.source}` };
  }

  if (competence.authority_kinds.length === 0) {
    if (rule.authority_ref !== undefined || rule.authority_reference !== undefined) {
      return { ok: false, reason: `OBLIGATION_AUTHORITY_NOT_ALLOWED:${rule.obligation_id}` };
    }
    return { ok: true, rule: { ...rule, authority_ref: undefined, authority_reference: undefined } };
  }

  const competentAuthority = reconciledAuthority(
    reconciliation,
    evidence,
    rule.source,
    competence.authority_kinds,
  );
  if (!competentAuthority) {
    return { ok: false, reason: `OBLIGATION_COMPETENT_AUTHORITY_UNAVAILABLE:${rule.obligation_id}:${rule.source}` };
  }
  if (rule.authority_ref !== undefined && rule.authority_ref !== competentAuthority) {
    return { ok: false, reason: `OBLIGATION_AUTHORITY_MISMATCH:${rule.obligation_id}:${rule.authority_ref}:${competentAuthority}` };
  }
  if (
    rule.authority_reference !== undefined &&
    (rule.authority_reference.kind !== 'AUTHORITY' || rule.authority_reference.id !== competentAuthority)
  ) {
    return { ok: false, reason: `OBLIGATION_AUTHORITY_REFERENCE_MISMATCH:${rule.obligation_id}` };
  }

  return {
    ok: true,
    rule: {
      ...rule,
      authority_ref: competentAuthority,
      authority_reference: rule.authority_reference,
    },
    competentAuthority,
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function stableEqual(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function protectedTaskCycleDrift(expected, current) {
  if (current.id !== expected.id) return 'TASKCYCLE_IDENTITY_DRIFT';
  if (current.state !== expected.state) return 'TASKCYCLE_STATE_DRIFT';
  if (!stableEqual(current.obligations, expected.obligations)) return 'OBLIGATION_DRIFT';
  if (!stableEqual(current.authority_refs, expected.authority_refs)) return 'AUTHORITY_DRIFT';
  if (current.responsibility !== expected.responsibility) return 'TASKCYCLE_RESPONSIBILITY_DRIFT';
  if (current.terminal_disposition_ref !== expected.terminal_disposition_ref) {
    return 'TASKCYCLE_TERMINAL_DISPOSITION_DRIFT';
  }
  if (!stableEqual(current.related_ids, expected.related_ids)) return 'TASKCYCLE_RELATED_IDS_DRIFT';
  if (current.revision !== expected.revision) return 'TASKCYCLE_REVISION_DRIFT';
  if (!stableEqual(current, expected)) return 'TASKCYCLE_PROTECTED_SUBJECT_DRIFT';
  return null;
}

function handoffObservation(aggregate) {
  return {
    id: aggregate.id,
    revision: aggregate.revision,
    state: aggregate.state,
  };
}

function authoritativeSnapshot(lifecycle, taskcycleId) {
  return lifecycle.snapshot(taskcycleId);
}

function noEffectProven(before, after) {
  return (
    after.revision === before.revision &&
    after.event_count === before.event_count &&
    stableEqual(after.taskcycle, before.taskcycle) &&
    stableEqual(after.obligations.obligations, before.obligations.obligations)
  );
}

function expectedSatisfactionEffect(before, after, rule) {
  if (after.revision !== before.revision + 1) return false;
  if (
    Number.isSafeInteger(before.event_count) &&
    Number.isSafeInteger(after.event_count) &&
    after.event_count !== before.event_count + 1
  ) return false;
  if (after.taskcycle.revision !== before.taskcycle.revision + 1) return false;
  if (after.taskcycle.state !== before.taskcycle.state) return false;
  if (after.taskcycle.terminal_disposition_ref !== before.taskcycle.terminal_disposition_ref) return false;

  const beforeById = new Map(before.taskcycle.obligations.map(item => [item.id, item]));
  const afterById = new Map(after.taskcycle.obligations.map(item => [item.id, item]));
  if (beforeById.size !== afterById.size) return false;
  for (const [id, beforeObligation] of beforeById) {
    const afterObligation = afterById.get(id);
    if (!afterObligation) return false;
    if (id === rule.obligation_id) {
      if (beforeObligation.status !== 'PENDING' || afterObligation.status !== 'SATISFIED') return false;
      if ((afterObligation.authority_ref ?? null) !== (rule.authority_ref ?? null)) return false;
    } else if (!stableEqual(afterObligation, beforeObligation)) {
      return false;
    }
  }

  const beforeAuthorities = before.taskcycle.authority_refs || [];
  const afterAuthorities = after.taskcycle.authority_refs || [];
  if (rule.authority_ref === undefined) return stableEqual(afterAuthorities, beforeAuthorities);
  const hadAuthority = beforeAuthorities.some(ref => ref.kind === 'AUTHORITY' && ref.id === rule.authority_ref);
  if (hadAuthority) return stableEqual(afterAuthorities, beforeAuthorities);
  if (!rule.authority_reference) return false;
  return (
    afterAuthorities.length === beforeAuthorities.length + 1 &&
    beforeAuthorities.every(ref => afterAuthorities.some(candidate => stableEqual(candidate, ref))) &&
    afterAuthorities.some(ref => stableEqual(ref, rule.authority_reference))
  );
}

function expectedClosureEffect(before, after, closure) {
  return (
    after.revision === before.revision + 1 &&
    (!Number.isSafeInteger(before.event_count) || !Number.isSafeInteger(after.event_count) || after.event_count === before.event_count + 1) &&
    after.taskcycle.revision === before.taskcycle.revision + 1 &&
    before.taskcycle.state !== 'CLOSED' &&
    after.taskcycle.state === 'CLOSED' &&
    after.taskcycle.terminal_disposition_ref === closure.disposition_ref &&
    stableEqual(after.taskcycle.obligations, before.taskcycle.obligations) &&
    stableEqual(after.taskcycle.authority_refs, before.taskcycle.authority_refs)
  );
}

function invokeMutation({ lifecycle, taskcycleId, expectedRevision, invoke, expectedEffect }) {
  let before;
  try {
    before = authoritativeSnapshot(lifecycle, taskcycleId);
  } catch (error) {
    return { disposition: 'PRE_DISPATCH_FAILURE', reason: error.message };
  }
  if (before.revision !== expectedRevision) {
    return { disposition: 'PRE_DISPATCH_FAILURE', reason: `LIFECYCLE_REVISION_DRIFT:${before.revision}` };
  }

  let result;
  let invocationError = null;
  try {
    result = invoke();
  } catch (error) {
    invocationError = error;
  }

  let after;
  try {
    after = authoritativeSnapshot(lifecycle, taskcycleId);
  } catch (error) {
    return {
      disposition: 'UNKNOWN',
      reason: `LIFECYCLE_MUTATION_REASSESSMENT_UNAVAILABLE:${invocationError?.message || 'UNVERIFIABLE_RETURN'}:${error.message}`,
    };
  }
  if (noEffectProven(before, after)) {
    return {
      disposition: 'NO_EFFECT',
      reason: `LIFECYCLE_MUTATION_REJECTED_NO_EFFECT:${invocationError?.message || 'UNVERIFIABLE_RETURN'}`,
    };
  }
  if (expectedEffect(before, after)) {
    const acknowledged = (
      invocationError === null &&
      result &&
      result.revision === after.revision &&
      result.aggregate_revision === after.taskcycle.revision &&
      result.event_id === after.taskcycle.last_event_id &&
      result.kind === 'TaskCycle' &&
      result.aggregate_id === taskcycleId
    );
    if (acknowledged) {
      return { disposition: 'ACKNOWLEDGED', result, after };
    }
    return {
      disposition: 'EXACT_EFFECT_UNACKNOWLEDGED',
      reason: `LIFECYCLE_MUTATION_EFFECT_CONFIRMED_BUT_UNACKNOWLEDGED:${invocationError?.message || 'RECEIPT_CORRESPONDENCE_MISMATCH'}`,
      after,
    };
  }
  return {
    disposition: 'UNKNOWN',
    reason: `LIFECYCLE_MUTATION_EFFECT_UNRESOLVED:${invocationError?.message || 'UNVERIFIABLE_RETURN'}`,
  };
}

function compareObligationIdentity(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function deterministicRules(input) {
  return [...input.obligation_satisfactions].sort((a, b) => {
    const leftIdentity = resolveObligationIdentity(a.obligation_id);
    const rightIdentity = resolveObligationIdentity(b.obligation_id);
    const semanticOrder = compareObligationIdentity(
      leftIdentity?.semantic_kind ?? a.obligation_id,
      rightIdentity?.semantic_kind ?? b.obligation_id,
    );
    return semanticOrder || compareObligationIdentity(a.obligation_id, b.obligation_id);
  });
}

function prepare({ request, input, lifecycle, reconcilePostTaskCycle, handoffSnapshot = null }) {
  let lifecycleSnapshot;
  try {
    lifecycleSnapshot = lifecycle.snapshot(request.context.taskcycle_id);
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      reason: `LIFECYCLE_SNAPSHOT_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const verified = {
    valid: true,
    revision: lifecycleSnapshot.revision,
    event_count: lifecycleSnapshot.event_count,
  };
  if (handoffSnapshot === null && verified.revision !== input.expected_state_revision) {
    return { status: 'BLOCKED', reason: `LIFECYCLE_REVISION_DRIFT:${verified.revision}` };
  }
  if (handoffSnapshot !== null && verified.revision < handoffSnapshot.preflight_state_revision) {
    return {
      status: 'BLOCKED',
      reason: `LIFECYCLE_REVISION_REGRESSION:${verified.revision}:${handoffSnapshot.preflight_state_revision}`,
    };
  }

  const taskcycle = lifecycleSnapshot.taskcycle;
  if (handoffSnapshot !== null) {
    const drift = protectedTaskCycleDrift(handoffSnapshot.taskcycle, taskcycle);
    if (drift !== null) return { status: 'BLOCKED', reason: drift };
  }
  if (taskcycle.id !== request.context.taskcycle_id) {
    return { status: 'BLOCKED', reason: 'TASKCYCLE_IDENTITY_MISMATCH' };
  }

  let invocationOperation = null;
  let invocationAttempt = null;
  if (handoffSnapshot !== null) {
    let bookkeeping;
    try {
      bookkeeping = lifecycle.observeInvocationBookkeeping(
        request.operation_id,
        request.execution_attempt_id,
      );
    } catch {
      return { status: 'BLOCKED', reason: 'INVOCATION_BOOKKEEPING_NOT_ESTABLISHED' };
    }
    if (bookkeeping.revision !== verified.revision) {
      return { status: 'UNAVAILABLE', reason: 'INVOCATION_BOOKKEEPING_SNAPSHOT_REVISION_MISMATCH' };
    }
    invocationOperation = bookkeeping.operation;
    invocationAttempt = bookkeeping.attempt;
    if (
      invocationOperation.id !== request.operation_id ||
      invocationOperation.taskcycle_id !== taskcycle.id ||
      invocationOperation.state !== 'RUNNING'
    ) {
      return { status: 'BLOCKED', reason: 'INVOCATION_OPERATION_NOT_RUNNING_FOR_PROTECTED_SUBJECT' };
    }
    if (
      invocationAttempt.id !== request.execution_attempt_id ||
      invocationAttempt.operation_id !== request.operation_id ||
      invocationAttempt.state !== 'RUNNING' ||
      invocationAttempt.reconciliation_required === true
    ) {
      return { status: 'BLOCKED', reason: 'INVOCATION_ATTEMPT_NOT_RUNNING_FOR_OPERATION' };
    }
  }

  if (['CLOSED', 'CANCELLED'].includes(taskcycle.state)) {
    return { status: 'BLOCKED', reason: `TASKCYCLE_ALREADY_TERMINAL:${taskcycle.state}` };
  }
  try {
    if (hasUnreconciledUnknown(lifecycle, taskcycle)) {
      return { status: 'BLOCKED', reason: 'UNKNOWN_EXECUTION_ATTEMPT_REQUIRES_RECONCILIATION' };
    }
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      reason: `LIFECYCLE_EXECUTION_OBSERVATION_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const reconciliation = reconcilePostTaskCycle({
    taskcycle,
    observations: input.observations,
    evidence: input.evidence,
  });
  if (!reconciliation || reconciliation.disposition !== 'RESOLVED') {
    return {
      status: 'BLOCKED',
      reason: 'POST_TASKCYCLE_RECONCILIATION_UNRESOLVED',
      reconciliation,
    };
  }

  const pending = taskcycle.obligations
    .filter(item => item.status === 'PENDING')
    .map(item => item.id);
  const rules = deterministicRules(input);
  const ruleIds = rules.map(rule => rule.obligation_id);
  if (new Set(ruleIds).size !== ruleIds.length) {
    return { status: 'BLOCKED', reason: 'DUPLICATE_OBLIGATION_SATISFACTION_RULE' };
  }
  const pendingSet = new Set(pending);
  if (
    pending.length !== ruleIds.length ||
    ruleIds.some(obligationId => !pendingSet.has(obligationId))
  ) {
    return {
      status: 'BLOCKED',
      reason: 'PENDING_OBLIGATIONS_REQUIRE_EXACT_EXPLICIT_RULES',
      reconciliation,
    };
  }

  const identityByStored = new Map();
  const storedBySemantic = new Map();
  for (const storedIdentity of pending) {
    const identity = resolveObligationIdentity(storedIdentity);
    if (!identity) {
      return {
        status: 'BLOCKED',
        reason: `UNKNOWN_OBLIGATION_IDENTITY:${storedIdentity}`,
        reconciliation,
      };
    }
    const priorStoredIdentity = storedBySemantic.get(identity.semantic_kind);
    if (priorStoredIdentity !== undefined && priorStoredIdentity !== storedIdentity) {
      return {
        status: 'BLOCKED',
        reason: `AMBIGUOUS_OBLIGATION_IDENTITY:${identity.semantic_kind}:${priorStoredIdentity}:${storedIdentity}`,
        reconciliation,
      };
    }
    storedBySemantic.set(identity.semantic_kind, storedIdentity);
    identityByStored.set(storedIdentity, identity);
  }

  const competentRules = [];
  for (const rule of rules) {
    const resolved = resolveCompetentRule({
      reconciliation,
      evidence: input.evidence,
      taskcycle,
      rule,
      identity: identityByStored.get(rule.obligation_id),
    });
    if (!resolved.ok) {
      return {
        status: 'BLOCKED',
        reason: resolved.reason,
        reconciliation,
      };
    }
    competentRules.push(resolved.rule);
  }

  const availableAuthorityIds = new Set(
    (taskcycle.authority_refs || [])
      .filter(ref => ref.kind === 'AUTHORITY')
      .map(ref => ref.id),
  );
  for (const rule of competentRules) {
    if (rule.authority_reference?.kind === 'AUTHORITY') availableAuthorityIds.add(rule.authority_reference.id);
  }
  for (const rule of competentRules) {
    if (rule.authority_ref !== undefined && !availableAuthorityIds.has(rule.authority_ref)) {
      return {
        status: 'BLOCKED',
        reason: `OBLIGATION_AUTHORITY_REFERENCE_REQUIRED:${rule.obligation_id}:${rule.authority_ref}`,
        reconciliation,
      };
    }
  }

  const closureAuthority = reconciledAuthority(
    reconciliation,
    input.evidence,
    CLOSURE_AUTHORITY_SOURCE,
    ['DEVELOPER'],
  );
  if (!closureAuthority) {
    return { status: 'BLOCKED', reason: 'COMPETENT_CLOSURE_AUTHORITY_UNAVAILABLE', reconciliation };
  }
  if (input.closure.authority_ref !== closureAuthority) {
    return {
      status: 'BLOCKED',
      reason: `CLOSURE_AUTHORITY_MISMATCH:${input.closure.authority_ref}:${closureAuthority}`,
      reconciliation,
    };
  }

  const closureAuthorityAlreadyPresent = (taskcycle.authority_refs || []).some(ref =>
    ref.kind === 'AUTHORITY' && ref.id === closureAuthority);
  const closureAuthorityWillBeAttached = competentRules.some(rule =>
    rule.authority_ref === closureAuthority &&
    rule.authority_reference?.kind === 'AUTHORITY' &&
    rule.authority_reference.id === closureAuthority);
  if (!closureAuthorityAlreadyPresent && !closureAuthorityWillBeAttached) {
    return { status: 'BLOCKED', reason: 'COMPETENT_CLOSURE_AUTHORITY_NOT_AVAILABLE_TO_TASKCYCLE', reconciliation };
  }

  return {
    status: 'READY',
    verified,
    taskcycle,
    reconciliation,
    rules: competentRules,
    closureAuthority,
    precondition: handoffSnapshot === null ? {
      mode: 'EXACT_GLOBAL_REVISION',
      preflight_state_revision: input.expected_state_revision,
      execution_state_revision: verified.revision,
      protected_taskcycle: handoffObservation(taskcycle),
      operation: null,
      attempt: null,
    } : {
      mode: 'PROTECTED_SUBJECT_HANDOFF',
      preflight_state_revision: handoffSnapshot.preflight_state_revision,
      execution_state_revision: verified.revision,
      protected_taskcycle: handoffObservation(taskcycle),
      operation: handoffObservation(invocationOperation),
      attempt: handoffObservation(invocationAttempt),
    },
  };
}

function closureOutput({ reconciliation, satisfied, remaining, beforeState, afterState, finalVerify, precondition }) {
  return {
    reconciliation: {
      disposition: reconciliation.disposition,
      unresolved: reconciliation.unresolved,
    },
    precondition,
    obligations: {
      satisfied,
      remaining,
    },
    transition: {
      before: beforeState,
      after: afterState,
    },
    lifecycle: {
      final_revision: finalVerify.revision,
      final_event_count: finalVerify.event_count,
      verification: finalVerify.valid === true ? 'PASS' : 'FAIL',
    },
    repository_effect: 'NONE',
    git_effect: 'NONE',
    remote_effect: 'NONE',
  };
}

function createReconcileAndCloseTaskCycleRecipe({
  lifecycle,
  reconcilePostTaskCycle = acceptedReconcilePostTaskCycle,
} = {}) {
  const capability = requireTaskCycleLifecycleCapability(lifecycle);
  if (typeof reconcilePostTaskCycle !== 'function') throw new TypeError('reconcilePostTaskCycle is required');
  const handoffSnapshots = new Map();
  let handoffSequence = 0;

  function issueHandoff(request, input, prepared) {
    const token = `${request.execution_attempt_id}:${++handoffSequence}`;
    handoffSnapshots.set(token, {
      recipe_id: request.recipe_id,
      recipe_version: request.recipe_version,
      operation_id: request.operation_id,
      execution_attempt_id: request.execution_attempt_id,
      taskcycle_id: request.context.taskcycle_id,
      input: stableValue(input),
      preflight_state_revision: prepared.verified.revision,
      taskcycle: stableValue(prepared.taskcycle),
    });
    return Object.freeze({
      schema_version: 'tecnotron-reconcile-close-preflight-handoff/v0',
      token,
    });
  }

  function consumeHandoff(request, input) {
    const parsed = ReconcileAndClosePreflightHandoff.safeParse(request.preflight_handoff);
    if (!parsed.success) return { ok: false, reason: 'PREFLIGHT_HANDOFF_INVALID' };
    const snapshot = handoffSnapshots.get(parsed.data.token);
    handoffSnapshots.delete(parsed.data.token);
    if (!snapshot) return { ok: false, reason: 'PREFLIGHT_HANDOFF_NOT_ESTABLISHED' };
    if (
      snapshot.recipe_id !== request.recipe_id ||
      snapshot.recipe_version !== request.recipe_version ||
      snapshot.operation_id !== request.operation_id ||
      snapshot.execution_attempt_id !== request.execution_attempt_id ||
      snapshot.taskcycle_id !== request.context.taskcycle_id
    ) {
      return { ok: false, reason: 'PREFLIGHT_HANDOFF_REQUEST_IDENTITY_MISMATCH' };
    }
    if (snapshot.preflight_state_revision !== input.expected_state_revision) {
      return { ok: false, reason: 'PREFLIGHT_HANDOFF_EXPECTED_REVISION_MISMATCH' };
    }
    if (!stableEqual(snapshot.input, input)) {
      return { ok: false, reason: 'PREFLIGHT_INPUT_CHANGED_AFTER_PREFLIGHT' };
    }
    return { ok: true, snapshot };
  }

  const definition = RecipeDefinition.parse({
    id: 'reconcile_and_close_taskcycle',
    version: 'v0',
    provides: ['taskcycle.reconcile', 'taskcycle.close'],
    required_inputs: [
      'expected_state_revision',
      'observations',
      'obligation_satisfactions',
      'closure',
    ],
    preconditions: [
      'Lifecycle revision exactly matches expected revision',
      'authoritative TaskCycle is nonterminal',
      'no ExecutionAttempt remains UNKNOWN or reconciliation-required',
      'post-TaskCycle reconciliation is fully RESOLVED',
      'every pending obligation has one explicit competent satisfaction rule',
      'obligation authority is bound to competent reconciled evidence where required',
      'closure authority is bound to competent reconciled Developer evidence and available to the TaskCycle',
    ],
    effects: [
      { effect: 'state.taskcycle.write', scope: 'exact taskcycle only' },
    ],
    postconditions: [
      'all TaskCycle obligations are satisfied',
      'TaskCycle is CLOSED through a legal Lifecycle transition',
      'fresh Lifecycle verification succeeds',
      'repository, Git and remote effects remain NONE',
    ],
  });

  async function preflight(request) {
    const input = ReconcileAndCloseTaskCycleInput.parse(request.input);
    const prepared = prepare({ request, input, lifecycle: capability, reconcilePostTaskCycle });
    if (prepared.status !== 'READY') {
      return { status: prepared.status, reason: prepared.reason };
    }
    return {
      status: 'READY',
      handoff: issueHandoff(request, input, prepared),
    };
  }

  async function execute(request) {
    const input = ReconcileAndCloseTaskCycleInput.parse(request.input);
    let handoffSnapshot = null;
    if (request.preflight_handoff !== undefined) {
      const consumed = consumeHandoff(request, input);
      if (!consumed.ok) {
        return receipt(request, {
          status: 'FAIL',
          effectState: 'NONE',
          reason: `PRECONDITION_CHANGED_AFTER_PREFLIGHT:${consumed.reason}`,
        });
      }
      handoffSnapshot = consumed.snapshot;
    }
    const prepared = prepare({
      request, input, lifecycle: capability, reconcilePostTaskCycle, handoffSnapshot,
    });
    if (prepared.status !== 'READY') {
      return receipt(request, {
        status: 'FAIL',
        effectState: 'NONE',
        reason: `PRECONDITION_CHANGED_AFTER_PREFLIGHT:${prepared.reason}`,
        output: prepared.reconciliation ? {
          reconciliation: {
            disposition: prepared.reconciliation.disposition,
            unresolved: prepared.reconciliation.unresolved,
          },
          repository_effect: 'NONE', git_effect: 'NONE', remote_effect: 'NONE',
        } : undefined,
      });
    }

    let currentRevision = prepared.verified.revision;
    let confirmedMutations = 0;
    const satisfied = [];

    for (const rule of prepared.rules) {
      const mutation = invokeMutation({
        lifecycle: capability,
        taskcycleId: prepared.taskcycle.id,
        expectedRevision: currentRevision,
        invoke: () => capability.satisfyObligation({
          expectedRevision: currentRevision,
          taskcycleId: prepared.taskcycle.id,
          obligationId: rule.obligation_id,
          authorityRef: rule.authority_ref,
          authorityReference: rule.authority_reference,
        }),
        expectedEffect: (before, after) => expectedSatisfactionEffect(before, after, rule),
      });

      if (mutation.disposition !== 'ACKNOWLEDGED') {
        if (mutation.disposition === 'NO_EFFECT' || mutation.disposition === 'PRE_DISPATCH_FAILURE') {
          return receipt(request, {
            status: 'FAIL',
            effectState: confirmedMutations > 0 ? 'CONFIRMED' : 'NONE',
            reason: mutation.reason,
          });
        }
        if (mutation.disposition === 'EXACT_EFFECT_UNACKNOWLEDGED') {
          return receipt(request, {
            status: 'FAIL',
            effectState: 'CONFIRMED',
            reason: mutation.reason,
          });
        }
        return receipt(request, {
          status: 'UNKNOWN',
          effectState: 'UNKNOWN',
          reason: mutation.reason,
        });
      }
      currentRevision = mutation.result.revision;
      confirmedMutations += 1;
      satisfied.push(rule.obligation_id);
    }

    try {
      const observed = capability.snapshot(prepared.taskcycle.id);
      if (observed.revision !== currentRevision) {
        throw new Error('LIFECYCLE_OBLIGATION_REVISION_MISMATCH');
      }
      const obligationState = observed.obligations;
      if (obligationState.pending.length !== 0) {
        return receipt(request, {
          status: 'FAIL',
          effectState: confirmedMutations > 0 ? 'CONFIRMED' : 'NONE',
          reason: 'OBLIGATIONS_REMAIN_PENDING',
          output: closureOutput({
            reconciliation: prepared.reconciliation,
            satisfied,
            remaining: obligationState.pending,
            beforeState: prepared.taskcycle.state,
            afterState: prepared.taskcycle.state,
            finalVerify: { valid: true, revision: currentRevision, event_count: observed.event_count },
            precondition: prepared.precondition,
          }),
        });
      }
      if (!observed.legal_next.includes('CLOSED')) {
        return receipt(request, {
          status: 'FAIL',
          effectState: confirmedMutations > 0 ? 'CONFIRMED' : 'NONE',
          reason: 'TASKCYCLE_CLOSED_TRANSITION_NOT_LEGAL',
        });
      }
    } catch (error) {
      return receipt(request, {
        status: confirmedMutations > 0 ? 'UNKNOWN' : 'FAIL',
        effectState: confirmedMutations > 0 ? 'UNKNOWN' : 'NONE',
        reason: confirmedMutations > 0
          ? `LIFECYCLE_POST_MUTATION_READ_UNAVAILABLE:${error.message}`
          : `LIFECYCLE_PRE_MUTATION_READ_UNAVAILABLE:${error.message}`,
      });
    }

    const closeMutation = invokeMutation({
      lifecycle: capability,
      taskcycleId: prepared.taskcycle.id,
      expectedRevision: currentRevision,
      invoke: () => capability.closeTaskCycle({
        expectedRevision: currentRevision,
        taskcycleId: prepared.taskcycle.id,
        authorityRef: prepared.closureAuthority,
        dispositionRef: input.closure.disposition_ref,
      }),
      expectedEffect: (before, after) => expectedClosureEffect(before, after, input.closure),
    });

    if (closeMutation.disposition !== 'ACKNOWLEDGED') {
      if (closeMutation.disposition === 'NO_EFFECT' || closeMutation.disposition === 'PRE_DISPATCH_FAILURE') {
        return receipt(request, {
          status: 'FAIL',
          effectState: confirmedMutations > 0 ? 'CONFIRMED' : 'NONE',
          reason: closeMutation.reason,
        });
      }
      if (closeMutation.disposition === 'EXACT_EFFECT_UNACKNOWLEDGED') {
        return receipt(request, {
          status: 'FAIL',
          effectState: 'CONFIRMED',
          reason: closeMutation.reason,
        });
      }
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: closeMutation.reason,
      });
    }
    currentRevision = closeMutation.result.revision;
    confirmedMutations += 1;

    let finalSnapshot;
    try {
      finalSnapshot = capability.snapshot(prepared.taskcycle.id);
    } catch (error) {
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: `POST_CLOSURE_STATE_VERIFY_UNAVAILABLE:${error.message}`,
      });
    }
    const finalVerify = {
      valid: true,
      revision: finalSnapshot.revision,
      event_count: finalSnapshot.event_count,
    };
    const finalTaskCycle = finalSnapshot.taskcycle;

    if (
      finalVerify.revision !== currentRevision ||
      finalTaskCycle.state !== 'CLOSED' ||
      finalTaskCycle.id !== prepared.taskcycle.id
    ) {
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: 'POST_CLOSURE_AUTHORITATIVE_EFFECT_NOT_ESTABLISHED',
      });
    }

    if (finalSnapshot.obligations.pending.length !== 0) {
      return receipt(request, {
        status: 'UNKNOWN',
        effectState: 'UNKNOWN',
        reason: 'POST_CLOSURE_OBLIGATIONS_NOT_EMPTY',
      });
    }

    return receipt(request, {
      status: 'PASS',
      effectState: 'CONFIRMED',
      output: closureOutput({
        reconciliation: prepared.reconciliation,
        satisfied,
        remaining: [],
        beforeState: prepared.taskcycle.state,
        afterState: finalTaskCycle.state,
        finalVerify,
        precondition: prepared.precondition,
      }),
    });
  }

  return { definition, preflight, execute };
}

module.exports = {
  ReconcileAndCloseTaskCycleInput,
  createReconcileAndCloseTaskCycleRecipe,
  hasUnreconciledUnknown,
  sourceSatisfied,
};
