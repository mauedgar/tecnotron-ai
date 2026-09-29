'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');
const { z } = require('zod');
const {
  RecipeDefinition,
  RecipeReceipt,
} = require('../contracts');

const FITFLOW = Object.freeze({
  composeFile: 'docker-compose.test.yml',
  composeProject: 'fitflow-test',
  backendService: 'backend_test',
  postgresService: 'postgres_test',
  redisService: 'redis_test',
  testDatabase: 'fitflow_test',
  testDatabaseUser: 'fitflow_test_user',
  developmentDatabase: 'fitflow_db',
  backendPath: 'backend',
  canonicalVenv: '.venv',
  retiredVenv: '.venv_backend',
});

const GitOid = z.string().regex(/^[a-f0-9]{40,64}$/);
const FitFlowRuntimeFailureClass = z.enum([
  'PRECONDITION',
  'REPOSITORY_IDENTITY',
  'RUNTIME_COMPETENCE',
  'DOCKER_COMPOSE',
  'DATABASE_IDENTITY',
  'ALEMBIC',
  'AUTHORITY',
  'COMMAND_CORRESPONDENCE',
  'POSTCONDITION',
  'UNKNOWN',
]);
const CandidateIdentity = z.object({
  commit: GitOid,
  tree: GitOid,
}).strict();

const RuntimeAuthority = z.object({
  may_start_services: z.boolean(),
  may_build_services: z.boolean(),
  may_recreate_services: z.boolean(),
  may_reset_test_database: z.boolean(),
  may_reset_redis: z.boolean(),
  may_upgrade_test_database: z.boolean().default(false),
}).strict();

const RuntimeActions = z.object({
  start_services: z.boolean().default(false),
  build_services: z.boolean().default(false),
  recreate_services: z.boolean().default(false),
  reset_test_database: z.boolean().default(false),
  reset_redis: z.boolean().default(false),
  upgrade_test_database: z.boolean().default(false),
}).strict().default({
  start_services: false,
  build_services: false,
  recreate_services: false,
  reset_test_database: false,
  reset_redis: false,
  upgrade_test_database: false,
});

const PrepareFitFlowTestRuntimeInput = z.object({
  repository_identity: z.string().min(1),
  candidate_identity_optional: CandidateIdentity.optional(),
  required_alembic_head: z.string().min(1),
  validation_surface: z.enum(['LOCAL_PROJECT_VENV', 'COMPOSE_BACKEND_TEST']),
  local_database_url: z.string().min(1).optional(),
  authority: RuntimeAuthority,
  actions: RuntimeActions,
}).strict().superRefine((value, ctx) => {
  if (value.validation_surface === 'LOCAL_PROJECT_VENV' && !value.local_database_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['local_database_url'],
      message: 'LOCAL_PROJECT_VENV requires a process-local database URL',
    });
  }
  if (value.actions.reset_test_database && !value.actions.upgrade_test_database) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['actions', 'upgrade_test_database'],
      message: 'reset_test_database requires upgrade_test_database to restore the required head',
    });
  }
  if (value.validation_surface === 'LOCAL_PROJECT_VENV' && (
    value.actions.start_services ||
    value.actions.build_services ||
    value.actions.recreate_services ||
    value.actions.reset_test_database ||
    value.actions.reset_redis
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['actions'],
      message: 'Docker service and reset actions require COMPOSE_BACKEND_TEST',
    });
  }
});

const ACTION_EFFECTS = Object.freeze([
  ['start_services', 'may_start_services', 'docker.service.start', 'fitflow-test intended services'],
  ['build_services', 'may_build_services', 'docker.service.build', 'fitflow-test backend_test image'],
  ['recreate_services', 'may_recreate_services', 'docker.service.recreate', 'fitflow-test intended services'],
  ['reset_test_database', 'may_reset_test_database', 'database.reset', 'fitflow-test/fitflow_test'],
  ['reset_redis', 'may_reset_redis', 'redis.reset', 'fitflow-test/redis_test'],
  ['upgrade_test_database', 'may_upgrade_test_database', 'database.migrate', 'fitflow-test/fitflow_test'],
]);

function effectsForInput(rawInput) {
  const input = PrepareFitFlowTestRuntimeInput.parse(rawInput);
  return ACTION_EFFECTS
    .filter(([action]) => input.actions[action])
    .map(([, , effect, scope]) => ({ effect, scope }));
}

function createProcessCommandRunner({ spawn = spawnSync, timeout = 120000 } = {}) {
  return {
    run({ executable, args, cwd, env = {} }) {
      const result = spawn(executable, args, {
        cwd,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, ...env, GIT_TERMINAL_PROMPT: '0' },
      });
      return {
        exit_code: result.status,
        signal: result.signal || null,
        error: result.error ? { name: result.error.name, message: result.error.message } : null,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      };
    },
  };
}

