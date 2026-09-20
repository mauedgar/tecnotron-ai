'use strict';

const { isDeepStrictEqual } = require('node:util');

const EXACT = 'EXACT';
const NOT_EXACT = 'NOT_EXACT';
const UNRESOLVED = 'UNRESOLVED';

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertObject(value, name) {
  if (!isObject(value)) fail('INVALID_CONTRACT', `${name} must be an object`);
}

function assertExactKeys(value, allowed, name) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail('INVALID_CONTRACT', `${name} contains unknown key ${key}`);
  }
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('INVALID_CONTRACT', `${name} must be a non-empty string`);
  }
}


function assertOwnDefined(value, key, name) {
  if (!Object.prototype.hasOwnProperty.call(value, key) || value[key] === undefined) {
    fail('INVALID_CONTRACT', `${name} must be explicitly present and defined`);
  }
}

function assertStringArray(value, name) {
  if (!Array.isArray(value)) fail('INVALID_CONTRACT', `${name} must be an array`);
  value.forEach((entry, index) => assertString(entry, `${name}[${index}]`));
}

function assertUniqueStrings(values, name) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail('DUPLICATE_CONTRACT_ID', `${name} contains duplicate ${value}`);
    seen.add(value);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateResponsibility(value) {
  assertObject(value, 'Responsibility');
  assertExactKeys(
    value,
    ['id', 'objective', 'authority_basis', 'permitted_effects', 'forbidden_effects', 'mechanical_postconditions'],
    'Responsibility',
  );
  assertString(value.id, 'Responsibility.id');
  assertString(value.objective, 'Responsibility.objective');
  assertString(value.authority_basis, 'Responsibility.authority_basis');
  assertStringArray(value.permitted_effects, 'Responsibility.permitted_effects');
  assertStringArray(value.forbidden_effects, 'Responsibility.forbidden_effects');
  if (!Array.isArray(value.mechanical_postconditions)) {
    fail('INVALID_CONTRACT', 'Responsibility.mechanical_postconditions must be an array');
  }
  value.mechanical_postconditions.forEach((entry, index) => {
    assertObject(entry, `Responsibility.mechanical_postconditions[${index}]`);
    assertExactKeys(entry, ['id', 'operator', 'expected'], `Responsibility.mechanical_postconditions[${index}]`);
    assertString(entry.id, `Responsibility.mechanical_postconditions[${index}].id`);
    assertString(entry.operator, `Responsibility.mechanical_postconditions[${index}].operator`);
    assertOwnDefined(entry, 'expected', `Responsibility.mechanical_postconditions[${index}].expected`);
  });
  assertUniqueStrings(value.mechanical_postconditions.map((entry) => entry.id), 'Responsibility.mechanical_postconditions ids');
  return clone(value);
}

function validateCheckpoint(value) {
  assertObject(value, 'Checkpoint');
  assertExactKeys(
    value,
    ['checkpoint_id', 'predecessor_checkpoint_id', 'responsibility_id', 'authority_basis', 'context_cutoff', 'exact_state', 'evidence', 'postconditions', 'disposition'],
    'Checkpoint',
  );
  assertString(value.checkpoint_id, 'Checkpoint.checkpoint_id');
  if (value.predecessor_checkpoint_id !== null) {
    assertString(value.predecessor_checkpoint_id, 'Checkpoint.predecessor_checkpoint_id');
  }
  assertString(value.responsibility_id, 'Checkpoint.responsibility_id');
  assertString(value.authority_basis, 'Checkpoint.authority_basis');
  assertString(value.context_cutoff, 'Checkpoint.context_cutoff');
  assertObject(value.exact_state, 'Checkpoint.exact_state');
  if (!Array.isArray(value.evidence)) fail('INVALID_CONTRACT', 'Checkpoint.evidence must be an array');
  value.evidence.forEach((entry, index) => {
    assertObject(entry, `Checkpoint.evidence[${index}]`);
    assertExactKeys(entry, ['id', 'path', 'sha256'], `Checkpoint.evidence[${index}]`);
    assertString(entry.id, `Checkpoint.evidence[${index}].id`);
    assertString(entry.path, `Checkpoint.evidence[${index}].path`);
    if (!/^sha256:[a-f0-9]{64}$/i.test(entry.sha256)) {
      fail('INVALID_CONTRACT', `Checkpoint.evidence[${index}].sha256 must be sha256:<64 hex>`);
    }
  });
  assertUniqueStrings(value.evidence.map((entry) => entry.id), 'Checkpoint.evidence ids');

  if (!Array.isArray(value.postconditions)) fail('INVALID_CONTRACT', 'Checkpoint.postconditions must be an array');
  value.postconditions.forEach((entry, index) => {
    assertObject(entry, `Checkpoint.postconditions[${index}]`);
    assertExactKeys(entry, ['id', 'expected', 'observed', 'correspondence', 'evidence_refs'], `Checkpoint.postconditions[${index}]`);
    assertString(entry.id, `Checkpoint.postconditions[${index}].id`);
    assertOwnDefined(entry, 'expected', `Checkpoint.postconditions[${index}].expected`);
    assertOwnDefined(entry, 'observed', `Checkpoint.postconditions[${index}].observed`);
    if (![EXACT, NOT_EXACT, UNRESOLVED].includes(entry.correspondence)) {
      fail('INVALID_CONTRACT', `Checkpoint.postconditions[${index}].correspondence is invalid`);
    }
    assertStringArray(entry.evidence_refs, `Checkpoint.postconditions[${index}].evidence_refs`);
    assertUniqueStrings(entry.evidence_refs, `Checkpoint.postconditions[${index}].evidence_refs`);
  });
  assertUniqueStrings(value.postconditions.map((entry) => entry.id), 'Checkpoint.postcondition ids');

  assertObject(value.disposition, 'Checkpoint.disposition');
  assertExactKeys(value.disposition, ['continuation_eligible', 'reason'], 'Checkpoint.disposition');
  if (typeof value.disposition.continuation_eligible !== 'boolean') {
    fail('INVALID_CONTRACT', 'Checkpoint.disposition.continuation_eligible must be boolean');
  }
  assertString(value.disposition.reason, 'Checkpoint.disposition.reason');
  return clone(value);
}

