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
const SCHEMA = 'deterministic-taskcycle-obligation-compatible-close/v0';
const MANIFEST_SCHEMA = 'deterministic-taskcycle-obligation-compatible-close-manifest/v0';
const { consumeTaskCycleClosureCompatibility } = require('../src/deterministic-taskcycle-substrate-v0/taskcycle-closure-compatibility');
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
const QUALIFIED_FACTS = new WeakSet();
const REVIEW_DIR = 'reviews/TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR004-20261030-001/';
const REVIEW_ATTEMPT = 'TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR004-ATTEMPT-001';
function exactIssueCommentId(ref) {
  const m = /^https:\/\/github\.com\/mauedgar\/tecnotron-ai\/issues\/34#issuecomment-(\d+)$/.exec(ref || '');
  expect(m, 'INVALID_EXACT_DEVELOPER_DECISION_REF');
  return m[1];
}
function ownerDecision(api, ref) {
  const x = api(apiPath(PRODUCT, 'issues/comments/' + exactIssueCommentId(ref)));
  expect(x && x.html_url === ref && x.user?.login === 'mauedgar'
    && x.author_association === 'OWNER' && typeof x.body === 'string'
    && typeof x.created_at === 'string' && x.updated_at === x.created_at,
    'COMPETENT_DEVELOPER_DECISION_PROVENANCE_MISSING');
  return x;
}
function verifyOriginalReviewPass(report, request, candidate, review=null) {
  // One top-level verdict only; quoted, indented and list-marked duplicates fail closed.
  const lines=String(report).replace(/\r\n/g,'\n').split('\n');
  const heading='# TECNOTRON #34 — OP03 / PR #58 — WEB_INLINE Independent Review IR004';
  const verdict=/^\*\*ORIGINAL SEMANTIC VERDICT: PASS(?: \(BOUNDED\))?\*\*$/;
  const tick=String.fromCharCode(96);
  const top=[
    '**REVIEWED SUBJECT COMMIT:** '+tick+candidate.commit+tick,
    '**REVIEWED SUBJECT TREE:** '+tick+candidate.tree+tick,
    '**REVIEWED SOURCE BLOB:** '+tick+candidate.sourceBlob+tick,
    '**REVIEWED TEST BLOB:** '+tick+candidate.testBlob+tick,
    '**FROZEN REQUEST COMMIT:** '+tick+review?.requestCommit+tick,
    '**FROZEN REQUEST BLOB:** '+tick+review?.requestBlob+tick,
    '**ExecutionAttempt:** '+tick+REVIEW_ATTEMPT+tick
  ];
  const normalized=line=>String(line).replace(/^\s*(?:(?:>\s*)|(?:[-*+]\s+))*/,'').trim();
  const claims=lines.map(normalized).filter(line =>
    /ORIGINAL\s+SEMANTIC\s+VERDICT\s*:/i.test(line));
  const subjectClaims=lines.map(normalized).filter(line=>
    /^(?:\*\*)?(?:REVIEWED SUBJECT COMMIT|REVIEWED SUBJECT TREE|REVIEWED SOURCE BLOB|REVIEWED TEST BLOB|FROZEN REQUEST COMMIT|FROZEN REQUEST BLOB|ExecutionAttempt)\s*:/i.test(line));
  const conflictingClaims=lines.map(normalized).some(line=>
    /^(?:\*\*)?(?:Reviewed (?:candidate|subject) commit|Reviewed tree|Evaluated (?:candidate|subject) commit|Evaluated tree)\s*:/i.test(line));
  expect(typeof report==='string' && typeof request==='string'
    && review && /^[a-f0-9]{40}$/.test(review.requestCommit)
    && /^[a-f0-9]{40}$/.test(review.requestBlob)
    && lines[0]===heading && lines[1]==='' && verdict.test(lines[2])
    && lines[3]==='' && top.every((line,i)=>lines[i+4]===line)
    && lines[11]==='' && claims.length===1 && claims[0]===lines[2]
    && subjectClaims.length===top.length
    && subjectClaims.every((line,i)=>line===top[i])
    && !conflictingClaims
    && request.includes(candidate.commit) && request.includes(candidate.tree)
    && request.includes(candidate.sourceBlob) && request.includes(candidate.testBlob)
    && request.includes(REVIEW_ATTEMPT),
    'PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS');
}
function verifyTerminalAdapterIntegration(api, currentHead, qualification) {
  if (currentHead === SUBJECT.merge) return { status: 'NOT_YET_INTEGRATED', currentHead };
  const q = qualification;
  const candidate = q?.candidate, rev = q?.review;
  const sha = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
  expect(candidate && rev && sha(candidate.commit) && sha(candidate.tree)
    && sha(candidate.sourceBlob) && sha(candidate.testBlob)
    && Number.isSafeInteger(candidate.ciRun) && candidate.ciRun > 0 && Number.isSafeInteger(candidate.ciJob) && candidate.ciJob > 0
    && sha(rev.commit) && sha(rev.blob) && sha(rev.requestCommit) && sha(rev.requestBlob)
    && q.controlRef && q.acceptanceRef && q.phase2Ref && q.terminalRef,
    'EXACT_ACCEPTED_REVIEWED_SUBJECT_REQUIRED');
  const pr = api(apiPath(PRODUCT, 'pulls/58'));
  expect(pr?.merged === true && pr.merge_commit_sha === currentHead
    && pr.head?.sha === candidate.commit, 'PR58_EXACT_MERGE_MISSING');
  const merge = api(apiPath(PRODUCT, 'git/commits/' + currentHead));
  const candidateCommit = api(apiPath(PRODUCT, 'git/commits/' + candidate.commit));
  expect(candidateCommit.tree?.sha === candidate.tree
    && JSON.stringify(merge.parents?.map(p => p.sha))
      === JSON.stringify([SUBJECT.merge, candidate.commit]) && sha(merge.tree?.sha),
    'PR58_REVIEWED_COMMIT_TREE_OR_PARENTS_MISMATCH');
  const diff = api(apiPath(PRODUCT, 'compare/' + SUBJECT.merge + '...' + currentHead));
  expect(JSON.stringify(diff.files?.map(f => f.filename).sort()) === JSON.stringify([
    'scripts/op03-original-taskcycle-close.js',
    'tests/adapters/op03-original-taskcycle-close.test.js'
  ]), 'PR58_CANDIDATE_WRITE_SCOPE_MISMATCH');
  apiBlob(api, PRODUCT, candidate.commit, 'scripts/op03-original-taskcycle-close.js', candidate.sourceBlob);
  apiBlob(api, PRODUCT, candidate.commit, 'tests/adapters/op03-original-taskcycle-close.test.js', candidate.testBlob);
  const mergedSource = api(apiPath(PRODUCT,
    'contents/scripts/op03-original-taskcycle-close.js?ref=' + currentHead));
  expect(mergedSource?.sha === candidate.sourceBlob
    && blobSha(fs.readFileSync(__filename)) === candidate.sourceBlob,
    'EXECUTED_PR58_SOURCE_BLOB_NOT_REVIEWED');
  const ci = api(apiPath(PRODUCT, 'actions/runs/' + candidate.ciRun));
  const jobs = api(apiPath(PRODUCT, 'actions/runs/' + candidate.ciRun + '/jobs'));
  expect(ci.head_sha === candidate.commit && ci.run_attempt === 1
    && ci.status === 'completed' && ci.conclusion === 'success'
    && jobs.jobs?.some(j => j.id === candidate.ciJob && j.conclusion === 'success'
      && j.steps?.some(st => st.name === 'Run repository test suite' && st.conclusion === 'success')),
    'PR58_EXACT_NATIVE_CI_NOT_PASS');
  const reviewText = apiBlob(api, TRANSPORT, rev.commit,
    REVIEW_DIR + 'ORIGINAL_REVIEW_RESULT.md', rev.blob);
  const requestText = apiBlob(api, TRANSPORT, rev.requestCommit,
    REVIEW_DIR + 'IMMUTABLE_REVIEW_REQUEST.md', rev.requestBlob);
  verifyOriginalReviewPass(reviewText, requestText, candidate, rev);
  expect(new Set([q.controlRef, q.acceptanceRef, q.phase2Ref, q.terminalRef]).size === 4,
    'DEVELOPER_AND_CONTROL_DECISIONS_NOT_DISTINCT');
  const selected=ownerDecision(api,q.controlRef);
  expect(selected.body.includes('CONTROL_SELECTED_PR58_IR003_FROZEN_INPUT')
    && selected.body.includes(candidate.commit) && selected.body.includes(candidate.tree)
    && selected.body.includes(candidate.sourceBlob) && selected.body.includes(candidate.testBlob)
    && selected.body.includes(String(candidate.ciRun)) && selected.body.includes(String(candidate.ciJob))
    && selected.body.includes(rev.requestCommit) && selected.body.includes(rev.requestBlob)
    && requestText.includes(String(candidate.ciRun)) && requestText.includes(String(candidate.ciJob)),
    'CONTROL_SELECTED_FROZEN_IR003_INTERFACE_MISMATCH');
  const a = ownerDecision(api, q.acceptanceRef);
  const p = ownerDecision(api, q.phase2Ref);
  const t = ownerDecision(api, q.terminalRef);
  expect(selected.created_at < a.created_at && a.created_at < p.created_at && p.created_at < t.created_at
    && a.body.includes('DEVELOPER_ACCEPTED_TERMINAL_COMPAT_EXACT_CANDIDATE')
    && /^>\s*Acepto el candidato de cierre OP03 PR #58/m.test(a.body)
    && p.body.includes('DEVELOPER_GRANTED_TERMINAL_COMPAT_PHASE2')
    && /^>\s*Autorizo Phase 2 para el candidato de cierre OP03 PR #58/m.test(p.body)
    && t.body.includes('DEVELOPER_AUTHORIZED_ORIGINAL_OP03_LOGICAL_CLOSE')
    && /^>\s*Autorizo el cierre lógico de la TaskCycle original OP03/m.test(t.body)
    && a.body.includes(candidate.commit) && a.body.includes(candidate.tree)
    && a.body.includes(rev.blob) && a.body.includes(rev.commit)
    && a.body.includes(rev.requestCommit) && a.body.includes(rev.requestBlob)
    && a.body.includes(q.controlRef) && p.body.includes(candidate.commit)
    && p.body.includes(candidate.tree) && p.body.includes(q.acceptanceRef)
    && t.body.includes(currentHead) && t.body.includes(candidate.commit)
    && t.body.includes(q.phase2Ref) && t.body.includes(rev.blob)
    && t.body.includes(rev.commit) && t.body.includes(q.controlRef),
    'DEVELOPER_DIRECT_DECISIONS_NOT_SOURCE_BOUND');
  return {status: 'QUALIFIED_MERGED', currentHead, prHead: candidate.commit,
    tree: merge.tree.sha, authority_refs: [q.acceptanceRef, q.phase2Ref, q.terminalRef],
    review_selection_ref:q.controlRef,
    native_script_blob: candidate.sourceBlob,
    independent_review_ref: 'https://github.com/' + TRANSPORT + '/blob/' + rev.commit
      + '/' + REVIEW_DIR + 'ORIGINAL_REVIEW_RESULT.md',
    frozen_review_ref: 'https://github.com/' + TRANSPORT + '/blob/' + rev.requestCommit
      + '/' + REVIEW_DIR + 'IMMUTABLE_REVIEW_REQUEST.md',
    ci_ref: 'https://github.com/' + PRODUCT + '/actions/runs/' + candidate.ciRun};
}
function inspectNative(api,{qualification=null}={}) {
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
  expect(typeof branch.commit?.sha==='string','CANONICAL_TOOLS_HEAD_UNAVAILABLE');
  const adapter=verifyTerminalAdapterIntegration(api,branch.commit.sha,qualification);
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
    && j.steps?.filter(s=>/Audit|Typecheck|Run repository|portable contract/i.test(s.name)).length===4
    && j.steps.filter(s=>/Audit|Typecheck|Run repository|portable contract/i.test(s.name))
      .every(s=>s.conclusion==='success')),'CI_JOB_NOT_CONFIRMED');
  const original=api(apiPath(PRODUCT,'actions/runs/'+SUBJECT.originalRun));
  const originalJobs=api(apiPath(PRODUCT,'actions/runs/'+SUBJECT.originalRun+'/jobs'));
  expect(original.status==='completed' && original.conclusion==='success'
    && original.run_attempt===1 && original.head_sha==='2169c2144ee05116d735743df66eec01e6e57bf4'
    && originalJobs.jobs?.some(j=>j.id===SUBJECT.originalJob && j.conclusion==='success'),
    'ORIGINAL_NATIVE_RUN_UNVERIFIED');
  const phase1=apiBlob(api,TRANSPORT,'1e164af9135bbfcbc960ccb658679760a5106099',
    'results/TECNOTRON-OP03-PHASE1-ATTEMPT006-TERMINAL-20261029-001/TECHNICAL_RETURN.md',
    '690f91f2363d8db53bc7134a34673266b828b0d7');
  expect(phase1.includes('ExecutionAttempt_id=TECNOTRON-OP03-PHASE1-IMPLEMENT-NATIVE-ATTEMPT-006')
    && /Native child \*\*exit 0\*\*, timeout \*\*false\*\*, exception null\./.test(phase1)
    && /Original `FOCUSED\.txt`: \*\*12 PASS, 0 FAIL, 0 SKIP\*\*/.test(phase1)
    && /Original `PROMOTION\.txt`: \*\*35 PASS, 0 FAIL, 0 SKIP\*\*/.test(phase1),
    'ORIGINAL_PHASE1_TERMINAL_NOT_EXACT_PASS');
  const report=apiBlob(api,TRANSPORT,SUBJECT.reportCommit,
    'reviews/TECNOTRON-OP03-PR57-WEB_INLINE-IR005-20261029-001/ORIGINAL_REVIEW_RESULT.md',SUBJECT.reportBlob);
  expect(/^\*\*Original independent semantic verdict: PASS \(BOUNDED\), no demonstrated BLOCKER\/MAJOR/m.test(report)
    && report.includes('TECNOTRON-OP03-PR57-WEBINLINE-IR005-ATTEMPT-001')
    && report.includes('exact commit `'+SUBJECT.accepted+'`')
    && report.includes('tree `'+SUBJECT.acceptedTree+'`'),
    'PR57_INDEPENDENT_REVIEW_DISPOSITION_NOT_EXACT_PASS');
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
  const facts={initial,manifest,source_identity:INITIAL_HASH,adapter,
    authority_refs:[ACCEPT_REF,GRANT_REF,...(adapter.authority_refs||[])],
    evidence_refs:[
      'https://github.com/mauedgar/tecnotron-ai/actions/runs/'+SUBJECT.originalRun,
      'https://github.com/mauedgar/tecnotron-ai/actions/runs/'+SUBJECT.ciRun,
      'https://github.com/mauedgar/ts-execution-transport/blob/'+SUBJECT.reportCommit+'/reviews/TECNOTRON-OP03-PR57-WEB_INLINE-IR005-20261029-001/ORIGINAL_REVIEW_RESULT.md',
      'https://github.com/mauedgar/ts-execution-transport/blob/'+SUBJECT.phase2ReceiptCommit+'/results/TECNOTRON-OP03-PR57-PHASE2-INTEGRATION-20261029-001/PHASE2_AND_EFFECT_RECEIPT.json',
      MERGE_REF
    ]};
  if(adapter.status==='QUALIFIED_MERGED') QUALIFIED_FACTS.add(facts);
  return facts;
}
function buildPackage(facts,terminalAuthorityRef) {
  expect(QUALIFIED_FACTS.has(facts) && facts.adapter?.status==='QUALIFIED_MERGED'
    && terminalAuthorityRef===facts.adapter.authority_refs[2] &&
    typeof facts.adapter.review_selection_ref==='string',
    'COMPETENT_TERMINAL_AUTHORITY_AND_SOURCE_RECEIPTS_REQUIRED');
  const p=facts.initial;
  const perObligation = {
    implementation:['https://github.com/'+TRANSPORT+'/blob/1e164af9135bbfcbc960ccb658679760a5106099/results/TECNOTRON-OP03-PHASE1-ATTEMPT006-TERMINAL-20261029-001/TECHNICAL_RETURN.md'],
    promotion_grade_validation:[facts.evidence_refs[1]],
    exact_candidate:[MERGE_REF],
    frozen_review_interface:[facts.adapter.frozen_review_ref],
    independent_review:[facts.adapter.independent_review_ref],
    Developer_acceptance:[ACCEPT_REF],
    Phase_2:[GRANT_REF,MERGE_REF],
    effect_reconciliation:[facts.evidence_refs[3],MERGE_REF],
    logical_close:[terminalAuthorityRef]
  };
  const obligations=p.pending_obligations.map(o=>({
    ...o,status:'SATISFIED',satisfaction:{
      authority_ref:o.id==='Developer_acceptance'?ACCEPT_REF:
        o.id==='Phase_2'?GRANT_REF:terminalAuthorityRef,
      evidence_refs:perObligation[o.id]
    }
  }));
  expect(obligations.length===9 && obligations.every(o=>
    Array.isArray(o.satisfaction.evidence_refs) &&
    o.satisfaction.evidence_refs.length>0 && o.satisfaction.evidence_refs.every(Boolean)),
    'ORIGINAL_OBLIGATION_RECEIPTS_INCOMPLETE');
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
    evidence_refs:[...new Set([...p.evidence_refs,...facts.evidence_refs,terminalAuthorityRef,
      facts.adapter.ci_ref,facts.adapter.independent_review_ref,facts.adapter.frozen_review_ref])],
    preserved_limitations:['F007','IR005-A011','REVIEWER_EXTERNAL_CONTEXT_ISOLATION_NOT_ATTESTED'],
    semantics:{creates_authority:false,State_Kernel_direct_calls:0,
      original_obligation_ids_preserved:true,Product_effects_replayed:false,
      no_new_TaskCycle:true,no_automatic_backlog_admission:true}
  };
  const projectionText=serialize(projection);
  const manifest={
    schema:MANIFEST_SCHEMA,taskcycle_id:ID,
    source_initialization_identity_sha256:facts.source_identity,
    candidate_commit:SUBJECT.accepted,
    files:{'projection.json':sha256(projectionText)},
    original_obligation_ids:[...OBLIGATIONS],
    semantics:{creates_authority:false,State_Kernel_direct_calls:0,Product_effects_replayed:false}
  };
  const manifestText=serialize(manifest);
  return {projection,manifest,projectionText,manifestText,identity_sha256:sha256(manifestText)};
}
function safeExistingDirectory(p) {
  expect(typeof p==='string' && path.isAbsolute(p), 'ABSOLUTE_OUTPUT_DIRECTORY_REQUIRED');
  const abs=path.resolve(p), root=path.parse(abs).root, rest=abs.slice(root.length);
  let current=root;
  for (const part of rest.split(path.sep).filter(Boolean)) {
    current=path.join(current,part);
    const st=fs.lstatSync(current);
    expect(st.isDirectory() && !st.isSymbolicLink() && st.nlink>=1,
      'OUTPUT_DIRECTORY_SYMLINK_OR_NOT_DIRECTORY');
    const resolved=fs.realpathSync.native(current);
    const norm=x=>process.platform==='win32'?x.toLowerCase():x;
    expect(norm(path.resolve(resolved))===norm(current),'OUTPUT_DIRECTORY_ESCAPE');
  }
  return abs;
}
function safeTerminalFiles(dir,pkg) {
  safeExistingDirectory(dir);
  const entries=fs.readdirSync(dir).sort();
  expect(JSON.stringify(entries)===JSON.stringify(['manifest.json','projection.json']),
    'TERMINAL_FILES_CONFLICT');
  for(const file of entries) {
    const st=fs.lstatSync(path.join(dir,file));
    expect(st.isFile() && !st.isSymbolicLink() && st.nlink===1,
      'TERMINAL_FILE_SYMLINK_OR_HARDLINK');
  }
  expect(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')===pkg.manifestText
    && fs.readFileSync(path.join(dir,'projection.json'),'utf8')===pkg.projectionText,
    'TERMINAL_CONTENT_CONFLICT');
  consumeTaskCycleClosureCompatibility({location:dir,
    expected_identity_sha256:pkg.identity_sha256});
  return true;
}
function publishOnce(root,pkg) {
  const base=safeExistingDirectory(root);
  const parent=path.join(base,ID),finalDir=path.join(parent,'closed-pass-op03');
  const lock=path.join(base,'.op03-original-taskcycle-close.lock');
  const lockFd=fs.openSync(lock,fs.constants.O_CREAT|fs.constants.O_EXCL|
    fs.constants.O_WRONLY|(fs.constants.O_NOFOLLOW||0),0o600);
  let staging=null;
  try {
    safeExistingDirectory(base);
    try {
      fs.mkdirSync(parent,{mode:0o700});
    } catch(e) {
      if(e.code!=='EEXIST')throw e;
    }
    safeExistingDirectory(parent);
    if(fs.existsSync(finalDir) || (()=>{try{fs.lstatSync(finalDir);return true;}catch{return false;}})()) {
      safeTerminalFiles(finalDir,pkg);
      return {status:'PASS',effect_state:'CONFIRMED',already_closed:true,
        location:finalDir,identity_sha256:pkg.identity_sha256};
    }
    staging=fs.mkdtempSync(path.join(parent,'.op03-close-staging-'));
    safeExistingDirectory(staging);
    fs.writeFileSync(path.join(staging,'manifest.json'),pkg.manifestText,{flag:'wx',mode:0o600});
    fs.writeFileSync(path.join(staging,'projection.json'),pkg.projectionText,{flag:'wx',mode:0o600});
    safeExistingDirectory(parent);
    safeTerminalFiles(staging,pkg);
    expect(!fs.existsSync(finalDir),'TERMINAL_OUTPUT_ALREADY_PRESENT');
    fs.renameSync(staging,finalDir);
    staging=null;
    safeExistingDirectory(parent);
    safeTerminalFiles(finalDir,pkg);
    return {status:'PASS',effect_state:'CONFIRMED',already_closed:false,
      location:finalDir,identity_sha256:pkg.identity_sha256};
  } finally {
    if(staging) {
      try {safeExistingDirectory(staging);
        fs.rmSync(staging,{recursive:true});} catch {}
    }
    fs.closeSync(lockFd);
    try {
      const st=fs.lstatSync(lock);
      if(st.isFile() && !st.isSymbolicLink() && st.nlink===1)fs.unlinkSync(lock);
    } catch {}
  }
}
function close({api=githubCLI,root,terminalAuthorityRef,qualification=null,commit=false}) {
  try {
    if(commit) expect(require.main===module && api===githubCLI,
      'NATIVE_CLI_PROVIDER_AND_TERMINAL_ENTRYPOINT_REQUIRED');
    const facts=inspectNative(api,{qualification});
    if (!commit) return {status:'READY',effect_state:'NONE',
      original_taskcycle_id:ID,obligations:OBLIGATIONS.length};
    const pkg=buildPackage(facts,terminalAuthorityRef);
    const receipt=publishOnce(root,pkg);
    return {...receipt,original_taskcycle_id:ID,obligations:OBLIGATIONS.length,
      termination:'CLOSED_PASS',product_effects_replayed:false};
  } catch(e) {
    if (commit && typeof root==='string' && path.isAbsolute(root) &&
        fs.existsSync(path.join(root,ID,'closed-pass-op03'))) {
      return {status:'BLOCKED',effect_state:'UNKNOWN',reason:e.code||'POST_WRITE_IDENTITY_UNVERIFIED',
        terminal_disposition_ref:null,State_Kernel_direct_calls:0};
    }
    return blocked(e.code||'UNVERIFIED_NATIVE_EVIDENCE');
  }
}
if(require.main===module) {
  const args=process.argv.slice(2);
  const root=args.includes('--output-root')?args[args.indexOf('--output-root')+1]:null;
  const authority=args.includes('--terminal-authority-ref')?args[args.indexOf('--terminal-authority-ref')+1]:null;
  const qualificationPath=args.includes('--qualification-json')?args[args.indexOf('--qualification-json')+1]:null;
  const qualification=qualificationPath?JSON.parse(fs.readFileSync(qualificationPath,'utf8')):null;
  const commit=args.includes('--commit');
  const result=close({root,terminalAuthorityRef:authority,qualification,commit});
  process.stdout.write(serialize(result));
  if(result.status==='BLOCKED') process.exitCode=2;
}
// Exports are read-only/testable functions only. Package construction and terminal
// publication are private to the authenticated native CLI execution path.
module.exports={close,blocked,SUBJECT,OBLIGATIONS,SCHEMA,INITIAL_HASH,
  blobSha,sha256,verifyTerminalAdapterIntegration,verifyOriginalReviewPass,
  ownerDecision,safeExistingDirectory,safeTerminalFiles};
