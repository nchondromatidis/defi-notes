import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildClient } from '../../src/lens/client.ts';
import { TestResourceLoader } from './TestResourceLoader.ts';
import type { ArtifactMap, FunctionEntryIndexes, ProtocolName } from './artifacts';
import { DebugMetadata } from '../../src/lens/indexes/DebugMetadata.ts';
import { DeploymentTracer } from '../../src/lens/callTracer/DeploymentTracer.ts';
import { LensCallTracer } from '../../src/lens/callTracer/LensCallTracer.ts';
import { LensClient } from '../../src/lens/LensClient.ts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from './utils/constants.ts';
import { ArtifactsProvider } from '../../src/lens/indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from '../../src/lens/indexes/FunctionIndexesRegistry.ts';
import { ExternalCallHandler } from '../../src/lens/handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from '../../src/lens/handlers/ExternalCallResultHandler.ts';
import { InternalCallHandler } from '../../src/lens/handlers/InternalCallHandler.ts';

export async function lensTracerTestSetup<ProjectNameT extends ProtocolName, RootT extends string>(
  projectName: ProjectNameT,
  root: RootT
) {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const client = await buildClient(deployerAccount);

  const resourceLoader = new TestResourceLoader<ArtifactMap, ProtocolName, ProjectNameT, RootT, FunctionEntryIndexes>(
    root
  );

  const artifactsProvider = new ArtifactsProvider();
  const functionIndexesRegistry = new FunctionIndexesRegistry();
  const debugMetadata = new DebugMetadata(artifactsProvider, functionIndexesRegistry);

  const deploymentTracer = new DeploymentTracer();
  const externalCallHandler = new ExternalCallHandler(debugMetadata, deploymentTracer);
  const externalCallResultHandler = new ExternalCallResultHandler(debugMetadata, deploymentTracer);
  const internalCallHandler = new InternalCallHandler(debugMetadata, deploymentTracer);
  const tracer = new LensCallTracer(externalCallHandler, externalCallResultHandler, internalCallHandler);

  const lensClient = new LensClient<ArtifactMap, ProtocolName, ProjectNameT, RootT>(
    client,
    debugMetadata,
    deploymentTracer,
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
