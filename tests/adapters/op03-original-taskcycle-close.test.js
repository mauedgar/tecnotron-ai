'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const api=require('../../scripts/op03-original-taskcycle-close');
const {close,blocked,SUBJECT,OBLIGATIONS,SCHEMA,INITIAL_HASH,sha256,blobSha,
  verifyTerminalAdapterIntegration,verifyOriginalReviewPass,ownerDecision,
  safeExistingDirectory,safeTerminalFiles}=api;

const digest='a'.repeat(40),other='b'.repeat(40);
const subj={commit:digest,tree:other,sourceBlob:'c'.repeat(40),testBlob:'d'.repeat(40),
  ciRun:40991197489,ciJob:123853756131};
const rev={requestCommit:'1'.repeat(40),requestBlob:'2'.repeat(40)};
const reviewHeading='# TECNOTRON #34 — OP03 / PR #58 — WEB_INLINE Independent Review IR003';
const attempt='TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR003-ATTEMPT-001';
const input=[subj.commit,subj.tree,subj.sourceBlob,subj.testBlob,
  subj.ciRun,subj.ciJob].join(' ');
const pass=[reviewHeading,'','**ORIGINAL SEMANTIC VERDICT: PASS**','',
  attempt,subj.commit,subj.tree,subj.sourceBlob,subj.testBlob,rev.requestCommit,
  rev.requestBlob].join('\n');
const commentRef='https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6519999999';

test('original nine obligation IDs, source identity and existing schema are stable',()=>{
  assert.deepEqual(OBLIGATIONS,['implementation','promotion_grade_validation','exact_candidate',
    'frozen_review_interface','independent_review','Developer_acceptance','Phase_2',
    'effect_reconciliation','logical_close']);
  assert.equal(SCHEMA,'deterministic-taskcycle-obligation-compatible-close/v0');
  assert.equal(INITIAL_HASH,'sha256:0513766df8f03c3fb38d0b102038c6456f356f68723cd092eebb8e0cec7f00d6');
  assert.equal(SUBJECT.merge,'6db3f02549a6ee0fce41e85b26f4c0898490d1ea');
});

test('F001: terminal publisher, package builder, and native inspector are private',()=>{
  assert.equal(Object.hasOwn(api,'publishOnce'),false);
  assert.equal(Object.hasOwn(api,'buildPackage'),false);
  assert.equal(Object.hasOwn(api,'inspectNative'),false);
});

test('F001: imported module cannot publish terminal using an injected provider',()=>{
  let count=0;
  const r=close({api:()=>{count++;return {};},root:os.tmpdir(),
    terminalAuthorityRef:commentRef,commit:true});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'NATIVE_CLI_PROVIDER_AND_TERMINAL_ENTRYPOINT_REQUIRED');
  assert.equal(r.effect_state,'NONE');
  assert.equal(count,0);
});

test('dry-run injected API failures never become terminal effects',()=>{
  let count=0;
  const r=close({api:()=>{count++;throw Error('Unauthorized');},commit:false});
  assert.equal(count,1);
  assert.equal(r.status,'BLOCKED');assert.equal(r.effect_state,'NONE');
});

test('dry-run malformed native content is rejected',()=>{
  const r=close({api:()=>({encoding:'base64',sha:'0'.repeat(40),
    content:Buffer.from('{}').toString('base64')}),commit:false});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'NATIVE_BLOB_INTEGRITY_MISMATCH');
});

test('F002: unselected PR58 subject cannot qualify',()=>{
  const r=verifyTerminalAdapterIntegration(()=>{throw Error('must not call');},
    SUBJECT.merge,null);
  assert.equal(r.status,'NOT_YET_INTEGRATED');
});

test('F002: no Control-selected frozen review binding fails before provider query',()=>{
  const q={candidate:subj,review:{...rev,commit:'3'.repeat(40),blob:'4'.repeat(40)},
    acceptanceRef:commentRef,phase2Ref:commentRef,terminalRef:commentRef};
  assert.throws(()=>verifyTerminalAdapterIntegration(()=>{throw Error('called');},digest,q),
    /EXACT_ACCEPTED_REVIEWED_SUBJECT_REQUIRED/);
});

test('F002: CI job ID must be included in exact qualification',()=>{
  const q={candidate:{...subj,ciJob:undefined},
    review:{...rev,commit:'3'.repeat(40),blob:'4'.repeat(40)},
    controlRef:commentRef,acceptanceRef:commentRef,phase2Ref:commentRef,terminalRef:commentRef};
  assert.throws(()=>verifyTerminalAdapterIntegration(()=>{throw Error('called');},digest,q),
    /EXACT_ACCEPTED_REVIEWED_SUBJECT_REQUIRED/);
});

