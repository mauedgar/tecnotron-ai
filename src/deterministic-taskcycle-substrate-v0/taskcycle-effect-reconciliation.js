'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { consumeTaskCycleInitialization } = require('./taskcycle-initialization');

const PROJECTION_SCHEMA = 'deterministic-taskcycle-effect-reconciliation/v0';
const MANIFEST_SCHEMA = 'deterministic-taskcycle-effect-reconciliation-manifest/v0';
const SEMANTIC_STATUS = 'COMPLETED_BEFORE_LIFECYCLE_INITIALIZATION';
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
function isSha256(value) { return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/i.test(value); }
function strings(value, nonEmpty = false) {
  return Array.isArray(value) && (!nonEmpty || value.length > 0)
    && value.every((x) => typeof x === 'string' && x.trim() !== '')
    && new Set(value).size === value.length;
}
function sameStringSet(left, right) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return strings(left) && strings(right)
    && sortedLeft.length === sortedRight.length
    && sortedLeft.every((value, index) => value === sortedRight[index]);
}
function unique(left, right) {
  return [...new Set([...(left || []), ...(right || [])])];
}

function validateRequest(r) {
  if (!r || typeof r !== 'object') return 'RECONCILIATION_REQUEST_INVALID';
  if (!r.taskcycle || !strings([r.taskcycle.id, r.taskcycle.responsibility], true)) return 'TASKCYCLE_IDENTITY_INVALID';
  if (!r.initialization || !strings([r.initialization.location_or_ref], true)
      || !isSha256(r.initialization.identity_sha256)) return 'INITIALIZATION_REFERENCE_INVALID';
  if (!r.obligation || !strings([r.obligation.id, r.obligation.semantic_status], true)
      || r.obligation.semantic_status !== SEMANTIC_STATUS) return 'OBLIGATION_RECONCILIATION_INVALID';
  if (!r.subject || !strings([r.subject.repository, r.subject.branch], true)
      || !isSha(r.subject.commit) || !isSha(r.subject.tree) || !isSha(r.subject.parent)
      || !strings(r.subject.changed_paths, true)) return 'SUBJECT_IDENTITY_INVALID';
  if (!strings(r.authority_refs, true) || !strings(r.evidence_refs || [])) return 'RECONCILIATION_REFS_INVALID';
  if (typeof r.next_gate !== 'string' || r.next_gate.trim() === '') return 'NEXT_GATE_INVALID';
  return null;
}

function terminal(r, status, effect_state, reason) {
  return {
    status,
    effect_state,
    reason,
    TaskCycle: null,
    obligation: r?.obligation?.id ?? null,
    subject: r?.subject ?? null,
    current_gate: null,
    pending_obligations: [],
    portable_projection: null,
    State_Kernel_direct_calls: 0,
    already_reconciled: false,
    replayed: false,
  };
}

function projectionFor(request, initialization) {
  const obligations = initialization.projection.pending_obligations.map((entry) => (
    entry.id === request.obligation.id
      ? { ...entry, status: 'SATISFIED' }
      : { ...entry }
  ));
  return {
    schema: PROJECTION_SCHEMA,
    TaskCycle: { ...initialization.projection.TaskCycle },
    source_initialization: {
      identity_sha256: request.initialization.identity_sha256,
    },
    exact_inputs: initialization.projection.exact_inputs,
    obligations,
    current_gate: request.next_gate,
    authority_refs: unique(initialization.projection.authority_refs, request.authority_refs),
    evidence_refs: unique(initialization.projection.evidence_refs, request.evidence_refs),
    reconciled_effect: {
      obligation_id: request.obligation.id,
      semantic_status: SEMANTIC_STATUS,
      subject: request.subject,
      preserved: true,
      replayed: false,
      mutation_during_reconciliation: 'NONE',
    },
    semantics: {
      creates_authority: false,
      State_Kernel_direct_calls: 0,
      State_Kernel_named_semantic_owner: false,
      new_persistence_backend: false,
    },
  };
}

