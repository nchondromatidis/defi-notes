import type { ArtifactMap } from '../artifacts';

export type FunctionTracesArtifactsMap = {
  [K in keyof ArtifactMap as K extends `${ArtifactMap[K]['sourceName']}:${ArtifactMap[K]['contractName']}`
    ? ArtifactMap[K]['sourceName'] extends `contracts/function-traces/${string}`
      ? K
      : never
    : never]: ArtifactMap[K];
};