test('PR58 must be genuinely merged before any next gate',()=>{
  const q={candidate:subj,review:{...rev,commit:'3'.repeat(40),blob:'4'.repeat(40)},
    controlRef:commentRef,acceptanceRef:commentRef,phase2Ref:commentRef,
    terminalRef:commentRef};
  assert.throws(()=>verifyTerminalAdapterIntegration(()=>({merged:false}),digest,q),
    /PR58_EXACT_MERGE_MISSING/);
});

test('F005: correct unique verdict at exact header is accepted',()=>{
  assert.doesNotThrow(()=>verifyOriginalReviewPass(pass,input,subj,rev));
});

test('F005: historical PASS followed by actual FAIL is rejected',()=>{
  const r=[reviewHeading,'','**ORIGINAL SEMANTIC VERDICT: PASS**','',
    '**ORIGINAL SEMANTIC VERDICT: FAIL**',pass].join('\n');
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNIQUE_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('F005: original FAIL mentioning historical PASS is rejected',()=>{
  const r=[reviewHeading,'','**ORIGINAL SEMANTIC VERDICT: FAIL**','',
    'Historical run: PASS',attempt,subj.commit,subj.tree,subj.sourceBlob,
    subj.testBlob,rev.requestCommit,rev.requestBlob].join('\n');
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNIQUE_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('F005: displaced verdict and false heading are rejected',()=>{
  const r=['# Unrelated review','','**ORIGINAL SEMANTIC VERDICT: PASS**',
    pass].join('\n');
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNIQUE_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('F002: review with omitted Control-selected request reference is rejected',()=>{
  const r=pass.replace(rev.requestBlob,'missing source reference');
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNIQUE_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('F002: source blob missing from frozen interface is rejected',()=>{
  assert.throws(()=>verifyOriginalReviewPass(pass,input.replace(subj.sourceBlob,'missing'),subj,rev),
    /PR58_EXACT_UNIQUE_INDEPENDENT_REVIEW_NOT_PASS/);
});

test('F003: native owner metadata rejects foreign author',()=>{
  const fake={html_url:commentRef,user:{login:'outsider'},author_association:'NONE',
    created_at:'2026-10-30T01:00:00Z',updated_at:'2026-10-30T01:00:00Z',
    body:'DEVELOPER_ACCEPTED_TERMINAL_COMPAT_EXACT_CANDIDATE'};
  assert.throws(()=>ownerDecision(()=>fake,commentRef),
    /COMPETENT_DEVELOPER_DECISION_PROVENANCE_MISSING/);
});

test('F003: edited native OWNER comment is unqualified',()=>{
  const fake={html_url:commentRef,user:{login:'mauedgar'},author_association:'OWNER',
    created_at:'2026-10-30T01:00:00Z',updated_at:'2026-10-30T02:00:00Z',body:'PASS'};
  assert.throws(()=>ownerDecision(()=>fake,commentRef),
    /COMPETENT_DEVELOPER_DECISION_PROVENANCE_MISSING/);
});

test('owner bytes alone do not imply genuine Developer decision',()=>{
  const fake={html_url:commentRef,user:{login:'mauedgar'},author_association:'OWNER',
    created_at:'2026-10-30T01:00:00Z',updated_at:'2026-10-30T01:00:00Z',
    body:'I have no acceptance'};
  assert.equal(ownerDecision(()=>fake,commentRef).body,'I have no acceptance');
});

test('F004: parent nested symlink cannot be treated as a safe output path',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'op03-real-root-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'op03-foreign-root-'));
  try{
    fs.symlinkSync(outside,path.join(root,'alias'),'dir');
    assert.throws(()=>safeExistingDirectory(path.join(root,'alias')),
      /OUTPUT_DIRECTORY_SYMLINK_OR_NOT_DIRECTORY|OUTPUT_DIRECTORY_ESCAPE/);
    assert.deepEqual(fs.readdirSync(outside),[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});}
});

test('F004: manifest file symlink is not valid terminal content',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'op03-terminal-files-'));
  try{
    fs.symlinkSync(__filename,path.join(root,'manifest.json'));
    fs.writeFileSync(path.join(root,'projection.json'),'{}');
    assert.throws(()=>safeTerminalFiles(root,{}),/TERMINAL_FILE_SYMLINK_OR_HARDLINK/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('original Git blob and durable sha256 hashes are domain separated',()=>{
  assert.equal(blobSha('test\n'),'9daeafb9864cf43055ae93beb0afd6c7d144bfa4');
  assert.equal(sha256('test\n'),'sha256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2');
});

test('a BLOCKED diagnostic carries no Product terminal disposition',()=>{
  const r=blocked('SOURCE_NOT_AUTHENTIC');
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.effect_state,'NONE');
  assert.equal(r.terminal_disposition_ref,null);
});