function packageFor(request, initialization) {
  const projection = projectionFor(request, initialization);
  const projectionText = stableJson(projection);
  const manifest = {
    schema: MANIFEST_SCHEMA,
    taskcycle_id: request.taskcycle.id,
    responsibility: request.taskcycle.responsibility,
    source_initialization_identity_sha256: request.initialization.identity_sha256,
    obligation_id: request.obligation.id,
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

function inspect(root, pkg) {
  try {
    const entries = fs.readdirSync(root).sort();
    if (entries.length !== FILES.length || entries.some((x, i) => x !== FILES[i])) return 'UNKNOWN';
    const manifest = path.join(root, 'manifest.json');
    const projection = path.join(root, 'projection.json');
    for (const file of [manifest, projection]) {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) return 'UNKNOWN';
    }
    const exactBytes = fs.readFileSync(manifest, 'utf8') === pkg.manifestText
      && fs.readFileSync(projection, 'utf8') === pkg.projectionText;
    return exactBytes ? 'EXACT' : 'CONFLICT';
  } catch {
    return 'UNKNOWN';
  }
}

function pass(request, finalRoot, pkg, already_reconciled = false, reason = null) {
  return {
    status: 'PASS',
    effect_state: 'CONFIRMED',
    reason,
    TaskCycle: pkg.projection.TaskCycle,
    obligation: request.obligation.id,
    subject: request.subject,
    current_gate: pkg.projection.current_gate,
    pending_obligations: pkg.projection.obligations.filter((entry) => entry.status === 'PENDING'),
    portable_projection: { location_or_ref: finalRoot, identity_sha256: pkg.identity },
    State_Kernel_direct_calls: 0,
    already_reconciled,
    replayed: false,
  };
}

function createTaskCycleEffectReconciliationCapability({ root }) {
  const base = path.resolve(root);
  return {
    reconcileCompletedObligation({ request, observed }) {
      const invalid = validateRequest(request);
      if (invalid) return terminal(request, 'BLOCKED', 'NONE', invalid);

      let initialization;
      try {
        initialization = consumeTaskCycleInitialization({
          location: request.initialization.location_or_ref,
          expected_identity_sha256: request.initialization.identity_sha256,
        });
      } catch (error) {
        return terminal(request, 'BLOCKED', 'NONE', `INITIALIZATION_CONSUME_FAILED:${error?.message || String(error)}`);
      }

      if (!exact(initialization.projection.TaskCycle, {
        id: request.taskcycle.id,
        responsibility: request.taskcycle.responsibility,
        state: 'ACTIVE',
      })) return terminal(request, 'BLOCKED', 'NONE', 'TASKCYCLE_INITIALIZATION_IDENTITY_MISMATCH');

      const obligation = initialization.projection.pending_obligations.find((entry) => entry.id === request.obligation.id);
      if (!obligation || obligation.status !== 'PENDING') {
        return terminal(request, 'BLOCKED', 'NONE', 'OBLIGATION_NOT_PENDING_IN_INITIALIZATION');
      }

      const exactInputs = initialization.projection.exact_inputs;
      if (request.subject.repository !== exactInputs.Product_baseline.repository
          || request.subject.branch !== exactInputs.TASK_carrier.branch
          || request.subject.parent !== exactInputs.TASK_carrier.commit
          || !sameStringSet(request.subject.changed_paths, exactInputs.write_scope)) {
        return terminal(request, 'BLOCKED', 'NONE', 'SUBJECT_NOT_EXACT_PHASE1_DESCENDANT_OF_TASK_CARRIER');
      }

      if (!observed || !exact(request.subject, observed.subject)) {
        return terminal(request, 'BLOCKED', 'NONE', 'SUBJECT_OBSERVATION_MISMATCH');
      }

      let baseStat;
      try { baseStat = fs.lstatSync(base); } catch {
        return terminal(request, 'FAILED', 'NONE', 'RECONCILIATION_ROOT_UNAVAILABLE');
      }
      if (!baseStat.isDirectory() || baseStat.isSymbolicLink()) {
        return terminal(request, 'FAILED', 'NONE', 'RECONCILIATION_ROOT_INVALID');
      }

      const pkg = packageFor(request, initialization);
      const finalRoot = path.join(base, safeId(request.taskcycle.id), safeId(request.obligation.id));
      const parentRoot = path.dirname(finalRoot);
      fs.mkdirSync(parentRoot, { recursive: true });

      if (fs.existsSync(finalRoot)) {
        const state = inspect(finalRoot, pkg);
        if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'ALREADY_RECONCILED_EXACT');
        return terminal(request, 'BLOCKED', state === 'CONFLICT' ? 'NONE' : 'UNKNOWN', state === 'CONFLICT'
          ? 'TASKCYCLE_EFFECT_RECONCILIATION_IDENTITY_CONFLICT'
          : 'EFFECT_RECONCILIATION_PROJECTION_AMBIGUOUS');
      }

      let staging = null;
      try {
        staging = fs.mkdtempSync(path.join(parentRoot, `.${safeId(request.obligation.id)}.staging-`));
        fs.writeFileSync(path.join(staging, 'projection.json'), pkg.projectionText, { flag: 'wx' });
        fs.writeFileSync(path.join(staging, 'manifest.json'), pkg.manifestText, { flag: 'wx' });
        if (inspect(staging, pkg) !== 'EXACT') {
          return terminal(request, 'FAILED', 'NONE', 'STAGED_EFFECT_RECONCILIATION_INVALID');
        }
        fs.renameSync(staging, finalRoot);
        staging = null;
        return inspect(finalRoot, pkg) === 'EXACT'
          ? pass(request, finalRoot, pkg)
          : terminal(request, 'BLOCKED', 'UNKNOWN', 'EFFECT_RECONCILIATION_PUBLISH_UNKNOWN');
      } catch (error) {
        if (fs.existsSync(finalRoot)) {
          const state = inspect(finalRoot, pkg);
          if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'PUBLISH_RACE_RECONCILED_EXACT');
          if (state === 'CONFLICT') {
            return terminal(request, 'BLOCKED', 'NONE', 'TASKCYCLE_EFFECT_RECONCILIATION_IDENTITY_CONFLICT');
          }
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'EFFECT_RECONCILIATION_PUBLISH_UNKNOWN');
        }
        return terminal(request, 'FAILED', 'NONE', `EFFECT_RECONCILIATION_MATERIALIZATION_FAILED:${error?.message || String(error)}`);
      } finally {
        if (staging && fs.existsSync(staging)) {
          try { fs.rmSync(staging, { recursive: true, force: true }); } catch { /* best effort */ }
        }
      }
    },
  };
}

