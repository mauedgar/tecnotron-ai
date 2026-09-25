#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  reconcilePostTaskCycle,
  reconcilePostMilestone,
  stableStringify,
} = require('./index');

function usage() {
  return 'usage: node cli.js <post-taskcycle|post-milestone> <request.json>';
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2) throw new Error(usage());
  const [command, requestFile] = argv;
  const absolute = path.resolve(requestFile);
  const request = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  let result;
  if (command === 'post-taskcycle') result = reconcilePostTaskCycle(request);
  else if (command === 'post-milestone') result = reconcilePostMilestone(request);
  else throw new Error(usage());
  process.stdout.write(`${stableStringify(result)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${stableStringify({
      code: error && error.code ? error.code : 'RECONCILIATION_CLI_ERROR',
      message: error && error.message ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  }
}

module.exports = { main };
