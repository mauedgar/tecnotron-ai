"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesystemExecutionRecordStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const contracts_1 = require("./contracts");
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [
            key,
            stable(value[key]),
        ]));
    }
    return value;
}
function bytes(value) {
    return `${JSON.stringify(stable(value), null, 2)}\n`;
}
function sha256(data) {
    return node_crypto_1.default.createHash('sha256').update(data).digest('hex');
}
function safeName(value) {
    return encodeURIComponent(value).replaceAll('%', '_');
}
class FilesystemExecutionRecordStore {
    home;
    root;
    constructor(home) {
        if (typeof home !== 'string' || !node_path_1.default.isAbsolute(home)) {
            throw new TypeError('execution record store home must be an absolute path');
        }
        this.home = node_path_1.default.resolve(home);
        this.root = node_path_1.default.join(this.home, 'artifacts', 'operational-spine-v0');
    }
    location(kind, id) {
        const directory = kind === 'plan' ? 'plans' : 'receipts';
        return node_path_1.default.join(this.root, directory, `${safeName(id)}.json`);
    }
    relativeLocation(kind, id) {
        const directory = kind === 'plan' ? 'plans' : 'receipts';
        return node_path_1.default.posix.join('artifacts', 'operational-spine-v0', directory, `${safeName(id)}.json`);
    }
    save(kind, id, value) {
        const file = this.location(kind, id);
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        const data = bytes(value);
        if (node_fs_1.default.existsSync(file)) {
            const existing = node_fs_1.default.readFileSync(file, 'utf8');
            if (existing !== data)
                throw new Error(`execution record identity collision: ${kind}/${id}`);
        }
        else {
            const temp = `${file}.${process.pid}.tmp`;
            node_fs_1.default.writeFileSync(temp, data, { flag: 'wx' });
            node_fs_1.default.renameSync(temp, file);
        }
        return {
            kind: 'ARTIFACT',
            id: `${kind}:${id}`,
            location: this.relativeLocation(kind, id),
            sha256: sha256(data),
        };
    }
    savePlan(rawPlan) {
        const plan = contracts_1.ExecutionPlan.parse(rawPlan);
        return this.save('plan', plan.operation_id, plan);
    }
    saveReceipt(rawReceipt) {
        const receipt = contracts_1.RecipeReceipt.parse(rawReceipt);
        return this.save('receipt', receipt.execution_attempt_id, receipt);
    }
    loadPlan(operationId) {
        return contracts_1.ExecutionPlan.parse(JSON.parse(node_fs_1.default.readFileSync(this.location('plan', operationId), 'utf8')));
    }
    loadReceipt(executionAttemptId) {
        return contracts_1.RecipeReceipt.parse(JSON.parse(node_fs_1.default.readFileSync(this.location('receipt', executionAttemptId), 'utf8')));
    }
}
exports.FilesystemExecutionRecordStore = FilesystemExecutionRecordStore;
