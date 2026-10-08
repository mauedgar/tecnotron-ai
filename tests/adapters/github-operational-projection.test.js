'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { GitHubAdapter, observePromotedIssue, evaluateOperationalReady } = require('../../src/adapters/github');
const issueUrl = 'https://github.com/mauedgar/tecnotron-ai/issues/30';
const promotionRef = 'TECNOTRON-CONTROL-004-GITHUB-FIRST-CIRCUIT-ADMISSION-2026-10-08-001';
const issue = { url: issueUrl, state: 'open', body: `Promotion: ${promotionRef}` };
const observed = observePromotedIssue(issue, { issueUrl, promotionRef });
const project = { provider: 'GITHUB_PROJECTS', verified: true, issueUrl, projectId: 'fixture-project', projectItemId: 'fixture-item', statusFieldId: 'fixture-field', statusOptionId: 'fixture-backlog', macrostate: 'Backlog' };
const decision = { kind: 'READY_GRANTED', authorityRef: 'EXPLICIT-CONTROL-RULING', issueUrl, dependencyIds: ['dep-A'] };
const dependencies = { complete: true, items: [{id:'dep-A',status:'SATISFIED'}] };
const ready = evaluateOperationalReady({ issueObservation: observed, projectObservation: project, decision, dependencies });
const request = { operationId:'fixture-operation', authorityRef:'EXPLICIT-PROJECTION-GRANT', authorizationKind:'OPERATIONAL_PROJECTION', writeAuthorized:true, mappingVerified:true, observationRef:'EXACT-PROVIDER-OBSERVATION', expectedCurrentOptionId:'fixture-ready', issueUrl, projectId: 'fixture-project', projectItemId:'fixture-item',statusFieldId:'fixture-field',statusOptions: { Backlog:'fixture-backlog',Ready:'fixture-ready' },desiredStatus:'Backlog' };
const item = (option) => ({ id:'fixture-item', issueUrl, projectId:'fixture-project', statusFieldId:'fixture-field', statusOptionId:option });
const adapter = (client) => new GitHubAdapter({ getIssue:async()=>issue, ...client });
test('real promoted Issue ID is correlated but open is not Backlog', () => {
  assert.deepEqual(observed, {status:'PASS',issueUrl,issueState:'open',promotionRef,projectMacrostate:'NOT_VERIFIED'});
});
test('mismatched promotion ref cannot be substituted by issue existence', () => {
  assert.equal(observePromotedIssue(issue, {issueUrl,promotionRef:'WRONG'}).status,'BLOCKED');
  assert.equal(observePromotedIssue({...issue,url:issueUrl+'/other'}, {issueUrl,promotionRef}).status,'BLOCKED');
});
test('Ready requires verified Projects status, not Issue open', () => {
  assert.equal(evaluateOperationalReady({issueObservation:observed,projectObservation:{...project,verified:false},decision,dependencies}).reason,'PROJECT_BACKLOG_STATUS_NOT_VERIFIED');
  assert.equal(evaluateOperationalReady({issueObservation:observed,decision,dependencies}).status,'BLOCKED');
});
test('Ready requires independently attributable Control decision', () => {
  assert.equal(evaluateOperationalReady({issueObservation:observed,projectObservation:project,decision:{...decision,kind:'NOT_DECIDED'},dependencies}).status,'BLOCKED');
});
test('unknown/incomplete dependency set fails closed', () => {
  assert.equal(evaluateOperationalReady({issueObservation:observed,projectObservation:project,decision,dependencies:{complete:false,items:[]}}).status,'BLOCKED');
  assert.equal(evaluateOperationalReady({issueObservation:observed,projectObservation:project,decision,dependencies:{complete:true,items:[{id:'dep-A',status:'UNKNOWN'}]}}).status,'BLOCKED');
  assert.equal(evaluateOperationalReady({issueObservation:observed,projectObservation:project,decision,dependencies:{complete:true,items:[{id:'dep-A',status:'SATISFIED'},{id:'dep-A',status:'SATISFIED'}]}}).status,'BLOCKED');
});
test('qualified synthetic fixture reaches eligibility, never effect authorization', () => {
  assert.equal(ready.status,'ELIGIBLE');
  assert.equal('writeAuthorized' in ready,false);
});
test('no competent projection grant yields effect NONE and no provider calls', async () => {
  let calls=0;
  const a=adapter({getProjectItem:async()=>{calls++;return item('fixture-backlog');}});
  const r=await a.reconcileOperationalMacrostate({...request,writeAuthorized:false});
  assert.equal(r.effect_state,'NONE');assert.equal(r.reason,'MISSING_COMPETENT_PROJECTION_AUTHORIZATION');assert.equal(calls,0);
});
test('missing provider IDs or mapping fails closed without writes', async () => {
  let calls=0;const a=adapter({getProjectItem:async()=>{calls++;return item('fixture-backlog');}});
  const r=await a.reconcileOperationalMacrostate({...request,statusFieldId:undefined});
  assert.equal(r.reason,'UNVERIFIED_PROJECT_FIELD_MAPPING');assert.equal(calls,0);
});
test('not decided Ready cannot be projected even if client can write', async () => {
  let calls=0;const a=adapter({getProjectItem:async()=>{calls++;return item('fixture-backlog');}});
  const r=await a.reconcileOperationalMacrostate({...request,desiredStatus:'Ready'});
  assert.equal(r.reason,'READY_ELIGIBILITY_NOT_PROVEN');assert.equal(calls,0);
});
test('READY requires matching independent evaluation', async () => {
  let state=item('fixture-backlog');const a=adapter({getProjectItem:async()=>state,updateProjectItem:async(_,patch)=>{state={...state,statusOptionId:patch.statusOptionId};}});
  assert.equal((await a.reconcileOperationalMacrostate({...request,desiredStatus:'Ready',readyAuthorityRef:'wrong',readyEvaluation:ready})).status,'BLOCKED');
  const r=await a.reconcileOperationalMacrostate({...request,desiredStatus:'Ready',readyAuthorityRef:ready.authorityRef,readyEvaluation:ready,expectedCurrentOptionId:'fixture-backlog'});
  assert.equal(r.status,'PASS');assert.equal(r.effect_state,'CONFIRMED');
});
test('pre-effect exact no-op and repeated authorized projection are idempotent', async () => {
  let n=0,state=item('fixture-backlog');const a=adapter({getProjectItem:async()=>state,updateProjectItem:async()=>{n++;}});
  const r1=await a.reconcileOperationalMacrostate(request);
  const r2=await a.reconcileOperationalMacrostate(request);
  assert.equal(r1.changed,false);assert.equal(r2.effect_state,'NONE');assert.equal(n,0);
});
test('authorized exact diff reobserved gives CONFIRMED; next identical call no-op', async () => {
  let n=0,state=item('fixture-ready');const a=adapter({getProjectItem:async()=>state,updateProjectItem:async(_,patch)=>{n++;state={...state,statusOptionId:patch.statusOptionId};}});
  const r1=await a.reconcileOperationalMacrostate(request);
  const r2=await a.reconcileOperationalMacrostate(request);
  assert.equal(r1.effect_state,'CONFIRMED');assert.equal(r2.effect_state,'NONE');assert.equal(n,1);
});
test('provider identity drift blocks with effect NONE', async () => {
  let n=0;const a=adapter({getProjectItem:async()=>({...item('fixture-ready'),projectId:'other'}),updateProjectItem:async()=>{n++;}});
  const r=await a.reconcileOperationalMacrostate(request);
  assert.equal(r.reason,'PROJECT_IDENTITY_OR_FIELD_DRIFT');assert.equal(n,0);
});
test('unavailable read/write capability returns explicit no-effect blocker', async () => {
  const a=adapter({});assert.equal((await a.reconcileOperationalMacrostate(request)).reason,'PROJECT_READ_CAPABILITY_UNAVAILABLE');
  const b=adapter({getProjectItem:async()=>item('fixture-ready')});assert.equal((await b.reconcileOperationalMacrostate(request)).reason,'PROJECT_WRITE_CAPABILITY_UNAVAILABLE');
});
test('write exception is UNKNOWN and must be reconciled before any retry', async () => {
  const a=adapter({getProjectItem:async()=>item('fixture-ready'),updateProjectItem:async()=>{throw Error('timeout after possible write');}});
  const r=await a.reconcileOperationalMacrostate(request);
  assert.equal(r.status,'UNKNOWN');assert.equal(r.effect_state,'UNKNOWN');
});
test('post-effect mismatch or read failure is UNKNOWN, not PASS', async () => {
  const a=adapter({getProjectItem:async()=>item('fixture-ready'),updateProjectItem:async()=>undefined});
  assert.equal((await a.reconcileOperationalMacrostate(request)).status,'UNKNOWN');
  let reads=0;const b=adapter({getProjectItem:async()=>{reads++;if(reads>1)throw Error('offline');return item('fixture-ready');},updateProjectItem:async()=>undefined});
  assert.equal((await b.reconcileOperationalMacrostate(request)).effect_state,'UNKNOWN');
});

