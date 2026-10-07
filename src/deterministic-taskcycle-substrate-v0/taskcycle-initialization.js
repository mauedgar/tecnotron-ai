'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const CURRENT_GATE = 'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE';
const PROJECTION_SCHEMA = 'deterministic-taskcycle-initialization/v0';
const MANIFEST_SCHEMA = 'deterministic-taskcycle-initialization-manifest/v0';
const FILES = ['manifest.json', 'projection.json'];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}
function stableJson(value) { return `${JSON.stringify(stable(value), null, 2)}\n`; }
function sha256(text) { return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`; }
function exact(a, b) { return stableJson(a) === stableJson(b); }
function safeId(value) { return encodeURIComponent(value).replaceAll('%', '_'); }
function isSha(value) { return typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value); }
function strings(value, nonEmpty = false) {
  return Array.isArray(value) && (!nonEmpty || value.length > 0)
    && value.every((x) => typeof x === 'string' && x.trim() !== '')
    && new Set(value).size === value.length;
}

function validateRequest(r) {
  if (!r || typeof r !== 'object') return 'INITIALIZATION_REQUEST_INVALID';
  if (!r.taskcycle || !strings([r.taskcycle.id, r.taskcycle.responsibility], true)) return 'TASKCYCLE_IDENTITY_INVALID';
  if (!r.Product_baseline || !strings([r.Product_baseline.repository, r.Product_baseline.integration_branch], true)
      || !isSha(r.Product_baseline.commit) || !isSha(r.Product_baseline.tree)) return 'PRODUCT_BASELINE_INVALID';
  if (!r.TASK_carrier || !strings([r.TASK_carrier.branch, r.TASK_carrier.path], true)
      || !isSha(r.TASK_carrier.commit) || !isSha(r.TASK_carrier.tree)) return 'TASK_CARRIER_INVALID';
  if (!strings(r.write_scope, true) || !strings(r.authority_refs, true) || !strings(r.evidence_refs || [])) return 'INITIALIZATION_REFS_INVALID';
  if (!Array.isArray(r.obligations) || r.obligations.length === 0) return 'OBLIGATIONS_INVALID';
  const ids = new Set();
  for (const o of r.obligations) {
    if (!o || typeof o.id !== 'string' || o.id.trim() === '' || ids.has(o.id)
        || (o.authority_ref !== null && (typeof o.authority_ref !== 'string' || o.authority_ref.trim() === ''))) return 'OBLIGATIONS_INVALID';
    ids.add(o.id);
  }
  if (r.current_gate !== CURRENT_GATE) return 'CURRENT_GATE_INVALID';
  return null;
}

function projectionFor(r) {
  return {
    schema: PROJECTION_SCHEMA,
    TaskCycle: { id: r.taskcycle.id, responsibility: r.taskcycle.responsibility, state: 'ACTIVE' },
    exact_inputs: {
      Product_baseline: r.Product_baseline,
      TASK_carrier: r.TASK_carrier,
      write_scope: [...r.write_scope],
    },
    pending_obligations: r.obligations.map((o) => ({ id: o.id, status: 'PENDING', authority_ref: o.authority_ref })),
    current_gate: CURRENT_GATE,
    authority_refs: [...r.authority_refs],
    evidence_refs: [...r.evidence_refs],
    semantics: {
      creates_authority: false,
      State_Kernel_direct_calls: 0,
      State_Kernel_named_semantic_owner: false,
      new_persistence_backend: false,
    },
  };
}

function packageFor(r) {
  const projection = projectionFor(r);
  const projectionText = stableJson(projection);
  const manifest = {
    schema: MANIFEST_SCHEMA,
    taskcycle_id: r.taskcycle.id,
    responsibility: r.taskcycle.responsibility,
    files: { 'projection.json': sha256(projectionText) },
    semantics: {
      creates_authority: false,
      external_identity_required: true,
      State_Kernel_direct_calls: 0,
      new_persistence_backend: false,
    },
  };
  const manifestText = stableJson(manifest);
  return { projection, projectionText, manifest, manifestText, identity: sha256(manifestText) };
}

function terminal(r, status, effect_state, reason) {
  return {
    status, effect_state, reason,
    TaskCycle: null,
    exact_inputs: r ? { Product_baseline: r.Product_baseline, TASK_carrier: r.TASK_carrier, write_scope: r.write_scope || [] } : null,
    pending_obligations: [], current_gate: null,
    authority_refs: Array.isArray(r?.authority_refs) ? [...r.authority_refs] : [],
    evidence_refs: Array.isArray(r?.evidence_refs) ? [...r.evidence_refs] : [],
    portable_projection: null, State_Kernel_direct_calls: 0, already_initialized: false,
  };
}
function pass(r, root, pkg, already_initialized = false, reason = null) {
  return {
    status: 'PASS', effect_state: 'CONFIRMED', reason,
    TaskCycle: pkg.projection.TaskCycle,
    exact_inputs: pkg.projection.exact_inputs,
    pending_obligations: pkg.projection.pending_obligations,
    current_gate: CURRENT_GATE,
    authority_refs: [...r.authority_refs], evidence_refs: [...r.evidence_refs],
    portable_projection: { location_or_ref: root, identity_sha256: pkg.identity },
    State_Kernel_direct_calls: 0, already_initialized,
  };
}

function inspect(root, pkg) {
  try {
    const entries = fs.readdirSync(root).sort();
    if (entries.length !== FILEL.length || entries.some((x, i) => x !== FILES[i])) return 'UNKNOWN';
    const manifest = path.join(root, 'manifest.json');
    const projection = path.join(root, 'projection.json');
    for (const file of [manifest, projection]) {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) return 'UNKNOWN';
    }
    const exactBytes = fs.readFileSync(manifest, 'utf8') === pkg.manifestText
      && fs.readFileSync(projection, 'utf8') === pkg.projectionText;
    return exactBytes ? 'EXACT' : 'CONFLICT';
  } catch { return 'UNKNOWN'; }
}

function createTaskCycleInitializationCapability({ root }) {
  const base = path.resolve(root);
  return {
    initializeTaskCycle({ request, observed }) {
      const invalid = validateRequest(request);
      if (invalid) return terminal(request, 'BLOCKED', 'NONE', invalid);
      if (!observed || !exact(request.Product_baseline, observed.Product_baseline)) return terminal(request, 'BLOCKED', 'NONE', 'PRODUCT_BASELINE_MISMATCH');
      if (!exact(request.TASK_carrier, observed.TASK_carrier)) return terminal(request, 'BLOCKED', 'NONE', 'TASK_CARRIER_MISMATCH');
      let baseStat;
      try { baseStat = fs.lstatSync(base); } catch { return terminal(request, 'FAILED', 'NONE', 'INITIALIZATION_ROOT_UNAVAILABLE'); }
      if (!baseStat.isDirectory() || baseStat.isSymbolicLink()) return terminal(request, 'FAILED', 'NONE', 'INITIALIZATION_ROOT_INVALID');

      const pkg = packageFor(request);
      const finalRoot = path.join(base, safeId(request.taskcycle.id));
      if (fs.existsSync(finalRoot)) {
        const state = inspect(finalRoot, pkg);
        if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'ALREADY_INITIALIZED_EXACT');
        return terminal(request, 'BLOCKED', state === 'CONFLICT' ? 'NONE' : 'UNKNOWN', state === 'CONFLICT'
          ? 'TASKCYCLE_INITIALIZATION_IDENTITY_CONFLICT' : 'INITIALIZATION_PROJECTION_AMBIGUOUS');
      }

      let staging = null;
      try {
        staging = fs.mkdtempSync(path.join(base, `.${safeId(request.taskcycle.id)}.staging-`));
        fs.writeFileSync(path.join(staging, 'projection.json'), pkg.projectionText, { flag: 'wx' });
        fs.writeFileSync(path.join(staging, 'manifest.json'), pkg.manifestText, { flag: 'wx' });
        if (inspect(staging, pkg) !== 'EXACT') return terminal(request, 'FAILED', 'NONE', 'STAGED_INITIALIZATION_INVALID');
        fs.renameSync(staging, finalRoot);
        staging = null;
        return inspect(finalRoot, pkg) === 'EXACT'
          ? pass(request, finalRoot, pkg)
          : terminal(request, 'BLOCKED', 'UNKNOWN', 'INITIALIZATION_PUBLISH_RECONCILIATION_UNKNOWN');
      } catch (error) {
        if (fs.existsSync(finalRoot)) {
          const state = inspect(finalRoot, pkg);
          if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'PUBLISH_RACE_RECONCILED_EXACT');
          if (state === 'CONFLICT') return terminal(request, 'BLOCKED', 'NONE', 'TASKCYCLE_INITIALIZATION_IDENTITY_CONFLICT');
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'INITIALIZATION_PUBLISH_RECONCILIATION_UNKNOWN');
        }
        return terminal(request, 'FAILED', 'NONE', `INITIALIZATION_MATERIALIZATION_FAILED:${error?.message || String(error)}`);
      } finally {
        if (staging && fs.existsSync(staging)) {
          try { fs.rmSync(staging, { recursive: true, force: true }); } catch { /* best effort */ }
        }
      }
    },
  };
}

function consumeTaskCycleInitialization({ location, expected_identity_sha256 }) {
  if (typeof location !== 'string' || !/^sha256:[a-f0-9]{64}$/i.test(expected_identity_sha256 || '')) throw new Error('INVALID_INITIALIZATION_CONSUME_REQUEST');
  const root = path.resolve(location);
  const manifestText = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
  if (sha256(manifestText) !== expected_identity_sha256) throw new Error('INITIALIZATION_IDENTITY_MISMATCH');
  const manifest = JSON.parse(manifestText);
  const projectionText = fs.readFileSync(path.join(root, 'projection.json'), 'utf8');
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.files?.['projection.json'] !== sha256(projectionText)) throw new Error('INITIALIZATION_PACKAGE_INVALID');
  const projection = JSON.parse(projectionText);
  if (projection.schema !== PROJECTION_SCHEMA || projection.TaskCycle?.state !== 'ACTIVE'
      || projection.current_gate !== CURRENT_GATE || projection.semantics?.creates_authority !== false
      || projection.semantics?.State_Kernel_direct_calls !== 0 || projection.semantics?.new_persistence_backend !== false
      || projection.pending_obligations?.some((o) => o.status !== 'PENDING')) throw new Error('INITIALIZATION_PROJECTION_INVALID');
  return { manifest, projection, identity_sha256: expected_identity_sha256 };
}

module.exports = {
  CURRENT_GATE,
  validateTaskCycleInitializationRequest: validateRequest,
  createTaskCycleInitializationCapability,
  consumeTaskCycleInitialization,
};
