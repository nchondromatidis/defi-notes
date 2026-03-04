import type { ArtifactMap } from '@defi-notes/protocols/*';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ProtocolWorkflowsBase } from '@/protocols/workflows/ProtocolWorkflowsBase.ts';
import type { IResourceLoader } from '@defi-notes/evm-lens/src/lens/_ports/IResourceLoader.ts';
import { _1e18, USER_0, USER_1 } from '@/protocols/workflows/_constants.ts';
import type { Account } from 'viem';

export type UniswapV2Artifacts = {
  [K in keyof ArtifactMap as K extends `contracts/uniswap-v2/${string}` ? K : never]: ArtifactMap[K];
};

export class UniswapV2Workflows extends ProtocolWorkflowsBase<UniswapV2Artifacts> {
  static async create(resourceLoader: IResourceLoader) {
    const lensClient = await ProtocolWorkflowsBase.buildLens<UniswapV2Artifacts>(resourceLoader, USER_0);
    return new UniswapV2Workflows(lensClient, resourceLoader);
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
    const ercTokenA = await this.deployErc20(1_000_000n * _1e18);
    await this.transferErc20Amounts(ercTokenA, userAmounts);

    const ercTokenB = await this.deployErc20(1_000_000n * _1e18);
    await this.transferErc20Amounts(ercTokenB, userAmounts);

    const tokenA_initialDeposit = 200n * _1e18;
    const tokenB_initialDeposit = 400n * _1e18;

    await this.approve(ercTokenA, router2.address, tokenA_initialDeposit, USER_1);
    await this.approve(ercTokenB, router2.address, tokenB_initialDeposit, USER_1);

    const result = await this.lensClient.contract(
      router2,
      'addLiquidity',
      [
        ercTokenA.address,
        ercTokenB.address,
        tokenA_initialDeposit,
        tokenB_initialDeposit,
        0n,
        0n,
        USER_1.address,
        this.maxUint256(),
      ],
      USER_1.address
    );

    return this.lensClient.getTracedTx(result);
  }

  // actions

  // helpers

  private async deployErc20(initialSupply: bigint) {
    const ercTokenDeployResult = await this.lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20',
      [initialSupply],
      [],
      USER_0.address
    );
    return this.lensClient.getContract(
      ercTokenDeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20'
    );
  }

  private async transferErc20Amounts(erc20: any, userAmounts: Array<{ account: Account; amount: bigint }>) {
    for (const userAmount of userAmounts) {
      await this.lensClient.contract(
        erc20,
        'transfer',
        [userAmount.account.address, userAmount.amount],
        USER_0.address
      );
    }
  }

  private async approve(erc20: any, spender: `0x${string}`, amount: bigint, caller: Account) {
    await this.lensClient.contract(erc20, 'approve', [spender, amount], caller.address);
  }
}
