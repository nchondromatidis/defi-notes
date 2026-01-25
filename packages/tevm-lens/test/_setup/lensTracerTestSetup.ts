import { TEST_ARTIFACTS_PATH, TestResourceLoader } from './TestResourceLoader.ts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from './utils/constants.ts';
import type { LensArtifact, LensArtifactsMap } from '../../src/lens/types.ts';
import { buildCallTracer } from '../../src/lens';

export type LensArtifactsMapSlice<MapT extends LensArtifactsMap<any>, RootT extends string, ProjectT extends string> = {
  [K in keyof MapT as MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${RootT}/${ProjectT}/${string}`
      ? K
      : never
    : never]: MapT[K];
};

type ExtractRoot<MapT extends LensArtifactsMap<any>> = {
  [K in keyof MapT]: MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${infer R}/${string}`
      ? R
      : never
    : never;
}[keyof MapT];

type ExtractProject<MapT extends LensArtifactsMap<any>, RootT extends string> = {
  [K in keyof MapT]: MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${RootT}/${infer P}/${any}`
      ? P
      : never
    : never;
}[keyof MapT];

export function createLensTracerTestSetup<MapT extends LensArtifactsMap<any>>(
  artifactsPath: string = TEST_ARTIFACTS_PATH
) {
  return async function lensTracerTestSetup<
    RootT extends ExtractRoot<MapT>,
    ProjectNameT extends ExtractProject<MapT, RootT>,
  >(root: RootT, projectName: ProjectNameT) {
    const resourceLoader = new TestResourceLoader(artifactsPath, root);
    const { lensClient, debugMetadata, deployerAccount, client } =
      await buildCallTracer<LensArtifactsMapSlice<MapT, RootT, ProjectNameT>>();

    const artifacts = await resourceLoader.getProtocolArtifacts(projectName);
    await debugMetadata.artifacts.registerArtifacts(artifacts);

    const functionIndexes = await resourceLoader.getFunctionIndexes(projectName);
    await debugMetadata.functions.register(functionIndexes);

    const pcLocationIndexes = await resourceLoader.getPcLocationIndexes(projectName);
    await debugMetadata.pcLocations.register(functionIndexes, pcLocationIndexes);

    await tevmSetAccount(lensClient.client, {
      address: deployerAccount.address,
      balance: ETHER_1,
    });

    return { lensClient, resourceLoader, client };
  };
}
