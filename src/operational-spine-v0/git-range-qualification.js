'use strict';

function exactLine(result) {
  return (result.stdout || '').trim();
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function qualifyExactFirstParentLinearRange(git, repositoryPath, range) {
  if (range.commit_count !== range.ordered_commit_range.length) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_COMMIT_COUNT_MISMATCH' };
  }
  if (new Set(range.ordered_commit_range).size !== range.ordered_commit_range.length) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH' };
  }
  if (range.ordered_commit_range.at(-1) !== range.accepted_tip) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH' };
  }

  const canonicalPaths = [...new Set(range.changed_paths)].sort();
  if (!sameList(range.changed_paths, canonicalPaths)) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_CHANGED_PATHS_MISMATCH' };
  }

  const commits = git.commitRange(repositoryPath, range.integration_range_base, range.accepted_tip);
  if (commits.exit_code !== 0 || commits.error) {
    return { status: 'UNAVAILABLE', reason: 'ACCEPTED_RANGE_COMMIT_LIST_UNAVAILABLE' };
  }
  const observed = exactLine(commits) ? exactLine(commits).split(/\r?\n/) : [];
  if (!sameList(observed, range.ordered_commit_range)) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_ORDERED_COMMIT_RANGE_MISMATCH' };
  }
  if (observed.length !== range.commit_count) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_COMMIT_COUNT_MISMATCH' };
  }

  let expectedParent = range.integration_range_base;
  for (const commit of observed) {
    const firstParent = git.revParse(repositoryPath, `${commit}^1`);
    if (firstParent.exit_code !== 0 || exactLine(firstParent) !== expectedParent) {
      return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_NON_LINEAR' };
    }
    const secondParent = git.revParse(repositoryPath, `${commit}^2`);
    if (secondParent.exit_code === 0) {
      return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_HIDDEN_MERGE_OR_NON_LINEAR' };
    }
    if (secondParent.error) {
      return { status: 'UNAVAILABLE', reason: 'ACCEPTED_RANGE_PARENT_AUDIT_UNAVAILABLE' };
    }
    expectedParent = commit;
  }

  const paths = git.changedPaths(repositoryPath, range.integration_range_base, range.accepted_tip);
  if (paths.exit_code !== 0 || paths.error) {
    return { status: 'UNAVAILABLE', reason: 'ACCEPTED_RANGE_CHANGED_PATHS_UNAVAILABLE' };
  }
  const observedPaths = [...new Set((paths.stdout || '').split('\0').filter(Boolean))].sort();
  if (!sameList(observedPaths, range.changed_paths)) {
    return { status: 'BLOCKED', reason: 'ACCEPTED_RANGE_CHANGED_PATHS_MISMATCH' };
  }
  return { status: 'READY' };
}

module.exports = {
  qualifyExactFirstParentLinearRange,
};
