'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  consumeTaskCycleEffectReconciliation,
} = require('./taskcycle-effect-reconciliation');

const PROJECTION_SCHEMA = 'deterministic-taskcycle-post-phase1-close/v0';
const MANIFEST_SCHEMA = 'deterministic-taskcycle-post-phase1-close-manifest/v0';
const TERMINAL_DISPOSITION = 'CLOSED_PASS';
const REQUIRED_PENDING_IDS = [
  'promotion_grade_validation',
  'exact_candidate',
  'frozen_review_interface',
  'independent_review',
  'Developer_acceptance',
  'Phase_2',
  'effect_reconciliation',
  'logical_close',
];
const ALL_OBLIGATION_IDS = ['implementation', ...REQUIRED_PENDING_IDS];
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
function nonEmpty(value) { return typeof value === 'string' && value.trim() !== ''; }
function uniqueStrings(value, required = false) {
  return Array.isArray(value)
    && (!required || value.length > 0)
    && value.every(nonEmpty)
    && new Set(value).size === value.length;
}

function repositoryRelativePaths(value) {
  return uniqueStrings(value)
    && value.every((entry) => {
      const segments = entry.split('/');
      return !entry.startsWith('/')
        && !entry.includes('\\')
        && !/[\r\n\0]/.test(entry)
        && segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..');
    });
}
function acceptedFirstParentRangeValid(value) {
  return value && typeof value === 'object'
    && isSha(value.integration_range_base)
    && isSha(value.accepted_tip)
    && isSha(value.accepted_tip_parent)
    && isSha(value.accepted_tip_tree)
    && uniqueStrings(value.ordered_commit_range, true)
    && value.ordered_commit_range.every(isSha)
    && Number.isInteger(value.commit_count)
    && value.commit_count > 0
    && value.commit_count === value.ordered_commit_range.length
    && repositoryRelativePaths(value.changed_paths);
}
function phase2EvidenceValid(p2, candidate) {
  if (!p2 || p2.status !== 'PASS'
      || !isSha(p2.pre_tools)
      || p2.post_tools !== candidate.commit
      || p2.post_tree !== candidate.tree
      || p2.force !== false
      || p2.remote_correspondence !== 'EXACT') {
    return false;
  }

  const acceptedRange = p2.accepted_first_parent_range;
  if (acceptedRange == null) return p2.pre_tools === candidate.parent;

  return acceptedFirstParentRangeValid(acceptedRange)
    && acceptedRange.integration_range_base === p2.pre_tools
    && acceptedRange.accepted_tip === candidate.commit
    && acceptedRange.accepted_tip_parent === candidate.parent
    && acceptedRange.accepted_tip_tree === candidate.tree
    && acceptedRange.ordered_commit_range[acceptedRange.ordered_commit_range.length - 1] === candidate.commit;
}
function unique(left, right) {
  return [...new Set([...(left || []), ...(right || [])])];
}
function executionId(value) {
  return (typeof value === 'string' && value.trim() !== '') || Number.isInteger(value);
}
function exactIds(entries, expected, status) {
  return Array.isArray(entries)
    && entries.length === expected.length
    && entries.every((entry, index) => entry?.id === expected[index] && entry?.status === status);
}
function terminal(request, status, effect_state, reason) {
  return {
    status,
    effect_state,
    reason,
    TaskCycle: null,
    terminal_disposition_ref: null,
    pending_obligations: [],
    portable_projection: null,
    State_Kernel_direct_calls: 0,
    already_closed: false,
  };
}

