'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { RunEvent } = require('../contracts/run-event');
const { RunState } = require('../contracts/run-state');

class RunStoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RunStoreError';
  }
}

class RunStoreConflictError extends RunStoreError {
  constructor(message) {
    super(message);
    this.name = 'RunStoreConflictError';
  }
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

function resolveWithinRoot(root, ...segments) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  const rel = path.relative(base, target);
  if (rel === '') {
    return target;
  }
  if (path.isAbsolute(rel) || rel.startsWith('..' + path.sep) || rel === '..') {
    throw new RunStoreError(`path escapes root: ${segments.join('/')}`);
  }
  return target;
}

function validateRunId(runId) {
  if (typeof runId !== 'string' || runId.length < 3 || runId.includes('/') || runId.includes('\\') || runId === '.' || runId === '..') {
    throw new RunStoreError(`invalid run id: ${runId}`);
  }
  return runId;
}

class RunStore {
  constructor({ root, eventsFile = 'events.jsonl', stateFile = 'run-state.json' }) {
    this.root = root;
    this.eventsFile = eventsFile;
    this.stateFile = stateFile;
  }

  runDir(runId) {
    return resolveWithinRoot(this.root, validateRunId(runId));
  }

  ensureRun(runId) {
    const dir = this.runDir(runId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  _readEventsFile(file) {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  }

  _dedupKey(existing, eventId, idempotencyKey) {
    for (const e of existing) {
      const sameEventId = e.event_id === eventId;
      const sameIdempotency =
        idempotencyKey !== null && idempotencyKey !== undefined &&
        e.idempotency_key !== null && e.idempotency_key !== undefined &&
        e.idempotency_key === idempotencyKey;
      if (sameEventId || sameIdempotency) {
        return e;
      }
    }
    return null;
  }

  appendEvent(event) {
    const parsed = RunEvent.safeParse(event);
    if (!parsed.success) {
      throw new RunStoreError(`invalid run event: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const data = parsed.data;
    const dir = this.ensureRun(data.run_id);
    const file = path.join(dir, this.eventsFile);
    const existing = this._readEventsFile(file);
    const prior = this._dedupKey(existing, data.event_id, data.idempotency_key);
    if (prior) {
      if (stableStringify(prior) === stableStringify(data)) {
        return prior;
      }
      throw new RunStoreConflictError(
        `conflicting event for key event_id=${data.event_id} idempotency_key=${data.idempotency_key || 'null'}`
      );
    }
    fs.appendFileSync(file, stableStringify(data) + '\n', 'utf8');
    return data;
  }

  listEvents(runId) {
    const file = path.join(this.runDir(runId), this.eventsFile);
    return this._readEventsFile(file);
  }

  writeRunState(state) {
    const parsed = RunState.safeParse(state);
    if (!parsed.success) {
      throw new RunStoreError(`invalid run state: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const data = parsed.data;
    const dir = this.ensureRun(data.run_id);
    const target = path.join(dir, this.stateFile);
    const tmp = path.join(dir, `${this.stateFile}.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(tmp, stableStringify(data) + '\n', 'utf8');
    fs.renameSync(tmp, target);
    return data;
  }

  readRunState(runId) {
    const file = path.join(this.runDir(runId), this.stateFile);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  writeArtifact(runId, relativePath, value, schemaVersion) {
    if (relativePath == null || relativePath === '') {
      throw new RunStoreError('artifact relative path is required');
    }
    const runDir = this.ensureRun(runId);
    const artifactsDir = resolveWithinRoot(runDir, 'artifacts');
    const target = resolveWithinRoot(artifactsDir, relativePath);
    const serialized = stableStringify(value);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, serialized, 'utf8');
    fs.renameSync(tmp, target);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex');
    return {
      path: path.posix.join('artifacts', relativePath.replaceAll('\\', '/')),
      hash: `sha256:${hash}`,
      schema_version: schemaVersion === undefined ? null : schemaVersion,
    };
  }
}

class SqliteProjection {
  constructor(dbPath) {
    let Database;
    try {
      Database = require('better-sqlite3');
    } catch (err) {
      throw new RunStoreError(`better-sqlite3 is unavailable: ${err.message}`);
    }
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        run_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        current_state TEXT NOT NULL,
        next_state TEXT,
        updated_at TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        raw TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        idempotency_key TEXT,
        raw TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_runs_task ON runs(task_id);
    `);
    const eventColumns = this.db.prepare('PRAGMA table_info(events)').all().map((row) => row.name);
    if (!eventColumns.includes('idempotency_key')) {
      this.db.exec('ALTER TABLE events ADD COLUMN idempotency_key TEXT');
    }
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_events_idempotency ON events(idempotency_key) WHERE idempotency_key IS NOT NULL');
  }

  upsertRunState(state) {
    const parsed = RunState.safeParse(state);
    if (!parsed.success) {
      throw new RunStoreError(`invalid run state: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const s = parsed.data;
    this.db
      .prepare(
        `INSERT INTO runs (run_id, task_id, current_state, next_state, updated_at, sequence, raw)
         VALUES (@run_id, @task_id, @current_state, @next_state, @updated_at, @sequence, @raw)
         ON CONFLICT(run_id) DO UPDATE SET
           task_id = excluded.task_id,
           current_state = excluded.current_state,
           next_state = excluded.next_state,
           updated_at = excluded.updated_at,
           sequence = excluded.sequence,
           raw = excluded.raw`
      )
      .run({ ...s, raw: JSON.stringify(s) });
    return s;
  }

  insertEvent(event) {
    const parsed = RunEvent.safeParse(event);
    if (!parsed.success) {
      throw new RunStoreError(`invalid run event: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const e = parsed.data;
    const idem = e.idempotency_key ?? null;
    const conflict = this.db
      .prepare('SELECT raw FROM events WHERE event_id = ? OR (idempotency_key IS NOT NULL AND idempotency_key = ?)')
      .get(e.event_id, idem);
    if (conflict) {
      const existing = JSON.parse(conflict.raw);
      if (stableStringify(existing) === stableStringify(e)) {
        return existing;
      }
      throw new RunStoreConflictError(
        `conflicting event for event_id=${e.event_id} idempotency_key=${e.idempotency_key || 'null'}`
      );
    }
    this.db
      .prepare(
        `INSERT INTO events (event_id, run_id, sequence, event_type, actor, created_at, idempotency_key, raw)
         VALUES (@event_id, @run_id, @sequence, @event_type, @actor, @created_at, @idempotency_key, @raw)`
      )
      .run({ ...e, raw: JSON.stringify(e) });
    return e;
  }

  latestState(runId) {
    const row = this.db.prepare('SELECT raw FROM runs WHERE run_id = ?').get(runId);
    return row ? JSON.parse(row.raw) : null;
  }

  eventsFor(runId) {
    return this.db
      .prepare('SELECT raw FROM events WHERE run_id = ? ORDER BY sequence ASC')
      .all(runId)
      .map((r) => JSON.parse(r.raw));
  }

  close() {
    this.db.close();
  }
}

module.exports = { RunStore, SqliteProjection, RunStoreError, RunStoreConflictError };
