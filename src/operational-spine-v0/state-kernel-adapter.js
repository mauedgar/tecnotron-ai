'use strict';

const {
  FilesystemStateStore,
  create,
  transition,
  inspect,
  obligations,
  satisfy,
  render,
} = require('../state-kernel-v0');

function receiptRefs(receipt, additionalRefs = []) {
  return [
    ...(Array.isArray(receipt?.result_refs) ? receipt.result_refs : []),
    ...additionalRefs,
  ];
}

function requireStore(store) {
  if (!store || typeof store.verify !== 'function') {
    throw new TypeError('State Kernel compatibility binding requires a verifiable store');
  }
  return store;
}

function verifiedRevision(store) {
  const verified = store.verify();
  if (!verified || verified.valid !== true || !Number.isSafeInteger(verified.revision)) {
    throw new Error('LIFECYCLE_VERIFY_UNAVAILABLE');
  }
  return verified.revision;
}

function inspectAtRevision(store, kind, id, expectedRevision) {
  const observed = inspect(store, kind, id);
  if (!observed || !observed.aggregate || observed.store_revision !== expectedRevision) {
    throw new Error('LIFECYCLE_SNAPSHOT_REVISION_MISMATCH');
  }
  return observed;
}

function createStateKernelExecutionLifecycle({ store }) {
  const boundStore = requireStore(store);

  function observeOperation(operationId) {
    return inspect(boundStore, 'Operation', operationId);
  }

  function observeAttemptPresence(attemptId) {
    try {
      inspect(boundStore, 'ExecutionAttempt', attemptId);
      return 'PRESENT';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes(`missing ExecutionAttempt/${attemptId}`)) return 'ABSENT';
      return 'UNKNOWN';
    }
  }

  function prepareAttempt({ attemptId, operationId, authorityRefs = [] }) {
    let observed = observeOperation(operationId).aggregate;

    if (observed.state === 'DEFINED') {
      transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'READY');
      observed = observeOperation(operationId).aggregate;
    }

    if (observed.state === 'READY') {
      transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'RUNNING');
      observed = observeOperation(operationId).aggregate;
    }

    if (observed.state !== 'RUNNING') {
      throw new Error(`Operation ${operationId} is not executable from state ${observed.state}`);
    }

    create(
      boundStore,
      verifiedRevision(boundStore),
      'ExecutionAttempt',
      attemptId,
      { operation_id: operationId },
      authorityRefs,
    );

    return {
      operation: observeOperation(operationId),
      attempt: inspect(boundStore, 'ExecutionAttempt', attemptId),
    };
  }

  function confirmDispatchStart(attemptId) {
    transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'DISPATCHED');
    transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'RUNNING');
    return inspect(boundStore, 'ExecutionAttempt', attemptId);
  }

  function recordPreflightTerminalOutcome({
    attemptId,
    operationId,
    status,
    receipt,
    resultRefs = [],
  }) {
    const refs = receiptRefs(receipt, resultRefs);

    if (status === 'BLOCKED') {
      transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'BLOCKED', {
        outcome: 'BLOCKED',
        result_refs: refs,
      });
      transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'BLOCKED');
    } else if (status === 'UNAVAILABLE') {
      transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'UNAVAILABLE', {
        outcome: 'UNAVAILABLE',
        result_refs: refs,
      });
      transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'BLOCKED');
    } else if (status === 'CANCELLED') {
      transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'CANCELLED', {
        outcome: 'CANCELLED',
        result_refs: refs,
      });
      transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'CANCELLED');
    } else {
      throw new Error(`unsupported preflight terminal status: ${status}`);
    }

    return {
      attempt: inspect(boundStore, 'ExecutionAttempt', attemptId),
      operation: observeOperation(operationId),
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
        transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'COMPLETED', {
          outcome: 'PASS',
          result_refs: refs,
        });
        transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'COMPLETED', {
          result_ref: receipt.receipt_ref,
        });
        break;
      case 'FAILED':
        transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'FAILED', {
          outcome: 'FAIL',
          result_refs: refs,
        });
        transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'FAILED');
        break;
      case 'CANCELLED':
        transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'CANCELLED', {
          outcome: 'CANCELLED',
          result_refs: refs,
        });
        transition(boundStore, verifiedRevision(boundStore), 'Operation', operationId, 'CANCELLED');
        break;
      case 'UNKNOWN':
        transition(boundStore, verifiedRevision(boundStore), 'ExecutionAttempt', attemptId, 'UNKNOWN', {
          result_refs: refs,
        });
        break;
      case 'PARTIAL_RESULT':
        break;
      default:
        throw new Error(`unsupported post-dispatch outcome: ${coordinatorOutcome.status}`);
    }

    return {
      attempt: inspect(boundStore, 'ExecutionAttempt', attemptId),
      operation: observeOperation(operationId),
    };
  }

  return {
    observeOperation,
    observeAttemptPresence,
    prepareAttempt,
    confirmDispatchStart,
    recordPreflightTerminalOutcome,
    recordExecutionOutcome,
  };
}

