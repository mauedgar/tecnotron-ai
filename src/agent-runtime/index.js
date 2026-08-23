'use strict';

const { RuntimeIdentity } = require('../contracts/runtime-identity');
const { RunEvent } = require('../contracts/run-event');
const { Actor, ArtifactRef } = require('../contracts/common');
const { createStateMachineFromOrchestrator } = require('../core/state-machine');

const EXECUTION_FROM = 'EXECUTING';
const EXECUTION_TO = 'VALIDATING';
const EXECUTION_ACTOR = 'adapter';

function failedOutcome(proposal, details) {
  const identity = RuntimeIdentity.parse({
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'FAILED',
    reason_code: 'EXECUTION_FAILED',
    simulated: false,
    proposal,
    effective: null,
    details,
  });
  return {
    status: 'FAILED',
    reason_code: 'EXECUTION_FAILED',
    identity,
    event: null,
  };
}

function executeRuntime({ routeDecision, modelResolution, adapter, identityArtifact, eventMetadata, orchestrator }) {
  if (routeDecision.status !== 'ROUTED') {
    return {
      status: 'BLOCKED',
      reason_code: 'ROUTE_NOT_ROUTED',
      identity: null,
      event: null,
    };
  }
  if (modelResolution.status !== 'SELECTED') {
    return {
      status: 'BLOCKED',
      reason_code: 'MODEL_NOT_SELECTED',
      identity: null,
      event: null,
    };
  }
  let stateMachine;
  try {
    stateMachine = createStateMachineFromOrchestrator(orchestrator);
  } catch {
    return failedOutcome(
      modelResolution.selected,
      'Invalid orchestrator configuration',
    );
  }
  let transitionAllowed;
  try {
    transitionAllowed = Actor.safeParse(EXECUTION_ACTOR).success
      && stateMachine.canTransition(EXECUTION_FROM, EXECUTION_TO, EXECUTION_ACTOR);
  } catch {
    transitionAllowed = false;
  }
  if (!transitionAllowed) {
    return failedOutcome(
      modelResolution.selected,
      'Orchestrator does not allow transition EXECUTING -> VALIDATING',
    );
  }
  if (!adapter || typeof adapter.execute !== 'function') {
    const identity = RuntimeIdentity.parse({
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'UNAVAILABLE',
      reason_code: 'ADAPTER_UNAVAILABLE',
      simulated: false,
      proposal: modelResolution.selected,
      effective: null,
      details: 'Adapter is unavailable',
    });
    return {
      status: 'UNAVAILABLE',
      reason_code: 'ADAPTER_UNAVAILABLE',
      identity,
      event: null,
    };
  }

  let execution;
  try {
    execution = adapter.execute({
      route: routeDecision,
      proposal: modelResolution.selected,
    });
  } catch (error) {
    const details = error instanceof Error
      ? error.message
      : 'Adapter threw a non-Error value';
    return failedOutcome(modelResolution.selected, details);
  }
  if (execution?.status === 'UNAVAILABLE') {
    const identity = RuntimeIdentity.parse({
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'UNAVAILABLE',
      reason_code: 'RUNTIME_UNAVAILABLE',
      simulated: false,
      proposal: modelResolution.selected,
      effective: null,
      details: typeof execution.details === 'string'
        ? execution.details
        : 'Runtime reported unavailable without details',
    });
    return {
      status: 'UNAVAILABLE',
      reason_code: 'RUNTIME_UNAVAILABLE',
      identity,
      event: null,
    };
  }
  const validExecution = execution
    && ['real', 'simulated'].includes(execution.mode)
    && typeof execution.provider === 'string'
    && execution.provider.length > 0
    && typeof execution.runtime_id === 'string'
    && execution.runtime_id.length > 0
    && Array.isArray(execution.outputs);
  if (!validExecution) {
    return failedOutcome(
      modelResolution.selected,
      'Adapter returned a malformed execution result',
    );
  }
  if (execution.outputs.some((output) => !ArtifactRef.safeParse(output).success)) {
    return failedOutcome(
      modelResolution.selected,
      'Adapter produced an invalid output artifact',
    );
  }
  const simulated = execution.mode === 'simulated';
  const mismatch = execution.provider !== modelResolution.selected.provider
    || execution.runtime_id !== modelResolution.selected.runtime_id;
  const reasonCode = mismatch
    ? 'PROPOSAL_MISMATCH'
    : simulated
      ? 'SIMULATION_DECLARED'
      : 'IDENTITY_CONFIRMED';
  const identity = RuntimeIdentity.parse({
    schema_version: 'fitflow-runtime-identity/v1',
    status: mismatch ? 'MISMATCH' : 'CONFIRMED',
    reason_code: reasonCode,
    simulated,
    proposal: modelResolution.selected,
    effective: {
      mode: execution.mode,
      provider: execution.provider,
      runtime_id: execution.runtime_id,
    },
    details: mismatch ? 'Effective runtime differs from proposal' : null,
  });
  const event = RunEvent.parse({
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    ...eventMetadata,
    actor: EXECUTION_ACTOR,
    event_type: 'EXECUTION_COMPLETED',
    state_from: EXECUTION_FROM,
    state_to: EXECUTION_TO,
    reason_code: reasonCode,
    inputs: [],
    outputs: [identityArtifact, ...execution.outputs],
  });

  return { identity, event };
}

module.exports = { executeRuntime };
