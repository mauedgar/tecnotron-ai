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
const reviewHeading='# TECNOTRON #34 — OP03 / PR #58 — WEB_INLINE Independent Review IR007';
const attempt='TECNOTRON-OP03-PR58-TERMINAL-COMPAT-WEBINLINE-IR007-ATTEMPT-001';
const tick=String.fromCharCode(96);
const input=[subj.commit,subj.tree,subj.sourceBlob,subj.testBlob,
  subj.ciRun,subj.ciJob,attempt].join(' ');
const canonical=[
  '**REVIEWED SUBJECT COMMIT:** '+tick+subj.commit+tick,
  '**REVIEWED SUBJECT TREE:** '+tick+subj.tree+tick,
  '**REVIEWED SOURCE BLOB:** '+tick+subj.sourceBlob+tick,
  '**REVIEWED TEST BLOB:** '+tick+subj.testBlob+tick,
  '**FROZEN REQUEST COMMIT:** '+tick+rev.requestCommit+tick,
  '**FROZEN REQUEST BLOB:** '+tick+rev.requestBlob+tick,
  '**ExecutionAttempt:** '+tick+attempt+tick
];
const pass=[reviewHeading,'','**ORIGINAL SEMANTIC VERDICT: PASS**','',
  ...canonical,'','Review scope: original nine obligations; F007 limitations retained.'].join('\n');
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

test('F005: a unique PASS with authoritative contiguous subject fields qualifies',()=>{
  assert.doesNotThrow(()=>verifyOriginalReviewPass(pass,input,subj,rev));
});

test('F005: historical PASS followed by a second bare FAIL is rejected',()=>{
  const r=pass+'\n**ORIGINAL SEMANTIC VERDICT: FAIL**';
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F005: a quoted contradictory FAIL is rejected',()=>{
  const r=pass+'\n> **ORIGINAL SEMANTIC VERDICT: FAIL**';
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F005: indented and tab-indented contradictory FAIL both reject',()=>{
  for(const prefix of ['  ','\t','  > ',' - ']){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+prefix+
      '**ORIGINAL SEMANTIC VERDICT: FAIL**',input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
  }
});

test('F005: a primary FAIL cannot be rescued by PASS anywhere in history',()=>{
  const r=pass.replace('**ORIGINAL SEMANTIC VERDICT: PASS**',
    '**ORIGINAL SEMANTIC VERDICT: FAIL**')+'\nHistorical verdict was PASS';
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F005: a displaced PASS, wrong heading or second PASS fails',()=>{
  for(const r of [pass.replace(reviewHeading,'# Other review'),
    pass.replace('\n\n**ORIGINAL SEMANTIC VERDICT: PASS**','\n**ORIGINAL SEMANTIC VERDICT: PASS**'),
    pass+'\n> **ORIGINAL SEMANTIC VERDICT: PASS**']){
    assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
  }
});

test('F006: a PASS about a different candidate cannot rely on historical mentions',()=>{
  const wrong='f'.repeat(40),wrongTree='e'.repeat(40);
  const r=pass.replace(canonical[0],
    '**REVIEWED SUBJECT COMMIT:** '+tick+wrong+tick)
    .replace(canonical[1],'**REVIEWED SUBJECT TREE:** '+tick+wrongTree+tick)
    +'\nHistorical frozen references (not reviewed): '+[...canonical].join(' ');
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F006: a competing reviewed-candidate declaration invalidates PASS',()=>{
  const r=pass+'\nReviewed candidate commit: '+('f'.repeat(40))+
    '\nReviewed tree: '+('e'.repeat(40));
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F006: moving authoritative subject into history cannot qualify',()=>{
  const r=[reviewHeading,'','**ORIGINAL SEMANTIC VERDICT: PASS**','',
    'Historical references: '+canonical.join(' '),'',...canonical].join('\n');
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F006: a duplicate authoritative subject field is rejected',()=>{
  const r=pass+'\n> '+canonical[0];
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F002: absent selected frozen request reference cannot be reintroduced by history',()=>{
  const r=pass.replace(canonical[5],
    '**FROZEN REQUEST BLOB:** '+tick+('f'.repeat(40))+tick)
    +'\nHistorical '+canonical[5];
  assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
    /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
});