function command(state, intent, executable, args, options = {}) {
  const result = state.runner.run({
    executable,
    args,
    cwd: options.cwd || state.repositoryPath,
    env: options.env || {},
  });
  state.commands.push({
    intent,
    effective_command: {
      executable,
      args,
      cwd: options.cwd || state.repositoryPath,
      environment_overrides: Object.keys(options.env || {}).sort(),
    },
    exit_code: result.exit_code,
    signal: result.signal,
    error: result.error,
    stdout_evidence: result.stdout,
    stderr_evidence: result.stderr,
  });
  return result;
}

function succeeded(result) {
  return result.exit_code === 0 && result.error === null;
}

function exactOutput(result) {
  return result.stdout.trim();
}

function samePath(left, right) {
  const normalize = value => {
    const resolved = path.resolve(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}

function environmentObject(raw) {
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map(item => {
      const separator = item.indexOf('=');
      return separator === -1 ? [item, ''] : [item.slice(0, separator), item.slice(separator + 1)];
    }));
  }
  return raw && typeof raw === 'object' ? raw : {};
}

function databaseIdentityFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : null,
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
      user: decodeURIComponent(parsed.username),
    };
  } catch {
    return null;
  }
}

function configuredComposeIdentity(document) {
  const services = document?.services || {};
  const postgres = environmentObject(services[FITFLOW.postgresService]?.environment);
  const backend = environmentObject(services[FITFLOW.backendService]?.environment);
  const backendDatabase = databaseIdentityFromUrl(backend.DATABASE_URL);
  const requiredServices = [FITFLOW.backendService, FITFLOW.postgresService, FITFLOW.redisService];

  if (document?.name !== FITFLOW.composeProject) {
    return { ok: false, reason: 'COMPOSE_PROJECT_IDENTITY_MISMATCH' };
  }
  if (requiredServices.some(service => !services[service])) {
    return { ok: false, reason: 'COMPOSE_TEST_SERVICES_UNRESOLVED' };
  }
  if (
    postgres.POSTGRES_DB !== FITFLOW.testDatabase ||
    postgres.POSTGRES_USER !== FITFLOW.testDatabaseUser ||
    !backendDatabase ||
    backendDatabase.database !== FITFLOW.testDatabase ||
    backendDatabase.user !== FITFLOW.testDatabaseUser ||
    backendDatabase.host !== FITFLOW.postgresService
  ) {
    return { ok: false, reason: 'CONFIGURED_TEST_DATABASE_IDENTITY_MISMATCH' };
  }
  if (
    postgres.POSTGRES_DB === FITFLOW.developmentDatabase ||
    backendDatabase.database === FITFLOW.developmentDatabase
  ) {
    return { ok: false, reason: 'FORBIDDEN_DEVELOPMENT_DATABASE_CONFIGURED' };
  }

  let hostPort = null;
  for (const published of services[FITFLOW.postgresService]?.ports || []) {
    if (typeof published === 'object' && Number(published.target) === 5432 && published.published !== undefined) {
      hostPort = Number(published.published);
    } else if (typeof published === 'string') {
      const match = published.match(/(?:^|:)(\d+):5432(?:\/tcp)?$/);
      if (match) hostPort = Number(match[1]);
    }
  }

  return {
    ok: true,
    compose_project: document.name,
    services: requiredServices,
    configured_database: backendDatabase.database,
    configured_database_user: backendDatabase.user,
    host_postgresql_port: hostPort,
  };
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseComposePs(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parsed = parseJson(trimmed);
  if (Array.isArray(parsed)) return parsed;
  if (parsed) return [parsed];
  try {
    return trimmed.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return null;
  }
}

function observedServices(records) {
  const byService = new Map(records.map(record => [record.Service || record.service, record]));
  return [FITFLOW.backendService, FITFLOW.postgresService, FITFLOW.redisService].map(service => {
    const record = byService.get(service);
    return {
      service,
      state: record?.State || record?.state || null,
      health: record?.Health || record?.health || null,
      runtime_id: record?.ID || record?.Id || record?.id || null,
    };
  });
}

function servicesReady(services) {
  return services.every(service => (
    typeof service.state === 'string' && service.state.toLowerCase().startsWith('running') &&
    (!service.health || service.health.toLowerCase() === 'healthy')
  ));
}

function authorizationCovers(request, effect, scope) {
  return request.authorization?.disposition === 'AUTHORIZED' &&
    (request.authorization.effect_constraints || []).some(constraint => (
      constraint.effect === effect && constraint.scope === scope
    ));
}

function authorityFailure(request, input) {
  for (const [action, authority, effect, scope] of ACTION_EFFECTS) {
    if (!input.actions[action]) continue;
    if (!input.authority[authority]) {
      return { failure_class: 'AUTHORITY', reason: `INPUT_AUTHORITY_REQUIRED:${authority}` };
    }
    if (!authorizationCovers(request, effect, scope)) {
      return { failure_class: 'AUTHORITY', reason: `EFFECT_AUTHORITY_REQUIRED:${effect}:${scope}` };
    }
  }
  return null;
}

function outcome(failureClass, reason, details = {}) {
  return { ok: false, failure_class: FitFlowRuntimeFailureClass.parse(failureClass), reason, ...details };
}

function composeArgs(state, tail) {
  return [
    'compose', '--project-name', FITFLOW.composeProject,
    '--file', state.composePath,
    ...tail,
  ];
}

function inspectRepository(state, input, request) {
  const root = command(state, 'observe repository root', 'git', ['rev-parse', '--show-toplevel']);
  const ref = command(state, 'observe repository ref', 'git', ['symbolic-ref', '-q', 'HEAD']);
  const head = command(state, 'observe repository commit', 'git', ['rev-parse', 'HEAD']);
  const tree = command(state, 'observe repository tree', 'git', ['rev-parse', 'HEAD^{tree}']);
  const status = command(state, 'observe repository worktree state', 'git', [
    'status', '--porcelain=v1', '--untracked-files=all',
  ]);
  if (![root, ref, head, tree, status].every(succeeded)) {
    return outcome('REPOSITORY_IDENTITY', 'REPOSITORY_IDENTITY_COMMAND_FAILED');
  }

  const observed = {
    identity: request.context.repository.identity,
    location: exactOutput(root),
    ref: exactOutput(ref),
    commit: exactOutput(head),
    tree: exactOutput(tree),
    worktree: exactOutput(status),
  };
  if (
    input.repository_identity !== request.context.repository.identity ||
    !samePath(observed.location, state.repositoryPath) ||
    !request.context.git ||
    observed.ref !== request.context.git.expected_ref ||
    observed.commit !== request.context.git.expected_commit
  ) {
    return outcome('REPOSITORY_IDENTITY', 'REPOSITORY_IDENTITY_MISMATCH', { observed });
  }
  if (observed.worktree !== '') {
    return outcome('PRECONDITION', 'CANDIDATE_WORKTREE_NOT_CLEAN', { observed });
  }
  if (input.candidate_identity_optional && (
    observed.commit !== input.candidate_identity_optional.commit ||
    observed.tree !== input.candidate_identity_optional.tree
  )) {
    return outcome('REPOSITORY_IDENTITY', 'CANDIDATE_IDENTITY_MISMATCH', { observed });
  }
  return { ok: true, observed };
}

function readComposeSource(state) {
  if (!fs.existsSync(state.composePath)) {
    return outcome('PRECONDITION', 'TEST_COMPOSE_FILE_UNAVAILABLE');
  }
  let document;
  try {
    document = YAML.parse(fs.readFileSync(state.composePath, 'utf8'));
  } catch (error) {
    return outcome('DOCKER_COMPOSE', `TEST_COMPOSE_FILE_INVALID:${error.message}`);
  }
  const identity = configuredComposeIdentity(document);
  return identity.ok ? { ok: true, identity } : outcome('DATABASE_IDENTITY', identity.reason);
}

function inspectComposeCompetence(state) {
  const docker = command(state, 'observe Docker competence', 'docker', ['--version']);
  if (!succeeded(docker)) return outcome('RUNTIME_COMPETENCE', 'DOCKER_COMMAND_FAILED');
  const compose = command(state, 'observe Compose competence', 'docker', ['compose', 'version']);
  if (!succeeded(compose)) return outcome('RUNTIME_COMPETENCE', 'DOCKER_COMPOSE_COMMAND_FAILED');
  const config = command(state, 'resolve test Compose configuration', 'docker', composeArgs(state, [
    'config', '--format', 'json',
  ]));
  if (!succeeded(config)) return outcome('DOCKER_COMPOSE', 'DOCKER_COMPOSE_CONFIG_COMMAND_FAILED');
  const document = parseJson(config.stdout);
  if (!document) return outcome('COMMAND_CORRESPONDENCE', 'DOCKER_COMPOSE_CONFIG_OUTPUT_UNPROVEN');
  const identity = configuredComposeIdentity(document);
  if (!identity.ok) return outcome('DATABASE_IDENTITY', identity.reason);
  return {
    ok: true,
    identity,
    docker_version: exactOutput(docker),
    compose_version: exactOutput(compose),
  };
}

function inspectServiceState(state) {
  const result = command(state, 'observe fitflow-test services', 'docker', composeArgs(state, [
    'ps', '--all', '--format', 'json',
  ]));
  if (!succeeded(result)) return outcome('DOCKER_COMPOSE', 'DOCKER_COMPOSE_PS_COMMAND_FAILED');
  const parsed = parseComposePs(result.stdout);
  if (!parsed) return outcome('COMMAND_CORRESPONDENCE', 'DOCKER_COMPOSE_PS_OUTPUT_UNPROVEN');
  const services = observedServices(parsed);
  return { ok: true, services, ready: servicesReady(services) };
}

function parseDatabaseProbe(result) {
  const [database, user, extra] = exactOutput(result).split('|');
  if (!database || !user || extra !== undefined) return null;
  return { database, user };
}

function inspectComposeDatabase(state) {
  const result = command(state, 'prove actual PostgreSQL database identity', 'docker', composeArgs(state, [
    'exec', '--no-TTY', FITFLOW.postgresService,
    'psql', '-U', FITFLOW.testDatabaseUser, '-d', FITFLOW.testDatabase,
    '-At', '-F', '|', '-c', 'SELECT current_database(), current_user;',
  ]));
  if (!succeeded(result)) return outcome('DATABASE_IDENTITY', 'DATABASE_PROBE_COMMAND_FAILED');
  const actual = parseDatabaseProbe(result);
  if (!actual) return outcome('COMMAND_CORRESPONDENCE', 'DATABASE_PROBE_OUTPUT_UNPROVEN');
  if (actual.database !== FITFLOW.testDatabase || actual.database === FITFLOW.developmentDatabase) {
    return outcome('DATABASE_IDENTITY', `ACTUAL_DATABASE_IDENTITY_MISMATCH:${actual.database}`, { actual });
  }
  if (actual.user !== FITFLOW.testDatabaseUser) {
    return outcome('DATABASE_IDENTITY', `ACTUAL_DATABASE_USER_MISMATCH:${actual.user}`, { actual });
  }
  return { ok: true, actual };
}

const LOCAL_DATABASE_PROBE = [
  'import json, os',
  'from sqlalchemy import create_engine, text',
  'engine = create_engine(os.environ["DATABASE_URL"])',
  'with engine.connect() as connection:',
  '    row = connection.execute(text("SELECT current_database(), current_user")).one()',
  'print(json.dumps({"database": row[0], "user": row[1]}))',
].join('\n');

const PACKAGE_VERSION_PROBE = [
  'import json, importlib.metadata as metadata',
  'print(json.dumps({"pytest": metadata.version("pytest"), "pytest_asyncio": metadata.version("pytest-asyncio")}))',
].join('\n');

function localPythonPath(state) {
  const executable = process.platform === 'win32'
    ? path.join(state.backendPath, FITFLOW.canonicalVenv, 'Scripts', 'python.exe')
    : path.join(state.backendPath, FITFLOW.canonicalVenv, 'bin', 'python');
  return fs.existsSync(executable) ? executable : null;
}

function localEnvironment(input) {
  return {
    DATABASE_URL: input.local_database_url,
    ENV: 'test',
    TESTING: 'true',
    PYTHONDONTWRITEBYTECODE: '1',
    PYTEST_ADDOPTS: '-p no:cacheprovider',
  };
}

function inspectLocalDatabase(state, input, python) {
  const result = command(state, 'prove actual PostgreSQL database identity', python, [
    '-c', LOCAL_DATABASE_PROBE,
  ], { cwd: state.backendPath, env: localEnvironment(input) });
  if (!succeeded(result)) return outcome('DATABASE_IDENTITY', 'DATABASE_PROBE_COMMAND_FAILED');
  const actual = parseJson(exactOutput(result));
  if (!actual || typeof actual.database !== 'string' || typeof actual.user !== 'string') {
    return outcome('COMMAND_CORRESPONDENCE', 'DATABASE_PROBE_OUTPUT_UNPROVEN');
  }
  if (actual.database !== FITFLOW.testDatabase || actual.database === FITFLOW.developmentDatabase) {
    return outcome('DATABASE_IDENTITY', `ACTUAL_DATABASE_IDENTITY_MISMATCH:${actual.database}`, { actual });
  }
  if (actual.user !== FITFLOW.testDatabaseUser) {
    return outcome('DATABASE_IDENTITY', `ACTUAL_DATABASE_USER_MISMATCH:${actual.user}`, { actual });
  }
  return { ok: true, actual };
}

function parseAlembicRevision(raw) {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) return null;
  const match = lines[0].match(/^([A-Za-z0-9_]+)(?:\s+\(head\))?$/);
  return match ? match[1] : null;
}

