const REQUIRED_FIELDS = [
  "operation_id",
  "execution_attempt_id",
  "runtime_provider",
  "state",
];

const ALLOWED_STATES = new Set([
  "started",
  "progress",
  "heartbeat",
  "idle",
  "completed",
  "failed",
  "blocked",
  "cancelled",
  "timed_out",
]);

const TERMINAL_STATES = new Set([
  "completed",
  "failed",
  "blocked",
  "cancelled",
  "timed_out",
]);

function requiredString(input, field) {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

export function normalizeLifecycleObservation(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be a non-null object");
  }

  const normalized = Object.fromEntries(
    REQUIRED_FIELDS.map((field) => [field, requiredString(input, field)]),
  );

  if (!ALLOWED_STATES.has(normalized.state)) {
    throw new TypeError("state is not allowed");
  }

  let subjectRef = null;
  if (input.subject_ref !== undefined && input.subject_ref !== null) {
    if (typeof input.subject_ref !== "string" || input.subject_ref.trim().length === 0) {
      throw new TypeError("subject_ref must be null, omitted, or a non-empty string");
    }
    subjectRef = input.subject_ref.trim();
  }

  return {
    operation_id: normalized.operation_id,
    execution_attempt_id: normalized.execution_attempt_id,
    runtime_provider: normalized.runtime_provider,
    state: normalized.state,
    subject_ref: subjectRef,
    terminal: TERMINAL_STATES.has(normalized.state),
  };
}