test('F002: request missing exact source blob or fixed reviewer attempt rejects',()=>{
  for(const bad of [input.replace(subj.sourceBlob,'missing'),
    input.replace(attempt,'old reviewer')]){
    assert.throws(()=>verifyOriginalReviewPass(pass,bad,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
  }
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

test('F006: ordered-list numbered duplicate authoritative identity is rejected',()=>{
  const wrong='f'.repeat(40);
  for(const prefix of ['1. ','42) ','  4. ','> 2. ','- 2. ','### ','#### > 2. ']){
    const r=pass+'\n'+prefix+'**REVIEWED SUBJECT COMMIT:** '+tick+wrong+tick;
    assert.throws(()=>verifyOriginalReviewPass(r,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
  }
});

test('F006: headings and numbered lists cannot hide different reviewed candidate',()=>{
  const wrong='f'.repeat(40);
  for(const line of ['### Reviewed candidate commit: '+wrong,
    '1. Reviewed tree: '+('e'.repeat(40)),
    '**Reviewed subject:** '+tick+wrong+tick,
    '2. **Reviewed subject:** '+tick+wrong+tick,
    '> ### Evaluated subject commit: '+wrong,
    '3) Selected target: '+wrong]){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+line,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
  }
});

test('F006: ordinary historical non-declarations remain compatible',()=>{
  const r=pass+'\nHistorical references (not reviewed): '+[
    'f'.repeat(40),'e'.repeat(40)].join(' ');
  assert.doesNotThrow(()=>verifyOriginalReviewPass(r,input,subj,rev));
});

test('F005: an ordered-list or heading contradictory verdict also rejects',()=>{
  for(const prefix of ['1. ','22) ','### ','> ### ','- 1. ']){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+prefix+
      '**ORIGINAL SEMANTIC VERDICT: FAIL**',input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/);
  }
});

test('F002: native terminal selection must name IR007 only, not IR006',()=>{
  const source=fs.readFileSync(require.resolve('../../scripts/op03-original-taskcycle-close'),'utf8');
  assert.ok(source.includes('CONTROL_SELECTED_PR58_IR007_FROZEN_INPUT'));
  assert.equal(source.includes('CONTROL_SELECTED_PR58_IR006_FROZEN_INPUT'),false);
});


test('IR005-F008: decorated competing subject declarations fail closed',()=>{
  const wrong='f'.repeat(40),wrongTree='e'.repeat(40);
  for(const line of [
    '**Reviewed subject**: '+tick+wrong+tick,
    '**Reviewed candidate commit**: '+tick+wrong+tick,
    '- [ ] **REVIEWED SUBJECT COMMIT:** '+tick+wrong+tick,
    '> 1. [x] **Reviewed subject**: '+tick+wrong+tick,
    tick+'Reviewed subject'+tick+': '+tick+wrong+tick,
    '3) - [X] '+tick+'Reviewed tree'+tick+': '+tick+wrongTree+tick,
    '- [x] **REVIEWED SUBJECT TREE:** '+tick+wrongTree+tick
  ]){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+line,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/,line);
  }
});

test('IR005-F009: decorated second FAIL verdicts fail closed',()=>{
  for(const line of [
    '**ORIGINAL SEMANTIC VERDICT**: FAIL',
    '1. **ORIGINAL SEMANTIC VERDICT**: FAIL',
    '> ### **ORIGINAL SEMANTIC VERDICT**: FAIL',
    '- [ ] **ORIGINAL SEMANTIC VERDICT**: FAIL',
    '**ORIG**INAL SEMANTIC VERDICT: FAIL',
    tick+'ORIGINAL SEMANTIC VERDICT'+tick+': FAIL'
  ]){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+line,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/,line);
  }
});

test('IR005: canonical PASS and explicit historical nondeclarations remain valid',()=>{
  assert.doesNotThrow(()=>verifyOriginalReviewPass(pass+'\nHistorical unrelated SHA: '+('f'.repeat(40)),input,subj,rev));
});


test('IR006-F010: competing identity via Markdown, HTML or escapes rejects',()=>{
  const wrong='f'.repeat(40);
  for(const line of [
    '**[Reviewed subject](https://example.com)**: '+wrong,
    '**Reviewed subject**\\: '+wrong,
    '<strong>Reviewed subject</strong>: '+wrong,
    '[REVIEWED SUBJECT COMMIT](https://example.com): '+wrong,
    '- [ ] **REVIEWED SUBJECT COMMIT:** '+wrong,
    '### Selected target: '+wrong,
    'History: [Reviewed subject](https://example.com): '+wrong,
    '&& Reviewed subject: '+wrong,
    '**Re**viewed subject: '+wrong
  ]){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+line,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/,line);
  }
});

test('IR006-F011: alternate second FAIL declarations reject',()=>{
  for(const line of [
    '**[ORIGINAL SEMANTIC VERDICT](https://example.com)**: FAIL',
    '**ORIGINAL SEMANTIC VERDICT**\\: FAIL',
    '<strong>ORIGINAL SEMANTIC VERDICT</strong>: FAIL',
    '- [x] **ORIGINAL SEMANTIC VERDICT:** FAIL',
    '### ORIGINAL SEMANTIC VERDICT: FAIL',
    '**ORIG**INAL SEMANTIC VERDICT: FAIL',
    'ORIG\u200bINAL SEMANTIC VERDICT: FAIL'
  ]){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+line,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/,line);
  }
});

test('bounded narrative grammar accepts authentic PASS and historical prose',()=>{
  const tick=String.fromCharCode(96);
  const narrative=[
    '## 1. Evidence and limits',
    '- Historical IR006 FAIL remains historical, not this review',
    '- Historical unrelated SHA '+('f'.repeat(40))+' was not reviewed',
    '- **Audit** PASS with source path '+tick+'scripts/example.js'+tick,
    '### AC01: PASS (bounded)',
    'Source: https://github.com/mauedgar/tecnotron-ai/commit/'+subj.commit
  ].join('\n');
  assert.doesNotThrow(()=>verifyOriginalReviewPass(pass+'\n'+narrative,input,subj,rev));
  const bounded=pass.replace('**ORIGINAL SEMANTIC VERDICT: PASS**',
    '**ORIGINAL SEMANTIC VERDICT: PASS (BOUNDED)**');
  assert.doesNotThrow(()=>verifyOriginalReviewPass(bounded+'\n'+narrative,input,subj,rev));
});

test('body grammar rejects unsupported rendering and controls, even without claims',()=>{
  for(const line of [
    '## [Documentation](https://example.com)',
    '<div>Test result</div>',
    '- [ ] reviewer checkbox',
    'Windows \\ path not in supported report grammar',
    'HTML entity &#58; rendered punctuation',
    '> quoted narrative',
    'zero\u200bwidth'
  ]){
    assert.throws(()=>verifyOriginalReviewPass(pass+'\n'+line,input,subj,rev),
      /PR58_EXACT_UNAMBIGUOUS_REVIEW_SUBJECT_OR_VERDICT_NOT_PASS/,line);
  }
});
