import { test, beforeEach, beforeAll } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmSetAccount } from 'tevm';
import { type Vm } from 'tevm/vm';
import { deployUniswapV2 } from './_fixtures/uniswap-v2.ts';
import { LensClient } from '../src/lens/LensClient.ts';
import { buildClient } from '../src/lens/client.ts';
import { TestResourceLoader } from './utils/TestResourceLoader.ts';
import { DeployedContracts } from '../src/lens/DeployedContracts.ts';
import { SupportedContracts } from '../src/lens/SupportedContracts.ts';
import { Tracer } from '../src/lens/Tracer.ts';
import { inspect } from './utils/inspect.ts';
import { getContractAddress, encodePacked, keccak256 } from 'viem';
import type { IResourceLoader } from '../src/adapters/IResourceLoader.ts';
import { safeCastToHex } from '../src/lens/artifact.ts';
import type { TestArtifactsMap } from './_fixtures/types.ts';
import type { ProtocolName } from '@defi-notes/protocols/types';

const ETHER_1 = parseEther('1');
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

let lensClient: LensClient<TestArtifactsMap>;
let factory: Awaited<ReturnType<typeof deployUniswapV2>>['factory'];
let vm: Vm;
let client: Awaited<ReturnType<typeof buildClient>>;
let resourceLoader: IResourceLoader<TestArtifactsMap, ProtocolName>;

beforeAll(async () => {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  client = await buildClient(deployerAccount);

  resourceLoader = new TestResourceLoader<TestArtifactsMap, ProtocolName>();

  const supportedContracts = new SupportedContracts<TestArtifactsMap>();
  const labeledContracts = new DeployedContracts<TestArtifactsMap>();
  const tracer = new Tracer<TestArtifactsMap>(supportedContracts, labeledContracts);
  lensClient = new LensClient<TestArtifactsMap>(client, supportedContracts, labeledContracts, tracer);

  const uniswapV2Artifacts = await resourceLoader.getProtocolArtifacts('uniswap-v2');
  await supportedContracts.registerArtifacts(uniswapV2Artifacts);

  const uniswapFunctionIndexes = await resourceLoader.getFunctionIndexes('uniswap-v2');
  await supportedContracts.registerFunctionIndexes(uniswapFunctionIndexes);

  await tevmSetAccount(lensClient.client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });

  const deployment = await deployUniswapV2(lensClient, feeToSetAccount.address, resourceLoader);
  factory = deployment.factory;

  vm = await client.transport.tevm.getVm();
  await vm.stateManager.checkpoint();
});

beforeEach(async () => {
  await vm.stateManager.revert();
});

test('tracer: send success with deployment', async () => {
  // arrange
  const token1 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );

  const token2 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );

  // act
  await lensClient.contract(factory, 'createPair', [token1.createdAddress!, token2.createdAddress!]);

  // assert
  inspect(lensClient.tracer.tracedTx);
});

test('tracer: call success', async () => {
  // arrange
  const token1 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );
  const token2 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );
  await lensClient.contract(factory, 'createPair', [token1.createdAddress!, token2.createdAddress!], false);

  const pairArtifact = await resourceLoader.getArtifact(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
  );

  const salt = keccak256(encodePacked(['address', 'address'], [token1.createdAddress!, token2.createdAddress!]));
  const pairAddress = getContractAddress({
    bytecode: safeCastToHex(pairArtifact.bytecode),
    from: factory.address,
    opcode: 'CREATE2',
    salt: salt,
  });

  lensClient.deployedContracts.markContractAddress(
    pairAddress,
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
  );

  const pairContract = await lensClient.getContract(
    pairAddress,
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
  );

  // act
  await lensClient.contract(pairContract, 'getReserves', []);

  // assert
  inspect(lensClient.tracer.tracedTx);
});

test('tracer: call error', async () => {
  // arrange
  const token2 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );

  // act
  await lensClient.contract(factory, 'createPair', [ZERO_ADDRESS, token2.createdAddress!]);

  // assert
  inspect(lensClient.tracer.tracedTx);
});
