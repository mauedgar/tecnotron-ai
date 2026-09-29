import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ExecutionPlan,
  RecipeReceipt,
  type ExecutionPlan as ExecutionPlanValue,
  type ExecutionPlanInput,
  type RecipeReceipt as RecipeReceiptValue,
  type RecipeReceiptInput,
  type Reference,
} from './contracts';
import type { ExecutionAttemptId, OperationId } from '../contracts/execution-coordination';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function stable(value: unknown): JsonValue {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      stable((value as Record<string, unknown>)[key]),
    ]));
  }
  return value as JsonValue;
}

function bytes(value: unknown): string {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function safeName(value: string): string {
  return encodeURIComponent(value).replaceAll('%', '_');
}

export interface ExecutionRecordStorePort {
  savePlan(rawPlan: ExecutionPlanInput): Reference;
  saveReceipt(rawReceipt: RecipeReceiptInput): Reference;
  loadPlan?(operationId: OperationId): ExecutionPlanValue;
  loadReceipt?(executionAttemptId: ExecutionAttemptId): RecipeReceiptValue;
}

export class FilesystemExecutionRecordStore implements ExecutionRecordStorePort {
  readonly home: string;
  readonly root: string;

  constructor(home: string) {
    if (typeof home !== 'string' || !path.isAbsolute(home)) {
      throw new TypeError('execution record store home must be an absolute path');
    }
    this.home = path.resolve(home);
    this.root = path.join(this.home, 'artifacts', 'operational-spine-v0');
  }

  location(kind: 'plan' | 'receipt', id: string): string {
    const directory = kind === 'plan' ? 'plans' : 'receipts';
    return path.join(this.root, directory, `${safeName(id)}.json`);
  }

  relativeLocation(kind: 'plan' | 'receipt', id: string): string {
    const directory = kind === 'plan' ? 'plans' : 'receipts';
    return path.posix.join('artifacts', 'operational-spine-v0', directory, `${safeName(id)}.json`);
  }

  save(kind: 'plan' | 'receipt', id: string, value: unknown): Reference {
    const file = this.location(kind, id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const data = bytes(value);
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8');
      if (existing !== data) throw new Error(`execution record identity collision: ${kind}/${id}`);
    } else {
      const temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, data, { flag: 'wx' });
      fs.renameSync(temp, file);
    }
    return {
      kind: 'ARTIFACT',
      id: `${kind}:${id}`,
      location: this.relativeLocation(kind, id),
      sha256: sha256(data),
    };
  }

  savePlan(rawPlan: ExecutionPlanInput): Reference {
    const plan = ExecutionPlan.parse(rawPlan);
    return this.save('plan', plan.operation_id, plan);
  }

  saveReceipt(rawReceipt: RecipeReceiptInput): Reference {
    const receipt = RecipeReceipt.parse(rawReceipt);
    return this.save('receipt', receipt.execution_attempt_id, receipt);
  }

  loadPlan(operationId: OperationId): ExecutionPlanValue {
    return ExecutionPlan.parse(JSON.parse(fs.readFileSync(this.location('plan', operationId), 'utf8')));
  }

  loadReceipt(executionAttemptId: ExecutionAttemptId): RecipeReceiptValue {
    return RecipeReceipt.parse(JSON.parse(fs.readFileSync(this.location('receipt', executionAttemptId), 'utf8')));
  }
}
