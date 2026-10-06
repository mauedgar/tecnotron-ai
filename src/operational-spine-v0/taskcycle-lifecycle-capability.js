"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireExecutionLifecycleCapability = requireExecutionLifecycleCapability;
exports.requireTaskCycleLifecycleCapability = requireTaskCycleLifecycleCapability;
function requireMethods(value, label, methods) {
    if (value === null ||
        (typeof value !== 'object' && typeof value !== 'function') ||
        methods.some((name) => typeof value[name] !== 'function')) {
        throw new TypeError(`${label} must provide: ${methods.join(', ')}`);
    }
    return value;
}
function requireExecutionLifecycleCapability(value) {
    return requireMethods(value, 'executionLifecycle', [
        'observeOperation',
        'observeAttemptPresence',
        'prepareAttempt',
        'confirmDispatchStart',
        'recordPreflightTerminalOutcome',
        'recordExecutionOutcome',
    ]);
}
function requireTaskCycleLifecycleCapability(value) {
    return requireMethods(value, 'taskcycleLifecycle', [
        'snapshot',
        'observeInvocationBookkeeping',
        'hasUnreconciledExecution',
        'satisfyObligation',
        'closeTaskCycle',
    ]);
}
