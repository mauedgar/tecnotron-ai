import contracts from './index.js';

export const { common, task, runEvent, runState, validation, contextPackager, route, modelResolution, runtimeIdentity } = contracts;
export default contracts;

import executionCoordination from './execution-coordination.js';

export const {
  EvidenceRef,
  EffectConstraint,
  ResolvedExecution,
  AuthorizationContext,
  HarnessConformance,
  ExecutionAttemptRequest,
  OutcomeStatus,
  ExecutionOutcome,
  mergeEvidenceRefs,
} = executionCoordination;