import { TestResourceLoader } from './TestResourceLoader.ts';
import type { ProtocolName } from './artifacts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from './utils/constants.ts';
import type { LensArtifact, LensArtifactsMap } from '../../src/lens/types.ts';
import { buildCallTracer } from '../../src';

export type LensArtifactsMapSlice<MapT extends LensArtifactsMap<any>, RootT extends string, ProjectT extends string> = {
  [K in keyof MapT as MapT[K] extends LensArtifact
    ? MapT[K]['sourceName'] extends `${RootT}/${ProjectT}/${string}`
      ? K
      : never
    : never]: MapT[K];
};

export async function lensTracerTestSetup<ProjectNameT extends ProtocolName, RootT extends string>(
  root: RootT,
  projectName: ProjectNameT
) {
  const resourceLoader = new TestResourceLoader(root);
  const { lensClient, debugMetadata, deployerAccount } = await buildCallTracer();

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

  return { lensClient };
}
