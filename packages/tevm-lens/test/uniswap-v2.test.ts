import { test, beforeEach, describe } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmSetAccount } from 'tevm';
import { deployUniswapV2 } from './setup/uniswap-v2/deploy.ts';
import { LensClient } from '../src/lens/LensClient.ts';
import { buildClient } from '../src/lens/client.ts';
import { TestResourceLoader } from './setup/TestResourceLoader.ts';
import { DeployedContracts } from '../src/lens/indexes/DeployedContracts.ts';
import { SupportedContracts } from '../src/lens/indexes/SupportedContracts.ts';
import { LensCallTracer } from '../src/lens/callTracer/LensCallTracer.ts';
import { inspect } from './setup/_utils/debug.ts';
import { getContractAddress, encodePacked, keccak256 } from 'viem';
import type { IResourceLoader } from '../src/adapters/IResourceLoader.ts';
import { safeCastToHex } from '../src/lens/types/artifact.ts';
import type { ProtocolName } from '@defi-notes/protocols/*';
import path from 'node:path';
import type { UniswapV2ArtifactsMap } from './setup/uniswap-v2/types.ts';

const ETHER_1 = parseEther('1');
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('uniswap-v2', () => {
  let lensClient: LensClient<UniswapV2ArtifactsMap>;
  let factory: Awaited<ReturnType<typeof deployUniswapV2>>['factory'];
  let client: Awaited<ReturnType<typeof buildClient>>;
  let resourceLoader: IResourceLoader<UniswapV2ArtifactsMap, ProtocolName>;

  beforeEach(async () => {
    const deployerAccount = privateKeyToAccount(generatePrivateKey());
    const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

    client = await buildClient(deployerAccount);

    const artifactsPath = path.join(__dirname, '..', '..', 'protocols', 'artifacts');
    const artifactsContractsPath = path.join(__dirname, '..', '..', 'protocols', 'artifacts', 'contracts');
    resourceLoader = new TestResourceLoader<UniswapV2ArtifactsMap, ProtocolName>(artifactsPath, artifactsContractsPath);

    const supportedContracts = new SupportedContracts();
    const labeledContracts = new DeployedContracts();
    const tracer = new LensCallTracer<UniswapV2ArtifactsMap>(supportedContracts, labeledContracts);
    lensClient = new LensClient<UniswapV2ArtifactsMap>(client, supportedContracts, labeledContracts, tracer);

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
    inspect(lensClient.callDecodeTracer.succeededTxs);
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
    await lensClient.contract(
      factory,
      'createPair',
      [token1.createdAddress!, token2.createdAddress!],
      undefined,
      false
    );

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
    inspect(lensClient.callDecodeTracer.succeededTxs);
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
    inspect(lensClient.callDecodeTracer.succeededTxs);
    inspect(lensClient.callDecodeTracer.failedTxs);
  });

  test('debug_traceTransaction', async () => {
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
