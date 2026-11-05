'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { consumeTaskCycleInitialization } = require('./taskcycle-initialization');
const { prepareForkedPhase1Branch, qualifyControlGitSource, qualifyForkedPhase1Branch } = require('./taskcycle-phase1-branch-qualification');
const { reconcilePinnedEffect } = require('./taskcycle-pinned-effect-io');

const PROJECTION_SCHEMA = 'deterministic-taskcycle-effect-reconciliation/v0';
const MANIFEST_SCHEMA = 'deterministic-taskcycle-effect-reconciliation-manifest/v0';
const SEMANTIC_STATUS = 'COMPLETED_BEFORE_LIFECYCLE_INITIALIZATION';
const AUTHORIZED_OBLIGATION_ID = 'implementation';
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

// A frozen write_scope is an allowlist, not a second list of actual Git paths.
// Keep the historical exact-path contract unchanged. If a frozen scope uses
// trailing /**, accept only concrete safe repository-relative paths under that
// literal directory prefix. Other wildcard grammars fail closed; no glob
// expansion, filesystem lookup or arbitrary regex is performed.
function canonicalGitPath(value) {
  return typeof value === 'string' && value.length > 0
    && !/[\\\0\r\n]/.test(value)
    && value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'
      && !/[*?\[\]]/.test(part));
}

function frozenScopeRules(scope) {
  if (!strings(scope, true)) return null;
  const patterns = scope.map((entry) => {
    if (entry.endsWith('/**') && entry.indexOf('*') === entry.length - 2
        && canonicalGitPath(entry.slice(0, -3))) {
      return { prefix: entry.slice(0, -3), subtree: true };
    }
    return canonicalGitPath(entry) ? { prefix: entry, subtree: false } : null;
  });
  return patterns.some((entry) => entry === null) ? null : patterns;
}

function matchedByRule(filename, entry) {
  return entry.subtree ? filename.startsWith(entry.prefix + '/') : filename === entry.prefix;
}

// Subset check is for individual observed Git edges and an integrated Git diff.
// The caller must independently attest the complete exact Git path list.
function changedPathsWithinScope(changedPaths, scope) {
  const patterns = frozenScopeRules(scope);
  return patterns !== null && strings(changedPaths, true)
    && changedPaths.every(canonicalGitPath)
    && changedPaths.every((filename) => patterns.some((entry) => matchedByRule(filename, entry)));
}

function subjectPathsWithinFrozenScope(changedPaths, scope) {
  if (!strings(changedPaths, true) || !strings(scope, true)) return false;
  if (scope.every((entry) => !entry.includes('*'))) {
    // Existing fixed-path TaskCycles continue requiring the *entire* exact set.
    return sameStringSet(changedPaths, scope);
  }
  const patterns = frozenScopeRules(scope);
  return patterns !== null && changedPathsWithinScope(changedPaths, scope)
    // Keep any literal entries mandatory even in a mixed literal/glob policy.
    && patterns.every((entry) => entry.subtree || changedPaths.includes(entry.prefix));
}

function validateRequest(r) {
  if (!r || typeof r !== 'object') return 'RECONCILIATION_REQUEST_INVALID';
  if (!r.taskcycle || !strings([r.taskcycle.id, r.taskcycle.responsibility], true)) return 'TASKCYCLE_IDENTITY_INVALID';
  if (!r.initialization || !strings([r.initialization.location_or_ref], true)
      || !isSha256(r.initialization.identity_sha256)) return 'INITIALIZATION_REFERENCE_INVALID';
  if (!r.obligation || !strings([r.obligation.id, r.obligation.semantic_status], true)
      || r.obligation.semantic_status !== SEMANTIC_STATUS) return 'OBLIGATION_RECONCILIATION_INVALID';
  if (r.obligation.id !== AUTHORIZED_OBLIGATION_ID) return 'OBLIGATION_NOT_AUTHORIZED_FOR_PHASE1_EFFECT_RECONCILIATION';
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

function projectionFor(request, initialization, branchProvenance = null) {
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
      ...(branchProvenance ? { branch_provenance: branchProvenance } : {}),
    },
    semantics: {
      creates_authority: false,
      State_Kernel_direct_calls: 0,
      State_Kernel_named_semantic_owner: false,
      new_persistence_backend: false,
    },
  };
}

