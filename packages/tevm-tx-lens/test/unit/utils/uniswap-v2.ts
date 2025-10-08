import { type Address, getContract } from 'viem';
import UniswapV2Factory from '@defi-notes/protocols/artifacts/contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol/UniswapV2Factory.json' assert { type: 'json' };
import UniswapV2Router02 from '@defi-notes/protocols/artifacts/contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol/UniswapV2Router02.json' assert { type: 'json' };
import type { LensClient } from '../../../src/lens/LensClient.ts';
import type { UniswapV2Factory$Type, UniswapV2Router02$Type } from '@defi-notes/protocols/types';

export async function deployUniswapV2(lensClient: LensClient, feeToSetAddress: Address) {
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

  const factory = getContract({
    address: factoryDeployResult.createdAddress!,
    abi: UniswapV2Factory.abi as UniswapV2Factory$Type['abi'],
    client: lensClient.client,
  });

  const router = getContract({
    address: routerDeployResult.createdAddress!,
    abi: UniswapV2Router02.abi as UniswapV2Router02$Type['abi'],
    client: lensClient.client,
  });

  return {
    factory,
    router,
  };
}

// export async function getUniswapContractFQNs(): Promise<ContractFQN[]> {}
