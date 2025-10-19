import type { ArtifactMap } from '@defi-notes/protocols/types';

export type TestArtifactsMap = {
  [K in keyof ArtifactMap as K extends `${ArtifactMap[K]['sourceName']}:${ArtifactMap[K]['contractName']}`
    ? K
    : never]: ArtifactMap[K];
};