function validateRequest(r) {
  if (!r || typeof r !== 'object') return 'POST_PHASE1_CLOSE_REQUEST_INVALID';
  if (!r.taskcycle || !nonEmpty(r.taskcycle.id) || !nonEmpty(r.taskcycle.responsibility)) return 'TASKCYCLE_IDENTITY_INVALID';
  if (!r.source_reconciliation || !nonEmpty(r.source_reconciliation.location_or_ref)
      || !isSha256(r.source_reconciliation.identity_sha256)) return 'SOURCE_RECONCILIATION_REFERENCE_INVALID';

  const c = r.candidate;
  if (!c || !nonEmpty(c.repository) || !nonEmpty(c.branch)
      || !isSha(c.commit) || !isSha(c.tree) || !isSha(c.parent)
      || !uniqueStrings(c.changed_paths, true)
      || !c.provenance || !c.provenance.phase1_subject) return 'EXACT_CANDIDATE_INVALID';

  const v = r.promotion_grade_validation;
  if (!v || !nonEmpty(v.provider) || !executionId(v.run_id) || !executionId(v.job_id)
      || v.status !== 'PASS' || v.exact_candidate_commit !== c.commit
      || v.exact_candidate_tree !== c.tree || v.contracts_check !== 'PASS'
      || v.post_validation_git_guard !== 'PASS' || !v.full_tests
      || !Number.isInteger(v.full_tests.total) || !Number.isInteger(v.full_tests.passed)
      || !Number.isInteger(v.full_tests.failed) || !Number.isInteger(v.full_tests.skipped)
      || v.full_tests.failed !== 0
      || v.full_tests.total !== v.full_tests.passed + v.full_tests.failed + v.full_tests.skipped) {
    return 'PROMOTION_GRADE_VALIDATION_EVIDENCE_INVALID';
  }

  const f = r.frozen_review_interface;
  if (!f || !nonEmpty(f.id) || !isSha256(f.prompt_sha256)
      || f.subject_commit !== c.commit || f.subject_tree !== c.tree) return 'FROZEN_REVIEW_INTERFACE_INVALID';

  const ir = r.independent_review;
  if (!ir || !nonEmpty(ir.id) || ir.verdict !== 'PASS'
      || ir.subject_commit !== c.commit || ir.subject_tree !== c.tree
      || !isSha256(ir.result_sha256)
      || !Array.isArray(ir.blocking_findings) || ir.blocking_findings.length !== 0) {
    return 'INDEPENDENT_REVIEW_EVIDENCE_INVALID';
  }

  const da = r.Developer_acceptance;
  if (!da || da.status !== 'GRANTED' || !nonEmpty(da.authority_ref)
      || da.subject_commit !== c.commit || da.subject_tree !== c.tree) {
    return 'DEVELOPER_ACCEPTANCE_EVIDENCE_INVALID';
  }

  const p2 = r.Phase_2;
  if (!phase2EvidenceValid(p2, c)) return 'PHASE2_EVIDENCE_INVALID';

  const er = r.effect_reconciliation;
  if (!er || er.status !== 'PASS' || er.canonical_commit !== c.commit
      || er.canonical_tree !== c.tree || !Array.isArray(er.unresolved_UNKNOWN_effects)
      || er.unresolved_UNKNOWN_effects.length !== 0) return 'EFFECT_RECONCILIATION_EVIDENCE_INVALID';

  const lc = r.logical_close;
  if (!lc || lc.terminal_disposition_ref !== TERMINAL_DISPOSITION || !nonEmpty(lc.authority_ref)) {
    return 'LOGICAL_CLOSE_AUTHORITY_INVALID';
  }

  if (!uniqueStrings(r.authority_refs, true) || !uniqueStrings(r.evidence_refs, true)
      || !r.authority_refs.includes(da.authority_ref)
      || !r.authority_refs.includes(lc.authority_ref)) {
    return 'POST_PHASE1_CLOSE_REFS_INVALID';
  }
  return null;
}

function validateSource(request, source) {
  const p = source.projection;
  if (!exact(p.TaskCycle, {
    id: request.taskcycle.id,
    responsibility: request.taskcycle.responsibility,
    state: 'ACTIVE',
  })) return 'SOURCE_TASKCYCLE_IDENTITY_MISMATCH';
  if (p.current_gate !== 'PROMOTION_GRADE_VALIDATION') return 'SOURCE_GATE_INVALID';
  if (!Array.isArray(p.obligations) || p.obligations.length !== ALL_OBLIGATION_IDS.length) {
    return 'SOURCE_OBLIGATION_SET_INVALID';
  }
  const implementation = p.obligations[0];
  if (implementation?.id !== 'implementation' || implementation?.status !== 'SATISFIED') {
    return 'SOURCE_IMPLEMENTATION_NOT_SATISFIED';
  }
  if (!exactIds(p.obligations.slice(1), REQUIRED_PENDING_IDS, 'PENDING')) {
    return 'SOURCE_PENDING_OBLIGATIONS_INVALID';
  }
  if (!exact(request.candidate.provenance.phase1_subject, p.reconciled_effect?.subject)) {
    return 'CANDIDATE_PHASE1_PROVENANCE_MISMATCH';
  }
  if (p.reconciled_effect?.obligation_id !== 'implementation'
      || p.reconciled_effect?.replayed !== false
      || p.reconciled_effect?.preserved !== true
      || p.reconciled_effect?.mutation_during_reconciliation !== 'NONE') {
    return 'SOURCE_PHASE1_RECONCILIATION_INVALID';
  }
  if (p.semantics?.creates_authority !== false
      || p.semantics?.State_Kernel_direct_calls !== 0
      || p.semantics?.State_Kernel_named_semantic_owner !== false
      || p.semantics?.new_persistence_backend !== false) {
    return 'SOURCE_SEMANTICS_INVALID';
  }
  return null;
}