function createStateKernelTaskCycleLifecycle({ store }) {
  const boundStore = requireStore(store);

  function snapshot(taskcycleId) {
    const verified = boundStore.verify();
    if (!verified || verified.valid !== true || !Number.isSafeInteger(verified.revision)) {
      throw new Error('LIFECYCLE_VERIFY_UNAVAILABLE');
    }
    const taskcycle = inspectAtRevision(boundStore, 'TaskCycle', taskcycleId, verified.revision);
    const obligationState = obligations(boundStore, taskcycleId);
    if (obligationState.store_revision !== verified.revision) {
      throw new Error('LIFECYCLE_SNAPSHOT_REVISION_MISMATCH');
    }
    return {
      revision: verified.revision,
      event_count: verified.event_count,
      taskcycle: taskcycle.aggregate,
      legal_next: taskcycle.legal_next,
      obligations: obligationState,
    };
  }

  function observeInvocationBookkeeping(operationId, attemptId) {
    const expectedRevision = verifiedRevision(boundStore);
    return {
      revision: expectedRevision,
      operation: inspectAtRevision(boundStore, 'Operation', operationId, expectedRevision).aggregate,
      attempt: inspectAtRevision(boundStore, 'ExecutionAttempt', attemptId, expectedRevision).aggregate,
    };
  }

  function hasUnreconciledExecution(taskcycleId) {
    const state = snapshot(taskcycleId);
    for (const operationId of state.taskcycle.related_ids || []) {
      const operation = inspectAtRevision(boundStore, 'Operation', operationId, state.revision).aggregate;
      for (const attemptId of operation.related_ids || []) {
        const attempt = inspectAtRevision(boundStore, 'ExecutionAttempt', attemptId, state.revision).aggregate;
        if (attempt.state === 'UNKNOWN' || attempt.reconciliation_required === true) return true;
      }
    }
    return false;
  }

  function satisfyObligation({
    expectedRevision,
    taskcycleId,
    obligationId,
    authorityRef,
    authorityReference,
  }) {
    return satisfy(
      boundStore,
      expectedRevision,
      taskcycleId,
      obligationId,
      authorityRef,
      authorityReference,
    );
  }

  function closeTaskCycle({
    expectedRevision,
    taskcycleId,
    authorityRef,
    dispositionRef,
  }) {
    return transition(boundStore, expectedRevision, 'TaskCycle', taskcycleId, 'CLOSED', {
      authority_ref: authorityRef,
      disposition_ref: dispositionRef,
    });
  }

  return {
    snapshot,
    observeInvocationBookkeeping,
    hasUnreconciledExecution,
    satisfyObligation,
    closeTaskCycle,
  };
}

function legacyExecutionLifecycleBoundary(value) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return null;
  const required = [
    'inspectOperation',
    'ensureOperationRunning',
    'startAttempt',
    'markAttemptDispatched',
    'markAttemptRunning',
    'recordPreflightTerminal',
    'recordExecutionOutcome',
  ];
  if (required.some((name) => typeof value[name] !== 'function')) return null;

  return {
    observeOperation: (operationId) => value.inspectOperation(operationId),
    observeAttemptPresence(attemptId) {
      if (typeof value.inspectAttempt !== 'function') return 'UNKNOWN';
      try {
        value.inspectAttempt(attemptId);
        return 'PRESENT';
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes(`missing ExecutionAttempt/${attemptId}`)) return 'ABSENT';
        return 'UNKNOWN';
      }
    },
    prepareAttempt(input) {
      value.ensureOperationRunning(input.operationId);
      const started = value.startAttempt(input);
      return {
        operation: value.inspectOperation(input.operationId),
        attempt: typeof value.inspectAttempt === 'function'
          ? value.inspectAttempt(input.attemptId)
          : started,
      };
    },
    confirmDispatchStart(attemptId) {
      value.markAttemptDispatched(attemptId);
      const running = value.markAttemptRunning(attemptId);
      return typeof value.inspectAttempt === 'function'
        ? value.inspectAttempt(attemptId)
        : running;
    },
    recordPreflightTerminalOutcome: (input) => value.recordPreflightTerminal(input),
    recordExecutionOutcome: (input) => value.recordExecutionOutcome(input),
  };
}

function bindOperationalSpineCompatibility(dependencies) {
  if (!dependencies || typeof dependencies !== 'object') return dependencies;
  if (dependencies.executionLifecycle !== undefined) return dependencies;
  if (dependencies.stateKernel === undefined) return dependencies;

  let executionLifecycle = dependencies.stateKernel;
  const portableMethods = [
    'observeOperation',
    'observeAttemptPresence',
    'prepareAttempt',
    'confirmDispatchStart',
    'recordPreflightTerminalOutcome',
    'recordExecutionOutcome',
  ];
  if (portableMethods.some((name) => typeof executionLifecycle?.[name] !== 'function')) {
    executionLifecycle = legacyExecutionLifecycleBoundary(dependencies.stateKernel);
  }
  if (!executionLifecycle) return dependencies;

  const { stateKernel: _legacyStateKernel, ...rest } = dependencies;
  return { ...rest, executionLifecycle };
}

function createStateKernelCompatibilityBinding({ home, store } = {}) {
  const boundStore = store || new FilesystemStateStore(home);
  requireStore(boundStore);
  return {
    executionLifecycle: createStateKernelExecutionLifecycle({ store: boundStore }),
    taskcycleLifecycle: createStateKernelTaskCycleLifecycle({ store: boundStore }),
    renderState: () => render(boundStore),
  };
}

function createStateKernelAdapter({ store }) {
  return createStateKernelExecutionLifecycle({ store });
}

module.exports = {
  createStateKernelAdapter,
  createStateKernelExecutionLifecycle,
  createStateKernelTaskCycleLifecycle,
  createStateKernelCompatibilityBinding,
  bindOperationalSpineCompatibility,
};
