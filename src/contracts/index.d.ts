export * from './execution-coordination';

type UntypedLegacyContract = Record<string, any>;

export const common: UntypedLegacyContract;
export const task: UntypedLegacyContract;
export const runEvent: UntypedLegacyContract;
export const runState: UntypedLegacyContract;
export const validation: UntypedLegacyContract;
export const contextPackager: UntypedLegacyContract;
export const route: UntypedLegacyContract;
export const modelResolution: UntypedLegacyContract;
export const runtimeIdentity: UntypedLegacyContract;
export const sddArtifacts: UntypedLegacyContract;

export const CONTRACT_VERSION: any;
export const ARTIFACT_KINDS: any;
export const ALLOWED_RELATIONS: any;
export const Reference: any;
export const RequirementReference: any;
export const ArtifactSchemas: any;
export function parseSddArtifact(...args: any[]): any;
export function validateSddArtifactSet(...args: any[]): any;

declare const contracts: typeof import('./execution-coordination') & {
  readonly common: typeof common;
  readonly task: typeof task;
  readonly runEvent: typeof runEvent;
  readonly runState: typeof runState;
  readonly validation: typeof validation;
  readonly contextPackager: typeof contextPackager;
  readonly route: typeof route;
  readonly modelResolution: typeof modelResolution;
  readonly runtimeIdentity: typeof runtimeIdentity;
  readonly sddArtifacts: typeof sddArtifacts;
};

export default contracts;
