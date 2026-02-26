import type { ArtifactMap } from '@defi-notes/protocols/*';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ProtocolActionsBase } from '@/protocols/actions/ProtocolActionsBase.ts';
import type { IResourceLoader } from '@defi-notes/evm-lens/src/lens/_ports/IResourceLoader.ts';
import { _1e18, USER_0, USER_1 } from '@/protocols/_constants.ts';
import type { Account } from 'viem';

export type UniswapV2Artifacts = {
  [K in keyof ArtifactMap as K extends `contracts/uniswap-v2/${string}` ? K : never]: ArtifactMap[K];
};

export class UniswapV2Actions extends ProtocolActionsBase<UniswapV2Artifacts> {
  static async create(resourceLoader: IResourceLoader) {
    const lensClient = await ProtocolActionsBase.buildLens<UniswapV2Artifacts>(resourceLoader, USER_0);
    return new UniswapV2Actions(lensClient, resourceLoader);
  }

  async deploy() {
    const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

    const factoryDeployResult = await this.lensClient.deploy(
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory',
      [feeToSetAccount.address]
    );

    const wethDeployResult = await this.lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/test/WETH9.sol:WETH9',
      []
    );

    const router2DeployResult = await this.lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol:UniswapV2Router02',
      [factoryDeployResult.createdAddress!, wethDeployResult.createdAddress!]
    );

    const factory = this.lensClient.getContract(
      factoryDeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory'
    );

    const router2 = this.lensClient.getContract(
      router2DeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol:UniswapV2Router02'
    );

    return { factory, router2 };
  }

  async initialLiquidity() {
    const { router2 } = await this.deploy();

    await this.lensClient.fundAccount(USER_1.address, _1e18);
    const userAmounts = [{ account: USER_1, amount: 1000n * _1e18 }];
    const ercToken1 = await this.deployErc20WithInitAmounts(userAmounts);
    const ercToken2 = await this.deployErc20WithInitAmounts(userAmounts);

    await this.lensClient.contract(ercToken1, 'approve', [router2.address, this.maxUint256()], USER_1.address);
    await this.lensClient.contract(ercToken2, 'approve', [router2.address, this.maxUint256()], USER_1.address);

    const result = await this.lensClient.contract(
      router2,
      'addLiquidity',
      [ercToken1.address, ercToken2.address, 200n * _1e18, 400n * _1e18, 0n, 0n, USER_1.address, this.maxUint256()],
      USER_1.address
    );

    return this.lensClient.getTracedTx(result);
  }

  // helpers

  async deployErc20WithInitAmounts(userAmounts: Array<{ account: Account; amount: bigint }>) {
    const ercTokenDeployResult = await this.lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20',
      [
        1000000n * _1e18, // 1M ERC20 with 18 dec
      ],
      [],
      USER_0.address
    );
    const erc20 = this.lensClient.getContract(
      ercTokenDeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20'
    );

    for (const userAmount of userAmounts) {
      await this.lensClient.contract(
        erc20,
        'transfer',
        [userAmount.account.address, userAmount.amount],
        USER_0.address
      );
    }

    return erc20;
  }
}