test('pre-effect concurrent status drift blocks without a write', async () => {
  let writes=0;const a=adapter({getProjectItem:async()=>item('new-concurrent-status'),updateProjectItem:async()=>{writes++;}});
  const r=await a.reconcileOperationalMacrostate(request);
  assert.equal(r.reason,'PROJECT_PRE_EFFECT_OPTION_DRIFT');assert.equal(r.effect_state,'NONE');assert.equal(writes,0);
});
test('unverified mapping and missing observation reference cannot write',async()=> {
  let reads=0;const a=adapter({getProjectItem:async()=>{reads++;return item('fixture-ready');}});
  assert.equal((await a.reconcileOperationalMacrostate({...request,mappingVerified:false})).status,'BLOCKED');
  assert.equal((await a.reconcileOperationalMacrostate({...request,observationRef:undefined})).status,'BLOCKED');
  assert.equal(reads,0);
});
test('closed Issue and invalid dependency identity never become Ready',()=>{
  assert.equal(evaluateOperationalReady({issueObservation:{...observed,issueState:'closed'},projectObservation:project,decision,dependencies}).status,'BLOCKED');
  assert.equal(evaluateOperationalReady({issueObservation:observed,projectObservation:project,decision:{...decision,dependencyIds:['']},dependencies:{complete:true,items:[{id:'',status:'SATISFIED'}]}}).status,'BLOCKED');
});
