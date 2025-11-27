import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildClient } from '../../../src/lens/client.ts';
import { TestResourceLoader } from '../../_setup/TestResourceLoader.ts';
import type { FunctionTracesArtifactsMap } from './types.ts';
import type { ProtocolName } from '../../_setup/artifacts';
import { SupportedContracts } from '../../../src/lens/indexes/SupportedContracts.ts';
import { DeployedContracts } from '../../../src/lens/indexes/DeployedContracts.ts';
import { LensCallTracer } from '../../../src/lens/callTracer/LensCallTracer.ts';
import { LensClient } from '../../../src/lens/LensClient.ts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from '../../_setup/utils/constants.ts';
import { deployFunctionTracesContracts } from './deploy.ts';

export async function testSetup() {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());

  const client = await buildClient(deployerAccount);

  const resourceLoader = new TestResourceLoader<FunctionTracesArtifactsMap, ProtocolName>();

  const supportedContracts = new SupportedContracts();
  const labeledContracts = new DeployedContracts();
  const tracer = new LensCallTracer<FunctionTracesArtifactsMap>(supportedContracts, labeledContracts);
  const lensClient = new LensClient<FunctionTracesArtifactsMap>(client, supportedContracts, labeledContracts, tracer);

  const artifacts = await resourceLoader.getProtocolArtifacts('function-traces');
  await supportedContracts.registerArtifacts(artifacts);

  const functionIndexes = await resourceLoader.getFunctionIndexes('function-traces');
  await supportedContracts.registerFunctionIndexes(functionIndexes);

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
