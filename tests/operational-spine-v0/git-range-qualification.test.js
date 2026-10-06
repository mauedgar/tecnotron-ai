'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  qualifyExactFirstParentLinearRange,
} = require('../../src/operational-spine-v0/git-range-qualification');

const base = 'a'.repeat(40);
const first = 'b'.repeat(40);
const tip = 'c'.repeat(40);

function result(stdout = '', exitCode = 0, error = null) {
  return { exit_code: exitCode, signal: null, error, stdout, stderr: '' };
}

function exactRange(overrides = {}) {
  return {
    integration_range_base: base,
    accepted_tip: tip,
    accepted_tip_parent: first,
    accepted_tip_tree: 'd'.repeat(40),
    ordered_commit_range: [first, tip],
    commit_count: 2,
    changed_paths: ['first.txt', 'tip.txt'],
    ...overrides,
  };
}

function gitAdapter(overrides = {}) {
  return {
    commitRange: () => result(`${first}\n${tip}\n`),
    revParse: (_repositoryPath, spec) => {
      if (spec === `${first}^1`) return result(base);
      if (spec === `${tip}^1`) return result(first);
      if (spec === `${first}^2` || spec === `${tip}^2`) return result('', 128);
      return result('', 128);
    },
    changedPaths: () => result('first.txt\0tip.txt\0'),
    ...overrides,
  };
}

test('qualifies an exact first-parent linear range', () => {
  assert.deepEqual(
    qualifyExactFirstParentLinearRange(gitAdapter(), '/repo', exactRange()),
    { status: 'READY' },
  );
});

test('fails closed on declared range correspondence mismatches', () => {
  const cases = [
    [exactRange({ commit_count: 3 }), 'ACCEPTED_RANGE_COMMIT_COUNT_MISMATCH'],
    [exactRange({ ordered_commit_range: [first, first] }), 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH'],
    [exactRange({ ordered_commit_range: [tip, first] }), 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH'],
    [exactRange({ changed_paths: ['tip.txt', 'first.txt'] }), 'ACCEPTED_RANGE_CHANGED_PATHS_MISMATCH'],
  ];

  for (const [range, reason] of cases) {
    assert.deepEqual(
      qualifyExactFirstParentLinearRange(gitAdapter(), '/repo', range),
      { status: 'BLOCKED', reason },
    );
  }
});

test('distinguishes non-linear history, hidden merges, and unavailable audits', () => {
  const nonLinear = gitAdapter({
    revParse: (_repositoryPath, spec) => spec === `${first}^1` ? result(tip) : result('', 128),
  });
  assert.deepEqual(qualifyExactFirstParentLinearRange(nonLinear, '/repo', exactRange()), {
    status: 'BLOCKED', reason: 'ACCEPTED_RANGE_NON_LINEAR',
  });

  const hiddenMerge = gitAdapter({
    revParse: (_repositoryPath, spec) => {
      if (spec === `${first}^1`) return result(base);
      if (spec === `${first}^2`) return result('e'.repeat(40));
      return result('', 128);
    },
  });
  assert.deepEqual(qualifyExactFirstParentLinearRange(hiddenMerge, '/repo', exactRange()), {
    status: 'BLOCKED', reason: 'ACCEPTED_RANGE_HIDDEN_MERGE_OR_NON_LINEAR',
  });

  const unavailable = gitAdapter({
    changedPaths: () => result('', null, new Error('git unavailable')),
  });
  assert.deepEqual(qualifyExactFirstParentLinearRange(unavailable, '/repo', exactRange()), {
    status: 'UNAVAILABLE', reason: 'ACCEPTED_RANGE_CHANGED_PATHS_UNAVAILABLE',
  });
});
