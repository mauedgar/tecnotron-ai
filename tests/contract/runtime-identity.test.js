'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  RuntimeIdentity,
  RuntimeIdentityArtifactRef,
  RUNTIME_IDENTITY_SCHEMA_VERSION,
} = require('../../src/contracts/runtime-identity');

test('runtime-identity: schema version is fitflow-runtime-identity/v1', () => {
  assert.strictEqual(RUNTIME_IDENTITY_SCHEMA_VERSION, 'fitflow-runtime-identity/v1');
});

test('runtime-identity: CommonJS contract entry point exports the schema', () => {
  const contracts = require('../../src/contracts/index.js');

  assert.strictEqual(contracts.runtimeIdentity.RuntimeIdentity, RuntimeIdentity);
});

test('runtime-identity: ESM contract entry point exports the schema', async () => {
  const entryPoint = pathToFileURL(path.resolve(__dirname, '../../src/contracts/index.mjs'));
  const contracts = await import(entryPoint.href);

  assert.strictEqual(contracts.runtimeIdentity.RuntimeIdentity, RuntimeIdentity);
});

test('runtime-identity: accepts valid SIMULATION_DECLARED identity', () => {
  const valid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'SIMULATION_DECLARED',
    simulated: true,
    proposal: {
      registry_id: 'test-model',
      provider: 'mock-provider',
      runtime_id: 'mock-runtime',
      pool_id: 'mock-pool',
      resource_class: 'local',
      access_mode: 'local',
    },
    effective: {
      mode: 'simulated',
      provider: 'mock-provider',
      runtime_id: 'mock-runtime',
    },
    details: null,
  };

  const parsed = RuntimeIdentity.safeParse(valid);
  assert.strictEqual(parsed.success, true);
});

test('runtime-identity: accepts valid IDENTITY_CONFIRMED', () => {
  const valid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'IDENTITY_CONFIRMED',
    simulated: false,
    proposal: {
      registry_id: 'test-model',
      provider: 'local-provider',
      runtime_id: 'local-runner',
      pool_id: 'local-pool',
      resource_class: 'local',
      access_mode: 'local',
    },
    effective: {
      mode: 'real',
      provider: 'local-provider',
      runtime_id: 'local-runner',
    },
    details: null,
  };

  const parsed = RuntimeIdentity.safeParse(valid);
  assert.strictEqual(parsed.success, true);
});

test('runtime-identity: accepts valid PROPOSAL_MISMATCH preserving both proposal and effective', () => {
  const valid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'MISMATCH',
    reason_code: 'PROPOSAL_MISMATCH',
    simulated: true,
    proposal: {
      registry_id: 'test-model',
      provider: 'proposed-provider',
      runtime_id: 'proposed-runtime',
      pool_id: 'proposed-pool',
      resource_class: 'local',
      access_mode: 'local',
    },
    effective: {
      mode: 'simulated',
      provider: 'effective-provider',
      runtime_id: 'effective-runtime',
    },
    details: 'Runtime resolved fallback adapter',
  };

  const parsed = RuntimeIdentity.safeParse(valid);
  assert.strictEqual(parsed.success, true);
});

test('runtime-identity: accepts valid UNAVAILABLE with stable reason code', () => {
  const valid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'UNAVAILABLE',
    reason_code: 'RUNTIME_UNAVAILABLE',
    simulated: false,
    proposal: null,
    effective: null,
    details: 'Adapter unavailable: missing dependency or network blocked',
  };

  const parsed = RuntimeIdentity.safeParse(valid);
  assert.strictEqual(parsed.success, true);
});

test('runtime-identity: rejects invalid reason_code', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'INVALID_REASON',
    simulated: true,
    proposal: null,
    effective: null,
    details: null,
  };

  const parsed = RuntimeIdentity.safeParse(invalid);
  assert.strictEqual(parsed.success, false);
});

