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

const REQUIRED_STRING_FIELDS = [
  "operation_id",
  "execution_attempt_id",
  "runtime_provider",
  "state",
];

function requireTrimmedNonEmptyString(value) {
  if (typeof value !== "string") {
    throw new TypeError("expected a non-empty string");
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new TypeError("expected a non-blank string");
  }
  return trimmed;
}

export function normalizeLifecycleObservation(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be a non-null, non-array object");
  }

  const normalized = {};
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!(field in input)) {
      throw new TypeError(`missing required field: ${field}`);
    }
    normalized[field] = requireTrimmedNonEmptyString(input[field]);
  }

  if (!ALLOWED_STATES.has(normalized.state)) {
    throw new TypeError(`invalid state: ${normalized.state}`);
  }

  let subjectRef = null;
  if ("subject_ref" in input && input.subject_ref !== null) {
    subjectRef = requireTrimmedNonEmptyString(input.subject_ref);
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
