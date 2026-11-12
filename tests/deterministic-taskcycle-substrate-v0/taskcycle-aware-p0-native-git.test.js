'use strict';

// An entirely disposable, local real-Git graph and bare remote. These tests do
// not access Aware Product, exercise an accepted Product effect, or attest Control.
// Only the tested adapter's ls-remote URL is redirected to a synthetic bare repo.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {qualifyMergeTopology}=require('../../src/deterministic-taskcycle-substrate-v0/taskcycle-close-evidence-qualification');

const URL='https://github.com/mauedgar/aware-commerce.git';
const REF='refs/heads/main';
const TASKCYCLE='TASKCYCLE-AWARE-P0-REPAIR-001';
const GIT_ENV={...process.env,GIT_CONFIG_NOSYSTEM:'1',
  GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1'};
function native(cwd,args,{allowFailure=false}={}){
  const result=spawnSync('git',['-C',cwd,...args],{
    env:GIT_ENV,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1024*1024});
  if(result.error||(!allowFailure && result.status!==0)){
    throw Error('DISPOSABLE_NATIVE_GIT_FAILED:'+args.join(' ')+':'+
      (result.error?.code||result.status)+':'+String(result.stderr||'').slice(0,250));
  }
  return result;
}
const stdout=(cwd,args)=>native(cwd,args).stdout.trim();
function write(repo,name,content){
  const file=path.join(repo,name);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content,{flag:fs.existsSync(file)?'w':'wx'});
}
function fixture(t){
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'ts-tc-aware-p0-git-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const repo=path.join(home,'work'),remote=path.join(home,'remote.git');
  fs.mkdirSync(repo);fs.mkdirSync(remote);
  native(repo,['init','--initial-branch=main']);
  native(remote,['init','--bare','--initial-branch=main']);
  native(repo,['config','user.name','Synthetic Reviewer']);
  native(repo,['config','user.email','synthetic@example.invalid']);
  native(repo,['remote','add','origin',URL]);
  const commit=(message)=>{native(repo,['add','--all']);native(repo,['commit','-m',message]);
    return stdout(repo,['rev-parse','HEAD'])};
  const tree=sha=>stdout(repo,['rev-parse',sha+'^{tree}']);
  write(repo,'README.md','public synthetic graph\n');
  const base=commit('isolated baseline');
  native(repo,['checkout','-b','candidate-p0']);
  write(repo,'docs/tasks/AC-P0-001-PROPOSED.md','synthetic carrier only\n');
  const carrier=commit('task carrier');
  write(repo,'product.txt','phase1\n');
  const phase1=commit('bounded phase1');
  write(repo,'product.txt','accepted\n');
  const candidate=commit('accepted delta');
  native(repo,['checkout','main']);
  native(repo,['merge','--no-ff','--no-edit','candidate-p0']);
  const merge=stdout(repo,['rev-parse','HEAD']);
  native(repo,['push',remote,'HEAD:'+REF]);
  const scope={write_scope:['product.txt'],
    task_path:'docs/tasks/AC-P0-001-PROPOSED.md',
    authorized_added_paths:[],
    baseline_path_scope:['product.txt','docs/tasks/AC-P0-001-PROPOSED.md']};
  const changed=stdout(repo,['diff','--name-only','--no-renames',base,merge,'--']).split('\n').sort();
  const request={taskcycle:{id:TASKCYCLE},
    candidate:{repository:'mauedgar/aware-commerce',branch:'candidate-p0',
      commit:candidate,tree:tree(candidate),parent:phase1,changed_paths:['product.txt']},
    Phase_2:{integration_mode:'MERGE_COMMIT',force:false,
      remote_correspondence:'EXACT',pre_tools:base,post_tools:merge,post_tree:tree(merge),
      merge:{commit:merge,tree:tree(merge),validated_combined_tree:tree(merge),
        parents:[base,candidate],candidate_lineage:[phase1,candidate],changed_paths:changed}}};
  const args={repositoryPath:repo,request,scope,
    phase1:{repository:'mauedgar/aware-commerce',commit:phase1,tree:tree(phase1),task_carrier:carrier},
    remoteUrl:URL,consumerProfile:'AWARE_P0_HISTORICAL_ONLY',remoteRef:REF,
    originalTaskCycleId:TASKCYCLE,expectedRemoteCommit:merge};
  // Real Git objects, diff, commit-tree, merges, origin and local bare remote.
  // Interception is test-only to prevent network access to real Aware Product.
  const git={run:(root,argv)=>{
    const replaced=[...argv];
    const index=replaced.indexOf('ls-remote');
    if(index>=0){
      const urlIndex=replaced.indexOf(URL,index);
      if(urlIndex<0)throw Error('NOT_QUALIFIED_SYNTHETIC_REMOTE_CALL');
      replaced[urlIndex]=remote;
    }
    const x=native(root,replaced,{allowFailure:true});
    return {exit_code:x.status??-1,error_code:x.error?.code||null,
      timed_out:x.error?.code==='ETIMEDOUT',signal:x.signal||null,
      stdout:x.stdout||'',stderr:x.stderr||''};
  }};
  return {home,repo,remote,request,args,git,native,commit,merge,tree,base};
}
test('positive: full real-Git local Aware-shape merge and pinned main-remote topology',t=>{
  const f=fixture(t);
  const result=qualifyMergeTopology(f.args,{git:f.git});
  assert.equal(result.status,'PASS',JSON.stringify(result));
  assert.equal(result.effect_state,'NONE');
  assert.equal(result.verified.merge_commit,f.merge);
  assert.equal(result.verified.remote_oid,f.merge);
  assert.equal(result.verified.remote_relation,'EXACT_CURRENT');
  assert.deepEqual(result.verified.actual_changed_paths,['docs/tasks/AC-P0-001-PROPOSED.md','product.txt']);
});
test('positive: local remote advances to actual descendant without mutating historical merge',t=>{
  const f=fixture(t);
  write(f.repo,'new-unrelated-object.txt','future work, not original merge\n');
  const next=f.commit('future unrelated main descendant');
  native(f.repo,['push',f.remote,'HEAD:'+REF]);
  const result=qualifyMergeTopology(f.args,{git:f.git});
  assert.equal(result.status,'PASS',JSON.stringify(result));
  assert.equal(result.verified.remote_oid,next);
  assert.equal(result.verified.remote_relation,'VERIFIED_REMOTE_DESCENDANT');
  assert.equal(result.verified.merge_commit,f.merge);
});
test('negative: real Git remote origin mismatch and URL rewrite both fail closed',t=>{
  const f=fixture(t);
  native(f.repo,['remote','set-url','origin','https://github.com/untrusted/other.git']);
  assert.equal(qualifyMergeTopology(f.args,{git:f.git}).reason,'REMOTE_ORIGIN_MISMATCH');
  native(f.repo,['remote','set-url','origin',URL]);
  native(f.repo,['config','url.https://example.invalid/.insteadOf','https://github.com/']);
  assert.equal(qualifyMergeTopology(f.args,{git:f.git}).reason,'GIT_URL_REWRITE_UNSAFE');
});
test('negative: wrong real commit trees, parents, scope and branch gate fail closed',t=>{
  const f=fixture(t);
  const mutations=[
    x=>{x.request.candidate.tree=f.tree(f.merge)},
    x=>{x.request.Phase_2.merge.parents=[f.base,f.base]},
    x=>{x.request.Phase_2.merge.validated_combined_tree=f.tree(f.base)},
    x=>{x.scope.write_scope=[];x.scope.baseline_path_scope=[x.scope.task_path]},
    x=>{x.remoteRef='refs/heads/feature'},
    x=>{x.request.taskcycle.id='TASKCYCLE-NOT-AWARE'},
  ];
  for(const mutate of mutations){
    const copy=structuredClone(f.args);mutate(copy);
    const result=qualifyMergeTopology(copy,{git:f.git});
    assert.equal(result.status,'BLOCKED',JSON.stringify(result));
  }
});
