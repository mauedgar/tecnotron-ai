'use strict';

const crypto = require('node:crypto');
const { z } = require('zod');
const { ContextPackagerResult, EvidenceRequirement } = require('../contracts/context-packager');
const { Reference, Digest } = require('../contracts/agent-launch');
const { AgentLaunchPreflightError } = require('./authority');

const BudgetResolution = z.object({
  context_budget_ref: Reference,
  budget_tokens: z.number().int().positive(),
}).strict();
const SerializedContext = z.object({
  context_ref: Reference,
  digest: Digest,
  serialized: z.string().min(1).max(10 * 1024 * 1024),
}).strict();
const SerializedRequirements = z.object({
  evidence_requirements_ref: Reference,
  digest: Digest,
  serialized: z.string().min(1).max(1024 * 1024),
}).strict();
const EvidenceRequirements = z.array(EvidenceRequirement).min(1);

function digestText(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

function resolveWithBoundary(resolver, reference, schema) {
  if (typeof resolver !== 'function') throw new AgentLaunchPreflightError('CONTEXT_PROVIDER_UNAVAILABLE', 'UNAVAILABLE');
  let value;
  try {
    value = resolver(reference);
  } catch {
    throw new AgentLaunchPreflightError('CONTEXT_PROVIDER_UNAVAILABLE', 'UNAVAILABLE');
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AgentLaunchPreflightError('CONTEXT_NOT_READY');
  return parsed.data;
}

function parseIntegrityPayload(serialized, expectedDigest, schema) {
  if (digestText(serialized) !== expectedDigest) throw new AgentLaunchPreflightError('CONTEXT_NOT_READY');
  let raw;
  try {
    raw = JSON.parse(serialized);
  } catch {
    throw new AgentLaunchPreflightError('CONTEXT_NOT_READY');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AgentLaunchPreflightError('CONTEXT_NOT_READY');
  return parsed.data;
}

function validateReadyPackage(packageResult, budget) {
  if (
    packageResult.status !== 'COMPLETE'
    || packageResult.coverage_status !== 'COMPLETE'
    || packageResult.telemetry.coverage_status !== 'COMPLETE'
    || packageResult.missing_evidence_ids.length !== 0
    || packageResult.telemetry.missing_evidence_ids.length !== 0
    || packageResult.budget_tokens !== budget.budget_tokens
    || packageResult.telemetry.budget_tokens !== budget.budget_tokens
    || packageResult.tokens_delivered > budget.budget_tokens
    || packageResult.telemetry.tokens_delivered > budget.budget_tokens
  ) {
    throw new AgentLaunchPreflightError('CONTEXT_NOT_READY');
  }
}

function preflightContext(authorityResult, dependencies = {}) {
  const { request, resolvedAuthority } = authorityResult;
  if (
    request.context.context_ref !== resolvedAuthority.context.context_ref
    || request.context.evidence_requirements_ref !== resolvedAuthority.context.evidence_requirements_ref
    || request.context.context_budget_ref !== resolvedAuthority.context.context_budget_ref
  ) {
    throw new AgentLaunchPreflightError('CONTEXT_AUTHORITY_MISMATCH');
  }

  const budget = resolveWithBoundary(
    dependencies.resolveContextBudget,
    request.context.context_budget_ref,
    BudgetResolution,
  );
  if (budget.context_budget_ref !== request.context.context_budget_ref) {
    throw new AgentLaunchPreflightError('CONTEXT_AUTHORITY_MISMATCH');
  }

  let packageResult;
  let packageDigest;
  if (request.context.context_ref !== null) {
    const resolved = resolveWithBoundary(dependencies.resolveContext, request.context.context_ref, SerializedContext);
    if (resolved.context_ref !== request.context.context_ref) throw new AgentLaunchPreflightError('CONTEXT_AUTHORITY_MISMATCH');
    packageResult = parseIntegrityPayload(resolved.serialized, resolved.digest, ContextPackagerResult);
    packageDigest = resolved.digest;
  } else {
    const resolved = resolveWithBoundary(
      dependencies.resolveEvidenceRequirements,
      request.context.evidence_requirements_ref,
      SerializedRequirements,
    );
    if (resolved.evidence_requirements_ref !== request.context.evidence_requirements_ref) {
      throw new AgentLaunchPreflightError('CONTEXT_AUTHORITY_MISMATCH');
    }
    const requirements = parseIntegrityPayload(resolved.serialized, resolved.digest, EvidenceRequirements);
    if (!dependencies.contextPackager || typeof dependencies.contextPackager.package !== 'function') {
      throw new AgentLaunchPreflightError('CONTEXT_PROVIDER_UNAVAILABLE', 'UNAVAILABLE');
    }
    try {
      packageResult = ContextPackagerResult.parse(dependencies.contextPackager.package({
        budget_tokens: budget.budget_tokens,
        requested_evidence: requirements,
      }));
    } catch {
      throw new AgentLaunchPreflightError('CONTEXT_PROVIDER_UNAVAILABLE', 'UNAVAILABLE');
    }
    packageDigest = digestText(JSON.stringify(packageResult));
  }

  validateReadyPackage(packageResult, budget);
  return Object.freeze({
    context_ref: request.context.context_ref,
    evidence_requirements_ref: request.context.evidence_requirements_ref,
    context_budget_ref: request.context.context_budget_ref,
    package_digest: packageDigest,
    status: packageResult.status,
    coverage_status: packageResult.coverage_status,
    budget_tokens: packageResult.budget_tokens,
    tokens_delivered: packageResult.tokens_delivered,
    retrieval_providers: Object.freeze([...packageResult.retrieval_providers]),
    fallback: Object.freeze({ ...packageResult.fallback }),
  });
}

module.exports = { digestText, preflightContext };
