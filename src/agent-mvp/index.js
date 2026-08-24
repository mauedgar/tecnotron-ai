'use strict';

const { TaskRoutingInput } = require('../contracts/task');
const { EvidenceRequirement } = require('../contracts/context-packager');

const STAGE = {
  INPUT: 'input',
  ROUTER: 'router',
  MODEL_RESOLVER: 'model-resolver',
  EXPLORER: 'explorer',
  RUNTIME: 'runtime',
};

let cachedDefaults = null;
function loadDefaults() {
  if (!cachedDefaults) {
    const { routeTask } = require('../router');
    const { resolveModel } = require('../model-resolver');
    const { decideContext } = require('../explorer');
    const { executeRuntime } = require('../agent-runtime');
    cachedDefaults = {
      router: (routingInput, roleRegistry) => routeTask(routingInput, roleRegistry),
      modelResolver: (args) => resolveModel(args),
      explorer: (contextResult) => decideContext(contextResult),
      agentRuntime: (args) => executeRuntime(args),
    };
  }
  return cachedDefaults;
}

function resolveConfig(value, fallback) {
  return value !== undefined ? value : fallback;
}

function isNonEmptyObject(value) {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateAgentMvpInput(input) {
  const errors = [];
  if (!isNonEmptyObject(input)) {
    errors.push({ field: 'root', message: 'input must be a non-null object' });
    return errors;
  }

  if (!isNonEmptyObject(input.routingInput)) {
    errors.push({ field: 'routingInput', message: 'routingInput must be a non-null object' });
  } else {
    const parsed = TaskRoutingInput.safeParse(input.routingInput);
    if (!parsed.success) {
      errors.push({
        field: 'routingInput',
        message: 'routingInput must satisfy the canonical TaskRoutingInput contract',
        details: parsed.error.issues.map((issue) => issue.message),
      });
    }
  }

  for (const field of ['roleRegistry', 'modelRegistry', 'finops']) {
    if (!isNonEmptyObject(input[field])) {
      errors.push({ field, message: `${field} must be a non-null object` });
    }
  }

  if (input.budget_tokens === undefined || input.budget_tokens === null) {
    errors.push({ field: 'budget_tokens', message: 'budget_tokens is required' });
  } else if (!Number.isInteger(input.budget_tokens) || input.budget_tokens < 0) {
    errors.push({ field: 'budget_tokens', message: 'budget_tokens must be a non-negative integer' });
  }

  if (input.requested_paths !== undefined) {
    if (!Array.isArray(input.requested_paths) || !input.requested_paths.every((p) => typeof p === 'string')) {
      errors.push({ field: 'requested_paths', message: 'requested_paths must be an array of strings' });
    }
  }

  if (input.requested_evidence !== undefined) {
    if (!Array.isArray(input.requested_evidence)) {
      errors.push({ field: 'requested_evidence', message: 'requested_evidence must be an array' });
    } else {
      input.requested_evidence.forEach((entry, index) => {
        const parsed = EvidenceRequirement.safeParse(entry);
        if (!parsed.success) {
          errors.push({
            field: `requested_evidence[${index}]`,
            message: 'each requested_evidence entry must satisfy the EvidenceRequirement contract',
            details: parsed.error.issues.map((issue) => issue.message),
          });
        }
      });
    }
  }

  return errors;
}

function stop(stage, stages, cause) {
  return {
    stopped_at: stage,
    reachedRuntime: false,
    stages,
    status: 'BLOCKED',
    reason_code: cause || null,
    identity: null,
    runEvent: null,
    cause: cause || null,
  };
}

function createAgentMvp(deps = {}) {
  if (!deps.contextPackager || typeof deps.contextPackager.package !== 'function') {
    throw new TypeError('createAgentMvp requires a contextPackager with a package method');
  }
  if (!deps.adapter || typeof deps.adapter.execute !== 'function') {
    throw new TypeError('createAgentMvp requires an adapter with an execute method');
  }

  const defaults = () => loadDefaults();
  const router = deps.router || defaults().router;
  const modelResolver = deps.modelResolver || defaults().modelResolver;
  const explorer = deps.explorer || defaults().explorer;
  const agentRuntime = deps.agentRuntime || defaults().agentRuntime;
  const contextPackager = deps.contextPackager;
  const adapter = deps.adapter;
  const baseOrchestrator = deps.orchestrator !== undefined ? deps.orchestrator : null;
  const baseIdentityArtifact = deps.identityArtifact !== undefined ? deps.identityArtifact : null;
  const baseEventMetadata = deps.eventMetadata !== undefined ? deps.eventMetadata : null;

  function execute(input = {}) {
    const stages = { route: null, model: null, context: null, explorer: null, runtime: null };

    const validationErrors = validateAgentMvpInput(input);
    if (validationErrors.length > 0) {
      return {
        stopped_at: STAGE.INPUT,
        reachedRuntime: false,
        stages,
        status: 'BLOCKED',
        reason_code: 'INVALID_AGENT_MVP_INPUT',
        identity: null,
        runEvent: null,
        cause: 'INVALID_AGENT_MVP_INPUT',
        validation_errors: validationErrors,
      };
    }

    const orchestrator = resolveConfig(input.orchestrator, baseOrchestrator);
    const identityArtifact = resolveConfig(input.identityArtifact, baseIdentityArtifact);
    const eventMetadata = resolveConfig(input.eventMetadata, baseEventMetadata);

    const routeDecision = router(input.routingInput, input.roleRegistry);
    stages.route = routeDecision;
    if (!routeDecision || routeDecision.status !== 'ROUTED') {
      return stop(STAGE.ROUTER, stages, routeDecision && routeDecision.reason_code);
    }

    const modelResolution = modelResolver({
      role: routeDecision.role,
      requirements: routeDecision.requirements,
      modelRegistry: input.modelRegistry,
      roleRegistry: input.roleRegistry,
      finops: input.finops,
    });
    stages.model = modelResolution;
    if (!modelResolution || modelResolution.status !== 'SELECTED') {
      return stop(STAGE.MODEL_RESOLVER, stages, modelResolution && modelResolution.reason_code);
    }

    const contextResult = contextPackager.package({
      budget_tokens: input.budget_tokens,
      requested_paths: input.requested_paths || [],
      requested_evidence: input.requested_evidence || [],
    });
    stages.context = contextResult;

    const explorerDecision = explorer(contextResult);
    stages.explorer = explorerDecision;
    if (!explorerDecision || explorerDecision.action !== 'PROCEED') {
      return stop(STAGE.EXPLORER, stages, explorerDecision && explorerDecision.reason_code);
    }

    const runtimeResult = agentRuntime({
      routeDecision,
      modelResolution,
      adapter,
      identityArtifact,
      eventMetadata,
      orchestrator,
    });
    stages.runtime = runtimeResult;

    return {
      stopped_at: STAGE.RUNTIME,
      reachedRuntime: true,
      stages,
      status: runtimeResult
        ? (runtimeResult.status !== undefined ? runtimeResult.status : (runtimeResult.identity ? runtimeResult.identity.status : null))
        : null,
      reason_code: runtimeResult
        ? (runtimeResult.reason_code !== undefined ? runtimeResult.reason_code : (runtimeResult.identity ? runtimeResult.identity.reason_code : null))
        : null,
      identity: runtimeResult ? runtimeResult.identity : null,
      runEvent: runtimeResult ? runtimeResult.event : null,
      cause: null,
    };
  }

  return { execute };
}

module.exports = { createAgentMvp, STAGE };
