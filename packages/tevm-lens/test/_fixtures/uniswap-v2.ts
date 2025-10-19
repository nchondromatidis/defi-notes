import { type Address, getContract } from 'viem';
import type { LensClient } from '../../src/lens/LensClient.ts';
import type { IResourceLoader } from '../../src/adapters/IResourceLoader.ts';
import type { TestArtifactsMap } from '../utils/types.ts';
import type { ProtocolName } from '@defi-notes/protocols/types';

export async function deployUniswapV2(
  lensClient: LensClient<TestArtifactsMap>,
  feeToSetAddress: Address,
  resourceLoader: IResourceLoader<TestArtifactsMap, ProtocolName>
) {
  const factoryDeployResult = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory',
    [feeToSetAddress]
  );

  const wethDeployResult = await lensClient.deploy(
    'contracts/uniswap-v2/v2-periphery/contracts/test/WETH9.sol:WETH9',
    []
  );

  const routerDeployResult = await lensClient.deploy(
    'contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol:UniswapV2Router02',
    [factoryDeployResult.createdAddress!, wethDeployResult.createdAddress!]
  );

  const UniswapV2FactoryAbi = await resourceLoader.getArtifactPart(
    'contracts/uniswap-v2/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
    'abi'
  );

  const factory = getContract({
    address: factoryDeployResult.createdAddress!,
    abi: UniswapV2FactoryAbi,
    client: lensClient.client,
  });

  const UniswapV2Router02Abi = await resourceLoader.getArtifactPart(
    'contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol:UniswapV2Router02',
    'abi'
  );

  const router = getContract({
    address: routerDeployResult.createdAddress!,
    abi: UniswapV2Router02Abi,
    client: lensClient.client,
  });

  return {
    factory,
    router,
  };
}
