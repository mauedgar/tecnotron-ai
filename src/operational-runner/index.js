'use strict';

const path = require('path');

const { OpenSpecAdapter } = require('../adapters/openspec');
const { OpenSpecCliClient } = require('../adapters/openspec-cli');
const { createCompositeMaterializer, createRepoPackagerMaterializer } = require('../adapters/repo-packager');
const { readTaskFile } = require('../adapters/task-file');
const { createAgentMvp } = require('../agent-mvp');
const { ContextPackager } = require('../core/context-packager');
const { RunStore } = require('../core/run-store');
const { resolveProject } = require('../project-profile');
const { loadRegistries } = require('../registries');

class OperationalRunnerError extends Error {
  constructor(message, code = 'OPERATIONAL_RUNNER_ERROR') {
    super(message);
    this.name = 'OperationalRunnerError';
    this.code = code;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function createRunId(taskId, now) {
  return `${taskId}-${now.toISOString().replace(/[-:.]/g, '')}`;
}

function createSimulationAdapter() {
  return {
    execute({ proposal, task, context }) {
      if (!task || context?.status !== 'COMPLETE') {
        return { status: 'UNAVAILABLE', details: 'Simulation requires a valid Task and COMPLETE context' };
      }
      const zeroCostResource = ['local', 'zero', 'zero_incremental'].includes(proposal.resource_class);
      const includedAccess = ['local', 'included'].includes(proposal.access_mode);
      if (!zeroCostResource || !includedAccess) {
        return { status: 'UNAVAILABLE', details: 'Simulation only accepts an eligible zero-incremental proposal' };
      }
      return {
        mode: 'simulated',
        provider: proposal.provider,
        runtime_id: proposal.runtime_id,
        outputs: [],
      };
    },
  };
}

function requireSafeFinOps(finops) {
  if (finops.paid_api_enabled !== false || finops.incremental_budget_usd !== 0) {
    throw new OperationalRunnerError('Paid API must remain disabled with zero incremental budget', 'PAID_API_BLOCKED');
  }
}

function buildContextEvent({ task, runId, createdAt, context, taskRef, contextRef }) {
  const stateTo = context.status === 'COMPLETE' ? 'EXECUTING' : context.status === 'PARTIAL' ? 'EXPLORING' : 'BLOCKED';
  return {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: `${runId}-context`,
    sequence: 1,
    task_id: task.task_id,
    run_id: runId,
    created_at: createdAt,
    actor: 'explorer',
    event_type: 'CONTEXT_DELIVERED',
    state_from: 'EXPLORING',
    state_to: stateTo,
    reason_code: `CONTEXT_${context.status}`,
    inputs: [taskRef],
    outputs: [contextRef],
    usage_record_id: null,
    idempotency_key: `${runId}:context`,
  };
}

function buildRouteEvent({ task, runId, createdAt, taskRef, modelRef }) {
  return {
    artifact: 'RUN_EVENT',
    schema_version: 'fitflow-run-event/v2',
    event_id: `${runId}-route`,
    sequence: 0,
    task_id: task.task_id,
    run_id: runId,
    created_at: createdAt,
    actor: 'model_resolver',
    event_type: 'ROUTE_DECIDED',
    state_from: 'ROUTING',
    state_to: 'EXPLORING',
    reason_code: 'MODEL_SELECTED',
    inputs: [taskRef],
    outputs: [modelRef],
    usage_record_id: null,
    idempotency_key: `${runId}:route`,
  };
}

function buildRunState({ task, runId, createdAt, result, contextRef, modelRef }) {
  const context = result.stages.context;
  const reachedValidating = result.reachedRuntime && result.runEvent;
  const currentState = reachedValidating
    ? 'VALIDATING'
    : context?.status === 'PARTIAL'
      ? 'EXPLORING'
      : task.risk === 'high'
        ? 'BLOCKED_HIGH_RISK'
        : 'BLOCKED';
  const nextState = currentState === 'VALIDATING' ? 'REVIEWING' : currentState === 'EXPLORING' ? 'EXPLORING' : null;
  return {
    artifact: 'RUN_STATE',
    schema_version: 'fitflow-run-state/v2',
    task_id: task.task_id,
    run_id: runId,
    updated_at: createdAt,
    baseline: task.baseline,
    workflow_id: 'development',
    current_state: currentState,
    next_state: nextState,
    sequence: result.runEvent ? result.runEvent.sequence : context ? 1 : modelRef ? 0 : 0,
    retry_counters: { context: 0, implementation: 0, review: 0 },
    context_deliveries: context && contextRef ? [{
      package_id: `${runId}-context`,
      consumer_role: result.stages.route?.role || 'explorer',
      mode: 'expanded',
      paths: context.telemetry.included_paths,
      tokens: context.tokens_delivered,
      content_hash: contextRef.hash,
    }] : [],
    route_history: modelRef ? [modelRef] : [],
    validation_history: [],
    review_history: [],
    blocked_by: ['BLOCKED', 'BLOCKED_HIGH_RISK'].includes(currentState) ? [result.cause || result.reason_code || 'WORKFLOW_BLOCKED'] : [],
    last_error: ['BLOCKED', 'BLOCKED_HIGH_RISK'].includes(currentState) ? result.cause || result.reason_code || 'WORKFLOW_BLOCKED' : null,
  };
}

async function runOperationalWorkflow(options, dependencies = {}) {
  const now = (dependencies.clock || (() => new Date()))();
  const budgetTokens = options.budgetTokens ?? 6000;
  if (!Number.isInteger(budgetTokens) || budgetTokens < 0) {
    throw new OperationalRunnerError('budgetTokens must be a non-negative integer', 'INVALID_CONTEXT_BUDGET');
  }

  const resolution = (dependencies.resolveProject || resolveProject)({
    projectRoot: options.projectRoot,
    profilePath: options.profilePath,
    aiCoreRoot: options.aiCoreRoot,
  });
  const taskPath = options.taskPath || path.join(resolution.projectRoot, '.ai', 'tasks', options.taskId, 'TASK.md');
  const task = (dependencies.readTaskFile || readTaskFile)(taskPath);
  if (options.taskId && options.taskId !== task.task_id) {
    throw new OperationalRunnerError('taskId does not match TASK.md', 'TASK_ID_MISMATCH');
  }

  const registries = (dependencies.loadRegistries || loadRegistries)(resolution.configDir, [
    'orchestrator.yaml', 'roles.yaml', 'models.yaml', 'finops.yaml',
  ]);
  const orchestrator = registries['orchestrator.yaml'];
  const roleRegistry = registries['roles.yaml'];
  const modelRegistry = registries['models.yaml'];
  const finops = registries['finops.yaml'];
  requireSafeFinOps(finops);

  const virtualPaths = task.openspec_change ? [`openspec:${task.openspec_change}`] : [];
  const virtualEvidence = [];
  let openSpecStatus = task.openspec_change ? 'UNAVAILABLE' : 'N/A';
  let openSpecError = null;
  if (task.openspec_change) {
    try {
      const client = dependencies.openSpecClient || new OpenSpecCliClient({ cwd: resolution.projectRoot });
      const change = await new OpenSpecAdapter(client).read(task.openspec_change);
      virtualEvidence.push({
        evidence_id: `openspec:${task.openspec_change}`,
        path: `openspec:${task.openspec_change}`,
        content: JSON.stringify(change.change),
      });
      openSpecStatus = 'PASS';
    } catch (error) {
      openSpecStatus = 'UNAVAILABLE';
      openSpecError = `${error.code || error.name || 'ERROR'}: ${error.message}`;
    }
  }

  const requestedPaths = unique([...virtualPaths, ...(task.required_docs || []), ...(options.requestedPaths || [])]);
  const requestedEvidence = requestedPaths.map((item) => ({
    evidence_id: item.startsWith('openspec:') ? item : `path:${item}`,
    path: item,
    required: true,
  }));
  const repositoryMaterializer = dependencies.repositoryMaterializer || createRepoPackagerMaterializer({
    root: resolution.projectRoot,
    scriptPath: path.join(resolution.aiCoreRoot, '.opencode', 'skills', 'repo-packager', 'scripts', 'pack.py'),
  });
  const contextPackager = new ContextPackager({
    materializer: createCompositeMaterializer({ repositoryMaterializer, virtualEvidence, virtualPaths }),
  });

  const runId = options.runId || createRunId(task.task_id, now);
  const runRoot = options.runRoot || path.resolve(resolution.projectRoot, resolution.profile.operational.run_root);
  const runStore = dependencies.runStore || new RunStore({ root: runRoot });
  const existingState = runStore.readRunState(runId);
  const createdAt = existingState?.updated_at || now.toISOString();
  const runtimeAdapter = dependencies.runtimeAdapter || createSimulationAdapter();
  const agent = createAgentMvp({
    contextPackager,
    adapter: runtimeAdapter,
    orchestrator,
    identityWriter: (identity) => runStore.writeArtifact(runId, 'runtime-identity.json', identity, 'fitflow-runtime-identity/v1'),
    eventMetadata: {
      event_id: `${runId}-execution`,
      sequence: 2,
      task_id: task.task_id,
      run_id: runId,
      created_at: createdAt,
      idempotency_key: `${runId}:execution`,
    },
  });
  const result = agent.execute({
    task,
    routingInput: { task_type: task.task_type, area: task.area, risk: task.risk },
    roleRegistry,
    modelRegistry,
    finops,
    orchestrator,
    requested_paths: requestedPaths,
    requested_evidence: requestedEvidence,
    budget_tokens: budgetTokens,
  });

  const taskRef = runStore.writeArtifact(runId, 'task.json', task, 'fitflow-task/v2');
  const modelRef = result.stages.model
    ? runStore.writeArtifact(runId, 'model-resolution.json', result.stages.model, 'fitflow-model-resolution/v1')
    : null;
  const contextRef = result.stages.context
    ? runStore.writeArtifact(runId, 'context-package.json', result.stages.context, 'fitflow-context-packager-result/v2')
    : null;
  if (result.stages.route?.status === 'ROUTED' && result.stages.model?.status === 'SELECTED' && modelRef) {
    runStore.appendEvent(buildRouteEvent({ task, runId, createdAt, taskRef, modelRef }));
  }
  if (result.stages.context) {
    runStore.appendEvent(buildContextEvent({ task, runId, createdAt, context: result.stages.context, taskRef, contextRef }));
  }
  if (result.runEvent) runStore.appendEvent(result.runEvent);

  const state = buildRunState({ task, runId, createdAt, result, contextRef, modelRef });
  runStore.writeRunState(state);
  const summary = {
    task_id: task.task_id,
    run_id: runId,
    status: result.status,
    reason_code: result.reason_code,
    stopped_at: result.stopped_at,
    reached_runtime: result.reachedRuntime,
    lifecycle_state: state.current_state,
    openspec_status: openSpecStatus,
    openspec_error: openSpecError,
    context: result.stages.context ? result.stages.context.telemetry : null,
    correlation: options.correlation || {},
  };
  runStore.writeArtifact(runId, 'workflow-summary.json', summary, 'fitflow-workflow-summary/v1');
  return { summary, result, state, runRoot };
}

module.exports = {
  OperationalRunnerError,
  buildRouteEvent,
  buildRunState,
  createSimulationAdapter,
  runOperationalWorkflow,
};
