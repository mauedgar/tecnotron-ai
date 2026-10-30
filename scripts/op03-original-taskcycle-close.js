'use strict';

// Bounded one-time compatibility with OP03's *original* kernel-free initialization.
// This is a read-only native-GitHub evidence consumer and append-only close carrier,
// NOT a new TaskCycle Core, provider receipt, authority source, or automatic backlog transition.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const PRODUCT = 'mauedgar/tecnotron-ai';
const TRANSPORT = 'mauedgar/ts-execution-transport';
const ID = 'TASKCYCLE-TECNOTRON-ULC-OP03-ACTIONS-EVIDENCE-CONSUMER-001';
const RESPONSIBILITY = 'QUALIFY_BOUNDED_NATIVE_ACTIONS_EVIDENCE_FOR_REAL_PRODUCT_CONTROL_CONSUMER';
const INITIAL_REF = '56f4d9e4d2fe44c22f187d564cfcfe3c411db130';
const INITIAL_DIR = 'results/TECNOTRON-ULC-OP03-NATIVE-TC-INIT-20261024-001/projection';
const INITIAL_HASH = 'sha256:0513766df8f03c3fb38d0b102038c6456f356f68723cd092eebb8e0cec7f00d6';
const INIT_BLOBS = Object.freeze({ manifest:'3b4b5f3fff78d2593c0a2130af1a5019ccbc301f', projection:'aaec4fc22701db72b040db53257640a29bde24f6' });
const SUBJECT = Object.freeze({
  sourceBase:'7a7225940aeaf1fbd16ac46ecd1cb76fa527ff56',
  carrier:'ae5f3f3f5fe25fdc3b3e48ad8f1cdb5038f86fdf',
  carrierTree:'816c6fd6cb083a2256af9ff517c6cb4947a0bc7f',
  carrierBlob:'019931aa5a66693747680a6a1ea54c29ecd53b26',
  pre:'5c0980b874ce30b4d211590dd3311de601bc73c6',
  accepted:'192c8262a10be8641dda432cc82b16af92f77a48',
  acceptedTree:'2cd7e6d01d2ba4ba39d6bfa027def902524d7355',
  merge:'6db3f02549a6ee0fce41e85b26f4c0898490d1ea',
  mergeTree:'2f23797e74338ce3dc2bf7a65de24f6194382061',
  sotBlob:'dd8d34a7e3ef3094805d014f9e59741d2c553957',
  sourceBlob:'d8868427f0cd252e71ac77a71456ce9ffda64524',
  testBlob:'79599d81bd0e6d97417a385fc30ae75544913c14',
  originalRun:40082522885, originalJob:120838820954,
  ciRun:40979482322, ciJob:123815653901,
  reportCommit:'f49364e700bee6bf8a7ab16baecedfe3768f8245',
  reportBlob:'05458cd99b7edc90f37ae003b89239470c8ebc18',
  interfaceCommit:'c2fe59bca870dc618a8f831507c2b7d29a89ca45',
  interfaceBlob:'1fcee6c4192fe770498596feeb4a85abc6bef814',
  phase2ReceiptCommit:'1bbe919cac43473499a52b7c54fe42422837372a',
  phase2ReceiptBlob:'ca04ab399c3ddb8e5fd7b1e441a3a6171dd9dce8',
});
const OBLIGATIONS = Object.freeze(['implementation','promotion_grade_validation','exact_candidate',
  'frozen_review_interface','independent_review','Developer_acceptance','Phase_2',
  'effect_reconciliation','logical_close']);