function inspectAlembic(state, input, invocation) {
  const heads = invocation('observe Alembic source head', ['heads']);
  if (!succeeded(heads)) return outcome('ALEMBIC', 'ALEMBIC_HEADS_COMMAND_FAILED');
  const sourceHead = parseAlembicRevision(heads.stdout);
  if (!sourceHead) return outcome('COMMAND_CORRESPONDENCE', 'ALEMBIC_HEADS_OUTPUT_UNPROVEN');
  if (sourceHead !== input.required_alembic_head) {
    return outcome('ALEMBIC', `ALEMBIC_REQUIRED_HEAD_MISMATCH:${sourceHead}`);
  }

  const currentBeforeResult = invocation('observe Alembic database current before any upgrade', ['current']);
  if (!succeeded(currentBeforeResult)) return outcome('ALEMBIC', 'ALEMBIC_CURRENT_COMMAND_FAILED');
  const currentBefore = parseAlembicRevision(currentBeforeResult.stdout);

  if (input.actions.upgrade_test_database && currentBefore !== input.required_alembic_head) {
    const upgrade = invocation('upgrade fitflow_test to required Alembic head', [
      'upgrade', input.required_alembic_head,
    ]);
    if (!succeeded(upgrade)) {
      const reconciled = invocation('reconcile Alembic current after failed upgrade command', ['current']);
      if (!succeeded(reconciled)) {
        return outcome('ALEMBIC', 'ALEMBIC_UPGRADE_EFFECT_UNRESOLVED', { effect_ambiguous: true });
      }
      const reconciledCurrent = parseAlembicRevision(reconciled.stdout);
      if (reconciledCurrent === input.required_alembic_head) {
        return outcome('ALEMBIC', 'ALEMBIC_UPGRADE_COMMAND_FAILED_POSTSTATE_REACHED', { effect_occurred: true });
      }
      if (reconciledCurrent && reconciledCurrent !== currentBefore) {
        return outcome('ALEMBIC', `ALEMBIC_UPGRADE_PARTIAL:${reconciledCurrent}`, { effect_occurred: true });
      }
      return outcome('ALEMBIC', 'ALEMBIC_UPGRADE_EFFECT_UNRESOLVED', { effect_ambiguous: true });
    }
  }

  const current = input.actions.upgrade_test_database && currentBefore !== input.required_alembic_head
    ? invocation('observe Alembic database current after upgrade', ['current'])
    : currentBeforeResult;
  if (!succeeded(current)) return outcome('ALEMBIC', 'ALEMBIC_CURRENT_COMMAND_FAILED');
  const databaseCurrent = parseAlembicRevision(current.stdout);
  if (!databaseCurrent) return outcome('COMMAND_CORRESPONDENCE', 'ALEMBIC_CURRENT_OUTPUT_UNPROVEN');
  if (databaseCurrent !== input.required_alembic_head) {
    return outcome('ALEMBIC', `ALEMBIC_DATABASE_NOT_AT_REQUIRED_HEAD:${databaseCurrent}`);
  }
  return {
    ok: true,
    sourceHead,
    databaseCurrent,
    migrationEffect: input.actions.upgrade_test_database && currentBefore !== input.required_alembic_head,
  };
}

