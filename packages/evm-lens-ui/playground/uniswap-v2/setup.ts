import type { LensClient } from '@defi-notes/evm-lens/src/lens/LensClient.ts';
import { buildClient } from '@defi-notes/evm-lens/src/adapters/client.ts';
import { type GetContractReturnType } from 'viem';
import type { ArtifactMap } from '@defi-notes/protocols/artifacts';
import { buildCallTracer } from '@defi-notes/evm-lens/src/lens';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { HardhatEvmLensHttpRL } from '@defi-notes/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';

const ETHER_1 = 1n * 10n ** 18n;

export type UniswapV2Artifacts = {
  [K in keyof ArtifactMap as K extends `contracts/uniswap-v2/${string}` ? K : never]: ArtifactMap[K];
};

export interface UniswapV2Setup {
  lensClient: LensClient<UniswapV2Artifacts>;
  factory: GetContractReturnType<
    ArtifactMap['contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory']['abi']
  >;
  client: Awaited<ReturnType<typeof buildClient>>;
  resourceLoader: HardhatEvmLensHttpRL;
}

export async function setupUniswapV2(): Promise<UniswapV2Setup> {
  // http://localhost:5173/public, public folder is also served in root in vite
  const resourceLoader = new HardhatEvmLensHttpRL('http://localhost:5173/', 'contracts');

  const { lensClient, deployerAccount, client } = await buildCallTracer<UniswapV2Artifacts>();

  await lensClient.registerIndexes(resourceLoader, 'uniswap-v2');

  await lensClient.fundAccount(deployerAccount.address, ETHER_1);

  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const factoryDeployResult = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory',
    [feeToSetAccount.address]
  );

  await lensClient.deploy('contracts/uniswap-v2/v2-periphery/contracts/test/WETH9.sol:WETH9', []);

  const factory = lensClient.getContract(
    factoryDeployResult.createdAddress!,
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory'
  );

  return {
    lensClient,
    factory,
    client,
    resourceLoader,
  };
}
