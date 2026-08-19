'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const { RunEvent } = require('../contracts/run-event');
const { RunState } = require('../contracts/run-state');

class RunStoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RunStoreError';
  }
}

class RunStore {
  constructor({ root, eventsFile = 'events.jsonl', stateFile = 'run-state.json' }) {
    this.root = root;
    this.eventsFile = eventsFile;
    this.stateFile = stateFile;
  }

  runDir(runId) {
    return path.join(this.root, runId);
  }

  ensureRun(runId) {
    const dir = this.runDir(runId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  appendEvent(event) {
    const parsed = RunEvent.safeParse(event);
    if (!parsed.success) {
      throw new RunStoreError(`invalid run event: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const file = path.join(this.ensureRun(parsed.data.run_id), this.eventsFile);
    fs.appendFileSync(file, JSON.stringify(parsed.data) + '\n', 'utf8');
    return parsed.data;
  }

  listEvents(runId) {
    const file = path.join(this.runDir(runId), this.eventsFile);
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  }

  writeRunState(state) {
    const parsed = RunState.safeParse(state);
    if (!parsed.success) {
      throw new RunStoreError(`invalid run state: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    const file = path.join(this.ensureRun(parsed.data.run_id), this.stateFile);
    fs.writeFileSync(file, JSON.stringify(parsed.data, null, 2) + '\n', 'utf8');
    return parsed.data;
  }

  readRunState(runId) {
    const file = path.join(this.runDir(runId), this.stateFile);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}

class SqliteProjection {
  constructor(dbPath) {
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
        raw TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_runs_task ON runs(task_id);
    `);
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
    this.db
      .prepare(
        `INSERT OR REPLACE INTO events (event_id, run_id, sequence, event_type, actor, created_at, raw)
         VALUES (@event_id, @run_id, @sequence, @event_type, @actor, @created_at, @raw)`
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

module.exports = { RunStore, SqliteProjection, RunStoreError };