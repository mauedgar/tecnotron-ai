#!/usr/bin/env node
'use strict';
const { FilesystemStateStore, create, transition, satisfy, inspect, obligations, render } = require('./index');
function main(argv) {
  const args = Object.fromEntries(argv.reduce((pairs, value, i) => { if (i % 2 === 0) pairs.push([value, argv[i + 1]]); return pairs; }, []));
  if (!args['--home'] || !args['--command']) throw new Error('--home and --command required');
  const store = new FilesystemStateStore(args['--home']);
  const r = args['--request'] ? JSON.parse(args['--request']) : {};
  const revision = r.expected_revision;
  switch (args['--command']) {
    case 'StateInit': return store.initialize();
    case 'StateVerify': return store.verify();
    case 'StateInspect': return store.read().state;
    case 'StateRender': return render(store);
    case 'TaskCycleCreate': return create(store, revision, 'TaskCycle', r.id, { responsibility: r.responsibility, obligations: r.obligations }, r.authority_refs);
    case 'TaskCycleInspect': return inspect(store, 'TaskCycle', r.id);
    case 'TaskCycleObligations': return obligations(store, r.id);
    case 'TaskCycleTransition': return transition(store, revision, 'TaskCycle', r.id, r.target, r.options);
    case 'TaskCycleSatisfy': return satisfy(store, revision, r.id, r.obligation_id, r.authority_ref, r.authority_reference);
    case 'OperationCreate': return create(store, revision, 'Operation', r.id, { taskcycle_id: r.taskcycle_id, objective: r.objective }, r.authority_refs);
    case 'OperationTransition': return transition(store, revision, 'Operation', r.id, r.target, r.options);
    case 'AttemptStart': return create(store, revision, 'ExecutionAttempt', r.id, { operation_id: r.operation_id }, r.authority_refs);
    case 'AttemptRecord': return transition(store, revision, 'ExecutionAttempt', r.id, r.target, r.options);
    case 'MilestoneCreate': return create(store, revision, 'Milestone', r.id, { title: r.title }, r.authority_refs);
    case 'MilestoneTransition': return transition(store, revision, 'Milestone', r.id, r.target, r.options);
    default: throw new Error(`unsupported command: ${args['--command']}`);
  }
}
try { const result = main(process.argv.slice(2)); process.stdout.write(typeof result === 'string' ? result : `${JSON.stringify(result, null, 2)}\n`); }
catch (error) { process.stderr.write(`${JSON.stringify({ code: error.code || 'INVALID_REQUEST', detail: error.message })}\n`); process.exitCode = 1; }