function receipt(request, { status, effectState, reason, output }) {
  return RecipeReceipt.parse({
    schema_version: 'tecnotron-recipe-receipt/v0',
    receipt_ref: `recipe-receipt:${request.execution_attempt_id}:prepare-fitflow-test-runtime`,
    recipe_id: request.recipe_id,
    recipe_version: request.recipe_version,
    operation_id: request.operation_id,
    execution_attempt_id: request.execution_attempt_id,
    status,
    effect_state: effectState,
    ...(reason ? { reason } : {}),
    output,
    result_refs: [],
    evidence_refs: request.evidence_refs || [],
  });
}

function runtimeOutput(state, input, details, result) {
  return {
    responsibility: 'prepare_fitflow_test_runtime',
    repository_identity: details.repository || null,
    candidate_identity_if_any: input.candidate_identity_optional || null,
    requested_effects: effectsForInput(input),
    runtime_identity: {
      surface: input.validation_surface,
      python: details.python || null,
      pytest: details.pytest || null,
      pytest_asyncio: details.pytest_asyncio || null,
      docker: details.docker || null,
      compose: details.compose || null,
      compose_project: details.composeIdentity?.compose_project || FITFLOW.composeProject,
      services: details.services || [],
      database: details.database?.database || null,
      database_user: details.database?.user || null,
      host_postgresql_port: details.composeIdentity?.host_postgresql_port ?? details.localDatabase?.port ?? null,
      alembic_head: details.alembic?.sourceHead || null,
      alembic_current: details.alembic?.databaseCurrent || null,
    },
    preconditions: details.preconditions,
    commands: state.commands,
    postconditions: {
      compose_project: details.composeIdentity?.compose_project === FITFLOW.composeProject,
      intended_services_observed: input.validation_surface === 'COMPOSE_BACKEND_TEST'
        ? Array.isArray(details.services) && details.services.length === 3
        : null,
      configured_database_is_fitflow_test: details.composeIdentity?.configured_database === FITFLOW.testDatabase,
      actual_database_is_fitflow_test: details.database?.database === FITFLOW.testDatabase,
      database_user_is_fitflow_test_user: details.database?.user === FITFLOW.testDatabaseUser,
      alembic_current_equals_required_head: details.alembic?.databaseCurrent === input.required_alembic_head,
      candidate_unchanged: details.candidateUnchanged === true,
      development_database_selected_or_modified: details.database?.database === FITFLOW.developmentDatabase,
    },
    failure_class: result.failure_class || null,
  };
}

