#!/usr/bin/env node
'use strict';

const path = require('path');
const { collect, summarize, FFROOT } = require('../lib/index');

const USAGE = `
ffai-doctor v1.0.0 — FitFlow AI Core doctor

USAGE:
  ffai doctor
      Discover and report the runtime toolchain and baseline compatibility.

STDOUT: JSON doctor report.
STDERR: diagnostics.
EXIT CODES:
  0  all required components available
  4  at least one required component unavailable
  10 internal error
`;

const REQUIRED = ['node', 'npm', 'python', 'git', 'gh', 'openspec', 'repomix', 'opencode'];

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stderr.write(USAGE);
    process.exit(0);
  }
  if (args.length > 0 && args[0] !== 'doctor') {
    process.stderr.write(USAGE);
    process.exit(2);
  }

  const components = await collect();
  const summary = summarize(components);

  const report = {
    artifact: 'DOCTOR_REPORT',
    schema_version: 'fitflow-doctor/v1',
    generated_at: new Date().toISOString(),
    project_root: FFROOT,
    components,
    summary,
    required_missing: REQUIRED.filter(
      (id) => !components.some((c) => c.id === id && c.available)
    ),
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');

  const allRequired = REQUIRED.every((id) =>
    components.some((c) => c.id === id && c.available)
  );
  process.exit(allRequired ? 0 : 4);
}

main().catch((err) => {
  process.stderr.write('fatal: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(10);
});
