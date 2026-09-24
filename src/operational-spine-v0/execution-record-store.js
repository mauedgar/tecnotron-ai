'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  ExecutionPlan,
  RecipeReceipt,
} = require('./contracts');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function bytes(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function safeName(value) {
  return encodeURIComponent(value).replaceAll('%', '_');
}

class FilesystemExecutionRecordStore {
  constructor(home) {
    if (typeof home !== 'string' || !path.isAbsolute(home)) {
      throw new TypeError('execution record store home must be an absolute path');
    }
    this.home = path.resolve(home);
    this.root = path.join(this.home, 'artifacts', 'operational-spine-v0');
  }

  location(kind, id) {
    const directory = kind === 'plan' ? 'plans' : 'receipts';
    return path.join(this.root, directory, `${safeName(id)}.json`);
  }

  relativeLocation(kind, id) {
    const directory = kind === 'plan' ? 'plans' : 'receipts';
    return path.posix.join('artifacts', 'operational-spine-v0', directory, `${safeName(id)}.json`);
  }

  save(kind, id, value) {
    const file = this.location(kind, id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const data = bytes(value);

    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8');
      if (existing !== data) {
        throw new Error(`execution record identity collision: ${kind}/${id}`);
      }
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

  savePlan(rawPlan) {
    const plan = ExecutionPlan.parse(rawPlan);
    return this.save('plan', plan.operation_id, plan);
  }

  saveReceipt(rawReceipt) {
    const receipt = RecipeReceipt.parse(rawReceipt);
    return this.save('receipt', receipt.execution_attempt_id, receipt);
  }

  loadPlan(operationId) {
    return ExecutionPlan.parse(JSON.parse(fs.readFileSync(this.location('plan', operationId), 'utf8')));
  }

  loadReceipt(executionAttemptId) {
    return RecipeReceipt.parse(JSON.parse(fs.readFileSync(this.location('receipt', executionAttemptId), 'utf8')));
  }
}

module.exports = {
  FilesystemExecutionRecordStore,
};