function createPrepareFitFlowTestRuntimeRecipe({ runner = createProcessCommandRunner() } = {}) {
  const definition = RecipeDefinition.parse({
    id: 'prepare_fitflow_test_runtime',
    version: 'v0',
    provides: ['fitflow.test_runtime.prepare'],
    required_inputs: [
      'repository_identity',
      'required_alembic_head',
      'validation_surface',
      'authority',
      'actions',
    ],
    preconditions: [
      'FitFlow repository and optional candidate identity are exact and clean',
      'docker-compose.test.yml resolves project fitflow-test and intended services',
      'configured and actual database identity both prove fitflow_test, never fitflow_db',
      'every requested effect has explicit caller and execution authority',
      'LOCAL_PROJECT_VENV selects backend/.venv without fallback',
    ],
    effects: [],
    postconditions: [
      'actual current_database() equals fitflow_test',
      'actual current_user equals fitflow_test_user',
      'Alembic current equals the required head',
      'candidate repository identity and bytes remain unchanged',
      'development database is neither selected nor modified',
    ],
  });

  function initialState(request) {
    const repositoryPath = request.context.worktree?.location || request.context.repository.location;
    return {
      runner,
      repositoryPath,
      backendPath: path.join(repositoryPath, FITFLOW.backendPath),
      composePath: path.join(repositoryPath, FITFLOW.composeFile),
      commands: [],
    };
  }

  async function preflight(request) {
    let input;
    try {
      input = PrepareFitFlowTestRuntimeInput.parse(request.input);
    } catch (error) {
      return { status: 'BLOCKED', reason: `INPUT_CONTRACT_INVALID:${error.message}` };
    }
    const denied = authorityFailure(request, input);
    if (denied) return { status: 'BLOCKED', reason: `${denied.failure_class}:${denied.reason}` };

    const state = initialState(request);
    const repository = inspectRepository(state, input, request);
    if (!repository.ok) return { status: 'BLOCKED', reason: `${repository.failure_class}:${repository.reason}` };
    const source = readComposeSource(state);
    if (!source.ok) return { status: 'BLOCKED', reason: `${source.failure_class}:${source.reason}` };

    if (input.validation_surface === 'LOCAL_PROJECT_VENV') {
      const localDatabase = databaseIdentityFromUrl(input.local_database_url);
      if (!localDatabase || localDatabase.database !== FITFLOW.testDatabase || localDatabase.database === FITFLOW.developmentDatabase) {
        return { status: 'BLOCKED', reason: 'DATABASE_IDENTITY:LOCAL_DATABASE_URL_NOT_FITFLOW_TEST' };
      }
      const python = localPythonPath(state);
      if (!python) {
        return { status: 'UNAVAILABLE', reason: 'CANONICAL_PROJECT_VENV_UNAVAILABLE_NO_FALLBACK' };
      }
      const database = inspectLocalDatabase(state, input, python);
      if (!database.ok) return { status: 'BLOCKED', reason: `${database.failure_class}:${database.reason}` };
    }

    if (input.validation_surface === 'COMPOSE_BACKEND_TEST' || effectsForInput(input).some(effect => effect.effect.startsWith('docker.'))) {
      const competence = inspectComposeCompetence(state);
      if (!competence.ok) return { status: 'UNAVAILABLE', reason: `${competence.failure_class}:${competence.reason}` };
      if (input.validation_surface === 'COMPOSE_BACKEND_TEST') {
        const services = inspectServiceState(state);
        if (!services.ok) return { status: 'UNAVAILABLE', reason: `${services.failure_class}:${services.reason}` };
        if (!services.ready) {
          if (!input.actions.start_services && !input.actions.recreate_services) {
            return { status: 'BLOCKED', reason: 'RUNTIME_COMPETENCE:INTENDED_TEST_SERVICES_NOT_READY' };
          }
        } else {
          const database = inspectComposeDatabase(state);
          if (!database.ok) return { status: 'BLOCKED', reason: `${database.failure_class}:${database.reason}` };
        }
      }
    }
    return { status: 'READY' };
  }

  async function execute(request) {
    const input = PrepareFitFlowTestRuntimeInput.parse(request.input);
    const state = initialState(request);
    const details = { preconditions: [] };
    let confirmedEffects = 0;

    const fail = async result => {
      const after = inspectRepository(state, input, request);
      details.candidateUnchanged = after.ok && details.repository &&
        after.observed.commit === details.repository.commit &&
        after.observed.tree === details.repository.tree &&
        after.observed.worktree === details.repository.worktree;
      const ambiguous = result.effect_ambiguous === true;
      return receipt(request, {
        status: ambiguous ? 'UNKNOWN' : 'FAIL',
        effectState: ambiguous ? 'UNKNOWN' : confirmedEffects > 0 || result.effect_occurred ? 'CONFIRMED' : 'NONE',
        reason: `${result.failure_class}:${result.reason}`,
        output: runtimeOutput(state, input, details, result),
      });
    };

    const denied = authorityFailure(request, input);
    if (denied) return fail(denied);

    const repository = inspectRepository(state, input, request);
    if (!repository.ok) return fail(repository);
    details.repository = repository.observed;
    details.preconditions.push({ name: 'repository_identity_exact', status: 'PASS' });

    const source = readComposeSource(state);
    if (!source.ok) return fail(source);
    details.composeIdentity = source.identity;
    details.preconditions.push({ name: 'compose_source_identity', status: 'PASS' });

    let localPython = null;
    let localEnv = null;
    if (input.validation_surface === 'LOCAL_PROJECT_VENV') {
      details.localDatabase = databaseIdentityFromUrl(input.local_database_url);
      if (!details.localDatabase || details.localDatabase.database !== FITFLOW.testDatabase || details.localDatabase.database === FITFLOW.developmentDatabase) {
        return fail(outcome('DATABASE_IDENTITY', 'LOCAL_DATABASE_URL_NOT_FITFLOW_TEST'));
      }
      localPython = localPythonPath(state);
      if (!localPython) return fail(outcome('RUNTIME_COMPETENCE', 'CANONICAL_PROJECT_VENV_UNAVAILABLE_NO_FALLBACK'));
      localEnv = localEnvironment(input);
    }

    const needsDocker = input.validation_surface === 'COMPOSE_BACKEND_TEST' ||
      effectsForInput(input).some(effect => effect.effect.startsWith('docker.') || effect.effect === 'redis.reset');
    if (needsDocker) {
      const competence = inspectComposeCompetence(state);
      if (!competence.ok) return fail(competence);
      details.composeIdentity = competence.identity;
      details.docker = competence.docker_version;
      details.compose = competence.compose_version;
      details.preconditions.push({ name: 'docker_compose_competent', status: 'PASS' });
    }

    if (input.actions.build_services) {
      const build = command(state, 'build backend_test by explicit authority', 'docker', composeArgs(state, [
        'build', FITFLOW.backendService,
      ]));
      if (!succeeded(build)) return fail(outcome('DOCKER_COMPOSE', 'BACKEND_TEST_BUILD_EFFECT_UNRESOLVED', { effect_ambiguous: true }));
      confirmedEffects += 1;
    }
    if (input.actions.start_services || input.actions.recreate_services) {
      const tail = ['up', '--detach'];
      if (input.actions.recreate_services) tail.push('--force-recreate');
      tail.push(FITFLOW.postgresService, FITFLOW.redisService, FITFLOW.backendService);
      const started = command(state, 'start exact fitflow-test services by explicit authority', 'docker', composeArgs(state, tail));
      if (!succeeded(started)) {
        const reconciled = inspectServiceState(state);
        if (!reconciled.ok || !reconciled.ready) {
          return fail(outcome('DOCKER_COMPOSE', 'SERVICE_START_EFFECT_UNRESOLVED', { effect_ambiguous: true }));
        }
      }
      confirmedEffects += 1;
    }

    if (input.validation_surface === 'COMPOSE_BACKEND_TEST') {
      const serviceState = inspectServiceState(state);
      if (!serviceState.ok) return fail(serviceState);
      details.services = serviceState.services;
      if (!serviceState.ready) return fail(outcome('RUNTIME_COMPETENCE', 'INTENDED_TEST_SERVICES_NOT_READY'));
      details.preconditions.push({ name: 'intended_services_ready', status: 'PASS' });

      const redisPing = command(state, 'prove redis_test responsiveness', 'docker', composeArgs(state, [
        'exec', '--no-TTY', FITFLOW.redisService, 'redis-cli', 'PING',
      ]));
      if (!succeeded(redisPing)) return fail(outcome('RUNTIME_COMPETENCE', 'REDIS_TEST_PING_COMMAND_FAILED'));
      if (exactOutput(redisPing) !== 'PONG') return fail(outcome('COMMAND_CORRESPONDENCE', 'REDIS_TEST_PING_OUTPUT_UNPROVEN'));

      const python = command(state, 'observe backend_test Python version', 'docker', composeArgs(state, [
        'exec', '--no-TTY', FITFLOW.backendService, 'python', '--version',
      ]));
      if (!succeeded(python)) return fail(outcome('RUNTIME_COMPETENCE', 'PYTHON_VERSION_COMMAND_FAILED'));
      details.python = `${python.stdout}${python.stderr}`.trim();
      const packages = command(state, 'observe pytest runtime versions', 'docker', composeArgs(state, [
        'exec', '--no-TTY', FITFLOW.backendService, 'python', '-c', PACKAGE_VERSION_PROBE,
      ]));
      if (!succeeded(packages)) return fail(outcome('RUNTIME_COMPETENCE', 'PYTEST_VERSION_COMMAND_FAILED'));
      const versions = parseJson(exactOutput(packages));
      if (!versions?.pytest || !versions?.pytest_asyncio) return fail(outcome('COMMAND_CORRESPONDENCE', 'PYTEST_VERSION_OUTPUT_UNPROVEN'));
      details.pytest = versions.pytest;
      details.pytest_asyncio = versions.pytest_asyncio;

      const database = inspectComposeDatabase(state);
      if (!database.ok) {
        if (database.actual) details.database = database.actual;
        return fail(database);
      }
      details.database = database.actual;
      details.preconditions.push({ name: 'actual_database_identity_proven', status: 'PASS' });
    } else {
      const python = command(state, 'observe canonical project venv Python version', localPython, ['--version'], {
        cwd: state.backendPath, env: localEnv,
      });
      if (!succeeded(python)) return fail(outcome('RUNTIME_COMPETENCE', 'PYTHON_VERSION_COMMAND_FAILED'));
      details.python = `${python.stdout}${python.stderr}`.trim();
      const packages = command(state, 'observe pytest runtime versions', localPython, ['-c', PACKAGE_VERSION_PROBE], {
        cwd: state.backendPath, env: localEnv,
      });
      if (!succeeded(packages)) return fail(outcome('RUNTIME_COMPETENCE', 'PYTEST_VERSION_COMMAND_FAILED'));
      const versions = parseJson(exactOutput(packages));
      if (!versions?.pytest || !versions?.pytest_asyncio) return fail(outcome('COMMAND_CORRESPONDENCE', 'PYTEST_VERSION_OUTPUT_UNPROVEN'));
      details.pytest = versions.pytest;
      details.pytest_asyncio = versions.pytest_asyncio;
      const database = inspectLocalDatabase(state, input, localPython);
      if (!database.ok) {
        if (database.actual) details.database = database.actual;
        return fail(database);
      }
      details.database = database.actual;
      details.services = [];
      details.preconditions.push({ name: 'actual_database_identity_proven', status: 'PASS' });
    }

    if (input.actions.reset_test_database) {
      const reset = command(state, 'reset only proven fitflow_test by explicit authority', 'docker', composeArgs(state, [
        'exec', '--no-TTY', FITFLOW.postgresService,
        'psql', '-U', FITFLOW.testDatabaseUser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
        '-c', `DROP DATABASE IF EXISTS ${FITFLOW.testDatabase} WITH (FORCE);`,
        '-c', `CREATE DATABASE ${FITFLOW.testDatabase} OWNER ${FITFLOW.testDatabaseUser};`,
      ]));
      if (!succeeded(reset)) return fail(outcome('DATABASE_IDENTITY', 'TEST_DATABASE_RESET_EFFECT_UNRESOLVED', { effect_ambiguous: true }));
      confirmedEffects += 1;
      const database = inspectComposeDatabase(state);
      if (!database.ok) return fail({ ...database, effect_occurred: true });
      details.database = database.actual;
    }

    if (input.actions.reset_redis) {
      const reset = command(state, 'reset only redis_test by explicit authority', 'docker', composeArgs(state, [
        'exec', '--no-TTY', FITFLOW.redisService, 'redis-cli', 'FLUSHALL',
      ]));
      if (!succeeded(reset)) return fail(outcome('DOCKER_COMPOSE', 'REDIS_RESET_EFFECT_UNRESOLVED', { effect_ambiguous: true }));
      if (exactOutput(reset) !== 'OK') return fail(outcome('COMMAND_CORRESPONDENCE', 'REDIS_RESET_OUTPUT_UNPROVEN', { effect_occurred: true }));
      confirmedEffects += 1;
    }

    const alembicInvocation = input.validation_surface === 'COMPOSE_BACKEND_TEST'
      ? (intent, args) => command(state, intent, 'docker', composeArgs(state, [
          'exec', '--no-TTY', FITFLOW.backendService, 'alembic', ...args,
        ]))
      : (intent, args) => command(state, intent, localPython, ['-m', 'alembic', ...args], {
          cwd: state.backendPath, env: localEnv,
        });
    const alembic = inspectAlembic(state, input, alembicInvocation);
    if (!alembic.ok) return fail(alembic);
    details.alembic = alembic;
    if (alembic.migrationEffect) confirmedEffects += 1;

    const after = inspectRepository(state, input, request);
    if (!after.ok) return fail(outcome('POSTCONDITION', `CANDIDATE_POST_STATE_UNPROVEN:${after.reason}`));
    details.candidateUnchanged = after.observed.commit === details.repository.commit &&
      after.observed.tree === details.repository.tree &&
      after.observed.worktree === details.repository.worktree;
    if (!details.candidateUnchanged) return fail(outcome('POSTCONDITION', 'CANDIDATE_BYTES_CHANGED'));

    return receipt(request, {
      status: 'PASS',
      effectState: confirmedEffects > 0 ? 'CONFIRMED' : 'NONE',
      output: runtimeOutput(state, input, details, {}),
    });
  }

  return { definition, effectsForInput, preflight, execute };
}

module.exports = {
  FITFLOW,
  FitFlowRuntimeFailureClass,
  PrepareFitFlowTestRuntimeInput,
  createProcessCommandRunner,
  createPrepareFitFlowTestRuntimeRecipe,
  configuredComposeIdentity,
  databaseIdentityFromUrl,
  effectsForInput,
};
