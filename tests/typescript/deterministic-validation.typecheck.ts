import {
  DeterministicValidationReceipt,
  DeterministicValidationRequest,
  type DeterministicValidationReceiptInput,
  type DeterministicValidationRequestInput,
  type ExactGitSubject,
  type ValidationProfileRef,
} from '../../src-typescript/contracts/deterministic-validation';
import type {
  ExecutionAttemptId,
  OperationId,
} from '../../src-typescript/contracts/execution-coordination';

const subject: ExactGitSubject = {
  repository: 'mauedgar/tecnotron-ai',
  commit: '0123456789abcdef0123456789abcdef01234567',
};

const profile: ValidationProfileRef = {
  id: 'tecnotron-promotion',
  version: 'v0',
};

const requestInput: DeterministicValidationRequestInput = {
  schema_version: 'tecnotron-deterministic-validation-request/v0',
  subject,
  profile,
  correlation: {
    operation_id: 'operation-validation-001',
    execution_attempt_id: 'attempt-validation-001',
  },
  evidence_refs: [],
};

const request = DeterministicValidationRequest.parse(requestInput);
const operationId: OperationId = request.correlation!.operation_id;
const attemptId: ExecutionAttemptId = request.correlation!.execution_attempt_id;

void operationId;
void attemptId;

const receiptInput: DeterministicValidationReceiptInput = {
  schema_version: 'tecnotron-deterministic-validation-receipt/v0',
  requested_subject: subject,
  observed_subject: subject,
  correspondence: 'EXACT',
  profile,
  execution: {
    provider: 'github-actions',
    run_id: '123456789',
    run_attempt: 1,
    workflow_ref: 'deterministic-ci.yml@refs/heads/tools',
    workflow_sha: '89abcdef0123456789abcdef0123456789abcdef',
  },
  checks: [
    {
      id: 'typecheck',
      status: 'PASS',
      elapsed_ms: 1250,
    },
  ],
  conclusion: 'PASS',
  effect_state: 'NONE',
  artifact_refs: [],
  evidence_refs: [],
};

const receipt = DeterministicValidationReceipt.parse(receiptInput);
if (receipt.correspondence !== 'EXACT') {
  throw new Error('expected exact correspondence');
}
const exact: 'EXACT' = receipt.correspondence;
const noEffect: 'NONE' = receipt.effect_state;

void exact;
void noEffect;

// @ts-expect-error validation v0 cannot claim an effect.
const invalidEffect: DeterministicValidationReceiptInput['effect_state'] = 'CONFIRMED';
void invalidEffect;

// @ts-expect-error provider identity is intentionally fixed for the v0 Actions receipt.
const invalidProvider: DeterministicValidationReceiptInput['execution']['provider'] = 'orca';
void invalidProvider;
