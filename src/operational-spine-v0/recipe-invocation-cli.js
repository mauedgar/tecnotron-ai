#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const recipe_invocation_1 = require("./recipe-invocation");
function parseArgs(argv) {
    const result = { stdin: false };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--config') {
            const value = argv[index + 1];
            if (!value)
                throw new Error('--config requires a value');
            result.config = value;
            index += 1;
        }
        else if (arg === '--request-file') {
            const value = argv[index + 1];
            if (!value)
                throw new Error('--request-file requires a value');
            result.requestFile = value;
            index += 1;
        }
        else if (arg === '--stdin') {
            result.stdin = true;
        }
        else {
            throw new Error(`unsupported argument: ${arg}`);
        }
    }
    if (!result.config)
        throw new Error('--config is required');
    if ((result.requestFile ? 1 : 0) + (result.stdin ? 1 : 0) !== 1) {
        throw new Error('exactly one of --request-file or --stdin is required');
    }
    return result;
}
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin)
        chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    const environment = JSON.parse(node_fs_1.default.readFileSync(args.config, 'utf8'));
    const requestText = args.stdin ? await readStdin() : node_fs_1.default.readFileSync(args.requestFile, 'utf8');
    const request = JSON.parse(requestText);
    const entrypoint = (0, recipe_invocation_1.createRecipeInvocationEntrypoint)(environment);
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
