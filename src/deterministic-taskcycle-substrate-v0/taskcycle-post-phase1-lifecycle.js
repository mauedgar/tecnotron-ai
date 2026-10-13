'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  consumeTaskCycleEffectReconciliation,
} = require('./taskcycle-effect-reconciliation');
const { consumeTaskCycleInitialization } = require('./taskcycle-initialization');
const { qualifyMergeTopology } = require('./taskcycle-close-evidence-qualification');

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
  if (!p2 || p2.status !== 'PASS' || !isSha(p2.pre_tools)
      || p2.force !== false || p2.remote_correspondence !== 'EXACT') return false;

  if (p2.integration_mode === 'MERGE_COMMIT') {
    const m = p2.merge;
    const lineage = m?.candidate_lineage;
    return m && isSha(m.commit) && isSha(m.tree)
      && m.commit === p2.post_tools && m.tree === p2.post_tree
      && m.validated_combined_tree === m.tree && m.candidate_tree === candidate.tree
      && Array.isArray(m.parents) && m.parents.length === 2
      && m.parents[0] === p2.pre_tools && m.parents[1] === candidate.commit
      && uniqueStrings(lineage, true) && lineage.length >= 2
      && lineage.every(isSha)
      && lineage[0] === candidate.provenance?.phase1_subject?.commit
      && lineage[lineage.length - 1] === candidate.commit
      && lineage[lineage.length - 2] === candidate.parent
      && repositoryRelativePaths(m.changed_paths)
      && nonEmpty(m.git_observation_ref) && nonEmpty(m.preflight_ref)
      && nonEmpty(m.lineage_verification_ref)
      && m.remote_effect === 'CONFIRMED' && m.unknown_effects === 0
      && p2.accepted_first_parent_range === undefined;
  }

  // Preserve v0 direct-child and accepted-first-parent-range contracts.
  if (p2.integration_mode !== undefined && p2.integration_mode !== 'FAST_FORWARD') return false;
  if (p2.post_tools !== candidate.commit || p2.post_tree !== candidate.tree) return false;
  const acceptedRange = p2.accepted_first_parent_range;
  if (acceptedRange == null) return p2.pre_tools === candidate.parent;

  return acceptedFirstParentRangeValid(acceptedRange)
    && acceptedRange.integration_range_base === p2.pre_tools
    && acceptedRange.accepted_tip === candidate.commit
    && acceptedRange.accepted_tip_parent === candidate.parent
    && acceptedRange.accepted_tip_tree === candidate.tree
    && acceptedRange.ordered_commit_range[acceptedRange.ordered_commit_range.length - 1] === candidate.commit;
}
function verifySourceInitialization(request, source) {
  if (request.Phase_2.integration_mode !== 'MERGE_COMMIT') return null;
  const v = request.source_initialization;
  if (!v || !nonEmpty(v.location_or_ref) || !isSha256(v.identity_sha256)
      || v.identity_sha256 !== source.manifest.source_initialization_identity_sha256
      || v.identity_sha256 !== source.projection.source_initialization?.identity_sha256
      || request.source_reconciliation.identity_sha256 !== source.identity_sha256) {
    return 'ORIGINAL_INITIALIZATION_SOURCE_CHAIN_MISMATCH';
  }
  try {
    const origin = consumeTaskCycleInitialization({
      location: v.location_or_ref, expected_identity_sha256: v.identity_sha256,
    });
    if (!exact(origin.projection.TaskCycle, source.projection.TaskCycle)
        || !exact(origin.projection.exact_inputs, source.projection.exact_inputs)
        || origin.projection.TaskCycle.id !== request.taskcycle.id
        || origin.projection.current_gate !== 'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE'
        || source.projection.reconciled_effect?.replayed !== false
        || source.projection.reconciled_effect?.preserved !== true) {
      return 'ORIGINAL_INITIALIZATION_CORRESPONDENCE_INVALID';
    }
  } catch { return 'ORIGINAL_INITIALIZATION_ACQUISITION_FAILED'; }
  return null;
}
function qualifiedMergeObservation(request, source, surface, resolved) {
  if (request.Phase_2.integration_mode !== 'MERGE_COMMIT') return {error:null,verified:null};
  // surface is supplied by Product Control at capability construction, never
  // sourced from request/observed.trusted_git. It has no Product authority.
  if (!surface || !surface.repositoryPath
      || surface.binding !== 'CONTROL_QUALIFIED_GIT'
      || surface.remoteUrl !== 'https://github.com/mauedgar/tecnotron-ai.git'
      || !isSha256(surface.qualification_identity_sha256)
      || surface.qualification_identity_sha256 !== resolved?.git_surface_identity_sha256
      || !nonEmpty(surface.qualification_receipt_ref)
      || surface.qualification_receipt_ref !== resolved?.git_surface_receipt_ref) {
    return {error:'QUALIFIED_GIT_SURFACE_REQUIRED'};
  }
  const p=source.projection, original=p.exact_inputs;
  if (!original || !Array.isArray(original.write_scope) || !original.TASK_carrier
      || !p.reconciled_effect?.subject) return {error:'ORIGINAL_SOURCE_INCOMPLETE'};
  const m=request.Phase_2.merge;
  const valid=qualifyMergeTopology({
    repositoryPath:surface.repositoryPath,
    remoteUrl:surface.remoteUrl,
    expectedRemoteCommit:request.Phase_2.post_tools,
    request,
    phase1:{...p.reconciled_effect.subject,task_carrier:original.TASK_carrier.commit},
    originalTaskCycleId:request.taskcycle.id,
    scope:{
      write_scope:original.write_scope,
      task_path:original.TASK_carrier.path,
      authorized_added_paths:resolved?.scope_added_paths || [],
      baseline_path_scope:[...original.write_scope,...(resolved?.scope_added_paths || []),original.TASK_carrier.path],
    },
    historicalContinuity:resolved?.historical_continuity || null,
    authorizedScopeAmendments:resolved?.scope_amendments || [],
  });
  if (valid.status!=='PASS') return {error:'MERGE_GIT_EVIDENCE_UNVERIFIED:'+valid.reason};
  return {error:null,verified:valid.verified};
}
function qualifiedControlEvidence(request, source, resolution) {
  if (request.Phase_2.integration_mode !== 'MERGE_COMMIT') return {error:null,proof:null};
  if (typeof resolution !== 'function')
    return {error:'COMPETENT_PRODUCT_CONTROL_RESOLUTION_REQUIRED',proof:null};
  let p;
  // Pass snapshots to externally supplied Control resolver. A callback is not
  // an authority oracle and must not mutate the original lifecycle request or
  // source projection that this consumer subsequently validates and publishes.
  // Control remains responsible for authenticating the resolver's provenance.
  try {p=resolution({request:structuredClone(request),source:structuredClone(source)});} catch {
    return {error:'ORIGINAL_PRODUCT_AUTHORITY_SOURCE_UNAVAILABLE',proof:null};
  }
  const c=request.candidate, p2=request.Phase_2, original=source.projection.exact_inputs;
  const added=p?.scope_added_paths, amendments=p?.scope_amendments;
  const scopeOk=Array.isArray(added) && repositoryRelativePaths(added)
    && Array.isArray(amendments)
    && amendments.every(a=>a && nonEmpty(a.ref) && isSha(a.blob)
      && isSha(a.source_commit) && a.source_commit===c.commit
      && typeof a.path==='string' && repositoryRelativePaths([a.path])
      && nonEmpty(a.Developer_authority_ref) && Array.isArray(a.added_paths)
      && repositoryRelativePaths(a.added_paths))
    && (added.length===0 || amendments.length>0)
    && amendments.every(a=>added.includes(a.path))
    && exact([...new Set(amendments.flatMap(a=>a.added_paths))].sort(),[...added].sort())
    && exact(p?.effective_write_scope,[...new Set([...(original?.write_scope||[]),...added])].sort());
  if (!p || p.status!=='COMPETENTLY_RESOLVED' || !scopeOk
      || p.taskcycle_id!==request.taskcycle.id
      || p.original_taskcycle_id!==request.taskcycle.id
      || p.original_initialization_sha256!==request.source_initialization?.identity_sha256
      || p.original_phase1_sha256!==request.source_reconciliation.identity_sha256
      || p.exact_candidate_commit!==c.commit || p.exact_candidate_tree!==c.tree
      || p.canonical_integration_commit!==p2.post_tools
      || p.canonical_integration_tree!==p2.post_tree
      || p.reviewer_verdict!=='PASS' || p.blocking_findings!==0
      || p.original_review_id!==request.independent_review.id
      || p.original_review_sha256!==request.independent_review.result_sha256
      // These are mechanical correlations to a Control-verified original,
      // never a self-authenticating authorization by the injected callback.
      || p.frozen_review_interface_id!==request.frozen_review_interface.id
      || p.frozen_review_interface_prompt_sha256!==request.frozen_review_interface.prompt_sha256
      || p.original_review_interface_prompt_sha256!==request.frozen_review_interface.prompt_sha256
      || !nonEmpty(p.frozen_review_interface_ref)
      || p.logical_close_authority_ref!==request.logical_close.authority_ref
      || !nonEmpty(p.logical_close_authorization_receipt_ref)
      || !isSha256(p.logical_close_authorization_receipt_sha256)
      || p.Developer_acceptance!=='GRANTED'
      || p.Developer_authority_source!==request.Developer_acceptance.authority_ref
      || p.effect_state!=='KNOWN'
      || p.natively_tested_tree!==p2.post_tree
      || p.candidate_tested_commit!==c.commit || p.candidate_tested_tree!==c.tree
      || !isSha256(p.candidate_validation_sha256)
      || p.candidate_validation_sha256 !== request.promotion_grade_validation.receipt_sha256
      || !isSha256(p.combined_validation_sha256)
      || p.combined_validation_sha256 !== request.Phase_2.merge.preflight_sha256
      || !isSha256(p.git_surface_identity_sha256)
      || !nonEmpty(p.git_surface_receipt_ref)
      || !nonEmpty(p.original_review_ref)
      || !nonEmpty(p.candidate_validation_ref)
      || !nonEmpty(p.combined_validation_ref)
      || !nonEmpty(p.Control_reconciliation_ref)
      || !nonEmpty(p.qualified_evidence_provenance_ref)
      || p.chronology_verified!==true) {
    return {error:'COMPETENT_PRODUCT_CONTROL_RESOLUTION_INVALID',proof:null};
  }
  return {error:null,proof:p};
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
  const postCommit = p2.integration_mode === 'MERGE_COMMIT' ? p2.post_tools : c.commit;
  const postTree = p2.integration_mode === 'MERGE_COMMIT' ? p2.post_tree : c.tree;
  if (!er || er.status !== 'PASS' || er.canonical_commit !== postCommit
      || er.canonical_tree !== postTree || !Array.isArray(er.unresolved_UNKNOWN_effects)
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

function validateSource(request, source, resolved = null) {
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
  if (request.Phase_2.integration_mode === 'MERGE_COMMIT') {
    const original = p.exact_inputs;
    const c = request.candidate;
    const m = request.Phase_2.merge;
    if (!original || !Array.isArray(original.write_scope) || !original.TASK_carrier
        || !nonEmpty(original.TASK_carrier.path) || !isSha(original.TASK_carrier.commit)) {
      return 'SOURCE_EXACT_INPUTS_MISSING';
    }
    const effective = resolved?.effective_write_scope;
    if (!Array.isArray(effective) || !repositoryRelativePaths(effective))
      return 'QUALIFIED_EFFECTIVE_SCOPE_REQUIRED';
    const allowed = [...effective, original.TASK_carrier.path].sort();
    if (c.provenance.task_carrier_commit !== original.TASK_carrier.commit
        || c.provenance.task_carrier_path !== original.TASK_carrier.path
        || !exact([...c.changed_paths].sort(), effective)
        || !exact([...m.changed_paths].sort(), allowed)
        || m.candidate_lineage[0] !== p.reconciled_effect.subject.commit
        || c.parent !== m.candidate_lineage[m.candidate_lineage.length - 2]) {
      return 'MERGE_CANDIDATE_OR_SCOPE_PROVENANCE_MISMATCH';
    }
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

// A pre-existing symlinked TaskCycle directory must never redirect a close
// outside the declared local root. Check the directory itself (not existsSync,
// which follows symlinks and misses dangling links) and its real parent.
function secureTerminalDirectory(location, parent) {
  try {
    const info = fs.lstatSync(location);
    if (!info.isDirectory() || info.isSymbolicLink()) return false;
    return fs.realpathSync(location) === path.join(fs.realpathSync(parent), path.basename(location));
  } catch { return false; }
}
function entryPresent(location) {
  try { fs.lstatSync(location); return true; }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

function inspect(root, pkg) {
  if (!secureTerminalDirectory(root, path.dirname(root))) return 'UNKNOWN';
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

function createTaskCyclePostPhase1LifecycleCapability({ root, qualifiedGitSurface = null, resolveCompetentProductEvidence = null }) {
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
      const resolution = qualifiedControlEvidence(request, source, resolveCompetentProductEvidence);
      if (resolution.error) return terminal(request, 'BLOCKED', 'NONE', resolution.error);
      const sourceInvalid = validateSource(request, source, resolution.proof);
      if (sourceInvalid) return terminal(request, 'BLOCKED', 'NONE', sourceInvalid);
      const initInvalid = verifySourceInitialization(request, source);
      if (initInvalid) return terminal(request, 'BLOCKED', 'NONE', initInvalid);

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
      // Exact terminal readback precedes live Git HEAD check. A genuine historical
      // close stays idempotent even after tools later advances.
      if (entryPresent(parentRoot) && !secureTerminalDirectory(parentRoot, base)) {
        return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PARENT_UNSAFE');
      }
      if (entryPresent(finalRoot)) {
        if (!secureTerminalDirectory(finalRoot, parentRoot)) {
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_TERMINAL_UNSAFE');
        }
        const state = inspect(finalRoot, pkg);
        if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'ALREADY_CLOSED_EXACT');
        return terminal(request, 'BLOCKED', state === 'CONFLICT' ? 'NONE' : 'UNKNOWN', state === 'CONFLICT'
          ? 'POST_PHASE1_LIFECYCLE_IDENTITY_CONFLICT'
          : 'POST_PHASE1_LIFECYCLE_PROJECTION_AMBIGUOUS');
      }
      const gitObservation = qualifiedMergeObservation(request, source, qualifiedGitSurface, resolution.proof);
      if (gitObservation.error)
        return terminal(request, 'BLOCKED', 'NONE', gitObservation.error);
      try {
        if (!entryPresent(parentRoot)) fs.mkdirSync(parentRoot);
      } catch (error) {
        return terminal(request, 'FAILED', 'NONE',
          `POST_PHASE1_LIFECYCLE_PARENT_CREATE_FAILED:${error?.message || String(error)}`);
      }
      if (!secureTerminalDirectory(parentRoot, base)) {
        return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PARENT_UNSAFE');
      }

      let staging = null;
      try {
        staging = fs.mkdtempSync(path.join(parentRoot, '.closed-pass.staging-'));
        fs.writeFileSync(path.join(staging, 'projection.json'), pkg.projectionText, { flag: 'wx' });
        fs.writeFileSync(path.join(staging, 'manifest.json'), pkg.manifestText, { flag: 'wx' });
        if (inspect(staging, pkg) !== 'EXACT') {
          return terminal(request, 'FAILED', 'NONE', 'STAGED_POST_PHASE1_LIFECYCLE_INVALID');
        }
        if (!secureTerminalDirectory(parentRoot, base)
            || !secureTerminalDirectory(staging, parentRoot)) {
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_STAGING_UNSAFE');
        }
        if (entryPresent(finalRoot)) {
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PUBLISH_RACE');
        }
        // The independent Git remote can advance between qualification and
        // local publication. Recheck the actual Git evidence at the last
        // possible moment, and reject a different remote head even if it is
        // still a descendant. This does not claim an atomic cross-provider lock.
        if (request.Phase_2.integration_mode==='MERGE_COMMIT') {
          const publicationGit = qualifiedMergeObservation(request, source, qualifiedGitSurface, resolution.proof);
          if (publicationGit.error)
            return terminal(request, 'BLOCKED', 'NONE', 'PREPUBLICATION_GIT_RECHECK:'+publicationGit.error);
          if (publicationGit.verified?.remote_oid !== gitObservation.verified?.remote_oid)
            return terminal(request, 'BLOCKED', 'NONE', 'REMOTE_HEAD_CHANGED_DURING_LOCAL_CLOSE');
        }
        fs.renameSync(staging, finalRoot);
        staging = null;
        return inspect(finalRoot, pkg) === 'EXACT'
          ? pass(request, finalRoot, pkg)
          : terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PUBLISH_UNKNOWN');
      } catch (error) {
        if (entryPresent(finalRoot)) {
          const state = inspect(finalRoot, pkg);
          if (state === 'EXACT') return pass(request, finalRoot, pkg, true, 'PUBLISH_RACE_RECONCILED_EXACT');
          if (state === 'CONFLICT') {
            return terminal(request, 'BLOCKED', 'NONE', 'POST_PHASE1_LIFECYCLE_IDENTITY_CONFLICT');
          }
          return terminal(request, 'BLOCKED', 'UNKNOWN', 'POST_PHASE1_LIFECYCLE_PUBLISH_UNKNOWN');
        }
        return terminal(request, 'FAILED', 'NONE', `POST_PHASE1_LIFECYCLE_MATERIALIZATION_FAILED:${error?.message || String(error)}`);
      } finally {
        if (staging && entryPresent(staging) && secureTerminalDirectory(staging, parentRoot)) {
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
