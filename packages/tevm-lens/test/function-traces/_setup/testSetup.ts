import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildClient } from '../../../src/lens/client.ts';
import { TestResourceLoader } from '../../_setup/TestResourceLoader.ts';
import type { FunctionTracesArtifactsMap } from './types.ts';
import type { FunctionEntryIndexes, ProtocolName } from '../../_setup/artifacts';
import { DebugMetadata } from '../../../src/lens/indexes/DebugMetadata.ts';
import { DeploymentTracer } from '../../../src/lens/callTracer/DeploymentTracer.ts';
import { LensCallTracer } from '../../../src/lens/callTracer/LensCallTracer.ts';
import { LensClient } from '../../../src/lens/LensClient.ts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from '../../_setup/utils/constants.ts';
import { deployFunctionTracesContracts } from './deploy.ts';
import { ArtifactsProvider } from '../../../src/lens/indexes/ArtifactsProvider.ts';
import { FunctionIndexesRegistry } from '../../../src/lens/indexes/FunctionIndexesRegistry.ts';

export async function testSetup() {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const client = await buildClient(deployerAccount);

  const resourceLoader = new TestResourceLoader<FunctionTracesArtifactsMap, FunctionEntryIndexes, ProtocolName>();

  const artifactsProvider = new ArtifactsProvider();
  const functionIndexesRegistry = new FunctionIndexesRegistry();
  const debugMetadata = new DebugMetadata(artifactsProvider, functionIndexesRegistry);

  const deploymentTracer = new DeploymentTracer();
  const tracer = new LensCallTracer<FunctionTracesArtifactsMap>(debugMetadata, deploymentTracer);

  const lensClient = new LensClient<FunctionTracesArtifactsMap>(client, debugMetadata, deploymentTracer, tracer);

  const artifacts = await resourceLoader.getProtocolArtifacts('function-traces');
  await debugMetadata.artifacts.registerArtifacts(artifacts);

  const functionIndexes = await resourceLoader.getFunctionIndexes('function-traces');
  await debugMetadata.functions.registerFunctionIndexes(functionIndexes);

  await tevmSetAccount(lensClient.client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });

  const deployment = await deployFunctionTracesContracts(lensClient, resourceLoader);
  const callerContract = deployment.callerContract;

  return {
    lensClient,
    callerContract,
  };
}
