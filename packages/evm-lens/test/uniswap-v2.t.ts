import { test, beforeEach, describe } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import { buildClient } from '../src/adapters/client.ts';
import { type GetContractReturnType, keccak256, encodePacked, getContractAddress } from 'viem';
import { inspect } from './_setup/utils/inspect.ts';
import type { ArtifactMap } from '@defi-notes/protocols/artifacts';
import { createLensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { LensArtifactsMap } from '../src/lens/types.ts';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS } from './_setup/utils/constants.ts';
import type { IResourceLoader } from '../src/lens/_ports/IResourceLoader.ts';
import { safeCastToHex } from '../src/_common/type-utils.ts';
import type { LensArtifactsMapSlice } from '../src/client-utils/type-helpers.ts';
import { PROTOCOLS_RESOURCES_PATH } from './_setup/HardhatEvmLensFileRL.ts';

describe('uniswap-v2', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'contracts', 'uniswap-v2'>>;
  let factory: GetContractReturnType<
    ArtifactMap['contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory']['abi']
  >;
  let client: Awaited<ReturnType<typeof buildClient>>;
  let resourceLoader: IResourceLoader;

  beforeEach(async () => {
    const {
      lensClient: _lensClient,
      client: _client,
      resourceLoader: _resourceLoader,
    } = await createLensTracerTestSetup<LensArtifactsMap<ArtifactMap>>(PROTOCOLS_RESOURCES_PATH)(
      'contracts',
      'uniswap-v2'
    );
    lensClient = _lensClient;
    client = _client;
    resourceLoader = _resourceLoader;

    const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

    const factoryDeployResult = await lensClient.deploy(
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory',
      [feeToSetAccount.address]
    );

    await lensClient.deploy('contracts/uniswap-v2/v2-periphery/contracts/test/WETH9.sol:WETH9', []);

    factory = lensClient.getContract(
      factoryDeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory'
    );
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
    const result = await lensClient.contract(factory, 'createPair', [token1.createdAddress!, token2.createdAddress!]);

    // assert
    inspect(lensClient.getSucceeded(result));
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

    lensClient.addressLabeler.markContractAddress(
      pairAddress,
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
    );

    const pairContract = lensClient.getContract(
      pairAddress,
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
    );

    // act
    const result = await lensClient.contract(pairContract, 'getReserves', []);

    // assert
    inspect(lensClient.getSucceeded(result));
  });

  test('tracer: call error', async () => {
    // arrange
    const token2 = await lensClient.deploy(
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
      []
    );

    // act
    const result = await lensClient.contract(factory, 'createPair', [ZERO_ADDRESS, token2.createdAddress!]);

    // assert
    inspect(lensClient.getSucceeded(result));
    inspect(lensClient.getFailed(result));
  });

  test.skip('debug_traceTransaction', async () => {
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
    const txHash = lensClient.functionTracer.succeededTxs.keys().next().value;
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
