'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { qualifyMergeTopology } = require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-close-evidence-qualification');

const s = c => c.repeat(40);
const c = { baseline:s('0'), task:s('1'), phase1:s('2'), accepted:s('3'),
  acceptedTree:s('4'), merge:s('5'), mergeTree:s('6'), phase1Tree:s('7') };

function fixture(repository='mauedgar/aware-commerce',taskcycle='TASKCYCLE-AWARE-P0-REPAIR-001'){
  const phase1={repository,commit:c.phase1,tree:c.phase1Tree,task_carrier:c.task};
  const request={
    taskcycle:{id:taskcycle},
    candidate:{repository,branch:'candidate/aware-p0-ir005-20261110',commit:c.accepted,
      tree:c.acceptedTree,parent:c.phase1,changed_paths:['docs/current-state.md']},
    Phase_2:{integration_mode:'MERGE_COMMIT',pre_tools:c.baseline,post_tools:c.merge,
      post_tree:c.mergeTree,force:false,remote_correspondence:'EXACT',
      merge:{parents:[c.baseline,c.accepted],commit:c.merge,tree:c.mergeTree,
        validated_combined_tree:c.mergeTree,candidate_lineage:[c.phase1,c.accepted],
        changed_paths:['docs/current-state.md']}}
  };
  const scope={write_scope:['docs/current-state.md'],task_path:'docs/tasks/AC-P0-001-PROPOSED.md',
    authorized_added_paths:[],
    baseline_path_scope:['docs/current-state.md','docs/tasks/AC-P0-001-PROPOSED.md']};
  const args={repositoryPath:'/no-native-checkout-in-test',request,phase1,scope,
    remoteUrl:'https://github.com/'+repository+'.git',originalTaskCycleId:taskcycle,
    expectedRemoteCommit:c.merge,consumerProfile:'AWARE_P0_HISTORICAL_ONLY',
    remoteRef:'refs/heads/main'};
  return args;
}
const absentGit={run(){throw Error('NATIVE_GIT_MUST_NOT_BE_RUN_BY_STATIC_UNIT_TEST')}};
const run=x=>qualifyMergeTopology(x,{git:absentGit});

test('Aware historical-only binding passes static repo/ref gate but remains blocked without real Git',()=>{
  const result=run(fixture());
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
  assert.equal(result.effect_state,undefined);
});
test('wrong TaskCycle, repository, ref, consumer profile or remote all fail before Git',()=>{
  const edits=[
    a=>{a.originalTaskCycleId='TASKCYCLE-INVENTED';a.request.taskcycle.id='TASKCYCLE-INVENTED'},
    a=>{a.request.taskcycle.id='TASKCYCLE-DIFFERENT'},
    a=>{a.consumerProfile='TECNOTRON_TOOLS'},
    a=>{a.consumerProfile='AWARE_P0_GENERAL'},
    a=>{a.remoteRef='refs/heads/tools'},
    a=>{a.remoteRef='refs/heads/feature'},
    a=>{a.remoteUrl='https://github.com/mauedgar/tecnotron-ai.git'},
    a=>{a.phase1.repository='mauedgar/tecnotron-ai'},
    a=>{a.request.candidate.repository='mauedgar/another-repo'},
  ];
  for(const edit of edits) {
    const a=fixture();edit(a);
    const x=run(a);
    assert.equal(x.status,'BLOCKED');
    assert.equal(x.reason,
      a.request.taskcycle.id!==a.originalTaskCycleId
        ? 'MERGE_CLOSURE_INPUT_INVALID'
        : 'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
  }
});
test('missing exact Aware profile does not grant an implicit fallback',()=>{
  const a=fixture();delete a.consumerProfile;delete a.remoteRef;
  assert.equal(run(a).reason,'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
});
test('Tecnotron original consumer remains its unchanged default tools profile',()=>{
  const a=fixture('mauedgar/tecnotron-ai','TASKCYCLE-TC-TEST');
  a.consumerProfile='TECNOTRON_TOOLS';a.remoteRef='refs/heads/tools';
  assert.equal(run(a).reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
  const implicit=fixture('mauedgar/tecnotron-ai','TASKCYCLE-TC-TEST');
  delete implicit.consumerProfile;delete implicit.remoteRef;
  assert.equal(run(implicit).reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
  const wrong=fixture('mauedgar/tecnotron-ai','TASKCYCLE-TC-TEST');
  assert.equal(run(wrong).reason,'PRODUCT_REMOTE_BINDING_UNQUALIFIED');
});
test('tampered merge-parent declaration, force, scope or remote correspondence cannot proceed',()=>{
  const edits=[
    a=>{a.request.Phase_2.force=true},
    a=>{a.request.Phase_2.remote_correspondence='UNVERIFIED'},
    a=>{a.request.Phase_2.merge.parents=[c.accepted,c.baseline,c.task]},
    a=>{a.scope.baseline_path_scope=[]},
    a=>{a.expectedRemoteCommit=c.accepted},
  ];
  for(const edit of edits){const a=fixture();edit(a);const x=run(a);
    assert.equal(x.status,'BLOCKED');
    assert.notEqual(x.reason,'VERIFIABLE_GIT_SOURCE_UNAVAILABLE');
  }
});
