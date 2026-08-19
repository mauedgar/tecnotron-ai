'use strict';

const { z } = require('zod');

const ProjectProfile = z
  .object({
    schema_version: z.literal('fitflow-project-profile/v1'),
    project_id: z.string(),
    baseline: z.string(),
    roots: z.object({
      product: z.string(),
      ai_core: z.string(),
    }),
    authority: z.object({
      source_of_truth: z.string(),
      agents: z.string(),
      canonical_docs: z.array(z.string()),
    }),
    product_architecture: z.object({
      backend_dependency_direction: z.array(z.string()),
      target: z.string(),
    }),
    operational: z.object({
      task_store: z.string(),
      project_count: z.string(),
      run_root: z.string(),
      local_state: z.string(),
    }),
    specification: z.object({
      adapter: z.string(),
      status: z.string(),
    }),
    features: z.object({
      semantic_retrieval: z.boolean(),
      mcp: z.boolean(),
      temporal: z.boolean(),
      orchestrator_workers: z.boolean(),
    }),
    environment: z.object({
      reusable_discovery_env: z.string(),
      official_ai_core_env: z.union([z.string(), z.null()]),
    }),
  })
  .strict();

module.exports = { ProjectProfile };
