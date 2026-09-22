'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createExecutionCoordinator } = require('../../src/execution-coordinator');
const {
  SUPPORTED_OPENCODE_VERSION,
  createOpenCodeExecutionSurface,
} = require('../../src/adapters/opencode-cli');

function request() {
  return {
    operation_id: 'OP-OPEN-CODE-001',
    execution_attempt_id: 'ATTEMPT-OPEN-CODE-001',
    resolved_execution: {
      decision_ref: 'decision:opencode:001',
      actor_id: 'implementer',
      runtime_id: 'runtime:opencode-tested',
      model_id: 'provider-a/model-a',
      provider_id: 'provider-a',
    },
    authorization: {
      disposition: 'AUTHORIZED',
      authority_reference: 'authority:opencode:001',
      effect_constraints: [
        { effect: 'repository_write', scope: 'candidate-only' },
      ],
    },
    harness_conformance: {
      disposition: 'CONFORMING',
      evidence_ref: 'evidence:opencode:conformance:001',
    },
    evidence_refs: [
      { kind: 'decision', ref: 'decision:opencode:001' },
    ],
    cancellation_requested: false,
    input: {
      cwd: process.cwd(),
      profile_id: 'implementer',
      message: 'Execute the already resolved task.',
      context_files: [],
      environment: { inherit: false, variables: {} },
      permissions: {
        read_scope: ['**'],
        write_scope: ['src/**'],
        web: false,
      },
      timeout_ms: 1000,
    },
  };
}

test('current Execution Coordinator consumes OpenCode as a replaceable surface without contract expansion', async () => {
  const calls = [];
  const processRunner = async (_executable, args) => {
    calls.push([...args]);

    if (args[0] === 'debug' && args[1] === 'config') {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          autoupdate: false,
          share: 'disabled',
          mcp: { project_docs: { type: 'local', enabled: true } },
          plugin: ['project-observer'],
        }),
        stderr: '',
      };
    }

    if (args[0] === 'debug' && args[1] === 'agent') {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          permission: [
            { permission: '*', pattern: '*', action: 'allow' },
            { permission: 'bash', pattern: '*', action: 'allow' },
            { permission: 'task', pattern: '*', action: 'deny' },
            { permission: 'skill', pattern: '*', action: 'allow' },
            { permission: 'read', pattern: '*', action: 'deny' },
            { permission: 'read', pattern: '**', action: 'allow' },
            { permission: 'edit', pattern: '*', action: 'deny' },
            { permission: 'edit', pattern: 'src/**', action: 'allow' },
            { permission: 'webfetch', pattern: '*', action: 'deny' },
            { permission: 'websearch', pattern: '*', action: 'deny' },
            { permission: 'external_directory', pattern: '*', action: 'deny' },
          ],
        }),
        stderr: '',
      };
    }

    return {
      exitCode: 0,
      stdout: JSON.stringify({
        type: 'text',
        timestamp: 1,
        sessionID: 'session-integration-1',
        part: {
          id: 'part-integration-1',
          messageID: 'message-integration-1',
          sessionID: 'session-integration-1',
          type: 'text',
          text: 'done',
        },
      }) + '\n',
      stderr: '',
      timedOut: false,
      aborted: false,
    };
  };

  const surface = createOpenCodeExecutionSurface({
    executablePath: process.execPath,
    runtimeId: 'runtime:opencode-tested',
    syncRunner: () => ({
      status: 0,
      stdout: SUPPORTED_OPENCODE_VERSION,
      stderr: '',
    }),
    processRunner,
    systemEnvironment: { PATH: process.env.PATH || '/bin' },
  });

  const coordinator = createExecutionCoordinator({ executionSurface: surface });
  const original = request();
  const result = await coordinator.execute(original);

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.operation_id, original.operation_id);
  assert.equal(result.execution_attempt_id, original.execution_attempt_id);
  assert.equal(result.result.execution_surface.actor_id, original.resolved_execution.actor_id);
  assert.equal(result.result.execution_surface.model_id, original.resolved_execution.model_id);
  assert.equal(result.result.execution_surface.runtime_id, original.resolved_execution.runtime_id);
  assert.ok(result.evidence_refs.some((entry) => entry.kind === 'execution-surface-conformance'));
  assert.equal(result.result.execution_surface.harness_conformance_ref, 'evidence:opencode:conformance:001');
  assert.equal(
    result.result.execution_surface.authorization_permission_binding.authority_reference,
    'authority:opencode:001',
  );
  assert.equal(result.result.execution_surface.config_proof.permission_conformance.non_broadening, true);
  assert.equal(
    result.result.execution_surface.config_proof.permission_conformance
      .direct_permission_conformance.proof_semantics,
    'ORDERED_LAST_MATCH_SEMANTIC_CONFORMANCE',
  );
  assert.deepEqual(
    result.result.execution_surface.config_proof.permission_conformance.direct_permission_conformance.edit_allow_patterns,
    ['src/**'],
  );
  assert.deepEqual(result.result.execution_surface.config_proof.capability_observation.mcp_entries, ['project_docs']);
  assert.equal(calls.at(-1)[0], 'run');
  assert.equal(calls.at(-1).includes('--pure'), false);
  assert.equal(calls.length, 3);
});