function packageFor(request, initialization, branchProvenance = null) {
  const projection = projectionFor(request, initialization, branchProvenance);
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


function samePhysicalPath(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}
// The reconciliation root and every output ancestor must be real directories.
// An exact package behind a symlink is not a trusted prior publication.
function outputDirectoryState(base, target) {
  const relative = path.relative(base, target);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return 'UNSAFE';
  const absolute = path.resolve(target);
  const volumeRoot = path.parse(absolute).root;
  const segments = path.relative(volumeRoot, absolute).split(path.sep).filter(Boolean);
  let current = volumeRoot;
  for (const segment of [null, ...segments]) {
    if (segment !== null) current = path.join(current, segment);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) { return error?.code === 'ENOENT' ? 'MISSING' : 'UNSAFE'; }
    if (!stat.isDirectory() || stat.isSymbolicLink()) return 'UNSAFE';
    try { if (!samePhysicalPath(fs.realpathSync(current), current)) return 'UNSAFE'; }
    catch { return 'UNSAFE'; }
  }
  return 'SAFE';
}
function directoryIdentity(root) {
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('UNSAFE_DIRECTORY');
  return [stat.dev, stat.ino, stat.mtimeMs].join(':');
}
function exactRegularFile(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1) throw Error('UNSAFE_EFFECT_FILE');
    const content = fs.readFileSync(fd, 'utf8');
    const after = fs.fstatSync(fd);
    if (before.dev !== after.dev || before.ino !== after.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw Error('RACING_EFFECT_FILE');
    return content;
  } finally { fs.closeSync(fd); }
}

