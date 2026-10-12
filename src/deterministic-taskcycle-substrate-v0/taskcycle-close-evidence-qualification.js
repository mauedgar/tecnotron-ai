'use strict';

// Technical verifier for a Git merge used in a kernel-free TaskCycle close.
// This does not verify Developer authority or Independent Review competence.
// Bind repositoryPath to a Control-qualified Git surface, never to a field in a
// TaskCycle request. The returned observation is not a Product grant.
const path = require('node:path');
const { createGitCliAdapter } = require('../operational-spine-v0/git-execution-qualification');

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
function same(a,b) {return JSON.stringify(a)===JSON.stringify(b);}
function sorted(xs) {return [...new Set(xs)].sort();}
function execute(git, root, args, { binary = false }={}) {
  const r=git.run(root,['--no-replace-objects',...args], {timeoutMs:30000});
  if(r.exit_code!==0 || r.error_code || r.timed_out || r.signal
      || typeof r.stdout!=='string' || r.stdout.length>4194304)
    throw Error('GIT_READ_FAILED:'+args[0]);
  // Never trim a NUL-delimited path list. Whitespace is part of a path.
  return binary?r.stdout:r.stdout.trim();
}
function parsePaths(raw) {
  if(raw==='')return [];
  if(!raw.endsWith('\0') || raw.includes('\uFFFD'))throw Error('GIT_NUL_PATH_INVALID');
  const names=raw.slice(0,-1).split('\0');
  if(names.some(x=>!x || x.includes('\\') || x.startsWith('/') || x.startsWith('../') || x.includes('/../') || x.includes('\n')))
    throw Error('GIT_PATH_INVALID');
  return sorted(names);
}
function paths(git,root,one,two) {
  return parsePaths(execute(git,root,['diff','--name-only','--no-renames','-z',one,two,'--'],{binary:true}));
}
function commit(git,root,oid) {
  if(!sha(oid))throw Error('BAD_GIT_ID');
  const raw=execute(git,root,['cat-file','-p',oid]);
  if(execute(git,root,['rev-parse',oid+'^{commit}'])!==oid)throw Error('GIT_ID_NOT_COMMIT');
  const headers=raw.split(/\r?\n\r?\n/,1)[0].split(/\r?\n/);
  const tree=headers.filter(x=>x.startsWith('tree ')).map(x=>x.slice(5));
  const parents=headers.filter(x=>x.startsWith('parent ')).map(x=>x.slice(7));
  if(tree.length!==1 || !sha(tree[0]) || !parents.every(sha))throw Error('GIT_COMMIT_MALFORMED');
  return {tree:tree[0],parents};
}
function parseRemote(raw, ref) {
  const lines=raw.split(/\r?\n/).filter(Boolean);
  if(lines.length!==1)throw Error('REMOTE_REF_UNVERIFIED');
  const parts=lines[0].split('\t');
  if(parts.length!==2 || !sha(parts[0]) || parts[1]!==ref)throw Error('REMOTE_REF_MALFORMED');
  return parts[0];
}
function qualifyMergeTopology({repositoryPath, request, phase1, scope, remoteUrl,
  originalTaskCycleId, expectedRemoteCommit, historicalContinuity=null}, {git=createGitCliAdapter()}={}) {
  const p2=request?.Phase_2, m=p2?.merge, c=request?.candidate;
  if(!p2 || p2.integration_mode!=='MERGE_COMMIT' || !m || !c
      || !Array.isArray(m.parents) || m.parents.length!==2
      || ![p2.pre_tools,p2.post_tools,p2.post_tree,c.commit,c.tree,
          m.commit,m.tree,m.validated_combined_tree].every(sha)
      || !Array.isArray(m.candidate_lineage) || m.candidate_lineage.length<2
      || !m.candidate_lineage.every(sha) || !Array.isArray(scope?.write_scope)
      || !scope.write_scope.every(x=>typeof x==='string')
      || !scope.task_path || typeof scope.task_path!=='string'
      || request?.taskcycle?.id!==originalTaskCycleId
      || p2.force!==false || p2.remote_correspondence!=='EXACT') {
    return {status:'BLOCKED',reason:'MERGE_CLOSURE_INPUT_INVALID'};
  }
  const expectedOrigin='https://github.com/'+c.repository+'.git';
  if(c.repository!=='mauedgar/tecnotron-ai' || remoteUrl!==expectedOrigin
      || !sha(expectedRemoteCommit) || expectedRemoteCommit!==m.commit) {
    return {status:'BLOCKED',reason:'PRODUCT_REMOTE_BINDING_UNQUALIFIED'};
  }
  if(!Array.isArray(scope.baseline_path_scope) || !Array.isArray(scope.authorized_added_paths)
      || !scope.authorized_added_paths.every(x=>typeof x==='string')
      || !same(sorted(scope.baseline_path_scope),sorted([...scope.write_scope,...scope.authorized_added_paths,scope.task_path]))) {
    return {status:'BLOCKED',reason:'BASELINE_SCOPE_UNQUALIFIED'};
  }
  try {
    const root=path.resolve(repositoryPath);
    if(execute(git,root,['rev-parse','--show-toplevel'])!==root)
      return {status:'BLOCKED',reason:'GIT_CHECKOUT_ROOT_MISMATCH'};
    const localOrigin=execute(git,root,['config','--local','--get','remote.origin.url']);
    if(localOrigin!==expectedOrigin)return {status:'BLOCKED',reason:'REMOTE_ORIGIN_MISMATCH'};
    // Any active rewrite could turn a nominal GitHub URL into another server.
    const rewrites=git.run(root,['--no-replace-objects','config','--get-regexp','^url\\..*\\.(insteadOf|pushInsteadOf)$'],{timeoutMs:30000});
    if(rewrites.exit_code!==1 || rewrites.stdout || rewrites.error_code)
      return {status:'BLOCKED',reason:'GIT_URL_REWRITE_UNSAFE'};
    if(!same(m.parents,[p2.pre_tools,c.commit]))
      return {status:'BLOCKED',reason:'MERGE_PARENT_DECLARATION_MISMATCH'};
    const merge=commit(git,root,m.commit);
    const candidate=commit(git,root,c.commit);
    if(m.commit!==p2.post_tools || !same(merge.parents,m.parents)
      || merge.tree!==m.tree || merge.tree!==p2.post_tree || candidate.tree!==c.tree
      || candidate.parents.length!==1 || candidate.parents[0]!==c.parent)
      return {status:'BLOCKED',reason:'MERGE_OR_CANDIDATE_OBJECT_MISMATCH'};
    const baseline=commit(git,root,phase1.commit);
    if(baseline.tree!==phase1.tree || !same(baseline.parents,[phase1.task_carrier]))
      return {status:'BLOCKED',reason:'ORIGINAL_PHASE1_GIT_IDENTITY_MISMATCH'};
    const lineage=m.candidate_lineage;
    if(lineage[0]!==phase1.commit || lineage.at(-1)!==c.commit)
      return {status:'BLOCKED',reason:'REPAIR_LINEAGE_ENDPOINT_MISMATCH'};
    for(let i=1;i<lineage.length;i++){
      const observed=commit(git,root,lineage[i]);
      if(!same(observed.parents,[lineage[i-1]]))
        return {status:'BLOCKED',reason:'REPAIR_LINEAGE_EDGE_INVALID'};
      const diff=paths(git,root,lineage[i-1],lineage[i]);
      if(diff.some(x=>![...scope.write_scope,...scope.authorized_added_paths].includes(x)))
        return {status:'BLOCKED',reason:'REPAIR_LINEAGE_SCOPE_VIOLATION'};
    }
    const integrated=paths(git,root,p2.pre_tools,m.commit);
    const authorized=sorted([...scope.write_scope,...scope.authorized_added_paths,scope.task_path]);
    if(!same(integrated,sorted(m.changed_paths)) || integrated.some(x=>!authorized.includes(x)))
      return {status:'BLOCKED',reason:'REAL_MERGE_DIFF_SCOPE_MISMATCH'};
    // Git merge-tree --write-tree writes objects; closure verifies immutable commit
    // objects, while Control authenticates the original native combined-tree receipt.
    if(m.validated_combined_tree!==m.tree)
      return {status:'BLOCKED',reason:'PRETESTED_MERGE_TREE_NOT_BOUND'};
    const remote=parseRemote(execute(git,root,['ls-remote','--heads',remoteUrl,'refs/heads/tools']),'refs/heads/tools');
    let remote_relation='EXACT_CURRENT';
    if(remote!==m.commit){
      if(!historicalContinuity || historicalContinuity.status!=='CONTROL_VERIFIED_HISTORICAL_INTEGRATION'
          || historicalContinuity.original_merge_commit!==m.commit
          || historicalContinuity.original_merge_tree!==m.tree
          || historicalContinuity.original_remote_exact!==true
          || typeof historicalContinuity.original_immutable_receipt_ref!=='string'
          || historicalContinuity.original_immutable_receipt_ref.length===0)
        return {status:'BLOCKED',reason:'REMOTE_EXACT_HEAD_DRIFT'};
      const ancestor=git.run(root,['--no-replace-objects','merge-base','--is-ancestor',m.commit,remote],{timeoutMs:30000});
      if(ancestor.exit_code!==0 || ancestor.error_code || ancestor.timed_out || ancestor.signal)
        return {status:'BLOCKED',reason:'REMOTE_HISTORICAL_ANCESTRY_UNVERIFIED'};
      remote_relation='HISTORICAL_VERIFIED_DESCENDANT_NOT_EXACT';
    }
    return {status:'PASS',effect_state:'NONE',verified:{
      merge_commit:m.commit,merge_tree:m.tree,accepted_candidate:c.commit,
      pre_tools:p2.pre_tools,remote_oid:remote,remote_relation,
      actual_changed_paths:integrated,exact_candidate_lineage:[...lineage],
      combined_tree_claim:m.validated_combined_tree,
      check_method:'GIT_CLI_BOUNDED_READ_ONLY_NO_OBJECT_WRITES',Product_authority:'NONE',
    }};
  }catch(e){return {status:'BLOCKED',reason:'VERIFIABLE_GIT_SOURCE_UNAVAILABLE',detail:String(e?.message||e).slice(0,180)};}
}
module.exports={qualifyMergeTopology,parsePaths};
