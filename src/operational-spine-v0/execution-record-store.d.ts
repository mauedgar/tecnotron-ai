import { type ExecutionPlan as ExecutionPlanValue, type ExecutionPlanInput, type RecipeReceipt as RecipeReceiptValue, type RecipeReceiptInput, type Reference } from './contracts';
import type { ExecutionAttemptId, OperationId } from '../contracts/execution-coordination';
export interface ExecutionRecordStorePort {
    savePlan(rawPlan: ExecutionPlanInput): Reference;
    saveReceipt(rawReceipt: RecipeReceiptInput): Reference;
    loadPlan?(operationId: OperationId): ExecutionPlanValue;
    loadReceipt?(executionAttemptId: ExecutionAttemptId): RecipeReceiptValue;
}
export declare class FilesystemExecutionRecordStore implements ExecutionRecordStorePort {
    readonly home: string;
    readonly root: string;
    constructor(home: string);
    location(kind: 'plan' | 'receipt', id: string): string;
    relativeLocation(kind: 'plan' | 'receipt', id: string): string;
    save(kind: 'plan' | 'receipt', id: string, value: unknown): Reference;
    savePlan(rawPlan: ExecutionPlanInput): Reference;
    saveReceipt(rawReceipt: RecipeReceiptInput): Reference;
    loadPlan(operationId: OperationId): ExecutionPlanValue;
    loadReceipt(executionAttemptId: ExecutionAttemptId): RecipeReceiptValue;
}