const PATHS = Object.freeze(['src/adapters/github.js','tests/adapters/github-native-actions-evidence.test.js']);
const ACCEPT_REF = 'https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6512300519';
const GRANT_REF = 'https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6512357634';
const MERGE_REF = 'https://github.com/mauedgar/tecnotron-ai/pull/57';
const SCHEMA = 'tecnotron-op03-original-taskcycle-terminal-compat/v0';
function stable(x) {
  if (Array.isArray(x)) return x.map(stable);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).sort(([a],[b]) => a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
  return x;
}
function serialize(x) { return JSON.stringify(stable(x),null,2)+'\n'; }
function sha256(text) { return 'sha256:'+createHash('sha256').update(text).digest('hex'); }
function blobSha(bytes) { const b=Buffer.from(bytes); return createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'); }
function expect(test, reason) { if (!test) { const err=new Error(reason); err.code=reason; throw err; } }
function blocked(reason) { return {status:'BLOCKED',effect_state:'NONE',reason,terminal_disposition_ref:null,State_Kernel_direct_calls:0}; }
const apiPath=(repo,p)=>'repos/'+repo+'/'+p;
function githubCLI(endpoint) {
  expect(/^[\w./?=&%-]+$/.test(endpoint),'UNSAFE_PROVIDER_PATH');
  const r=spawnSync('gh',['api',endpoint],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,windowsHide:true});
  expect(!r.error && r.status===0 && !r.signal,'NATIVE_GITHUB_PROVIDER_UNAVAILABLE');
  return JSON.parse(r.stdout);
}
function apiBlob(api,repo,ref,p,expected) {
  const v=api(apiPath(repo,'contents/'+p+'?ref='+ref));
  expect(v && v.encoding==='base64' && typeof v.content==='string','NATIVE_BLOB_UNAVAILABLE');
  const b=Buffer.from(v.content.replace(/\s/g,''),'base64');
  expect(blobSha(b)===expected && v.sha===expected,'NATIVE_BLOB_INTEGRITY_MISMATCH');
  return b.toString('utf8');
}
function inspectNative(api) {
  const mi=apiBlob(api,TRANSPORT,INITIAL_REF,INITIAL_DIR+'/manifest.json',INIT_BLOBS.manifest);
  const pi=apiBlob(api,TRANSPORT,INITIAL_REF,INITIAL_DIR+'/projection.json',INIT_BLOBS.projection);
  const manifest=JSON.parse(mi), initial=JSON.parse(pi);
  expect(sha256(mi)===INITIAL_HASH,'INITIALIZATION_IDENTITY_MISMATCH');
  expect(manifest.taskcycle_id===ID && manifest.files?.['projection.json']===sha256(pi),'INITIALIZATION_MANIFEST_INVALID');
  expect(initial.TaskCycle?.id===ID && initial.TaskCycle?.responsibility===RESPONSIBILITY
    && initial.TaskCycle?.state==='ACTIVE' && initial.current_gate==='PHASE1_IMPLEMENT_BOUNDED_CANDIDATE',
    'ORIGINAL_TASKCYCLE_IDENTITY_OR_GATE_MISMATCH');
  expect(JSON.stringify(initial.pending_obligations?.map(o=>o.id))===JSON.stringify(OBLIGATIONS)
    && initial.pending_obligations.every(o=>o.status==='PENDING'),'ORIGINAL_NINE_OBLIGATIONS_MISMATCH');
  expect(initial.exact_inputs?.TASK_carrier?.commit===SUBJECT.carrier
    && initial.exact_inputs?.Product_baseline?.commit===SUBJECT.sourceBase
    && JSON.stringify(initial.exact_inputs.write_scope)===JSON.stringify(PATHS),
    'ORIGINAL_TASKCYCLE_PROVENANCE_MISMATCH');
  const carrier=api(apiPath(PRODUCT,'git/commits/'+SUBJECT.carrier));
  expect(carrier.tree?.sha===SUBJECT.carrierTree
    && carrier.parents?.[0]?.sha===SUBJECT.sourceBase,'TASK_CARRIER_GIT_MISMATCH');
  apiBlob(api,PRODUCT,SUBJECT.carrier,'docs/tasks/TEC-TC-ULC-OP03-ACTIONS-EVIDENCE-CONSUMER-001/TASK.md',SUBJECT.carrierBlob);
  const branch=api(apiPath(PRODUCT,'branches/tools'));
  expect(branch.commit?.sha===SUBJECT.merge,'CANONICAL_TOOLS_HEAD_DRIFT');
  const merge=api(apiPath(PRODUCT,'git/commits/'+SUBJECT.merge));
  expect(merge.tree?.sha===SUBJECT.mergeTree
    && JSON.stringify(merge.parents?.map(p=>p.sha))===JSON.stringify([SUBJECT.pre,SUBJECT.accepted]),
    'MERGE_TOPOLOGY_MISMATCH');
  const accepted=api(apiPath(PRODUCT,'git/commits/'+SUBJECT.accepted));
  expect(accepted.tree?.sha===SUBJECT.acceptedTree,'ACCEPTED_CANDIDATE_TREE_DRIFT');
  const pr=api(apiPath(PRODUCT,'pulls/57'));
  expect(pr.merged===true && pr.merge_commit_sha===SUBJECT.merge && pr.head?.sha===SUBJECT.accepted,
    'PR57_ORIGINAL_INTEGRATION_NOT_CONFIRMED');
  const compare=api(apiPath(PRODUCT,'compare/'+SUBJECT.pre+'...'+SUBJECT.merge));
  expect(JSON.stringify(compare.files?.map(f=>f.filename).sort())===JSON.stringify([...PATHS].sort()),
    'MERGE_SCOPE_DRIFT');
  apiBlob(api,PRODUCT,SUBJECT.merge,'docs/SOURCE_OF_TRUTH.md',SUBJECT.sotBlob);
  apiBlob(api,PRODUCT,SUBJECT.merge,PATHS[0],SUBJECT.sourceBlob);
  apiBlob(api,PRODUCT,SUBJECT.merge,PATHS[1],SUBJECT.testBlob);
  const run=api(apiPath(PRODUCT,'actions/runs/'+SUBJECT.ciRun));
  expect(run.head_sha===SUBJECT.accepted && run.run_attempt===1
    && run.status==='completed' && run.conclusion==='success','PROMOTION_VALIDATION_NOT_CONFIRMED');
  const jobs=api(apiPath(PRODUCT,'actions/runs/'+SUBJECT.ciRun+'/jobs'));
  expect(jobs.jobs?.some(j=>j.id===SUBJECT.ciJob && j.conclusion==='success'
    && j.steps?.filter(s=>/Audit|Typecheck|Run repository|portable contract/i.test(s.name))
      .every(s=>s.conclusion==='success')),'CI_JOB_NOT_CONFIRMED');
  const original=api(apiPath(PRODUCT,'actions/runs/'+SUBJECT.originalRun));
  const originalJobs=api(apiPath(PRODUCT,'actions/runs/'+SUBJECT.originalRun+'/jobs'));
  expect(original.status==='completed' && original.conclusion==='success'
    && original.run_attempt===1 && original.head_sha==='2169c2144ee05116d735743df66eec01e6e57bf4'
    && originalJobs.jobs?.some(j=>j.id===SUBJECT.originalJob && j.conclusion==='success'),
    'ORIGINAL_NATIVE_RUN_UNVERIFIED');
  const report=apiBlob(api,TRANSPORT,SUBJECT.reportCommit,
    'reviews/TECNOTRON-OP03-PR57-WEB_INLINE-IR005-20261029-001/ORIGINAL_REVIEW_RESULT.md',SUBJECT.reportBlob);
  expect(/PASS/.test(report) && report.includes(SUBJECT.accepted),'INDEPENDENT_REVIEW_SUBJECT_OR_VERDICT_MISMATCH');
  apiBlob(api,TRANSPORT,SUBJECT.interfaceCommit,
    'reviews/TECNOTRON-OP03-PR57-WEB_INLINE-IR005-20261029-001/IMMUTABLE_REVIEW_REQUEST.md',SUBJECT.interfaceBlob);
  const acceptance=api(apiPath(PRODUCT,'issues/comments/6512300519')).body;
  const grant=api(apiPath(PRODUCT,'issues/comments/6512357634')).body;
  expect(acceptance.includes('DEVELOPER_ACCEPTED_EXACT_CANDIDATE') && acceptance.includes(SUBJECT.accepted)
    && acceptance.includes(SUBJECT.acceptedTree),'EXACT_DEVELOPER_ACCEPTANCE_MISSING');
  expect(grant.includes('explicit Developer Phase2 grant') && grant.includes(SUBJECT.accepted),
    'SEPARATE_PHASE2_GRANT_MISSING');
  const receipt=JSON.parse(apiBlob(api,TRANSPORT,SUBJECT.phase2ReceiptCommit,
    'results/TECNOTRON-OP03-PR57-PHASE2-INTEGRATION-20261029-001/PHASE2_AND_EFFECT_RECEIPT.json',
    SUBJECT.phase2ReceiptBlob));
  expect(receipt.Phase_2?.status==='PASS'
    && receipt.Phase_2?.merge_commit===SUBJECT.merge
    && receipt.effect_reconciliation?.status==='PASS'
    && receipt.effect_reconciliation?.canonical_commit===SUBJECT.merge
    && receipt.effect_reconciliation?.unresolved_UNKNOWN_effects?.length===0,
    'PHASE2_EFFECT_RECONCILIATION_INCOMPLETE');
  return {initial,manifest,source_identity:INITIAL_HASH,
    authority_refs:[ACCEPT_REF,GRANT_REF],
    evidence_refs:[
      'https://github.com/mauedgar/tecnotron-ai/actions/runs/'+SUBJECT.originalRun,
      'https://github.com/mauedgar/tecnotron-ai/actions/runs/'+SUBJECT.ciRun,
      'https://github.com/mauedgar/ts-execution-transport/blob/'+SUBJECT.reportCommit+'/reviews/TECNOTRON-OP03-PR57-WEB_INLINE-IR005-20261029-001/ORIGINAL_REVIEW_RESULT.md',
      'https://github.com/mauedgar/ts-execution-transport/blob/'+SUBJECT.phase2ReceiptCommit+'/results/TECNOTRON-OP03-PR57-PHASE2-INTEGRATION-20261029-001/PHASE2_AND_EFFECT_RECEIPT.json',
      MERGE_REF
    ]};
}
function buildPackage(facts,terminalAuthorityRef) {
  expect(typeof terminalAuthorityRef==='string' && terminalAuthorityRef.includes('github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-'),
    'COMPETENT_TERMINAL_AUTHORITY_REFERENCE_REQUIRED');
  const p=facts.initial;
  const obligations=p.pending_obligations.map(o=>({
    id:o.id,status:'SATISFIED',authority_ref:o.id==='Developer_acceptance'?ACCEPT_REF:
      o.id==='Phase_2'?GRANT_REF:terminalAuthorityRef,
    evidence_refs:[...facts.evidence_refs,terminalAuthorityRef]
  }));
  const projection={
    schema:SCHEMA,TaskCycle:{...p.TaskCycle,state:'CLOSED'},
    source_initialization:{identity_sha256:facts.source_identity,original_gate:p.current_gate},
    exact_inputs:p.exact_inputs,
    obligations,pending_obligations:[],current_gate:null,terminal_disposition_ref:'CLOSED_PASS',
    exact_candidate:{repository:PRODUCT,commit:SUBJECT.accepted,tree:SUBJECT.acceptedTree},
    Phase_2:{integration_mode:'MERGE_COMMIT',merge_commit:SUBJECT.merge,merge_tree:SUBJECT.mergeTree},
    native_verification:{provider:'GitHub CLI authenticated native GET',authenticity:'PROVIDER_READ_AT_EXECUTION_NOT_SIGNED_AT_SOURCE',
      observation:'CONSUMED_LIVE_NATIVE_RUN_JOB_GIT_OBJECTS_AND_SOURCE_BLOBS',read_only:true},
    authority_refs:[...new Set([...p.authority_refs,...facts.authority_refs,terminalAuthorityRef])],
    evidence_refs:[...new Set([...p.evidence_refs,...facts.evidence_refs,terminalAuthorityRef])],
    preserved_limitations:['F007','IR005-A011','REVIEWER_EXTERNAL_CONTEXT_ISOLATION_NOT_ATTESTED'],
    semantics:{creates_authority:false,State_Kernel_direct_calls:0,
      original_obligation_ids_preserved:true,Product_effects_replayed:false,
      no_new_TaskCycle:true,no_automatic_backlog_admission:true}
  };
  const projectionText=serialize(projection);
  const manifest={
    schema:SCHEMA+'-manifest/v0',taskcycle_id:ID,
    original_initialization_identity_sha256:facts.source_identity,
    files:{'projection.json':sha256(projectionText)},
    original_obligation_ids:[...OBLIGATIONS],
    semantics:{creates_authority:false,State_Kernel_direct_calls:0,Product_effects_replayed:false}
  };
  const manifestText=serialize(manifest);
  return {projection,manifest,projectionText,manifestText,identity_sha256:sha256(manifestText)};
}
function publishOnce(root,pkg) {
  const base=path.resolve(root); const finalDir=path.join(base,ID,'closed-pass-op03');
  const parent=path.dirname(finalDir); fs.mkdirSync(parent,{recursive:true});
  if (fs.existsSync(finalDir)) {
    const a=fs.readFileSync(path.join(finalDir,'manifest.json'),'utf8');
    const b=fs.readFileSync(path.join(finalDir,'projection.json'),'utf8');
    expect(a===pkg.manifestText && b===pkg.projectionText,'EXISTING_TERMINAL_CONFLICT');
    return {status:'PASS',effect_state:'CONFIRMED',already_closed:true,location:finalDir,identity_sha256:pkg.identity_sha256};
  }
  const staging=fs.mkdtempSync(path.join(parent,'.op03-close-staging-'));
  try {
    fs.writeFileSync(path.join(staging,'manifest.json'),pkg.manifestText,{flag:'wx'});
    fs.writeFileSync(path.join(staging,'projection.json'),pkg.projectionText,{flag:'wx'});
    fs.renameSync(staging,finalDir);
    expect(fs.readFileSync(path.join(finalDir,'manifest.json'),'utf8')===pkg.manifestText &&
      fs.readFileSync(path.join(finalDir,'projection.json'),'utf8')===pkg.projectionText,
      'POST_WRITE_ORIGINAL_TERMINAL_UNVERIFIED');
    return {status:'PASS',effect_state:'CONFIRMED',already_closed:false,location:finalDir,identity_sha256:pkg.identity_sha256};
  } finally { if(fs.existsSync(staging)) fs.rmSync(staging,{recursive:true,force:true}); }
}
function close({api=githubCLI,root,terminalAuthorityRef,commit=false}) {
  try {
    const facts=inspectNative(api); const pkg=buildPackage(facts,terminalAuthorityRef);
    if (!commit) return {status:'READY',effect_state:'NONE',identity_sha256:pkg.identity_sha256,
      original_taskcycle_id:ID,obligations:OBLIGATIONS.length};
    const receipt=publishOnce(root,pkg);
    return {...receipt,original_taskcycle_id:ID,obligations:OBLIGATIONS.length,
      termination:'CLOSED_PASS',product_effects_replayed:false};
  } catch(e) { return blocked(e.code||'UNVERIFIED_NATIVE_EVIDENCE'); }
}
if(require.main===module) {
  const args=process.argv.slice(2);
  const root=args[args.indexOf('--output-root')+1];
  const authority=args[args.indexOf('--terminal-authority-ref')+1];
  const commit=args.includes('--commit');
  const result=close({root,terminalAuthorityRef:authority,commit});
  process.stdout.write(serialize(result));
  if(result.status==='BLOCKED') process.exitCode=2;
}
module.exports={close,inspectNative,buildPackage,publishOnce,blocked,SUBJECT,OBLIGATIONS,
  SCHEMA,INITIAL_HASH,blobSha,sha256};
