'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {parsePaths,qualifyMergeTopology}=require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-close-evidence-qualification');

test('NUL path parser preserves leading/trailing spaces and UTF-8 names',()=>{
  assert.deepEqual(parsePaths(' leading.test.js\0utf8/café.test.js\0'),[' leading.test.js','utf8/café.test.js']);
  assert.deepEqual(parsePaths(''),[]);
  assert.deepEqual(parsePaths('z.js\0a.js\0z.js\0'),['a.js','z.js']);
});
test('NUL path parser fails closed on malformed and dangerous paths',()=>{
  for(const s of [' a.js\n','file.js','../escape\0','/abs\0','file.js\0\0','a\\b\0','a/../b\0','\uFFFD.js\0']){
    assert.throws(()=>parsePaths(s),undefined,s);
  }
});

const phase1={commit:'d47dffd5b25da3f883f0f08d34ad9e8e0cb081ac',
tree:'d2cbc04162441f0bc0c10d49093fd41ed65075a5',
task_carrier:'b43ce9fc518510a0f5b41ab29df88bbefacca11f'};
const candidate='08e94d6d17b9a2071c36c920574683a969fb53ba';
const pre='58c9b68d468588d58c4d85d032a799f83846123d';
const merge='2a42a1bbda6e9fecccb28c42c9c2dd294b3b1c89';
const tree='04e57337ac129bd40774d48cf2cfee041f904cfa';
const writeScope=['docs/guides/testing-by-type.md','package.json','scripts/tests/run-by-type.js','scripts/tests/test-suites.test.js'];
const taskPath='docs/tasks/TEC-TC-TEST-SUITE-TYPE-CLASSIFICATION-001/TASK.md';
function params(root) {
  return { repositoryPath:root,phase1,originalTaskCycleId:'TASKCYCLE-TECNOTRON-TEST-SUITE-TYPE-CLASSIFICATION-001',
    expectedRemoteCommit:merge,remoteUrl:'https://github.com/mauedgar/tecnotron-ai.git',
    scope:{write_scope:writeScope,task_path:taskPath,baseline_path_scope:[...writeScope,taskPath]},
    request:{taskcycle:{id:'TASKCYCLE-TECNOTRON-TEST-SUITE-TYPE-CLASSIFICATION-001'},
      candidate:{repository:'mauedgar/tecnotron-ai',commit:candidate,tree:'f8d8ba33dd7f3322b48d46f03998aa606afd3ce1',
        parent:phase1.commit},
      Phase_2:{integration_mode:'MERGE_COMMIT',status:'PASS',pre_tools:pre,post_tools:merge,post_tree:tree,
        force:false,remote_correspondence:'EXACT',
        merge:{commit:merge,tree,parents:[pre,candidate],validated_combined_tree:tree,
          candidate_lineage:[phase1.commit,candidate],
          changed_paths:[...writeScope,taskPath]}}}};
}
test('typed guards reject invalid mode, false remote binding and wrong TaskCycle before reading Git',()=>{
  const p=params('/nonexistent');
  p.request.Phase_2.integration_mode='SQUASH';
  assert.equal(qualifyMergeTopology(p).reason,'MERGE_CLOSURE_INPUT_INVALID');
  p.request.Phase_2.integration_mode='MERGE_COMMIT';
  p.remoteUrl='file:///fake';
  assert.equal(qualifyMergeTopology(p).reason,'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
  p.remoteUrl='https://github.com/mauedgar/tecnotron-ai.git';
  p.request.taskcycle.id='fake';
  assert.equal(qualifyMergeTopology(p).reason,'MERGE_CLOSURE_INPUT_INVALID');
});
test('missing independently qualified checkout cannot close via synthetic self-consistency',()=>{
  const r=qualifyMergeTopology(params('/path/that/does-not-exist'));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
});
test('real two-parent PR42 merge requires exact official GitHub HEAD, parents, tree and every repair edge', {
  skip: process.env.TS_PRODUCT_GIT_PROOF!=='1'?'requires an isolated exact native Product Git checkout and explicit gate':''
},()=>{
  const r=qualifyMergeTopology(params(path.resolve(process.cwd())));
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.verified.merge_commit,merge);
  assert.equal(r.verified.recomputed_combined_tree,tree);
  assert.equal(r.verified.remote_oid,merge);
  assert.deepEqual(r.verified.actual_changed_paths,[...writeScope,taskPath].sort());
});