function projectionFor(request, source) {
  return {
    schema: PROJECTION_SCHEMA,
    TaskCycle: {
      id: request.taskcycle.id,
      responsibility: request.taskcycle.responsibility,
      state: 'CLOSED',
    },
    source_reconciliation: {
      identity_sha256: request.source_reconciliation.identity_sha256,
    },
    exact_inputs: source.projection.exact_inputs,
    obligations: source.projection.obligations.map((entry) => ({ ...entry, status: 'SATISFIED' })),
    pending_obligations: [],
    current_gate: null,
    terminal_disposition_ref: TERMINAL_DISPOSITION,
    exact_candidate: request.candidate,
    lifecycle_evidence: {
      promotion_grade_validation: request.promotion_grade_validation,
      frozen_review_interface: request.frozen_review_interface,
      independent_review: request.independent_review,
      Developer_acceptance: request.Developer_acceptance,
      Phase_2: request.Phase_2,
      effect_reconciliation: request.effect_reconciliation,
      logical_close: request.logical_close,
    },
    authority_refs: unique(source.projection.authority_refs, request.authority_refs),
    evidence_refs: unique(source.projection.evidence_refs, request.evidence_refs),
    preserved_Phase1_effect: source.projection.reconciled_effect,
    semantics: {
      creates_authority: false,
      evidence_records_resolved_facts_only: true,
      State_Kernel_direct_calls: 0,
      State_Kernel_named_semantic_owner: false,
      new_persistence_backend: false,
      arbitrary_obligation_mutation: false,
    },
  };
}

function packageFor(request, source) {
  const projection = projectionFor(request, source);
  const projectionText = stableJson(projection);
  const manifest = {
    schema: MANIFEST_SCHEMA,
    taskcycle_id: request.taskcycle.id,
    responsibility: request.taskcycle.responsibility,
    source_reconciliation_identity_sha256: request.source_reconciliation.identity_sha256,
    exact_candidate_commit: request.candidate.commit,
    terminal_disposition_ref: TERMINAL_DISPOSITION,
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

function pass(request, finalRoot, pkg, already_closed = false, reason = null) {
  return {
    status: 'PASS',
    effect_state: 'CONFIRMED',
    reason,
    TaskCycle: pkg.projection.TaskCycle,
    terminal_disposition_ref: TERMINAL_DISPOSITION,
    pending_obligations: [],
    portable_projection: { location_or_ref: finalRoot, identity_sha256: pkg.identity },
    State_Kernel_direct_calls: 0,
    already_closed,
  };
}

function createTaskCyclePostPhase1LifecycleCapability({ root }) {
  const base = path.resolve(root);
  return {
    closeFromResolvedLifecycle({ request, observed }) {
      const invalid = validateRequest(request);
      if (invalid) return terminal(request, 'BLOCKED', 'NONE', invalid);
      if (!observed || !exact(request.candidate, observed.candidate)
          || !exact(request.promotion_grade_validation, observed.promotion_grade_validation)
          || !exact(request.frozen_review_interface, observed.frozen_review_interface)
          || !exact(request.independent_review, observed.independent_review)
          || !exact(request.Developer_acceptance, observed.Developer_acceptance)
          || !exact(request.Phase_2, observed.Phase_2)
          || !exact(request.effect_reconciliation, observed.effect_reconciliation)
          || !exact(request.logical_close, observed.logical_close)) {
        return terminal(request, 'BLOCKED', 'NONE', 'RESOLVED_LIFECYCLE_OBSERVATION_MISMATCH');
      }

      let source;
      try {
        source = consumeTaskCycleEffectReconciliation({
          location: request.source_reconciliation.location_or_ref,
          expected_identity_sha256: request.source_reconciliation.identity_sha256,
        });
      } catch (error) {
        return terminal(request, 'BLOCKED', 'NONE', `SOURCE_RECONCILIATION_CONSUME_FAILED:${error?.message || String(error)}`);
      }
      const sourceInvalid = validateSource(request, source);
      if (sourceInvalid) return terminal(request, 'BLOCKED', 'NONE', sourceInvalid);

      let baseStat;
      try { baseStat = fs.lstatSync(base); } catch {
        return terminal(request, 'FAILED', 'NONE', 'POST_PHASE1_LIFECYCLE_ROOT_UNAVAILABLE');
      }
      if (!baseStat.isDirectory() || baseStat.isSymbolicLink()) {
        return terminal(request, 'FAILED', 'NONE', 'POST_PHASE1_LIFECYCLE_ROOT_INVALID');
      }

      const pkg = packageFor(request, source);
      const finalRoot = path.join(base, safeId(request.taskcycle.id), 'closed-pass');
      const parentRoot = path.dirname(finalRoot);
      fs.mkdirSync(parentRoot, { recursive: true });

      if (fs.existsSync(finalRoot)) {
        const state = inspect(finalRoot, pkg);
        if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'ALREADY_CLOSED_EXACT');
        return terminal(request, 'BLOCKED', state === 'CONFLICT' ? 'NONE' : 'UNKNOWN', state === 'CONFLICT'
          ? 'POST_PHASE1_LIFECYCLE_IDENTITY_CONFLICT'
          : 'POST_PHASE1_LIFECYCLE_PROJECTION_AMBIGUOUS');
      }

      let staging = null;
      try {
        staging = fs.mkdtempSync(path.join(parentRoot, '.closed-pass.staging-'));
        fs.writeFileSync(path.join(staging, 'projection.json'), pkg.projectionText, { flag: 'wx' });
        fs.writeFileSync(path.join(staging, 'manifest.json'), pkg.manifestText, { flag: 'wx' });
        if (inspect(staging, pkg) !== 'EXACT') {
          return terminal(request, 'FAILED', 'NONE', 'STAGED_POST_PHASE1_LIFECYCLE_INVALID');
        }
        fs.renameSync(staging, finalRoot);
        staging = null;
        return inspect(finalRoot, pkg) === 'EXACT'
          ? pass(request, finalRoot, pkg)
          : terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PUBLISH_UNKNOWN');
      } catch (error) {
        if (fs.existsSync(finalRoot)) {
          const state = inspect(finalRoot, pkg);
          if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'PUBLISH_RACE_RECONCILED_EXACT');
          if (state === 'CONFLICT') {
            return terminal(request, 'BLOCKED', 'NONE', 'POST_PHASE1_LIFECYCLE_IDENTITY_CONFLICT');
          }
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PUBLISH_UNKNOWN');
        }
        return terminal(request, 'FAILED', 'NONE', `POST_PHASE1_LIFECYCLE_MATERIALIZATION_FAILED:${error?.message || String(error)}`);
      } finally {
        if (staging && fs.existsSync(staging)) {
          try { fs.rmSync(staging, { recursive: true, force: true }); } catch { /* best effort */ }
        }
      }
    },
  };
}

