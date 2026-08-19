'use strict';

const { z } = require('zod');

const TaskId = z.string().regex(/^[A-Z][A-Z0-9-]{2,63}$/);
const RunId = z.string().min(3).max(160);
const Timestamp = z.iso.datetime({ offset: true });
const Hash = z.string().regex(/^(sha256:)?[A-Fa-f0-9]{32,128}$/);

const State = z.enum([
  'BACKLOG', 'READY', 'PLANNING', 'ROUTING', 'EXPLORING', 'EXECUTING',
  'VALIDATING', 'REVIEWING', 'DOC_SYNC', 'PENDING_ACCEPTANCE',
  'WAITING_DEVELOPER', 'DONE', 'BLOCKED', 'BLOCKED_HIGH_RISK', 'CANCELLED',
]);

const Actor = z.enum([
  'developer', 'system', 'router', 'model_resolver', 'explorer', 'coder_b',
  'coder_a', 'coder_strong_a', 'reviewer', 'architect', 'doc_curator',
  'validator', 'adapter',
]);

const NormalizedStatus = z.enum(['PASS', 'FAIL', 'NOT_RUN', 'UNAVAILABLE', 'BLOCKED', 'N/A']);

const Baseline = z
  .object({
    revision: z.string().min(1),
    fingerprint_status: z.enum(['captured', 'unavailable']),
    working_tree_fingerprint: z.union([
      z.string().regex(/^sha256:[A-Fa-f0-9]{64}$/),
      z.null(),
    ]),
    fingerprint_reason: z.union([z.string().min(3), z.null()]),
  })
  .superRefine((val, ctx) => {
    if (val.fingerprint_status === 'captured') {
      if (!val.working_tree_fingerprint) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['working_tree_fingerprint'], message: 'captured requires fingerprint' });
      }
      if (val.fingerprint_reason !== null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fingerprint_reason'], message: 'captured requires null reason' });
      }
    } else {
      if (val.working_tree_fingerprint !== null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['working_tree_fingerprint'], message: 'unavailable requires null fingerprint' });
      }
    }
  });

const ArtifactRef = z.object({
  path: z.string().min(1),
  hash: Hash,
  schema_version: z.union([z.string(), z.null()]).optional(),
});

module.exports = { TaskId, RunId, Timestamp, Hash, State, Actor, NormalizedStatus, Baseline, ArtifactRef };