function consumeTaskCycleEffectReconciliation({ location, expected_identity_sha256 }) {
  if (typeof location !== 'string' || !isSha256(expected_identity_sha256)) {
    throw new Error('INVALID_EFFECT_RECONCILIATION_CONSUME_REQUEST');
  }
  const root = path.resolve(location);
  const manifestText = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
  if (sha256(manifestText) !== expected_identity_sha256) throw new Error('EFFECT_RECONCILIATION_IDENTITY_MISMATCH');
  const manifest = JSON.parse(manifestText);
  const projectionText = fs.readFileSync(path.join(root, 'projection.json'), 'utf8');
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.files?.['projection.json'] !== sha256(projectionText)) {
    throw new Error('EFFECT_RECONCILIATION_PACKAGE_INVALID');
  }
  const projection = JSON.parse(projectionText);
  const satisfied = projection.obligations?.filter((entry) => entry.status === 'SATISFIED') || [];
  if (manifest.taskcycle_id !== projection.TaskCycle?.id
      || manifest.responsibility !== projection.TaskCycle?.responsibility
      || manifest.source_initialization_identity_sha256 !== projection.source_initialization?.identity_sha256
      || manifest.obligation_id !== projection.reconciled_effect?.obligation_id
      || projection.schema !== PROJECTION_SCHEMA
      || projection.TaskCycle?.state !== 'ACTIVE'
      || projection.reconciled_effect?.semantic_status !== SEMANTIC_STATUS
      || projection.reconciled_effect?.replayed !== false
      || projection.reconciled_effect?.preserved !== true
      || projection.reconciled_effect?.mutation_during_reconciliation !== 'NONE'
      || satisfied.length !== 1
      || satisfied[0].id !== projection.reconciled_effect.obligation_id
      || projection.semantics?.creates_authority !== false
      || projection.semantics?.State_Kernel_direct_calls !== 0
      || projection.semantics?.new_persistence_backend !== false) {
    throw new Error('EFFECT_RECONCILIATION_PROJECTION_INVALID');
  }
  return { manifest, projection, identity_sha256: expected_identity_sha256 };
}

module.exports = {
  PROJECTION_SCHEMA,
  SEMANTIC_STATUS,
  validateTaskCycleEffectReconciliationRequest: validateRequest,
  createTaskCycleEffectReconciliationCapability,
  consumeTaskCycleEffectReconciliation,
};
