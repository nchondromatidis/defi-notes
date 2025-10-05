import { type Abi, type Hex, type Address, getContract } from 'viem';
import UniswapV2Factory from '@defi-notes/protocols/artifacts/contracts/v2-core/contracts/UniswapV2Factory.sol/UniswapV2Factory.json';
import WETH9 from '@defi-notes/protocols/artifacts/contracts/v2-periphery/contracts/test/WETH9.sol/WETH9.json';
import UniswapV2Router02 from '@defi-notes/protocols/artifacts/contracts/v2-periphery/contracts/UniswapV2Router02.sol/UniswapV2Router02.json';
import type { Simulator } from '../../src/lens/Simulator.ts';
import type { UniswapV2Factory$Type } from '@defi-notes/protocols/artifacts/contracts/v2-core/contracts/UniswapV2Factory.sol/artifacts.d.ts';
import type { UniswapV2Router02$Type } from '@defi-notes/protocols/artifacts/contracts/v2-periphery/contracts/UniswapV2Router02.sol/artifacts.d.ts';

export async function deployUniswapV2(simulator: Simulator, feeToSetAddress: Address) {
  const factoryDeployResult = await simulator.tevmDeploy({
    abi: UniswapV2Factory.abi as Abi,
    bytecode: UniswapV2Factory.bytecode as Hex,
    args: [feeToSetAddress],
  });

  const wethDeployResult = await simulator.tevmDeploy({
    abi: WETH9.abi as Abi,
    bytecode: WETH9.bytecode as Hex,
  });

  const routerDeployResult = await simulator.tevmDeploy({
    abi: UniswapV2Router02.abi as Abi,
    bytecode: UniswapV2Router02.bytecode as Hex,
    args: [factoryDeployResult.createdAddress, wethDeployResult.createdAddress],
  });

  const factory = getContract({
    address: factoryDeployResult.createdAddress!,
    abi: UniswapV2Factory.abi as UniswapV2Factory$Type['abi'],
    client: simulator.client,
  });

  const router = getContract({
    address: routerDeployResult.createdAddress!,
    abi: UniswapV2Router02.abi as UniswapV2Router02$Type['abi'],
    client: simulator.client,
  });

  return {
    factory,
    router,
  };
}
