'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {
  close,buildPackage,publishOnce,blocked,SUBJECT,OBLIGATIONS,SCHEMA,INITIAL_HASH,
  sha256,blobSha,verifyTerminalAdapterIntegration,verifyOriginalReviewPass,
  ownerDecision,safeExistingDirectory,safeTerminalFiles
}=require('../../scripts/op03-original-taskcycle-close');

const ref='https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6512731481';
const hash='a'.repeat(40);
const qualification={
  candidate:{commit:hash,tree:'b'.repeat(40),sourceBlob:'c'.repeat(40),
    testBlob:'d'.repeat(40),ciRun:40987791765},
  review:{commit:'e'.repeat(40),blob:'f'.repeat(40),
    requestCommit:'1'.repeat(40),requestBlob:'2'.repeat(40)},
  acceptanceRef:ref,phase2Ref:ref,terminalRef:ref
};

test('original TaskCycle ID and nine obligations remain exact, with Core contract reused',()=>{
  assert.equal(OBLIGATIONS.length,9);
  assert.deepEqual([...OBLIGATIONS],[
    'implementation','promotion_grade_validation','exact_candidate',
    'frozen_review_interface','independent_review','Developer_acceptance',
    'Phase_2','effect_reconciliation','logical_close']);
  assert.equal(SCHEMA,'deterministic-taskcycle-obligation-compatible-close/v0');
  assert.equal(INITIAL_HASH,'sha256:0513766df8f03c3fb38d0b102038c6456f356f68723cd092eebb8e0cec7f00d6');
  assert.equal(SUBJECT.merge,'6db3f02549a6ee0fce41e85b26f4c0898490d1ea');
});

test('no caller-assembled facts can mint CLOSED_PASS projection',()=>{
  const fake={
    initial:{TaskCycle:{state:'ACTIVE'},
      pending_obligations:OBLIGATIONS.map(id=>({id,status:'PENDING'})),
      authority_refs:[],evidence_refs:[]},
    authority_refs:[ref],evidence_refs:[ref],
    adapter:{status:'QUALIFIED_MERGED',authority_refs:[ref,ref,ref]}
  };
  assert.throws(()=>buildPackage(fake,ref),
    /COMPETENT_TERMINAL_AUTHORITY_AND_SOURCE_RECEIPTS_REQUIRED/);
});

test('unavailable native GitHub provider returns BLOCKED without terminal effect',()=>{
  let called=0;
  const result=close({api:()=>{called++;throw Error('HTTP 401');},
    root:'ignored',terminalAuthorityRef:ref,commit:true});
  assert.equal(called,1);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.effect_state,'NONE');
  assert.equal(result.terminal_disposition_ref,null);
});

test('forged native blob bytes and SHA mismatch fail before close',()=>{
  const result=close({api:()=>({encoding:'base64',sha:'0'.repeat(40),
    content:Buffer.from('{}').toString('base64')}),
    root:'ignored',terminalAuthorityRef:ref,commit:true});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'NATIVE_BLOB_INTEGRITY_MISMATCH');
});

test('PR58 cannot become a terminal authority before its actual integration',()=>{
  const r=verifyTerminalAdapterIntegration(()=>{throw Error('no provider read');},
    SUBJECT.merge,null);
  assert.equal(r.status,'NOT_YET_INTEGRATED');
});

test('after changed tools head, missing exact candidate or review blocks first',()=>{
  assert.throws(()=>verifyTerminalAdapterIntegration(()=>{throw Error('should not read');},
    hash,null),/EXACT_ACCEPTED_REVIEWED_SUBJECT_REQUIRED/);
});

test('PR58 native merged property must be true for the exact candidate',()=>{
  assert.throws(()=>verifyTerminalAdapterIntegration(()=>({merged:false}),hash,qualification),
    /PR58_EXACT_MERGE_MISSING/);
});

