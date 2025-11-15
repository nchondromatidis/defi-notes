import { test, beforeEach, beforeAll } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { tevmSetAccount } from 'tevm';
import { type Vm } from 'tevm/vm';
import { LensClient } from '../src/lens/LensClient.ts';
import { buildClient } from '../src/lens/client.ts';
import { TestResourceLoader } from './setup/TestResourceLoader.ts';
import { DeployedContracts } from '../src/lens/indexes/DeployedContracts.ts';
import { SupportedContracts } from '../src/lens/indexes/SupportedContracts.ts';
import { LensCallTracer } from '../src/lens/tracers/callTracer/LensCallTracer.ts';
import { inspect } from './setup/_utils/debug.ts';
import type { IResourceLoader } from '../src/adapters/IResourceLoader.ts';
import path from 'node:path';

import { ETHER_1 } from './setup/_utils/constants.js';
import type { FunctionTracesArtifactsMap } from './setup/function-traces/types.js';
import type { ProtocolName } from './setup/artifacts/index.js';
import { deployFunctionTracesContracts } from './setup/function-traces/deploy.js';

let lensClient: LensClient<FunctionTracesArtifactsMap>;
let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];
// let calleeContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['calleeContract'];
let vm: Vm;
let client: Awaited<ReturnType<typeof buildClient>>;
let resourceLoader: IResourceLoader<FunctionTracesArtifactsMap, ProtocolName>;

beforeAll(async () => {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());

  client = await buildClient(deployerAccount);

  const artifactsPath = path.join(__dirname, 'setup', 'artifacts');
  const artifactsContractsPath = path.join(__dirname, 'setup', 'artifacts', 'contracts');
  resourceLoader = new TestResourceLoader<FunctionTracesArtifactsMap, ProtocolName>(
    artifactsPath,
    artifactsContractsPath
  );

  const supportedContracts = new SupportedContracts<FunctionTracesArtifactsMap>();
  const labeledContracts = new DeployedContracts<FunctionTracesArtifactsMap>();
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
  // calleeContract = deployment.calleeContract;

  vm = await client.transport.tevm.getVm();
  await vm.stateManager.checkpoint();
});

beforeEach(async () => {
  await vm.stateManager.revert();
});

test('tracer: send success with deployment', async () => {
  // arrange

  // act
  await lensClient.contract(callerContract, 'callExternalFunction', []);

  // assert
  inspect(lensClient.callDecodeTracer.tracedTxs);
});
