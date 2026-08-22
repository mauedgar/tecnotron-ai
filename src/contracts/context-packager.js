'use strict';

const { z } = require('zod');

const EvidenceRequirement = z.object({
  evidence_id: z.string().min(1),
  path: z.string().min(1).nullable().optional(),
  required: z.boolean().default(true),
}).strict();

const ContextEvidence = z.object({
  evidence_id: z.string().min(1),
  path: z.string().min(1).nullable().optional(),
  content: z.string(),
}).strict();

const TokenizerMetadata = z.object({
  name: z.string().min(1),
  exact: z.boolean(),
  limitation: z.string().nullable(),
}).strict();

const ContextTelemetry = z.object({
  budget_tokens: z.number().int().nonnegative(),
  tokens_delivered: z.number().int().nonnegative(),
  requested_paths: z.array(z.string()),
  included_paths: z.array(z.string()),
  omitted_paths: z.array(z.string()),
  requested_evidence_ids: z.array(z.string()),
  included_evidence_ids: z.array(z.string()),
  missing_evidence_ids: z.array(z.string()),
  coverage_status: z.enum(['COMPLETE', 'PARTIAL', 'EMPTY']),
  fallback_used: z.boolean(),
  retrieval_provider: z.array(z.string().min(1)).min(1),
  tokenizer: TokenizerMetadata,
}).strict();

const ContextPackagerResult = z.object({
  status: z.enum(['COMPLETE', 'PARTIAL', 'EMPTY']),
  requested_evidence: z.array(EvidenceRequirement),
  included_evidence: z.array(ContextEvidence),
  omitted_evidence: z.array(EvidenceRequirement),
  budget_tokens: z.number().int().nonnegative(),
  tokens_delivered: z.number().int().nonnegative(),
  retrieval_providers: z.array(z.string().min(1)).min(1),
  fallback: z.object({
    used: z.boolean(),
    provider: z.string().min(1).nullable(),
    reason: z.enum(['MISSING_EVIDENCE', 'STALE_EVIDENCE', 'CONTRADICTORY_EVIDENCE']).nullable(),
  }).strict(),
  coverage_status: z.enum(['COMPLETE', 'PARTIAL', 'EMPTY']),
  missing_evidence_ids: z.array(z.string()),
  telemetry: ContextTelemetry,
}).strict();

module.exports = { EvidenceRequirement, ContextEvidence, ContextTelemetry, ContextPackagerResult };
