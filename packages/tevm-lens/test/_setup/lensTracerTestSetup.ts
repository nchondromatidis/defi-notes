import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildClient } from '../../src/lens/client.ts';
import { TestResourceLoader } from './TestResourceLoader.ts';
import type { ArtifactMap, ProtocolName } from './artifacts';
import { DebugMetadata } from '../../src/lens/indexes/DebugMetadata.ts';
import { AddressLabeler } from '../../src/lens/indexes/AddressLabeler.ts';
import { TxTracer } from '../../src/lens/tx-tracer/TxTracer.ts';
import { LensClient } from '../../src/lens/LensClient.ts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from './utils/constants.ts';
import { ArtifactsProvider } from '../../src/lens/indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from '../../src/lens/indexes/FunctionIndexesRegistry.ts';
import { ExternalCallHandler } from '../../src/lens/opcode-handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from '../../src/lens/opcode-handlers/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from '../../src/lens/opcode-handlers/FunctionEntryHandler.ts';
import { FunctionExitHandler } from '../../src/lens/opcode-handlers/FunctionExitHandler.ts';
import type { LensArtifact, LensArtifactsMap } from '../../src/lens/types/artifact.ts';

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
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const client = await buildClient(deployerAccount);

  const resourceLoader = new TestResourceLoader(root);

  const artifactsProvider = new ArtifactsProvider();
  const functionIndexesRegistry = new FunctionIndexesRegistry();
  const debugMetadata = new DebugMetadata(artifactsProvider, functionIndexesRegistry);

  const addressLabeler = new AddressLabeler();
  const externalCallHandler = new ExternalCallHandler(debugMetadata, addressLabeler);
  const externalCallResultHandler = new ExternalCallResultHandler(debugMetadata, addressLabeler);
  const functionEntryHandler = new FunctionEntryHandler(debugMetadata, addressLabeler);
  const functionExitHandler = new FunctionExitHandler(debugMetadata, addressLabeler);

  const tracer = new TxTracer(
    externalCallHandler,
    externalCallResultHandler,
    functionEntryHandler,
    functionExitHandler
  );

  const lensClient = new LensClient<LensArtifactsMapSlice<ArtifactMap, RootT, ProjectNameT>>(
    client,
    debugMetadata,
    addressLabeler,
    tracer
  );

  const artifacts = await resourceLoader.getProtocolArtifacts(projectName);
  await debugMetadata.artifacts.registerArtifacts(artifacts);

  const functionIndexes = await resourceLoader.getFunctionIndexes(projectName);
  await debugMetadata.functions.registerFunctionIndexes(functionIndexes);

  await tevmSetAccount(lensClient.client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });

  return { lensClient };
}