test('runtime-identity: rejects confirmed status without effective identity', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'IDENTITY_CONFIRMED',
    simulated: false,
    proposal: null,
    effective: null,
    details: null,
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

test('runtime-identity: rejects mismatch status without effective identity', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'MISMATCH',
    reason_code: 'PROPOSAL_MISMATCH',
    simulated: true,
    proposal: {
      registry_id: 'test-model',
      provider: 'proposed-provider',
      runtime_id: 'proposed-runtime',
      pool_id: 'proposed-pool',
      resource_class: 'local',
      access_mode: 'local',
    },
    effective: null,
    details: 'Effective runtime differs from proposal',
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

test('runtime-identity: rejects unavailable status with effective identity', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'UNAVAILABLE',
    reason_code: 'RUNTIME_UNAVAILABLE',
    simulated: false,
    proposal: null,
    effective: {
      mode: 'real',
      provider: 'local-provider',
      runtime_id: 'local-runner',
    },
    details: 'Runtime unavailable',
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

test('runtime-identity: rejects confirmed identity reason with simulated flag', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'IDENTITY_CONFIRMED',
    simulated: true,
    proposal: {
      registry_id: 'test-model',
      provider: 'local-provider',
      runtime_id: 'local-runner',
      pool_id: 'local-pool',
      resource_class: 'local',
      access_mode: 'local',
    },
    effective: {
      mode: 'real',
      provider: 'local-provider',
      runtime_id: 'local-runner',
    },
    details: null,
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

for (const failureReason of ['EXECUTION_FAILED', 'RUNTIME_UNAVAILABLE', 'ADAPTER_UNAVAILABLE']) {
  test(`runtime-identity: rejects confirmed status with ${failureReason} reason`, () => {
    const invalid = {
      schema_version: 'fitflow-runtime-identity/v1',
      status: 'CONFIRMED',
      reason_code: failureReason,
      simulated: false,
      proposal: {
        registry_id: 'test-model',
        provider: 'local-provider',
        runtime_id: 'local-runner',
        pool_id: 'local-pool',
        resource_class: 'local',
        access_mode: 'local',
      },
      effective: {
        mode: 'real',
        provider: 'local-provider',
        runtime_id: 'local-runner',
      },
      details: null,
    };

    assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
  });
}

test('runtime-identity: rejects mismatch status without proposal', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'MISMATCH',
    reason_code: 'PROPOSAL_MISMATCH',
    simulated: true,
    proposal: null,
    effective: {
      mode: 'simulated',
      provider: 'effective-provider',
      runtime_id: 'effective-runtime',
    },
    details: 'Effective runtime differs from proposal',
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

test('runtime-identity: rejects failed status with effective identity', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'FAILED',
    reason_code: 'EXECUTION_FAILED',
    simulated: false,
    proposal: null,
    effective: {
      mode: 'real',
      provider: 'local-provider',
      runtime_id: 'local-runner',
    },
    details: 'Execution failed',
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

test('runtime-identity: rejects simulation reason presented as real execution', () => {
  const invalid = {
    schema_version: 'fitflow-runtime-identity/v1',
    status: 'CONFIRMED',
    reason_code: 'SIMULATION_DECLARED',
    simulated: false,
    proposal: {
      registry_id: 'test-model',
      provider: 'local-provider',
      runtime_id: 'local-runner',
      pool_id: 'local-pool',
      resource_class: 'local',
      access_mode: 'local',
    },
    effective: {
      mode: 'real',
      provider: 'local-provider',
      runtime_id: 'local-runner',
    },
    details: null,
  };

  assert.strictEqual(RuntimeIdentity.safeParse(invalid).success, false);
});

test('runtime-identity: RuntimeIdentityArtifactRef validates artifact ref contract', () => {
  const validRef = {
    path: 'runs/test-run/runtime-identity.json',
    hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    schema_version: 'fitflow-runtime-identity/v1',
  };

  const parsed = RuntimeIdentityArtifactRef.safeParse(validRef);
  assert.strictEqual(parsed.success, true);
});