function consumeTaskCyclePostPhase1Lifecycle({ location, expected_identity_sha256 }) {
  if (!nonEmpty(location) || !isSha256(expected_identity_sha256)) {
    throw new Error('INVALID_POST_PHASE1_LIFECYCLE_CONSUME_REQUEST');
  }
  const root = path.resolve(location);
  const manifestText = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
  if (sha256(manifestText) !== expected_identity_sha256) throw new Error('POST_PHASE1_LIFECYCLE_IDENTITY_MISMATCH');
  const manifest = JSON.parse(manifestText);
  const projectionText = fs.readFileSync(path.join(root, 'projection.json'), 'utf8');
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.files?.['projection.json'] !== sha256(projectionText)) {
    throw new Error('POST_PHASE1_LIFECYCLE_PACKAGE_INVALID');
  }
  const p = JSON.parse(projectionText);
  if (p.schema !== PROJECTION_SCHEMA || p.TaskCycle?.state !== 'CLOSED'
      || p.terminal_disposition_ref !== TERMINAL_DISPOSITION
      || p.current_gate !== null || !Array.isArray(p.pending_obligations) || p.pending_obligations.length !== 0
      || !exactIds(p.obligations, ALL_OBLIGATION_IDS, 'SATISFIED')
      || p.semantics?.creates_authority !== false
      || p.semantics?.evidence_records_resolved_facts_only !== true
      || p.semantics?.State_Kernel_direct_calls !== 0
      || p.semantics?.State_Kernel_named_semantic_owner !== false
      || p.semantics?.new_persistence_backend !== false
      || p.semantics?.arbitrary_obligation_mutation !== false
      || manifest.taskcycle_id !== p.TaskCycle.id
      || manifest.responsibility !== p.TaskCycle.responsibility
      || manifest.exact_candidate_commit !== p.exact_candidate?.commit
      || manifest.terminal_disposition_ref !== TERMINAL_DISPOSITION
      || manifest.source_reconciliation_identity_sha256 !== p.source_reconciliation?.identity_sha256) {
    throw new Error('POST_PHASE1_LIFECYCLE_PROJECTION_INVALID');
  }
  return { manifest, projection: p, identity_sha256: expected_identity_sha256 };
}

module.exports = {
  PROJECTION_SCHEMA,
  TERMINAL_DISPOSITION,
  REQUIRED_PENDING_IDS,
  validateTaskCyclePostPhase1LifecycleRequest: validateRequest,
  createTaskCyclePostPhase1LifecycleCapability,
  consumeTaskCyclePostPhase1Lifecycle,
};
