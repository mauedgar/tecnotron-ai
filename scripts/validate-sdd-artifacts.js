#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSddArtifactSet } = require('../src/contracts/sdd-artifacts');

const EXIT_CODE = Object.freeze({
  PASS: 0,
  FAIL: 1,
  NOT_RUN: 2,
  UNAVAILABLE: 2,
});

function result(outcome, findings = [], limitations = []) {
  return { outcome, artifacts: [], findings, limitations };
}

function finding(code, message) {
  return { code, message };
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = EXIT_CODE[payload.outcome] ?? 2;
}

function parseInvocation(argv) {
  if (argv.length === 0) {
    return {
      outcome: 'NOT_RUN',
      payload: result('NOT_RUN', [finding('CLI_INPUT_NOT_PROVIDED', 'Validation requires exactly --input <path>.')]),
    };
  }

  if (argv.length !== 2 || argv[0] !== '--input' || typeof argv[1] !== 'string' || argv[1].trim() === '') {
    return {
      outcome: 'NOT_RUN',
      payload: result('NOT_RUN', [finding('CLI_ARGUMENTS_INVALID', 'Only --input <path> is supported; no repair or fix mode exists.')]),
    };
  }

  return { outcome: null, inputPath: path.resolve(argv[1]) };
}

function loadInput(inputPath) {
  let bytes;
  try {
    bytes = fs.readFileSync(inputPath, 'utf8');
  } catch (error) {
    return {
      outcome: 'UNAVAILABLE',
      payload: result('UNAVAILABLE', [finding('CLI_INPUT_UNAVAILABLE', `Cannot read validation input: ${error.code || error.message}`)]),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(bytes);
  } catch (error) {
    return {
      outcome: 'UNAVAILABLE',
      payload: result('UNAVAILABLE', [finding('CLI_INPUT_UNAVAILABLE', `Validation input is not readable JSON: ${error.message}`)]),
    };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)
      || !Array.isArray(parsed.artifacts)
      || !Array.isArray(parsed.external_references)) {
    return {
      outcome: 'FAIL',
      payload: result('FAIL', [finding(
        'CLI_INPUT_INVALID',
        'Validation input must explicitly provide artifacts[] and external_references[]; no authoritative defaults are applied.',
      )]),
    };
  }

  return { outcome: null, parsed };
}

function main(argv) {
  const invocation = parseInvocation(argv);
  if (invocation.outcome) {
    emit(invocation.payload);
    return;
  }

  const loaded = loadInput(invocation.inputPath);
  if (loaded.outcome) {
    emit(loaded.payload);
    return;
  }

  try {
    const validation = validateSddArtifactSet(loaded.parsed.artifacts, {
      external_references: loaded.parsed.external_references,
    });

    if (!['PASS', 'FAIL'].includes(validation.outcome)) {
      emit(result('UNAVAILABLE', [finding(
        'CLI_VALIDATOR_OUTCOME_INVALID',
        `Validator returned unsupported executable outcome: ${String(validation.outcome)}`,
      )]));
      return;
    }

    emit(validation);
  } catch (error) {
    emit(result('UNAVAILABLE', [finding(
      'CLI_VALIDATOR_UNAVAILABLE',
      `Validator execution was unavailable: ${error.message}`,
    )]));
  }
}

main(process.argv.slice(2));
