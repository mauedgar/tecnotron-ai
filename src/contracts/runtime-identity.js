'use strict';

const { z } = require('zod');
const { ArtifactRef } = require('./common');
const { SelectedModel } = require('./model-resolution');

const RUNTIME_IDENTITY_SCHEMA_VERSION = 'fitflow-runtime-identity/v1';

const RuntimeIdentityStatus = z.enum(['CONFIRMED', 'MISMATCH', 'UNAVAILABLE', 'FAILED']);

const RuntimeIdentityReasonCode = z.enum([
  'IDENTITY_CONFIRMED',
  'SIMULATION_DECLARED',
  'PROPOSAL_MISMATCH',
  'RUNTIME_UNAVAILABLE',
  'ADAPTER_UNAVAILABLE',
  'EXECUTION_FAILED',
]);

const EffectiveIdentity = z
  .object({
    mode: z.enum(['real', 'simulated']),
    provider: z.string().min(1),
    runtime_id: z.string().min(1),
  })
  .strict();

const RuntimeIdentity = z
  .object({
    schema_version: z.literal(RUNTIME_IDENTITY_SCHEMA_VERSION),
    status: RuntimeIdentityStatus,
    reason_code: RuntimeIdentityReasonCode,
    simulated: z.boolean(),
    proposal: SelectedModel.nullable(),
    effective: EffectiveIdentity.nullable(),
    details: z.string().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (['CONFIRMED', 'MISMATCH'].includes(value.status) && value.effective === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effective'],
        message: `${value.status} requires effective identity`,
      });
    }
    if (value.status === 'UNAVAILABLE' && value.effective !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effective'],
        message: 'UNAVAILABLE requires null effective identity',
      });
    }
    if (
      value.reason_code === 'SIMULATION_DECLARED'
      && (!value.simulated || value.effective?.mode !== 'simulated')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['simulated'],
        message: 'SIMULATION_DECLARED requires simulated effective identity',
      });
    }
    if (
      value.reason_code === 'IDENTITY_CONFIRMED'
      && (value.simulated || value.effective?.mode !== 'real')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['simulated'],
        message: 'IDENTITY_CONFIRMED requires real effective identity',
      });
    }
    if (
      value.status === 'CONFIRMED'
      && !['IDENTITY_CONFIRMED', 'SIMULATION_DECLARED'].includes(value.reason_code)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason_code'],
        message: 'CONFIRMED requires a confirmation reason code',
      });
    }
    if (value.status === 'MISMATCH' && value.proposal === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposal'],
        message: 'MISMATCH requires proposal',
      });
    }
    if (value.status === 'FAILED' && value.effective !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effective'],
        message: 'FAILED requires null effective identity',
      });
    }
  });

const RuntimeIdentityArtifactRef = ArtifactRef.extend({
  schema_version: z.literal(RUNTIME_IDENTITY_SCHEMA_VERSION),
}).strict();

module.exports = {
  RUNTIME_IDENTITY_SCHEMA_VERSION,
  RuntimeIdentityStatus,
  RuntimeIdentityReasonCode,
  EffectiveIdentity,
  RuntimeIdentity,
  RuntimeIdentityArtifactRef,
};