function inspect(root, pkg, base) {
  try {
    if (outputDirectoryState(base, root) !== 'SAFE') return 'UNKNOWN';
    const before = directoryIdentity(root);
    const entries = fs.readdirSync(root).sort();
    if (entries.length !== FILES.length || entries.some((x, i) => x !== FILES[i])) return 'UNKNOWN';
    const manifest = path.join(root, 'manifest.json');
    const projection = path.join(root, 'projection.json');
    const manifestBytes = exactRegularFile(manifest);
    const projectionBytes = exactRegularFile(projection);
    if (outputDirectoryState(base, root) !== 'SAFE' || before !== directoryIdentity(root)) return 'UNKNOWN';
    return manifestBytes === pkg.manifestText && projectionBytes === pkg.projectionText ? 'EXACT' : 'CONFLICT';
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

function createTaskCycleEffectReconciliationCapability({ root, qualifiedGitSurface = null, resolveControlGitSource = null }) {
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
          || request.subject.parent !== exactInputs.TASK_carrier.commit
          || !subjectPathsWithinFrozenScope(request.subject.changed_paths, exactInputs.write_scope)) {
        return terminal(request, 'BLOCKED', 'NONE', 'SUBJECT_NOT_EXACT_PHASE1_DESCENDANT_OF_TASK_CARRIER');
      }
      // Default behavior is unchanged. A different truthful child branch can
      // be qualified only by a Control-bound, independently checked Git source.
      // No caller-supplied request proof is sufficient for a branch exception.
      let branchProvenance = null;
      const forked = request.subject.branch !== exactInputs.TASK_carrier.branch;
      if (forked) {
        if (!qualifiedGitSurface) {
          return terminal(request, 'BLOCKED', 'NONE', 'SUBJECT_NOT_EXACT_PHASE1_DESCENDANT_OF_TASK_CARRIER');
        }
        const bound = prepareForkedPhase1Branch({
          request, originalInputs: exactInputs, qualifiedGitSurface,
        });
        if (bound.status !== 'PASS') {
          return terminal(request, 'BLOCKED', 'NONE', bound.reason);
        }
        // Require separately Control-verified source before idempotent readback.
        const custody = qualifyControlGitSource({
          request, originalInputs: exactInputs, qualifiedGitSurface, resolveControlGitSource,
        });
        if (custody.status !== 'PASS')
          return terminal(request, 'BLOCKED', 'NONE', custody.reason);
        // This is stable shape validation, NOT live Git qualification.
        // The latter is mandatory before first publication, but cannot
        // invalidate an already exact immutable reconciliation on branch move.
        branchProvenance = bound.immutable;
      }

      if (!observed || !exact(request.subject, observed.subject)) {
        return terminal(request, 'BLOCKED', 'NONE', 'SUBJECT_OBSERVATION_MISMATCH');
      }

      const baseState = outputDirectoryState(base, base);
      if (baseState !== 'SAFE') {
        return terminal(request, 'FAILED', 'NONE', baseState === 'MISSING'
          ? 'RECONCILIATION_ROOT_UNAVAILABLE' : 'RECONCILIATION_ROOT_INVALID');
      }

      const pkg = packageFor(request, initialization, branchProvenance);
      const finalRoot = path.join(base, safeId(request.taskcycle.id), safeId(request.obligation.id));
      const parentRoot = path.dirname(finalRoot);

      // The fork branch is security-sensitive: an exact existing package
      // is accepted before live Git only if an independently anchored inode
      // (not a mutable pathname) holds its bytes. The first publication still
      // requires real Git qualification. On hosts without descriptor-relative
      // filesystem operations, forked publication fails closed.
      if (forked) {
        const pinned = reconcilePinnedEffect({
          root: base,
          taskName: safeId(request.taskcycle.id),
          obligationName: safeId(request.obligation.id),
          pkg,
          qualifyFirstWrite: () => {
            const qualified = qualifyForkedPhase1Branch({
              request, originalInputs: exactInputs, qualifiedGitSurface, resolveControlGitSource,
            });
            if (qualified.status !== 'PASS') return qualified;
            const { remote_head: _observationOnly, ...immutable } = qualified.verified;
            return exact(immutable, branchProvenance)
              ? { status: 'PASS' }
              : { status: 'BLOCKED', reason: 'FORK_IMMUTABLE_PROVENANCE_MISMATCH' };
          },
        });
        if (pinned.kind === 'EXACT') return pass(request, finalRoot, pkg, true, 'ALREADY_RECONCILED_EXACT');
        if (pinned.kind === 'CREATED') return pass(request, finalRoot, pkg);
        return terminal(request, 'BLOCKED', pinned.effect_state, pinned.reason);
      }

      const initialFinalState = outputDirectoryState(base, finalRoot);
      if (initialFinalState === 'UNSAFE') {
        return terminal(request, 'BLOCKED', 'NONE', 'RECONCILIATION_PATH_UNSAFE');
      }
      if (initialFinalState === 'SAFE') {
        const state = inspect(finalRoot, pkg, base);
        if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'ALREADY_RECONCILED_EXACT');
        return terminal(request, 'BLOCKED', state === 'CONFLICT' ? 'NONE' : 'UNKNOWN', state === 'CONFLICT'
          ? 'TASKCYCLE_EFFECT_RECONCILIATION_IDENTITY_CONFLICT'
          : 'EFFECT_RECONCILIATION_PROJECTION_AMBIGUOUS');
      }

      // Never let a caller's static binding alone create a new effect.
      // Qualify original source objects and current remote ancestry now,
      // only after exact existing state has been checked for idempotence.
      if (forked) {
        const qualified = qualifyForkedPhase1Branch({
          request, originalInputs: exactInputs, qualifiedGitSurface,
        });
        if (qualified.status !== 'PASS') {
          return terminal(request, 'BLOCKED', 'NONE', qualified.reason);
        }
        const { remote_head: _observationOnly, ...stable } = qualified.verified;
        if (!exact(stable, branchProvenance)) {
          return terminal(request, 'BLOCKED', 'NONE', 'FORK_IMMUTABLE_PROVENANCE_MISMATCH');
        }
      }

      let staging = null;
      try {
        if (outputDirectoryState(base, parentRoot) === 'UNSAFE') {
          return terminal(request, 'BLOCKED', 'NONE', 'RECONCILIATION_PATH_UNSAFE');
        }
        fs.mkdirSync(parentRoot, { recursive: true });
        if (outputDirectoryState(base, parentRoot) !== 'SAFE'
            || outputDirectoryState(base, finalRoot) !== 'MISSING') {
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'EFFECT_RECONCILIATION_PATH_RACE');
        }
        staging = fs.mkdtempSync(path.join(parentRoot, `.${safeId(request.obligation.id)}.staging-`));
        fs.writeFileSync(path.join(staging, 'projection.json'), pkg.projectionText, { flag: 'wx' });
        fs.writeFileSync(path.join(staging, 'manifest.json'), pkg.manifestText, { flag: 'wx' });
        if (outputDirectoryState(base, staging) !== 'SAFE'
            || inspect(staging, pkg, base) !== 'EXACT') {
          return terminal(request, 'FAILED', 'NONE', 'STAGED_EFFECT_RECONCILIATION_INVALID');
        }
        if (outputDirectoryState(base, parentRoot) !== 'SAFE'
            || outputDirectoryState(base, finalRoot) !== 'MISSING') {
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'EFFECT_RECONCILIATION_PATH_RACE');
        }
        fs.renameSync(staging, finalRoot);
        staging = null;
        return inspect(finalRoot, pkg, base) === 'EXACT'
          ? pass(request, finalRoot, pkg)
          : terminal(request, 'BLOCKED', 'UNKNOWN', 'EFFECT_RECONCILIATION_PUBLISH_UNKNOWN');
      } catch (error) {
        const finalState = outputDirectoryState(base, finalRoot);
        if (finalState === 'UNSAFE') {
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'EFFECT_RECONCILIATION_PATH_RACE');
        }
        if (finalState === 'SAFE') {
          const state = inspect(finalRoot, pkg, base);
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
  AUTHORIZED_OBLIGATION_ID,
  validateTaskCycleEffectReconciliationRequest: validateRequest,
  createTaskCycleEffectReconciliationCapability,
  consumeTaskCycleEffectReconciliation,
  changedPathsWithinScope,
  subjectPathsWithinFrozenScope,
};