function evaluateMechanicalPostcondition(input) {
  assertObject(input, 'MechanicalPostconditionEvaluation');
  assertOwnDefined(input, 'expected', 'MechanicalPostconditionEvaluation.expected');
  assertOwnDefined(input, 'observed', 'MechanicalPostconditionEvaluation.observed');
  const { id, operator, expected, observed, evidence_refs = [] } = input;
  if (operator !== EXACT) {
    return { id, expected, observed, correspondence: UNRESOLVED, evidence_refs: [...evidence_refs] };
  }
  return {
    id,
    expected,
    observed,
    correspondence: isDeepStrictEqual(expected, observed) ? EXACT : NOT_EXACT,
    evidence_refs: [...evidence_refs],
  };
}

function validateResponsibilityCheckpointPair(responsibility, checkpoint) {
  const r = validateResponsibility(responsibility);
  const c = validateCheckpoint(checkpoint);

  if (c.responsibility_id !== r.id) {
    fail('RESPONSIBILITY_ID_MISMATCH', 'checkpoint responsibility_id differs from responsibility.id');
  }
  if (c.authority_basis !== r.authority_basis) {
    fail('AUTHORITY_REFERENCE_MISMATCH', 'checkpoint and responsibility authority basis differ');
  }

  const checkpointById = new Map(c.postconditions.map((entry) => [entry.id, entry]));
  const declaredIds = new Set(r.mechanical_postconditions.map((entry) => entry.id));

  if (checkpointById.size !== declaredIds.size) {
    fail('POSTCONDITION_COVERAGE_MISMATCH', 'checkpoint postconditions must exactly cover responsibility mechanical postconditions');
  }

  const evidenceIds = new Set(c.evidence.map((entry) => entry.id));
  let allSatisfied = true;

  for (const declared of r.mechanical_postconditions) {
    const observed = checkpointById.get(declared.id);
    if (!observed) {
      fail('POSTCONDITION_COVERAGE_MISMATCH', `missing checkpoint postcondition ${declared.id}`);
    }
    if (!isDeepStrictEqual(declared.expected, observed.expected)) {
      fail('POSTCONDITION_EXPECTED_MISMATCH', declared.id);
    }

    for (const evidenceRef of observed.evidence_refs) {
      if (!evidenceIds.has(evidenceRef)) fail('DANGLING_EVIDENCE_REF', `${declared.id}:${evidenceRef}`);
    }

    const mechanical = evaluateMechanicalPostcondition({
      id: declared.id,
      operator: declared.operator,
      expected: declared.expected,
      observed: observed.observed,
      evidence_refs: observed.evidence_refs,
    });

    if (observed.correspondence !== mechanical.correspondence) {
      fail('POSTCONDITION_CORRESPONDENCE_INVALID', `${declared.id} expected ${mechanical.correspondence}, received ${observed.correspondence}`);
    }
    if (mechanical.correspondence !== EXACT) allSatisfied = false;
  }

  for (const observed of c.postconditions) {
    if (!declaredIds.has(observed.id)) {
      fail('POSTCONDITION_COVERAGE_MISMATCH', `unexpected checkpoint postcondition ${observed.id}`);
    }
  }

  if (c.disposition.continuation_eligible && !allSatisfied) {
    fail('CONTINUATION_ELIGIBILITY_INVALID', 'continuation_eligible=true requires every declared mechanical postcondition to be EXACT');
  }

  return { responsibility: r, checkpoint: c, all_mechanical_postconditions_satisfied: allSatisfied };
}

module.exports = {
  EXACT,
  NOT_EXACT,
  UNRESOLVED,
  validateResponsibility,
  validateCheckpoint,
  evaluateMechanicalPostcondition,
  validateResponsibilityCheckpointPair,
};
