'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createTaskCycleInitializationCapability}=require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-initialization');
const {createTaskCycleClosureCompatibilityCapability,consumeTaskCycleClosureCompatibility}=require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-closure-compatibility');
const id5=['PHASE1_BOUNDED_PRODUCT_SOT_RECONCILIATION','PROMOTION_GRADE_VALIDATION_AND_EXACT_CANDIDATE','FROZEN_INDEPENDENT_REVIEW_AND_RECONCILIATION','DEVELOPER_ACCEPTANCE','PHASE2_AND_LOGICAL_CLOSE'];
const id9=['implementation','promotion_grade_validation','exact_candidate','frozen_review_interface','independent_review','Developer_acceptance','Phase_2','effect_reconciliation','logical_close'];
function fixture(ids=id5){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tc-close-compat-'));
 const initRoot=path.join(root,'init'),closeRoot=path.join(root,'close');fs.mkdirSync(initRoot);fs.mkdirSync(closeRoot);
 const base='1'.repeat(40),baseTree='2'.repeat(40),task='3'.repeat(40),taskTree='4'.repeat(40),commit='5'.repeat(40),tree='6'.repeat(40);
 const request={taskcycle:{id:'TC-EXACT-1',responsibility:'BOUNDED_COMPATIBILITY'},Product_baseline:{repository:'mauedgar/tecnotron-ai',integration_branch:'tools',commit:base,tree:baseTree},TASK_carrier:{branch:'candidate/TC-EXACT-1',path:'docs/tasks/TC-EXACT-1/TASK.md',commit:task,tree:taskTree},write_scope:['docs/current-state.md'],authority_refs:['DEVELOPER-BOOTSTRAP'],evidence_refs:['TASK-EXACT'],obligations:ids.map(id=>({id,authority_ref:null})),current_gate:'PHASE1_IMPLEMENT_BOUNDED_CANDIDATE'};
 const init=createTaskCycleInitializationCapability({root:initRoot}).initializeTaskCycle({request,observed:{Product_baseline:request.Product_baseline,TASK_carrier:request.TASK_carrier}});
 assert.equal(init.status,'PASS');
 const cand={repository:request.Product_baseline.repository,branch:request.TASK_carrier.branch,commit,tree,parent:task,changed_paths:[...request.write_scope]};
 const p={taskcycle:request.taskcycle,initialization:{location_or_ref:init.portable_projection.location_or_ref,identity_sha256:init.portable_projection.identity_sha256},candidate:cand,
 validation:{status:'PASS',commit,tree,evidence_ref:'VALIDATION-EXACT'},
 freeze:{id:'FROZEN-EXACT',identity_sha256:'sha256:'+'7'.repeat(64),commit,tree},
 review:{id:'IR-EXACT',actual_verdict:'PASS',normalized_class:'PASS_CLASS',result_sha256:'sha256:'+'8'.repeat(64),commit,tree,blocking_findings:[],nonblocking_findings:['ADVISORY-1']},
 Developer_acceptance:{status:'GRANTED',authority_ref:'DEVELOPER-ACCEPT',commit,tree},
 Phase_2:{status:'PASS',pre_tools:base,post_tools:commit,post_tree:tree,force:false,remote_correspondence:'EXACT',accepted_first_parent_range:{integration_range_base:base,accepted_tip:commit,accepted_tip_parent:task,accepted_tip_tree:tree,ordered_commit_range:[task,commit],commit_count:2,changed_paths:['docs/current-state.md','docs/tasks/TC-EXACT-1/TASK.md']}},
 effect_reconciliation:{status:'PASS',canonical_commit:commit,canonical_tree:tree,unresolved_UNKNOWN_effects:[]},
 logical_close:{terminal_disposition_ref:'CLOSED_PASS',authority_ref:'DEVELOPER-CLOSE'},
 authority_refs:['DEVELOPER-BOOTSTRAP','DEVELOPER-ACCEPT','DEVELOPER-CLOSE','AUTH-OBSERVED'],
 evidence_refs:['VALIDATION-EXACT','FROZEN-EXACT','IR-EXACT','GIT-EXACT'],
 obligation_satisfactions:ids.map((id,i)=>({id,status:'SATISFIED',authority_ref:i===3?'DEVELOPER-ACCEPT':'AUTH-OBSERVED',evidence_refs:['GIT-EXACT']}))};
 const observed={candidate:structuredClone(p.candidate),validation:structuredClone(p.validation),freeze:structuredClone(p.freeze),review:structuredClone(p.review),Developer_acceptance:structuredClone(p.Developer_acceptance),Phase_2:structuredClone(p.Phase_2),effect_reconciliation:structuredClone(p.effect_reconciliation),logical_close:structuredClone(p.logical_close),obligation_satisfactions:structuredClone(p.obligation_satisfactions),canonical_tools:{branch:'tools',head_commit:commit,head_tree:tree,verification_ref:'GIT-EXACT',lineage:{status:'PASS',ancestor_commit:commit,descendant_commit:commit,verification_ref:'GIT-EXACT'}}};
 const cap=createTaskCycleClosureCompatibilityCapability({root:closeRoot});
 return {root,closeRoot,p,observed,cap,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function mutateObserved(f){ for(const k of ['candidate','validation','freeze','review','Developer_acceptance','Phase_2','effect_reconciliation','logical_close','obligation_satisfactions'])f.observed[k]=structuredClone(f.p[k]);}
for(const ids of [id5,id9])test(`closes without inventing IDs: ${ids.length}-obligation initialization`,()=>{
 const f=fixture(ids);try{const out=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(out.status,'PASS',out.reason);assert.equal(out.effect_state,'CONFIRMED');assert.equal(out.TaskCycle.state,'CLOSED');assert.equal(out.State_Kernel_direct_calls,0);const consumed=consumeTaskCycleClosureCompatibility({location:out.portable_projection.location_or_ref,expected_identity_sha256:out.portable_projection.identity_sha256});assert.deepEqual(consumed.projection.obligations.map(o=>o.id),ids);assert.ok(consumed.projection.obligations.every(o=>o.status==='SATISFIED'));assert.equal(consumed.projection.semantics.Product_effects_replayed,false);assert.deepEqual(consumed.projection.lifecycle_evidence.review.nonblocking_findings,['ADVISORY-1']);}finally{f.cleanup()}
});
test('exact repeat is idempotent, conflicting new evidence is blocked without mutation',()=>{
 const f=fixture();try{const one=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(one.status,'PASS');const repeat=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(repeat.status,'PASS');assert.equal(repeat.already_closed,true);f.p.evidence_refs.push('ANOTHER-EVIDENCE');const conflict=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(conflict.status,'BLOCKED');assert.equal(conflict.reason,'CLOSE_IDENTITY_CONFLICT');assert.equal(conflict.effect_state,'NONE');}finally{f.cleanup()}
});
const negative=[
 ['review FAIL',f=>f.p.review.actual_verdict='FAIL','INDEPENDENT_REVIEW_NOT_QUALIFIED_PASS'],
 ['review BLOCKED',f=>f.p.review.actual_verdict='BLOCKED','INDEPENDENT_REVIEW_NOT_QUALIFIED_PASS'],
 ['advisory review with blocking finding',f=>f.p.review.blocking_findings.push('CRITICAL'),'INDEPENDENT_REVIEW_NOT_QUALIFIED_PASS'],
 ['review noncanonical verdict',f=>f.p.review.actual_verdict='PASS_WITH_FINDINGS','INDEPENDENT_REVIEW_NOT_QUALIFIED_PASS'],
 ['missing Developer acceptance',f=>f.p.Developer_acceptance.status='PENDING','DEVELOPER_ACCEPTANCE_REQUIRED'],
 ['missing Developer authority',f=>f.p.Developer_acceptance.authority_ref='','DEVELOPER_ACCEPTANCE_REQUIRED'],
 ['unreconciled UNKNOWN effect',f=>f.p.effect_reconciliation.unresolved_UNKNOWN_effects.push('UNKNOWN-1'),'EFFECT_RECONCILIATION_INVALID'],
 ['invalid phase2 range',f=>f.p.Phase_2.accepted_first_parent_range.commit_count=1,'PHASE2_RANGE_EVIDENCE_INVALID'],
 ['wrong remote correspondence',f=>f.p.Phase_2.remote_correspondence='UNKNOWN','PHASE2_RANGE_EVIDENCE_INVALID'],
 ['force forbidden',f=>f.p.Phase_2.force=true,'PHASE2_RANGE_EVIDENCE_INVALID'],
 ['missing obligation',f=>f.p.obligation_satisfactions.pop(),'ORIGINAL_OBLIGATION_SET_MISMATCH'],
 ['invented obligations',f=>f.p.obligation_satisfactions[0].id='implementation','ORIGINAL_OBLIGATION_SET_MISMATCH'],
 ['missing obligation evidence',f=>f.p.obligation_satisfactions[0].evidence_refs=[],'OBLIGATION_SATISFACTION_EVIDENCE_INVALID'],
 ['missing obligation authority',f=>f.p.obligation_satisfactions[0].authority_ref='','OBLIGATION_SATISFACTION_EVIDENCE_INVALID'],
 ['mismatched implementation provenance',f=>{f.p.candidate.parent='9'.repeat(40);f.p.Phase_2.accepted_first_parent_range.accepted_tip_parent='9'.repeat(40)},'CANDIDATE_INITIALIZATION_PROVENANCE_MISMATCH'],
 ['wrong base',f=>{f.p.Phase_2.pre_tools='9'.repeat(40);f.p.Phase_2.accepted_first_parent_range.integration_range_base='9'.repeat(40)},'INTEGRATION_BASELINE_MISMATCH'],
 ['unknown close authority',f=>f.p.logical_close.authority_ref='','LOGICAL_CLOSE_AUTHORITY_INVALID'],
 ];
for(const [name,change,reason] of negative)test(`fail closed: ${name}`,()=>{
 const f=fixture();try{change(f);mutateObserved(f);const out=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(out.status,'BLOCKED',name);assert.equal(out.effect_state,'NONE',name);assert.equal(out.reason,reason,name);assert.deepEqual(fs.readdirSync(f.closeRoot),[],name);}finally{f.cleanup()}
});
test('observed Git drift blocks even valid request',()=>{
 const f=fixture();try{f.observed.canonical_tools.head_commit='a'.repeat(40);const o=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(o.status,'BLOCKED');assert.equal(o.reason,'COMPETENT_OBSERVATION_MISMATCH');assert.deepEqual(fs.readdirSync(f.closeRoot),[]);}finally{f.cleanup()}
});
test('identity mismatch in immutable initialization evidence is blocked',()=>{
 const f=fixture();try{f.p.initialization.identity_sha256='sha256:'+'0'.repeat(64);const o=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(o.status,'BLOCKED');assert.match(o.reason,/INITIALIZATION_CONSUME_FAILED/);}finally{f.cleanup()}
});

test('accepted subject still closes after canonical tools advances, only with verified ancestry',()=>{
 const f=fixture();try{
   f.observed.canonical_tools.head_commit='a'.repeat(40);
   f.observed.canonical_tools.head_tree='b'.repeat(40);
   f.observed.canonical_tools.verification_ref='GIT-CURRENT-DESCENDANT';
   f.observed.canonical_tools.lineage.descendant_commit='a'.repeat(40);
   f.observed.canonical_tools.lineage.verification_ref='GIT-RANGE-ANCESTRY';
   const result=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});
   assert.equal(result.status,'PASS',result.reason);
   const p=consumeTaskCycleClosureCompatibility({location:result.portable_projection.location_or_ref,expected_identity_sha256:result.portable_projection.identity_sha256}).projection;
   assert.equal(p.exact_candidate.commit,'5'.repeat(40));
   assert.equal(p.lifecycle_evidence.canonical_tools_observation.head_commit,'a'.repeat(40));
 }finally{f.cleanup()}
});
test('unverified historical ancestry blocks closure before publication',()=>{
 const f=fixture();try{f.observed.canonical_tools.lineage.status='UNKNOWN';const out=f.cap.closeFromExactInitialization({request:f.p,observed:f.observed});assert.equal(out.status,'BLOCKED');assert.equal(out.reason,'COMPETENT_OBSERVATION_MISMATCH');assert.deepEqual(fs.readdirSync(f.closeRoot),[]);}finally{f.cleanup()}
});
