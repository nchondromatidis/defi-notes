import type { ArtifactMap } from '@defi-notes/protocols/*';

export type UniswapV2ArtifactsMap = {
  [K in keyof ArtifactMap as K extends `${ArtifactMap[K]['sourceName']}:${ArtifactMap[K]['contractName']}`
    ? ArtifactMap[K]['sourceName'] extends `contracts/uniswap-v2/${string}`
      ? K
      : never
    : never]: ArtifactMap[K];
};
