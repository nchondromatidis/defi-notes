import { beforeEach, describe, test } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';
import type { FunctionTracesArtifactsMap } from './setup/function-traces/types.ts';
import { deployFunctionTracesContracts } from './setup/function-traces/deploy.ts';
import { buildClient } from '../src/lens/client.ts';
import type { IResourceLoader } from '../src/adapters/IResourceLoader.ts';
import type { ProtocolName } from './setup/artifacts';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import path from 'node:path';
import { TestResourceLoader } from './setup/TestResourceLoader.ts';
import { SupportedContracts } from '../src/lens/indexes/SupportedContracts.ts';
import { DeployedContracts } from '../src/lens/indexes/DeployedContracts.ts';
import { LensCallTracer } from '../src/lens/callTracer/LensCallTracer.ts';
import { tevmSetAccount } from 'tevm';
import { ETHER_1 } from './setup/_utils/constants.ts';

describe('exploratory tests', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];
  // let calleeContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['calleeContract'];
  let client: Awaited<ReturnType<typeof buildClient>>;
  let resourceLoader: IResourceLoader<FunctionTracesArtifactsMap, ProtocolName>;

  beforeEach(async () => {
    const deployerAccount = privateKeyToAccount(generatePrivateKey());

    client = await buildClient(deployerAccount);

    const artifactsPath = path.join(__dirname, 'setup', 'artifacts');
    const artifactsContractsPath = path.join(__dirname, 'setup', 'artifacts', 'contracts');
    resourceLoader = new TestResourceLoader<FunctionTracesArtifactsMap, ProtocolName>(
      artifactsPath,
      artifactsContractsPath
    );

    const supportedContracts = new SupportedContracts();
    const labeledContracts = new DeployedContracts();
    const tracer = new LensCallTracer<FunctionTracesArtifactsMap>(supportedContracts, labeledContracts);
    lensClient = new LensClient<FunctionTracesArtifactsMap>(client, supportedContracts, labeledContracts, tracer);

    const artifacts = await resourceLoader.getProtocolArtifacts('function-traces');
    await supportedContracts.registerArtifacts(artifacts);

    const functionIndexes = await resourceLoader.getFunctionIndexes('function-traces');
    await supportedContracts.registerFunctionIndexes(functionIndexes);

    await tevmSetAccount(lensClient.client, {
      address: deployerAccount.address,
      balance: ETHER_1,
    });

    const deployment = await deployFunctionTracesContracts(lensClient, resourceLoader);
    callerContract = deployment.callerContract;
  });

  test('debug_traceTransaction', async () => {
    const calldata = '0x20';
    await lensClient.contract(callerContract, 'callDelegateCall', [calldata]);
    const txHash = lensClient.callDecodeTracer.succeededTxs.keys().next().value;
    const callTraceResult = await client.transport.tevm.request({
      method: 'debug_traceTransaction',
      params: [
        {
          transactionHash: txHash,
          tracer: 'callTracer',
          tracerConfig: { onlyTopCall: false },
        },
      ],
    });

    console.log(callTraceResult);
  });
});
