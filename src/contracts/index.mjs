import contracts from './index.js';

export const { common, task, runEvent, runState, validation, contextPackager, route, modelResolution, runtimeIdentity, sddArtifacts } = contracts;
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

import sddArtifactContracts from './sdd-artifacts.js';

export const {
  CONTRACT_VERSION,
  ARTIFACT_KINDS,
  ALLOWED_RELATIONS,
  Reference,
  RequirementReference,
  ArtifactSchemas,
  parseSddArtifact,
  validateSddArtifactSet,
} = sddArtifactContracts;
