#!/usr/bin/env node
import fs from 'node:fs';
import { createRecipeInvocationEntrypoint } from './recipe-invocation';

interface CliArgs {
  config?: string;
  requestFile?: string;
  stdin: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = { stdin: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config') {
      const value = argv[index + 1];
      if (!value) throw new Error('--config requires a value');
      result.config = value;
      index += 1;
    } else if (arg === '--request-file') {
      const value = argv[index + 1];
      if (!value) throw new Error('--request-file requires a value');
      result.requestFile = value;
      index += 1;
    } else if (arg === '--stdin') {
      result.stdin = true;
    } else {
      throw new Error(`unsupported argument: ${arg}`);
    }
  }
  if (!result.config) throw new Error('--config is required');
  if ((result.requestFile ? 1 : 0) + (result.stdin ? 1 : 0) !== 1) {
    throw new Error('exactly one of --request-file or --stdin is required');
  }
  return result;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const environment = JSON.parse(fs.readFileSync(args.config!, 'utf8'));
  const requestText = args.stdin ? await readStdin() : fs.readFileSync(args.requestFile!, 'utf8');
  const request = JSON.parse(requestText);
  const entrypoint = createRecipeInvocationEntrypoint(environment);
  const result = await entrypoint.invoke(request);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    code: 'RECIPE_INVOCATION_CLI_ERROR',
    detail: error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 2;
});
