'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {
  close,buildPackage,publishOnce,blocked,SUBJECT,OBLIGATIONS,SCHEMA,INITIAL_HASH,
  sha256,blobSha,
}=require('../../scripts/op03-original-taskcycle-close');

function facts() {
  return {
    source_identity:INITIAL_HASH,
    initial:{
      TaskCycle:{id:'TASKCYCLE-TECNOTRON-ULC-OP03-ACTIONS-EVIDENCE-CONSUMER-001',
        responsibility:'QUALIFY_BOUNDED_NATIVE_ACTIONS_EVIDENCE_FOR_REAL_PRODUCT_CONTROL_CONSUMER',state:'ACTIVE'},
      current_gate:'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE',
      exact_inputs:{Product_baseline:{commit:SUBJECT.sourceBase},
        TASK_carrier:{commit:SUBJECT.carrier},
        write_scope:['src/adapters/github.js','tests/adapters/github-native-actions-evidence.test.js']},
      pending_obligations:OBLIGATIONS.map(id=>({id,status:'PENDING'})),
      authority_refs:['https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6384214121'],
      evidence_refs:['https://github.com/mauedgar/tecnotron-ai/issues/34'],
    },
    authority_refs:['https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6512300519',
      'https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6512357634'],
    evidence_refs:['https://github.com/mauedgar/tecnotron-ai/pull/57']
  };
}
const authority='https://github.com/mauedgar/tecnotron-ai/issues/34#issuecomment-6512731481';

test('original 9 obligations and merge topology remain projected separately from canonical Product code',()=>{
  const pkg=buildPackage(facts(),authority);
  assert.equal(pkg.projection.TaskCycle.state,'CLOSED');
  assert.equal(pkg.projection.current_gate,null);
  assert.equal(pkg.projection.pending_obligations.length,0);
  assert.deepEqual(pkg.projection.obligations.map(o=>o.id),[...OBLIGATIONS]);
  assert.ok(pkg.projection.obligations.every(o=>o.status==='SATISFIED'));
  assert.equal(pkg.projection.exact_inputs.TASK_carrier.commit,SUBJECT.carrier);
  assert.equal(pkg.projection.Phase_2.merge_commit,SUBJECT.merge);
  assert.equal(pkg.projection.exact_candidate.commit,SUBJECT.accepted);
  assert.equal(pkg.projection.preserved_limitations.includes('F007'),true);
  assert.equal(pkg.projection.semantics.State_Kernel_direct_calls,0);
  assert.equal(pkg.projection.semantics.Product_effects_replayed,false);
  assert.equal(pkg.manifest.files['projection.json'],sha256(pkg.projectionText));
  assert.equal(pkg.identity_sha256,sha256(pkg.manifestText));
  assert.equal(pkg.projection.schema,SCHEMA);
});

test('Native provider read failure blocks before any close effect',()=>{
  let count=0;
  const res=close({api:()=>{count++; throw new Error('HTTP 401');},root:'ignored',
    terminalAuthorityRef:authority,commit:true});
  assert.equal(res.status,'BLOCKED');
  assert.equal(res.effect_state,'NONE');
  assert.equal(res.terminal_disposition_ref,null);
  assert.equal(count,1);
});

test('wrong original manifest or missing native Content blocks before close',()=>{
  const r=close({api:()=>({encoding:'base64',sha:'0'.repeat(40),
    content:Buffer.from('{}').toString('base64')}),root:'ignored',
    terminalAuthorityRef:authority,commit:true});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'NATIVE_BLOB_INTEGRITY_MISMATCH');
});

test('one append-only projection; exact reread is idempotent, conflicted output fails closed',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tec-op03-close-test-'));
  try {
    const pkg=buildPackage(facts(),authority);
    const first=publishOnce(root,pkg);
    assert.equal(first.status,'PASS');
    assert.equal(first.already_closed,false);
    assert.equal(first.identity_sha256,pkg.identity_sha256);
    const second=publishOnce(root,pkg);
    assert.equal(second.already_closed,true);
    const changed=structuredClone(facts());
    changed.evidence_refs.push('https://github.com/mauedgar/tecnotron-ai/issues/34');
    assert.throws(()=>publishOnce(root,buildPackage(changed,authority)),/EXISTING_TERMINAL_CONFLICT/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('no terminal authority reference means no output even with preassembled input',()=>{
  assert.throws(()=>buildPackage(facts(),'unverified'),/COMPETENT_TERMINAL_AUTHORITY_REFERENCE_REQUIRED/);
});

test('sha256 and Git blob hashing are domain-separated',()=>{
  assert.equal(blobSha('test\n'),'9daeafb9864cf43055ae93beb0afd6c7d144bfa4');
  assert.equal(sha256('test\n'),'sha256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2');
});

test('bounded terminal proof does not invent TaskCycle or promote issue #35',()=>{
  const p=buildPackage(facts(),authority).projection;
  assert.equal(p.semantics.no_new_TaskCycle,true);
  assert.equal(p.semantics.no_automatic_backlog_admission,true);
  assert.equal(p.terminal_disposition_ref,'CLOSED_PASS');
  assert.deepEqual(p.preserved_limitations,['F007','IR005-A011','REVIEWER_EXTERNAL_CONTEXT_ISOLATION_NOT_ATTESTED']);
});

test('blocking result does not masquerade as Product post-write UNKNOWN',()=>{
  const p=blocked('NO_NATIVE_PROVIDER_RECEIPT');
  assert.equal(p.status,'BLOCKED');
  assert.equal(p.effect_state,'NONE');
  assert.equal(p.terminal_disposition_ref,null);
});
