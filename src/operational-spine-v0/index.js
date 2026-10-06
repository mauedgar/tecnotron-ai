'use strict';

const core = require('./core');
const stateKernelAdapter = require('./state-kernel-adapter');

function createOperationalSpine(dependencies) {
  return core.createOperationalSpine(
    stateKernelAdapter.bindOperationalSpineCompatibility(dependencies),
  );
}

module.exports = {
  ...core,
  ...require('./resolution'),
  ...require('./recipe-registry'),
  ...require('./recipe-execution-surface'),
  ...require('./execution-record-store'),
  ...require('./invocation-contracts'),
  ...require('./surface-resolution'),
  ...require('./recipe-invocation'),
  ...require('./taskcycle-lifecycle-capability'),
  ...stateKernelAdapter,
  ...require('./recipes/integrate-accepted-candidate'),
  ...require('./recipes/reconcile-and-close-taskcycle'),
  ...require('./recipes/render-current-state'),
  ...require('./recipes/prepare-fitflow-test-runtime'),
  ...require('./recipes/validate-fitflow-http-contract-candidate'),
  ...require('./recipes/materialize-frozen-review-interface'),
  createOperationalSpine,
};
