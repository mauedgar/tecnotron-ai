'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  requireExecutionLifecycleCapability,
  requireTaskCycleLifecycleCapability,
} = require('../../src/operational-spine-v0/taskcycle-lifecycle-capability');

test('portable lifecycle guards accept semantic capabilities without State Kernel shape', () => {
  const executionLifecycle = {
    observeOperation() {},
    observeAttemptPresence() {},
    prepareAttempt() {},
    confirmDispatchStart() {},
    recordPreflightTerminalOutcome() {},
    recordExecutionOutcome() {},
  };
  const taskcycleLifecycle = {
    snapshot() {},
    observeInvocationBookkeeping() {},
    hasUnreconciledExecution() {},
    satisfyObligation() {},
    closeTaskCycle() {},
  };

  assert.equal(requireExecutionLifecycleCapability(executionLifecycle), executionLifecycle);
  assert.equal(requireTaskCycleLifecycleCapability(taskcycleLifecycle), taskcycleLifecycle);
  assert.equal(Object.hasOwn(executionLifecycle, 'verify'), false);
  assert.equal(Object.hasOwn(taskcycleLifecycle, 'inspectTaskCycle'), false);
});

test('State-Kernel-shaped method bags are not portable lifecycle capabilities', () => {
  const kernelShaped = {
    verify() {},
    inspectTaskCycle() {},
    inspectOperation() {},
    inspectAttempt() {},
    obligations() {},
    satisfy() {},
    transition() {},
  };

  assert.throws(
    () => requireExecutionLifecycleCapability(kernelShaped),
    /executionLifecycle must provide/,
  );
  assert.throws(
    () => requireTaskCycleLifecycleCapability(kernelShaped),
    /taskcycleLifecycle must provide/,
  );
});
