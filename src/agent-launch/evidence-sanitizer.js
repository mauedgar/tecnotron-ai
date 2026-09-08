'use strict';

const { AgentLaunchPreflightError, digestValue } = require('./authority');

const SOURCES = new Set([
  'remote',
  'organizational',
  'global',
  'personal',
  'custom',
  'project',
  'managed',
  'inline',
]);
const STATES = new Set(['excluded', 'projected', 'applied', 'not_applicable']);
const SECRET_LIKE = /(?:api[_ -]?key|password|passwd|credential|bearer|token\s*=|secret\s*=|private key)/i;

function fail() {
  throw new AgentLaunchPreflightError('EVIDENCE_SANITIZATION_FAILED', 'FAILED');
}

function sanitizeCapabilityEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  if (Object.keys(value).some((key) => !['source_categories', 'capabilities'].includes(key))) fail();
  if (!Array.isArray(value.source_categories) || !Array.isArray(value.capabilities)) fail();

  const sourceCategories = value.source_categories.map((entry) => {
    if (
      !entry
      || typeof entry !== 'object'
      || Array.isArray(entry)
      || Object.keys(entry).some((key) => !['source', 'state'].includes(key))
      || !SOURCES.has(entry.source)
      || !STATES.has(entry.state)
    ) fail();
    return { source: entry.source, state: entry.state };
  }).sort((left, right) => left.source.localeCompare(right.source));
  const capabilities = value.capabilities.map((capability) => {
    if (typeof capability !== 'string' || !/^[a-z][a-z0-9_.:-]*$/.test(capability) || SECRET_LIKE.test(capability)) fail();
    return capability;
  }).sort();
  if (new Set(capabilities).size !== capabilities.length) fail();

  const sanitized = Object.freeze({
    source_categories: Object.freeze(sourceCategories.map(Object.freeze)),
    capabilities: Object.freeze(capabilities),
  });
  return Object.freeze({
    evidence: sanitized,
    capability_evidence_ref: digestValue({ kind: 'capability-evidence', value: sanitized }),
  });
}

module.exports = { sanitizeCapabilityEvidence };
