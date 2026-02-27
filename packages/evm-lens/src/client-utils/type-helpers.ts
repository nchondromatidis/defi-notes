import type { LensArtifact, LensArtifactsMap } from '../lens/types.ts';

export type LensArtifactsMapSlice<MapT extends LensArtifactsMap<any>, RootT extends string, ProjectT extends string> = {
  [K in keyof MapT as MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${RootT}/${ProjectT}/${string}`
      ? K
      : never
    : never]: MapT[K];
};

export type ExtractRoot<MapT extends LensArtifactsMap<any>> = {
  [K in keyof MapT]: MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${infer R}/${string}`
      ? R
      : never
    : never;
}[keyof MapT];

export type ExtractProject<MapT extends LensArtifactsMap<any>, RootT extends string> = {
  [K in keyof MapT]: MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${RootT}/${infer P}/${any}`
      ? P
      : never
    : never;
}[keyof MapT];
