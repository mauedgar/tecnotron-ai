#!/usr/bin/env node
'use strict';

const path = require('path');

const { runOperationalWorkflow } = require('../../../src/operational-runner');

function parseArgs(argv) {
  const values = { requestedPaths: [], correlation: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--simulate') values.simulate = true;
    else if (arg === '--path') values.requestedPaths.push(argv[++index]);
    else if (arg === '--project-root') values.projectRoot = argv[++index];
    else if (arg === '--ai-core-root') values.aiCoreRoot = argv[++index];
    else if (arg === '--task') values.taskPath = argv[++index];
    else if (arg === '--task-id') values.taskId = argv[++index];
    else if (arg === '--run-id') values.runId = argv[++index];
    else if (arg === '--run-root') values.runRoot = argv[++index];
    else if (arg === '--budget') values.budgetTokens = Number(argv[++index]);
    else if (arg === '--orca-run') values.correlation.orca_run = argv[++index];
    else if (arg === '--orca-task') values.correlation.orca_task = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return values;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.simulate) throw new Error('--simulate is required; no real runtime adapter is conformant');
  if (!options.projectRoot) throw new Error('--project-root is required');
  if (!options.taskPath && !options.taskId) throw new Error('--task or --task-id is required');
  options.aiCoreRoot = options.aiCoreRoot || path.resolve(__dirname, '..', '..', '..');
  const output = await runOperationalWorkflow(options);
  process.stdout.write(`${JSON.stringify(output.summary, null, 2)}\n`);
  if (!output.summary.reached_runtime) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error.code || error.name || 'ERROR'}: ${error.message}\n`);
  process.exitCode = 1;
});
