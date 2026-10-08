'use strict';

// Narrow post-adoption compatibility for an exact *already initialized* TaskCycle.
// Does not remap obligation IDs, infer competence, or change the v0 nine-ID path.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { consumeTaskCycleInitialization } = require('./taskcycle-initialization');

const SCHEMA = 'deterministic-taskcycle-obligation-compatible-close/v0';
const MANIFEST_SCHEMA = 'deterministic-taskcycle-obligation-compatible-close-manifest/v0';
const FILES = ['manifest.json', 'projection.json'];
const SHA = /^[a-f0-9]{40}$/i;
const HASH = /^sha256:[a-f0-9]{64}$/i;

function nonempty(v) { return typeof v === 'string' && v.trim() !== ''; }
function sha(v) { return nonempty(v) && SHA.test(v); }
function hash(v) { return nonempty(v) && HASH.test(v); }
function unique(v, required = true) {
  return Array.isArray(v) && (!required || v.length > 0) && v.every(nonempty) && new Set(v).size === v.length;
}
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => (o[k] = stable(v[k]), o), {});
  return v;
}
function json(v) { return `${JSON.stringify(stable(v), null, 2)}\n`; }
function exact(a, b) { return json(a) === json(b); }
function digest(s) { return `sha256:${createHash('sha256').update(s, 'utf8').digest('hex')}`; }
function id(v) { return encodeURIComponent(v).replaceAll('%', '_'); }
function terminal(reason, effect_state = 'NONE') {
  return { status: 'BLOCKED', effect_state, reason, TaskCycle: null, terminal_disposition_ref: null,
    pending_obligations: [], portable_projection: null, State_Kernel_direct_calls: 0, already_closed: false };
}
function cleanPaths(p) {
  return unique(p) && p.every(s => !s.startsWith('/') && !s.includes('\\') && !/[\r\n\0]/.test(s)
    && s.split('/').every(c => c && c !== '.' && c !== '..'));
}
function validRange(range, c, p) {
  if (!range || !sha(range.integration_range_base) || !sha(range.accepted_tip)
      || !sha(range.accepted_tip_parent) || !sha(range.accepted_tip_tree)
      || !Array.isArray(range.ordered_commit_range) || !range.ordered_commit_range.length
      || !range.ordered_commit_range.every(sha) || new Set(range.ordered_commit_range).size !== range.ordered_commit_range.length
      || !Number.isInteger(range.commit_count) || range.commit_count !== range.ordered_commit_range.length
      || !cleanPaths(range.changed_paths)) return false;
  return range.integration_range_base === p.pre_tools && range.accepted_tip === c.commit
    && range.accepted_tip_parent === c.parent && range.accepted_tip_tree === c.tree
    && range.ordered_commit_range.at(-1) === c.commit;
}
function validateRequest(r) {
  if (!r || !r.taskcycle || !nonempty(r.taskcycle.id) || !nonempty(r.taskcycle.responsibility)) return 'TASKCYCLE_IDENTITY_INVALID';
  if (!r.initialization || !nonempty(r.initialization.location_or_ref) || !hash(r.initialization.identity_sha256)) return 'INITIALIZATION_REFERENCE_INVALID';
  const c = r.candidate;
  if (!c || !nonempty(c.repository) || !nonempty(c.branch) || !sha(c.commit) || !sha(c.tree)
      || !sha(c.parent) || !cleanPaths(c.changed_paths)) return 'EXACT_CANDIDATE_INVALID';
  if (!r.validation || r.validation.status !== 'PASS' || r.validation.commit !== c.commit
      || r.validation.tree !== c.tree || !nonempty(r.validation.evidence_ref)) return 'VALIDATION_EVIDENCE_INVALID';
  if (!r.freeze || !nonempty(r.freeze.id) || !hash(r.freeze.identity_sha256)
      || r.freeze.commit !== c.commit || r.freeze.tree !== c.tree) return 'FROZEN_REVIEW_INTERFACE_INVALID';
  const rev = r.review;
  if (!rev || rev.actual_verdict !== 'PASS' || rev.normalized_class !== 'PASS_CLASS'
      || !nonempty(rev.id) || !hash(rev.result_sha256) || rev.commit !== c.commit || rev.tree !== c.tree
      || !Array.isArray(rev.blocking_findings) || rev.blocking_findings.length !== 0
      || !Array.isArray(rev.nonblocking_findings)) return 'INDEPENDENT_REVIEW_NOT_QUALIFIED_PASS';
  const da = r.Developer_acceptance;
  if (!da || da.status !== 'GRANTED' || !nonempty(da.authority_ref)
      || da.commit !== c.commit || da.tree !== c.tree) return 'DEVELOPER_ACCEPTANCE_REQUIRED';
  const p = r.Phase_2;
  if (!p || p.status !== 'PASS' || !sha(p.pre_tools) || p.post_tools !== c.commit || p.post_tree !== c.tree
      || p.force !== false || p.remote_correspondence !== 'EXACT'
      || !validRange(p.accepted_first_parent_range, c, p)) return 'PHASE2_RANGE_EVIDENCE_INVALID';
  const er = r.effect_reconciliation;
  if (!er || er.status !== 'PASS' || er.canonical_commit !== c.commit || er.canonical_tree !== c.tree
      || !Array.isArray(er.unresolved_UNKNOWN_effects) || er.unresolved_UNKNOWN_effects.length !== 0) return 'EFFECT_RECONCILIATION_INVALID';
  if (!r.logical_close || r.logical_close.terminal_disposition_ref !== 'CLOSED_PASS'
      || !nonempty(r.logical_close.authority_ref)) return 'LOGICAL_CLOSE_AUTHORITY_INVALID';
  if (!unique(r.authority_refs) || !r.authority_refs.includes(da.authority_ref)
      || !r.authority_refs.includes(r.logical_close.authority_ref)
      || !unique(r.evidence_refs)) return 'AUTHORITY_OR_EVIDENCE_REFS_INVALID';
  if (!Array.isArray(r.obligation_satisfactions) || r.obligation_satisfactions.length === 0) return 'OBLIGATION_SATISFACTION_SET_INVALID';
  for (const s of r.obligation_satisfactions) {
    if (!s || !nonempty(s.id) || s.status !== 'SATISFIED' || !nonempty(s.authority_ref)
        || !unique(s.evidence_refs) || !r.authority_refs.includes(s.authority_ref)
        || !s.evidence_refs.every(ref => r.evidence_refs.includes(ref))) return 'OBLIGATION_SATISFACTION_EVIDENCE_INVALID';
  }
  if (!unique(r.obligation_satisfactions.map(s => s.id))) return 'OBLIGATION_IDS_NOT_UNIQUE';
  return null;
}
function sourceGuard(r, source) {
  const p = source.projection, init = p?.exact_inputs;
  if (p.TaskCycle?.id !== r.taskcycle.id || p.TaskCycle?.responsibility !== r.taskcycle.responsibility
      || p.TaskCycle?.state !== 'ACTIVE') return 'TASKCYCLE_IDENTITY_DRIFT';
  if (p.current_gate !== 'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE') return 'INITIALIZATION_GATE_DRIFT';
  if (!init || init.Product_baseline?.repository !== r.candidate.repository
      || init.TASK_carrier?.branch !== r.candidate.branch || init.TASK_carrier?.commit !== r.candidate.parent
      || !exact([...init.write_scope].sort(), [...r.candidate.changed_paths].sort())) return 'CANDIDATE_INITIALIZATION_PROVENANCE_MISMATCH';
  if (init.Product_baseline?.commit !== r.Phase_2.pre_tools) return 'INTEGRATION_BASELINE_MISMATCH';
  const pending = p.pending_obligations;
  if (!Array.isArray(pending) || pending.length !== r.obligation_satisfactions.length
      || !pending.every((o,i) => o?.status === 'PENDING' && nonempty(o.id)
          && o.id === r.obligation_satisfactions[i].id)) return 'ORIGINAL_OBLIGATION_SET_MISMATCH';
  if (p.semantics?.creates_authority !== false || p.semantics?.State_Kernel_direct_calls !== 0
      || p.semantics?.new_persistence_backend !== false) return 'SOURCE_SEMANTICS_INVALID';
  return null;
}
function inspected(root, pkg) {
  try {
    const files = fs.readdirSync(root).sort();
    if (!exact(files, FILES)) return 'UNKNOWN';
    for (const name of files) {
      const s = fs.lstatSync(path.join(root,name));
      if (!s.isFile() || s.isSymbolicLink() || s.nlink !== 1) return 'UNKNOWN';
    }
    return fs.readFileSync(path.join(root,'manifest.json'),'utf8') === pkg.manifestText
      && fs.readFileSync(path.join(root,'projection.json'),'utf8') === pkg.projectionText ? 'EXACT' : 'CONFLICT';
  } catch { return 'UNKNOWN'; }
}
function result(pkg, finalRoot, already_closed = false) {
  return { status:'PASS', effect_state:'CONFIRMED', TaskCycle:pkg.projection.TaskCycle,
    terminal_disposition_ref:'CLOSED_PASS', pending_obligations:[],
    portable_projection:{location_or_ref:finalRoot,identity_sha256:pkg.identity},
    State_Kernel_direct_calls:0, already_closed };
}
function createTaskCycleClosureCompatibilityCapability({ root }) {
  const base = path.resolve(root);
  return { closeFromExactInitialization({ request:r, observed }) {
    const invalid = validateRequest(r);
    if (invalid) return terminal(invalid);
    if (!observed || !exact(r.candidate,observed.candidate)
        || !exact(r.validation,observed.validation) || !exact(r.freeze,observed.freeze)
        || !exact(r.review,observed.review) || !exact(r.Developer_acceptance,observed.Developer_acceptance)
        || !exact(r.Phase_2,observed.Phase_2) || !exact(r.effect_reconciliation,observed.effect_reconciliation)
        || !exact(r.logical_close,observed.logical_close) || !exact(r.obligation_satisfactions,observed.obligation_satisfactions)
        || !observed.canonical_tools || observed.canonical_tools.branch !== 'tools'
        || !sha(observed.canonical_tools.head_commit) || !sha(observed.canonical_tools.head_tree)
        || !nonempty(observed.canonical_tools.verification_ref)
        || !observed.canonical_tools.lineage || observed.canonical_tools.lineage.status !== 'PASS'
        || observed.canonical_tools.lineage.ancestor_commit !== r.candidate.commit
        || observed.canonical_tools.lineage.descendant_commit !== observed.canonical_tools.head_commit
        || !nonempty(observed.canonical_tools.lineage.verification_ref)) {
      return terminal('COMPETENT_OBSERVATION_MISMATCH');
    }
    let source;
    try { source = consumeTaskCycleInitialization({location:r.initialization.location_or_ref,
      expected_identity_sha256:r.initialization.identity_sha256}); }
    catch(e) { return terminal(`INITIALIZATION_CONSUME_FAILED:${e.message}`); }
    const mismatch = sourceGuard(r,source);
    if(mismatch) return terminal(mismatch);
    let st;
    try { st=fs.lstatSync(base); } catch { return terminal('CLOSE_ROOT_UNAVAILABLE'); }
    if(!st.isDirectory() || st.isSymbolicLink()) return terminal('CLOSE_ROOT_INVALID');
    const projection={schema:SCHEMA,TaskCycle:{id:r.taskcycle.id,responsibility:r.taskcycle.responsibility,state:'CLOSED'},
      source_initialization:{identity_sha256:r.initialization.identity_sha256, original_gate:source.projection.current_gate},
      exact_inputs:source.projection.exact_inputs,
      obligations:source.projection.pending_obligations.map((o,i)=>({...o,status:'SATISFIED',
        satisfaction:{authority_ref:r.obligation_satisfactions[i].authority_ref,evidence_refs:r.obligation_satisfactions[i].evidence_refs}})),
      pending_obligations:[], current_gate:null, terminal_disposition_ref:'CLOSED_PASS',
      exact_candidate:r.candidate,
      lifecycle_evidence:{validation:r.validation,freeze:r.freeze,review:r.review,Developer_acceptance:r.Developer_acceptance,
        Phase_2:r.Phase_2,effect_reconciliation:r.effect_reconciliation,logical_close:r.logical_close,
        canonical_tools_observation:observed.canonical_tools},
      authority_refs:[...new Set([...source.projection.authority_refs,...r.authority_refs])],
      evidence_refs:[...new Set([...source.projection.evidence_refs,...r.evidence_refs])],
      semantics:{creates_authority:false,evidence_records_resolved_facts_only:true,State_Kernel_direct_calls:0,
        State_Kernel_named_semantic_owner:false,new_persistence_backend:false,arbitrary_obligation_mutation:false,
        original_obligation_ids_preserved:true,Product_effects_replayed:false}};
    const projectionText=json(projection);
    const manifest={schema:MANIFEST_SCHEMA,taskcycle_id:r.taskcycle.id,
      source_initialization_identity_sha256:r.initialization.identity_sha256,
      candidate_commit:r.candidate.commit,files:{'projection.json':digest(projectionText)},
      original_obligation_ids:source.projection.pending_obligations.map(o=>o.id),
      semantics:{creates_authority:false,State_Kernel_direct_calls:0,Product_effects_replayed:false}};
    const manifestText=json(manifest);
    const pkg={projection,projectionText,manifest,manifestText,identity:digest(manifestText)};
    const finalRoot=path.join(base,id(r.taskcycle.id),'closed-pass-compat');
    const parent=path.dirname(finalRoot);
    fs.mkdirSync(parent,{recursive:true});
    if(fs.existsSync(finalRoot)){
      const state=inspected(finalRoot,pkg);
      return state==='EXACT'?result(pkg,finalRoot,true):terminal(state==='CONFLICT'?'CLOSE_IDENTITY_CONFLICT':'CLOSE_IDENTITY_UNKNOWN',state==='CONFLICT'?'NONE':'UNKNOWN');
    }
    let staging=null;
    try {
      staging=fs.mkdtempSync(path.join(parent,'.close-compat-staging-'));
      fs.writeFileSync(path.join(staging,'projection.json'),projectionText,{flag:'wx'});
      fs.writeFileSync(path.join(staging,'manifest.json'),manifestText,{flag:'wx'});
      if(inspected(staging,pkg)!=='EXACT') return terminal('STAGING_INVALID');
      fs.renameSync(staging,finalRoot);
      staging=null;
      return inspected(finalRoot,pkg)==='EXACT' ? result(pkg,finalRoot)
        : terminal('POST_PUBLISH_UNKNOWN','UNKNOWN');
    } catch(e) {
      if(fs.existsSync(finalRoot)){
        const state=inspected(finalRoot,pkg);
        if(state==='EXACT')return result(pkg,finalRoot,true);
        return terminal(state==='CONFLICT'?'CLOSE_IDENTITY_CONFLICT':'POST_PUBLISH_UNKNOWN',state==='CONFLICT'?'NONE':'UNKNOWN');
      }
      return terminal(`CLOSE_WRITE_FAILED:${e.message}`);
    } finally { if(staging && fs.existsSync(staging)){ try{fs.rmSync(staging,{recursive:true,force:true});}catch{} } }
  }};
}
function consumeTaskCycleClosureCompatibility({location,expected_identity_sha256}){
  if(!nonempty(location)||!hash(expected_identity_sha256))throw Error('INVALID_CONSUME_REQUEST');
  const base=path.resolve(location),manifestText=fs.readFileSync(path.join(base,'manifest.json'),'utf8');
  if(digest(manifestText)!==expected_identity_sha256)throw Error('IDENTITY_MISMATCH');
  const manifest=JSON.parse(manifestText),projectionText=fs.readFileSync(path.join(base,'projection.json'),'utf8');
  if(manifest.schema!==MANIFEST_SCHEMA||manifest.files?.['projection.json']!==digest(projectionText))throw Error('PACKAGE_INVALID');
  const p=JSON.parse(projectionText);
  if(p.schema!==SCHEMA||p.TaskCycle?.state!=='CLOSED'||p.terminal_disposition_ref!=='CLOSED_PASS'
      ||p.current_gate!==null||!Array.isArray(p.pending_obligations)||p.pending_obligations.length!==0
      ||!Array.isArray(p.obligations)||p.obligations.length!==manifest.original_obligation_ids?.length
      ||!p.obligations.every((o,i)=>o.id===manifest.original_obligation_ids[i]&&o.status==='SATISFIED'
        &&nonempty(o.satisfaction?.authority_ref)&&unique(o.satisfaction?.evidence_refs))
      ||p.semantics?.creates_authority!==false||p.semantics?.State_Kernel_direct_calls!==0
      ||p.semantics?.original_obligation_ids_preserved!==true||p.semantics?.Product_effects_replayed!==false
      ||manifest.taskcycle_id!==p.TaskCycle.id||manifest.candidate_commit!==p.exact_candidate?.commit
      ||manifest.source_initialization_identity_sha256!==p.source_initialization?.identity_sha256)
    throw Error('PROJECTION_INVALID');
  return {manifest,projection:p,identity_sha256:expected_identity_sha256};
}
module.exports={SCHEMA,validateTaskCycleClosureCompatibilityRequest:validateRequest,
  createTaskCycleClosureCompatibilityCapability,consumeTaskCycleClosureCompatibility};