test('review PASS parser never accepts a FAIL with historical PASS',()=>{
  const r='**ORIGINAL SEMANTIC VERDICT: FAIL**\nHistorical PASS on an old candidate.\n' +
    'TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR002-ATTEMPT-001 '+hash;
  const input=[qualification.candidate.commit,qualification.candidate.tree,
    qualification.candidate.sourceBlob,qualification.candidate.testBlob].join(' ');
  assert.throws(()=>verifyOriginalReviewPass(r,input,qualification.candidate),
    /PR58_EXACT_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('review PASS parser refuses subject or frozen-input drift',()=>{
  const r='**ORIGINAL SEMANTIC VERDICT: PASS**\n' +
    'TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR002-ATTEMPT-001 '+hash+
    ' '+qualification.candidate.tree;
  assert.throws(()=>verifyOriginalReviewPass(r,'wrong source',qualification.candidate),
    /PR58_EXACT_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('a PASS review must match exact input, subject, tree and both source blobs',()=>{
  const c=qualification.candidate;
  const r='**ORIGINAL SEMANTIC VERDICT: PASS**\n' +
    'TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR002-ATTEMPT-001 ' +
    c.commit+' '+c.tree;
  const input=c.commit+' '+c.tree+' '+c.sourceBlob+' '+c.testBlob;
  assert.doesNotThrow(()=>verifyOriginalReviewPass(r,input,c));
});

test('native issue-comment bytes cannot impersonate Developer owner competence',()=>{
  const fake={html_url:ref,user:{login:'outsider'},author_association:'NONE',
    created_at:'2026-10-30T01:00:00Z',updated_at:'2026-10-30T01:00:00Z',
    body:'DEVELOPER_ACCEPTED_TERMINAL_COMPAT_EXACT_CANDIDATE'};
  assert.throws(()=>ownerDecision(()=>fake,ref),
    /COMPETENT_DEVELOPER_DECISION_PROVENANCE_MISSING/);
});

test('edited owner comment is rejected as unqualified original declaration',()=>{
  const fake={html_url:ref,user:{login:'mauedgar'},author_association:'OWNER',
    created_at:'2026-10-30T01:00:00Z',updated_at:'2026-10-30T01:30:00Z',
    body:'DEVELOPER_ACCEPTED_TERMINAL_COMPAT_EXACT_CANDIDATE'};
  assert.throws(()=>ownerDecision(()=>fake,ref),
    /COMPETENT_DEVELOPER_DECISION_PROVENANCE_MISSING/);
});

test('native owner comment alone is evidence to inspect, not automatic acceptance',()=>{
  const c={html_url:ref,user:{login:'mauedgar'},author_association:'OWNER',
    created_at:'2026-10-30T01:00:00Z',updated_at:'2026-10-30T01:00:00Z',
    body:'Not a candidate acceptance'};
  assert.equal(ownerDecision(()=>c,ref).body,'Not a candidate acceptance');
});

test('root path and nested symlink are rejected without writing outside',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-link-negative-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-link-outside-'));
  const name='TASKCYCLE-TECNOTRON-ULC-OP03-ACTIONS-EVIDENCE-CONSUMER-001';
  try {
    fs.symlinkSync(outside,path.join(root,name),'dir');
    assert.throws(()=>publishOnce(root,{}),
      /OUTPUT_DIRECTORY_SYMLINK_OR_NOT_DIRECTORY|OUTPUT_DIRECTORY_ESCAPE/);
    assert.deepEqual(fs.readdirSync(outside),[]);
    assert.equal(fs.existsSync(path.join(root,'.op03-original-taskcycle-close.lock')),false);
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('intermediate symlink is rejected by directory containment check',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-symlink-root-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-symlink-target-'));
  try {
    fs.symlinkSync(outside,path.join(root,'alias'),'dir');
    assert.throws(()=>safeExistingDirectory(path.join(root,'alias')),
      /OUTPUT_DIRECTORY_SYMLINK_OR_NOT_DIRECTORY|OUTPUT_DIRECTORY_ESCAPE/);
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('lock contention blocks concurrent close and leaves original lock untouched',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-lock-'));
  const lock=path.join(root,'.op03-original-taskcycle-close.lock');
  try {
    fs.writeFileSync(lock,'other attempt',{flag:'wx'});
    assert.throws(()=>publishOnce(root,{}),e=>e.code==='EEXIST');
    assert.equal(fs.readFileSync(lock,'utf8'),'other attempt');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('terminal files must be ordinary files and not symlinked',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-files-'));
  try {
    const dir=path.join(root,'terminal');
    fs.mkdirSync(dir);
    fs.symlinkSync(__filename,path.join(dir,'manifest.json'));
    fs.writeFileSync(path.join(dir,'projection.json'),'{}');
    assert.throws(()=>safeTerminalFiles(dir,{}),
      /TERMINAL_FILE_SYMLINK_OR_HARDLINK/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('file and hash helpers preserve distinct hash domains',()=>{
  assert.equal(blobSha('test\n'),'9daeafb9864cf43055ae93beb0afd6c7d144bfa4');
  assert.equal(sha256('test\n'),'sha256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2');
});

test('blocking result has no Product terminal disposition or UNKNOWN effect',()=>{
  const r=blocked('NO_PROVIDER_NATIVE_EVIDENCE');
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.effect_state,'NONE');
  assert.equal(r.terminal_disposition_ref,null);
  assert.equal(r.State_Kernel_direct_calls,0);
});
