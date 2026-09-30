import type { RecipePort } from '../../src-typescript/operational-spine-v0/recipe-registry';
import {
  ValidateFitFlowHttpContractCandidateInput,
  createValidateFitFlowHttpContractCandidateRecipe,
  type RuntimeCorrespondenceValue,
  type ValidateFitFlowHttpContractCandidateInputValue,
} from '../../src/operational-spine-v0/recipes/validate-fitflow-http-contract-candidate';

const recipe: RecipePort = createValidateFitFlowHttpContractCandidateRecipe();
void recipe;

const runtimeEvidence = {
  kind: 'EVIDENCE' as const,
  id: 'recipe-receipt:runtime:prepare',
  sha256: 'a'.repeat(64),
};

const runtime: RuntimeCorrespondenceValue = {
  status: 'COMPETENT',
  source_recipe: {
    id: 'prepare_fitflow_test_runtime',
    version: 'v0',
    receipt_ref: runtimeEvidence.id,
    evidence_ref: runtimeEvidence,
  },
  repository_identity: 'fitflow',
  candidate_ref: 'refs/heads/candidate',
  candidate_commit: 'a'.repeat(40),
  candidate_tree: 'b'.repeat(40),
  compose_project: 'fitflow-test',
  backend_service: 'backend_test',
  database: 'fitflow_test',
  database_user: 'fitflow_test_user',
  development_database: 'fitflow_db',
  development_database_excluded: true,
  backend_root: '/fitflow/backend',
  tooling: {
    targeted_pytest: {
      executable: 'python',
      args_prefix: ['-m', 'pytest'],
      probe_args: ['--version'],
    },
  },
};

const input: ValidateFitFlowHttpContractCandidateInputValue = {
  responsibility: {
    taskcycle_id: 'TC-001',
    responsibility_id: 'FITFLOW_HTTP_CONTRACT',
    validation_attempt_id: 'VALIDATION-001',
  },
  candidate: {
    repository_identity: 'fitflow',
    expected_ref: 'refs/heads/candidate',
    parent: 'c'.repeat(40),
    commit: 'a'.repeat(40),
    tree: 'b'.repeat(40),
    allowed_changed_paths: ['backend/tests/api/test_auth.py'],
  },
  runtime_correspondence: runtime,
  validation_profile: {
    targeted_pytest_selectors: ['backend/tests/api/test_auth.py::test_contract'],
    full_backend_regression: { requested: false },
    ruff: { requested: false },
    pyright: { requested: false },
    extra_probes: [],
  },
};

ValidateFitFlowHttpContractCandidateInput.parse(input);

// @ts-expect-error Runtime preparation identity is fixed to the separate prepare_fitflow_test_runtime Recipe.
const wrongRuntimeRecipe: RuntimeCorrespondenceValue = { ...runtime, source_recipe: { ...runtime.source_recipe, id: 'validate_fitflow_http_contract_candidate' } };

// @ts-expect-error Runtime receipt identity is mandatory.
const missingReceipt: RuntimeCorrespondenceValue = { ...runtime, source_recipe: { id: 'prepare_fitflow_test_runtime', version: 'v0', evidence_ref: runtimeEvidence } };

// @ts-expect-error Development database exclusion is a literal safety invariant.
const unsafeRuntime: RuntimeCorrespondenceValue = { ...runtime, development_database_excluded: false };

const missingSelectors: ValidateFitFlowHttpContractCandidateInputValue = {
  ...input,
  // @ts-expect-error Caller-owned targeted selectors are mandatory in the typed contract.
  validation_profile: {
    full_backend_regression: { requested: false },
    ruff: { requested: false },
    pyright: { requested: false },
    extra_probes: [],
  },
};

const missingChangedPaths: ValidateFitFlowHttpContractCandidateInputValue = {
  ...input,
  // @ts-expect-error Caller-owned changed-path allowlist is mandatory.
  candidate: {
    repository_identity: 'fitflow',
    expected_ref: 'refs/heads/candidate',
    parent: 'c'.repeat(40),
    commit: 'a'.repeat(40),
    tree: 'b'.repeat(40),
  },
};

const missingRegressionArgs: ValidateFitFlowHttpContractCandidateInputValue = {
  ...input,
  validation_profile: {
    ...input.validation_profile,
    // @ts-expect-error Requested full regression requires exact explicit args.
    full_backend_regression: { requested: true },
  },
};

const executableProbeInjection: ValidateFitFlowHttpContractCandidateInputValue = {
  ...input,
  validation_profile: {
    ...input.validation_profile,
    // @ts-expect-error Extra probes are identity-only caller requests; executable injection is not part of the contract.
    extra_probes: [{ id: 'db-current', command: { executable: 'pwsh', probe_args: ['whoami'] } }],
  },
};

void wrongRuntimeRecipe;
void missingReceipt;
void unsafeRuntime;
void missingSelectors;
void missingChangedPaths;
void missingRegressionArgs;
void executableProbeInjection;
