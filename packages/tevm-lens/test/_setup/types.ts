import type { ArtifactMap, ProtocolName } from './artifacts';

export type TestContractsArtifactsMap<Project extends ProtocolName> = {
  [K in keyof ArtifactMap as K extends `${ArtifactMap[K]['sourceName']}:${ArtifactMap[K]['contractName']}`
    ? ArtifactMap[K]['sourceName'] extends `test-contracts/${Project}/${string}`
      ? K
      : never
    : never]: ArtifactMap[K];
};
