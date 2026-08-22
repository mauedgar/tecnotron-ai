'use strict';

const { ModelResolutionArtifactRef } = require('../contracts/model-resolution');

function appendRouteEvidence(history, artifactRef) {
  const parsed = ModelResolutionArtifactRef.parse(artifactRef);
  if (history.some((entry) => entry.path === parsed.path && entry.hash === parsed.hash)) return history.slice();
  return history.concat(parsed);
}

module.exports = { appendRouteEvidence };
