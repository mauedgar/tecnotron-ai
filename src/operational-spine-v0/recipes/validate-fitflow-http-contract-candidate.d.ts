import { z } from 'zod';
import type { RecipePort } from '../recipe-registry';
import type { Reference } from '../contracts';

export interface CommandBinding {
  executable: string;
  args_prefix?: string[];
  probe_args: string[];
}

export interface RuntimeCorrespondenceValue {
  status: 'COMPETENT';
  source_recipe: {
    id: 'prepare_fitflow_test_runtime';
    version: 'v0';
    receipt_ref: string;
    evidence_ref: Reference;
  };
  repository_identity: string;
  candidate_ref: string;
  candidate_commit: string;
  candidate_tree: string;
  compose_project: 'fitflow-test';
  backend_service: 'backend_test';
  database: 'fitflow_test';
  database_user: string;
  development_database: 'fitflow_db';
  development_database_excluded: true;
  backend_root: string;
  tooling: {
    targeted_pytest: CommandBinding;
    full_regression?: CommandBinding;
    ruff?: CommandBinding;
    pyright?: CommandBinding;
  };
}

export type FullBackendRegressionValue =
  | { requested: false }
  | { requested: true; args: string[] };

export type ScopedValidationStepValue =
  | { requested: false }
  | { requested: true; scope: string[] };

export interface ValidationProfileValue {
  targeted_pytest_selectors: string[];
  expected_behavior_ref?: Reference;
  full_backend_regression: FullBackendRegressionValue;
  ruff: ScopedValidationStepValue;
  pyright: ScopedValidationStepValue;
  extra_probes: Array<{ id: string }>;
}

export interface ValidateFitFlowHttpContractCandidateInputValue {
  responsibility: {
    taskcycle_id: string;
    responsibility_id: string;
    validation_attempt_id: string;
  };
  candidate: {
    repository_identity: string;
    expected_ref: string;
    parent: string;
    commit: string;
    tree: string;
    allowed_changed_paths: string[];
  };
  runtime_correspondence: RuntimeCorrespondenceValue;
  validation_profile: ValidationProfileValue;
}

export interface ValidationCommandResult {
  exit_code: number | null;
  stdout?: string;
  stderr?: string;
  signal?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface ValidationRunner {
  probe(input: {
    command: CommandBinding;
    cwd: string;
    step_id?: string;
  }): ValidationCommandResult;
  run(input: {
    step_id: string;
    command: CommandBinding;
    args: readonly string[];
    cwd: string;
  }): ValidationCommandResult;
}

export interface ValidationGitAdapter {
  status(repositoryPath: string): ValidationCommandResult;
  revParse(repositoryPath: string, spec: string): ValidationCommandResult;
  changedPaths(repositoryPath: string, parent: string, commit: string): ValidationCommandResult;
  diffCheck(repositoryPath: string, parent: string, commit: string): ValidationCommandResult;
}

export interface ExtraProbeDefinitionValue {
  id: string;
  purpose: 'CORRESPONDENCE';
  effects: Array<{ effect: string; scope: string }>;
  command: CommandBinding;
  args?: string[];
}

export type ExtraProbeRegistry =
  | Readonly<Record<string, ExtraProbeDefinitionValue>>
  | ReadonlyMap<string, ExtraProbeDefinitionValue>;

export declare const RuntimeCorrespondence: z.ZodType<RuntimeCorrespondenceValue>;
export declare const ValidationProfile: z.ZodType<ValidationProfileValue>;
export declare const ExtraProbeDefinition: z.ZodType<ExtraProbeDefinitionValue>;
export declare const ValidateFitFlowHttpContractCandidateInput: z.ZodType<ValidateFitFlowHttpContractCandidateInputValue>;

export declare function createValidationProcessRunner(): ValidationRunner;
export declare function createValidationGitAdapter(options?: { command?: string }): ValidationGitAdapter;
export declare function createValidateFitFlowHttpContractCandidateRecipe(options?: {
  git?: ValidationGitAdapter;
  runner?: ValidationRunner;
  probeRegistry?: ExtraProbeRegistry;
}): RecipePort;
export declare function normalizeProbeRegistry(registry: ExtraProbeRegistry): Map<string, ExtraProbeDefinitionValue>;
export declare function observeCandidate(...args: any[]): any;
