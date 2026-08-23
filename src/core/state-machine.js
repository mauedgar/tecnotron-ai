'use strict';

const { State } = require('../contracts/common');
const { Orchestrator } = require('../registries/schemas/orchestrator');

class InvalidTransitionError extends Error {
  constructor(from, to, reason) {
    super(`invalid transition ${from} -> ${to}: ${reason}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
    this.reason = reason;
  }
}

function buildTransitionMap(transitions) {
  const map = {};
  for (const [from, targets] of Object.entries(transitions)) {
    map[from] = new Set(targets);
  }
  return map;
}

class StateMachine {
  constructor(config) {
    this.config = Orchestrator.parse(config);
    this.states = new Set(this.config.states);
    this.transitions = buildTransitionMap(this.config.transitions);
    this.finalState = this.config.control.final_state;
    this.finalActor = this.config.control.final_actor;
    this.terminalAgentState = this.config.control.terminal_agent_state;
    this._validate();
  }

  _validate() {
    for (const [state, targets] of Object.entries(this.transitions)) {
      if (!this.states.has(state)) {
        throw new InvalidTransitionError(state, null, 'transition origin not in states');
      }
      for (const target of targets) {
        if (!this.states.has(target)) {
          throw new InvalidTransitionError(state, target, 'transition target not in states');
        }
      }
    }
    const entersRouting = this.transitions.PLANNING?.has('ROUTING');
    const leavesRouting = this.transitions.ROUTING?.has('EXPLORING') || this.transitions.ROUTING?.has('EXECUTING');
    if (!entersRouting || !leavesRouting) {
      throw new InvalidTransitionError('ROUTING', null, 'invalid routing transition');
    }
  }

  canTransition(from, to, actor = 'system') {
    if (!this.states.has(from)) {
      throw new InvalidTransitionError(from, to, 'unknown origin state');
    }
    if (!this.states.has(to)) {
      throw new InvalidTransitionError(from, to, 'unknown target state');
    }
    if (!this.transitions[from] || !this.transitions[from].has(to)) {
      return false;
    }
    if (to === this.finalState) {
      return actor === this.finalActor && from === this.terminalAgentState;
    }
    return true;
  }

  allowedTargets(from) {
    return Array.from(this.transitions[from] || []).sort();
  }
}

function createStateMachineFromOrchestrator(orchestrator) {
  return new StateMachine(orchestrator);
}

module.exports = { StateMachine, InvalidTransitionError, createStateMachineFromOrchestrator, State };
