'use strict';

const { State } = require('../contracts/common');

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
    this.config = config;
    this.states = new Set(config.states);
    this.transitions = buildTransitionMap(config.transitions);
    this.finalState = config.control.final_state;
    this.finalActor = config.control.final_actor;
    this.terminalAgentState = config.control.terminal_agent_state;
    this._validate();
  }

  _validate() {
    for (const state of this.states) {
      if (!this.transitions[state]) {
        continue;
      }
      if (!this.states.has(state)) {
        throw new InvalidTransitionError(state, null, 'transition origin not in states');
      }
      for (const target of this.transitions[state]) {
        if (!this.states.has(target)) {
          throw new InvalidTransitionError(state, target, 'transition target not in states');
        }
      }
    }
  }

  canTransition(from, to, actor = 'system') {
    if (!this.states.has(from)) {
      throw new InvalidTransitionError(from, to, 'unknown origin state');
    }
    if (!this.states.has(to)) {
      throw new InvalidTransitionError(from, to, 'unknown target state');
    }
    if (!this.transitions[from].has(to)) {
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