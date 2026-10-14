'use strict';

// Technical verifier for a Git merge used in a kernel-free TaskCycle close.
// This does not verify Developer authority or Independent Review competence.
// Bind repositoryPath to a Control-qualified Git surface, never to a field in a
// TaskCycle request. The returned observation is not a Product grant.
const path = require('node:path');
const { createGitCliAdapter } = require('../operational-spine-v0/git-execution-qualification');

// Constrain the inherited adapter at this read-only consumer boundary. The
// shared operational adapter is intentionally unchanged: other Recipes may
// legitimately need writes. Disallow object lazy fetching and credential
// helpers here, including when a configured local partial clone is inspected.
const READ_ONLY_GIT_PREFIX = [
  '-c', 'credential.helper=',
  '-c', 'core.fsmonitor=false',
  '-c', 'maintenance.auto=false',
  '--no-replace-objects',
];
function createReadOnlyGitAdapter() {
  return createGitCliAdapter({ env: {
    ...process.env,
    GIT_NO_LAZY_FETCH: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PROTOCOL_FROM_USER: '0',
  }});
}

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
function same(a,b) {return JSON.stringify(a)===JSON.stringify(b);}
function sorted(xs) {return [...new Set(xs)].sort();}
function execute(git, root, args, { binary = false }={}) {
  const r=git.run(root,[...READ_ONLY_GIT_PREFIX,...args], {timeoutMs:30000});
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

// This is NOT an expandable scope list or a Product authorization mechanism.
// Developer authorized reconciliation of precisely one historically rejected
// add+remove test fixture in the already-merged PR43 lineage. The immutable
// pair is attested by actual Git objects, including file absence at both ends.
// Every unrelated path/edge and every other TaskCycle remains fail-closed.
const PR43_REJECTED_TRANSIENT_TEST = Object.freeze({
  taskcycle: 'TASKCYCLE-TECNOTRON-CLOSE-TOPOLOGY-NORMALIZATION-001',
  phase1: 'b21bf4d7a199302893ec28949d38fc6a7dd740cb',
  accepted: '5ad3e4cd6b27ad62a5a80ff1c1f2b69eb8c7bf57',
  integrated: '1ecce07708a5760c99d7faf55f2344f2eabbc119',
  pre_tools: '2a42a1bbda6e9fecccb28c42c9c2dd294b3b1c89',
  before_add: '8c26c9d3e418a7f55f3b0910619e8b2364611923',
  add: '0422dfa3b4347278b0243f603653db1923543f0b',
  remove: '584ccc2d386b0784116a84a9b0c5a0e9691dd5c8',
  file: 'tests/deterministic-taskcycle-substrate-v0/taskcycle-close-evidence-qualification.test.js',
});
function exactPathPresent(git, root, oid, filename) {
  const raw=execute(git,root,['ls-tree','--name-only','-r','-z',oid,'--',filename],{binary:true});
  if(raw==='')return false;
  if(raw===filename+'\0')return true;
  throw Error('UNEXPECTED_GIT_TREE_PATH');
}
function isExactPR43RejectedTransientPair({git,root,request,originalTaskCycleId,phase1,lineage,index,diff}) {
  const e=PR43_REJECTED_TRANSIENT_TEST, m=request.Phase_2.merge, c=request.candidate;
  if(originalTaskCycleId!==e.taskcycle || request.taskcycle.id!==e.taskcycle
      || phase1.commit!==e.phase1 || c.commit!==e.accepted
      || m.commit!==e.integrated || request.Phase_2.pre_tools!==e.pre_tools
      || lineage.indexOf(e.before_add)<0
      || !same(sorted(diff.filter(x=>x===e.file)),[e.file]))return false;
  const a=lineage.indexOf(e.before_add);
  if(lineage[a+1]!==e.add || lineage[a+2]!==e.remove
      || !([a+1,a+2].includes(index)))return false;
  // The exact immutable Git edges are separately checked for first-parent
  // consistency by the loop; verify real add, real removal, no final artifact.
  return !exactPathPresent(git,root,e.before_add,e.file)
    && exactPathPresent(git,root,e.add,e.file)
    && !exactPathPresent(git,root,e.remove,e.file)
    && !exactPathPresent(git,root,e.accepted,e.file)
    && !exactPathPresent(git,root,e.pre_tools,e.file);
}

function qualifyMergeTopology({repositoryPath, request, phase1, scope, remoteUrl,
  originalTaskCycleId, expectedRemoteCommit, historicalContinuity=null,
  authorizedScopeAmendments=[]}, {git=createReadOnlyGitAdapter()}={}) {
  // historicalContinuity is retained as a compatibility input only; never an authority.
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
  // An injected scope array cannot by itself enlarge the original TaskCycle.
  // Control must first qualify an explicit immutable additive record; the
  // verifier checks the Product Git blob, not the Developer's authority.
  const added=scope.authorized_added_paths;
  if(!Array.isArray(authorizedScopeAmendments)
      || (added.length>0 && authorizedScopeAmendments.length===0)
      || authorizedScopeAmendments.some(a=>
        !a || a.source_commit!==c.commit || !sha(a.blob)
        || typeof a.path!=='string' || !added.includes(a.path)
        || a.path.startsWith('/') || a.path.includes('..')
        || a.path.includes('\\') || a.path.includes('\u0000')))
    return {status:'BLOCKED',reason:'QUALIFIED_SCOPE_AMENDMENT_REQUIRED'};
  try {
    const root=path.resolve(repositoryPath);
    if(execute(git,root,['rev-parse','--show-toplevel'])!==root)
      return {status:'BLOCKED',reason:'GIT_CHECKOUT_ROOT_MISMATCH'};
    const localOrigin=execute(git,root,['config','--local','--get','remote.origin.url']);
    if(localOrigin!==expectedOrigin)return {status:'BLOCKED',reason:'REMOTE_ORIGIN_MISMATCH'};
    // Any active rewrite could turn a nominal GitHub URL into another server.
    const rewrites=git.run(root,[...READ_ONLY_GIT_PREFIX,'config','--get-regexp','^url\\..*\\.(insteadOf|pushInsteadOf)$'],{timeoutMs:30000});
    if(rewrites.exit_code!==1 || rewrites.stdout || rewrites.error_code)
      return {status:'BLOCKED',reason:'GIT_URL_REWRITE_UNSAFE'};
    for(const amendment of authorizedScopeAmendments){
      const actual=execute(git,root,['rev-parse',c.commit+':'+amendment.path]);
      if(actual!==amendment.blob)
        return {status:'BLOCKED',reason:'ORIGINAL_SCOPE_AMENDMENT_GIT_BLOB_MISMATCH'};
    }
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
      const unexpected=diff.filter(x=>![...scope.write_scope,...scope.authorized_added_paths].includes(x));
      if(unexpected.length && !(unexpected.length===1
          && isExactPR43RejectedTransientPair({
            git,root,request,originalTaskCycleId,phase1,lineage,index:i,diff:unexpected,
          })))
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
    // F006: verify historical continuation using the observed remote's
    // actual immutable commit DAG. Caller-supplied historicalContinuity
    // is NEVER authority or proof. No lazy fetch or object writes.
    let remote_relation='EXACT_CURRENT';
    if(remote!==m.commit){
      const ancestry=git.run(root,[...READ_ONLY_GIT_PREFIX,
        'merge-base','--is-ancestor',m.commit,remote],{timeoutMs:30000});
      if(ancestry.exit_code!==0 || ancestry.error_code || ancestry.timed_out
          || ancestry.signal || ancestry.stdout || ancestry.stderr) {
        return {status:'BLOCKED',reason:ancestry.exit_code===1
          && !ancestry.error_code && !ancestry.timed_out && !ancestry.signal
          && !ancestry.stdout && !ancestry.stderr
          ?'REMOTE_HEAD_OUTSIDE_MERGE_LINEAGE':'REMOTE_DESCENDANT_PROOF_UNAVAILABLE'};
      }
      // Fail closed if the head is not an already available local Git commit.
      // An execution surface must acquire its immutable objects separately;
      // this verifier must not download or mutate objects during close.
      commit(git,root,remote);
      remote_relation='VERIFIED_REMOTE_DESCENDANT';
    }
    return {status:'PASS',effect_state:'NONE',verified:{
      merge_commit:m.commit,merge_tree:m.tree,accepted_candidate:c.commit,
      pre_tools:p2.pre_tools,remote_oid:remote,remote_relation,
      actual_changed_paths:integrated,exact_candidate_lineage:[...lineage],
      combined_tree_claim:m.validated_combined_tree,
      check_method:'GIT_CLI_READ_ONLY_GUARDED_NO_LAZY_FETCH_NO_CREDENTIAL_HELPERS',Product_authority:'NONE',
    }};
  }catch(e){return {status:'BLOCKED',reason:'VERIFIABLE_GIT_SOURCE_UNAVAILABLE',detail:String(e?.message||e).slice(0,180)};}
}
module.exports={qualifyMergeTopology,parsePaths};
