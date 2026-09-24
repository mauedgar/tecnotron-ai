'use strict';

const {
  create,
  transition,
  inspect,
} = require('../state-kernel-v0');

function receiptRefs(receipt, additionalRefs = []) {
  return [
    ...(Array.isArray(receipt?.result_refs) ? receipt.result_refs : []),
    ...additionalRefs,
  ];
}

function createStateKernelAdapter({ store }) {
  if (!store || typeof store.verify !== 'function') {
    throw new TypeError('State Kernel store is required');
  }

  const revision = () => store.verify().revision;

  function inspectTaskCycle(id) {
    return inspect(store, 'TaskCycle', id);
  }

  function inspectOperation(id) {
    return inspect(store, 'Operation', id);
  }

  function inspectAttempt(id) {
    return inspect(store, 'ExecutionAttempt', id);
  }

  function ensureOperationRunning(operationId) {
    let observed = inspectOperation(operationId).aggregate;

    if (observed.state === 'DEFINED') {
      transition(store, revision(), 'Operation', operationId, 'READY');
      observed = inspectOperation(operationId).aggregate;
    }

    if (observed.state === 'READY') {
      transition(store, revision(), 'Operation', operationId, 'RUNNING');
      observed = inspectOperation(operationId).aggregate;
    }

    if (observed.state !== 'RUNNING') {
      throw new Error(`Operation ${operationId} is not executable from state ${observed.state}`);
    }

    return inspectOperation(operationId);
  }

  function startAttempt({ attemptId, operationId, authorityRefs = [] }) {
    create(
      store,
      revision(),
      'ExecutionAttempt',
      attemptId,
      { operation_id: operationId },
      authorityRefs,
    );
    return inspectAttempt(attemptId);
  }

  function markAttemptDispatched(attemptId) {
    transition(store, revision(), 'ExecutionAttempt', attemptId, 'DISPATCHED');
    return inspectAttempt(attemptId);
  }

  function markAttemptRunning(attemptId) {
    transition(store, revision(), 'ExecutionAttempt', attemptId, 'RUNNING');
    return inspectAttempt(attemptId);
  }

  function recordPreflightTerminal({
    attemptId,
    operationId,
    status,
    receipt,
    resultRefs = [],
  }) {
    const refs = receiptRefs(receipt, resultRefs);

    if (status === 'BLOCKED') {
      transition(store, revision(), 'ExecutionAttempt', attemptId, 'BLOCKED', {
        outcome: 'BLOCKED',
        result_refs: refs,
      });
      transition(store, revision(), 'Operation', operationId, 'BLOCKED');
    } else if (status === 'UNAVAILABLE') {
      transition(store, revision(), 'ExecutionAttempt', attemptId, 'UNAVAILABLE', {
        outcome: 'UNAVAILABLE',
        result_refs: refs,
      });
      transition(store, revision(), 'Operation', operationId, 'BLOCKED');
    } else if (status === 'CANCELLED') {
      transition(store, revision(), 'ExecutionAttempt', attemptId, 'CANCELLED', {
        outcome: 'CANCELLED',
        result_refs: refs,
      });
      transition(store, revision(), 'Operation', operationId, 'CANCELLED');
    } else {
      throw new Error(`unsupported preflight terminal status: ${status}`);
    }

    return {
      attempt: inspectAttempt(attemptId),
      operation: inspectOperation(operationId),
    };
  }

  function recordExecutionOutcome({
    attemptId,
    operationId,
    coordinatorOutcome,
    receipt,
    resultRefs = [],
  }) {
    const refs = receiptRefs(receipt, resultRefs);

    switch (coordinatorOutcome.status) {
      case 'SUCCESS':
        transition(store, revision(), 'ExecutionAttempt', attemptId, 'COMPLETED', {
          outcome: 'PASS',
          result_refs: refs,
        });
        transition(store, revision(), 'Operation', operationId, 'COMPLETED', {
          result_ref: receipt.receipt_ref,
        });
        break;
      case 'FAILED':
        transition(store, revision(), 'ExecutionAttempt', attemptId, 'FAILED', {
          outcome: 'FAIL',
          result_refs: refs,
        });
        transition(store, revision(), 'Operation', operationId, 'FAILED');
        break;
      case 'CANCELLED':
        transition(store, revision(), 'ExecutionAttempt', attemptId, 'CANCELLED', {
          outcome: 'CANCELLED',
          result_refs: refs,
        });
        transition(store, revision(), 'Operation', operationId, 'CANCELLED');
        break;
      case 'UNKNOWN':
        transition(store, revision(), 'ExecutionAttempt', attemptId, 'UNKNOWN', {
          result_refs: refs,
        });
        // Operation intentionally remains RUNNING. The State Kernel prevents a
        // new attempt while reconciliation_required=true.
        break;
      case 'PARTIAL_RESULT':
        // Partial execution remains RUNNING and resumable. It is not rewritten
        // into PASS/FAIL/UNKNOWN.
        break;
      default:
        throw new Error(`unsupported post-dispatch outcome: ${coordinatorOutcome.status}`);
    }

    return {
      attempt: inspectAttempt(attemptId),
      operation: inspectOperation(operationId),
    };
  }

  return {
    currentRevision: revision,
    inspectTaskCycle,
    inspectOperation,
    inspectAttempt,
    ensureOperationRunning,
    startAttempt,
    markAttemptDispatched,
    markAttemptRunning,
    recordPreflightTerminal,
    recordExecutionOutcome,
  };
}

module.exports = {
  createStateKernelAdapter,
};
