'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {qualifyMergeTopology} = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-close-evidence-qualification');

const ids={
  task:'TASKCYCLE-AWARE-P0-REPAIR-001',
  source:'1'.repeat(40),
  phase1:'2'.repeat(40),
  candidate:'3'.repeat(40),
  pre:'4'.repeat(40),
  merge:'5'.repeat(40),
  tree:'6'.repeat(40),
};
function fixture({repo='mauedgar/aware-commerce',branch='main',taskcycle=ids.task}={}) {
  const request={
    taskcycle:{id:taskcycle},
    candidate:{repository:repo,commit:ids.candidate,tree:'7'.repeat(40),parent:ids.phase1},
    Phase_2:{
      integration_mode:'MERGE_COMMIT',pre_tools:ids.pre,post_tools:ids.merge,
      post_tree:ids.tree,force:false,remote_correspondence:'EXACT',
      merge:{
        commit:ids.merge,tree:ids.tree,validated_combined_tree:ids.tree,
        parents:[ids.pre,ids.candidate],candidate_lineage:[ids.phase1,ids.candidate],
        changed_paths:['docs/example.md'],
      },
    },
  };
  return {
    request,repositoryPath:'/this/does/not/exist',
    phase1:{commit:ids.phase1,tree:'8'.repeat(40),task_carrier:ids.source},
    scope:{write_scope:['docs/example.md'],task_path:'docs/task.md',
      authorized_added_paths:[],baseline_path_scope:['docs/example.md','docs/task.md']},
    originalTaskCycleId:taskcycle,expectedRemoteCommit:ids.merge,
    remoteUrl:'https://github.com/'+repo+'.git',
    qualifiedProductSource:{repository:repo,integration_branch:branch,taskcycle_id:taskcycle},
  };
}
const blocked=(f)=>qualifyMergeTopology(f,{git:{run(){throw Error('NO_NATIVE_GIT_IN_STATIC_TEST')}}});
test('legacy calls without qualified source remain restricted to Tecnotron tools',()=>{
  const v=fixture(),result=blocked({...v,qualifiedProductSource:null});
  assert.deepEqual(result,{status:'BLOCKED',reason:'PRODUCT_REMOTE_BINDING_UNQUALIFIED'});
});
test('exact Aware original P0/main trusted binding passes Product gate but cannot claim Git PASS without source',()=>{
  const result=blocked(fixture());
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
});
test('only exact original Aware P0 is allowed, not a new TaskCycle identity',()=>{
  const x=blocked(fixture({taskcycle:'TASKCYCLE-AWARE-OTHER-001'}));
  assert.equal(x.reason,'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
});
test('a mismatched trusted branch or candidate repository fails closed',()=>{
  for(const value of [
    fixture({branch:'tools'}),
    fixture({repo:'mauedgar/other',branch:'main'}),
    {...fixture(),qualifiedProductSource:{repository:'mauedgar/tecnotron-ai',integration_branch:'tools',taskcycle_id:ids.task}},
    {...fixture(),remoteUrl:'https://github.com/mauedgar/tecnotron-ai.git'},
    {...fixture(),request:{...fixture().request,candidate:{...fixture().request.candidate,repository:'mauedgar/tecnotron-ai'}}},
  ]) assert.equal(blocked(value).reason,'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
});
test('original Tecnotron tools verifier still accepts its historical binding and needs native Git evidence',()=>{
  const v=fixture({repo:'mauedgar/tecnotron-ai',branch:'tools',taskcycle:'TC-1'});
  assert.equal(blocked({...v,qualifiedProductSource:null}).reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
});
test('native Git and authority are required even for source-correct Aware merge',()=>{
  const v=fixture();
  assert.equal(blocked({...v,scope:{...v.scope,authorized_added_paths:['x.js']}}).reason,
    'BASELINE_SCOPE_UNQUALIFIED');
  assert.equal(blocked({...v,expectedRemoteCommit:'9'.repeat(40)}).reason,
    'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
  assert.equal(blocked({...v,qualifiedProductSource:{...v.qualifiedProductSource,taskcycle_id:'WRONG'}}).reason,
    'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
});
