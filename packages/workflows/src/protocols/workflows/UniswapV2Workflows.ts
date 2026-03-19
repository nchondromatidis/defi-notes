import type { ArtifactMap } from '@defi-notes/protocols/*';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ProtocolWorkflowsBase } from './ProtocolWorkflowsBase.ts';
import type { IResourceLoader } from '@defi-notes/evm-lens/src/lens/_ports/IResourceLoader.ts';
import { _1e18, USER_0, USER_1 } from './_constants.ts';
import { type Address, encodePacked, getContractAddress, type GetContractReturnType, keccak256 } from 'viem';
import type { LensClient } from '@defi-notes/evm-lens/src/lens/LensClient.ts';
import { safeCastToHex } from '@defi-notes/evm-lens/src/_common/type-utils.ts';

export type UniswapV2Artifacts = {
  [K in keyof ArtifactMap as K extends `contracts/uniswap-v2/${string}` ? K : never]: ArtifactMap[K];
};

type UniswapV2ERC20 = GetContractReturnType<
  ArtifactMap['contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20']['abi']
>;

export class UniswapV2Workflows extends ProtocolWorkflowsBase<UniswapV2Artifacts> {
  static async create(resourceLoader: IResourceLoader) {
    const lensClient = await ProtocolWorkflowsBase.buildLens<UniswapV2Artifacts>(resourceLoader, USER_0);
    const deployment = await this.deploy(lensClient);
    return new UniswapV2Workflows(lensClient, resourceLoader, deployment);
  }

  static async deploy(lensClient: LensClient<UniswapV2Artifacts>) {
    const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

    const factoryDeployResult = await lensClient.deploy(
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory',
      [feeToSetAccount.address]
    );

    const wethDeployResult = await lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/test/WETH9.sol:WETH9',
      []
    );

    const router2DeployResult = await lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol:UniswapV2Router02',
      [factoryDeployResult.createdAddress!, wethDeployResult.createdAddress!]
    );

    const factory = lensClient.getContract(
      factoryDeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol:UniswapV2Factory'
    );

    const router2 = lensClient.getContract(
      router2DeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-periphery/contracts/UniswapV2Router02.sol:UniswapV2Router02'
    );

    return { factory, router2 };
  }

  constructor(
    protected readonly lensClient: LensClient<UniswapV2Artifacts>,
    protected readonly resourceLoader: IResourceLoader,
    protected readonly deployment: Awaited<ReturnType<(typeof UniswapV2Workflows)['deploy']>>
  ) {
    super(lensClient, resourceLoader);
  }

  async initialLiquidity({
    user = USER_1.address,
    amountADesired = 200n * _1e18,
    amountBDesired = 400n * _1e18,
    traceTx = true,
  } = {}) {
    await this.lensClient.fundAccount(user, _1e18);

    const erc20TokenA = await this.deployErc20(USER_0.address, 1_000_000n * _1e18);

    const erc20TokenB = await this.deployErc20(USER_0.address, 1_000_000n * _1e18);

    const trace = await this._addLiquidity(
      erc20TokenA,
      erc20TokenB,
      amountADesired,
      amountBDesired,
      0n,
      0n,
      user,
      this.maxUint256(),
      traceTx
    );

    return { trace, erc20TokenA, erc20TokenB };
  }

  async addLiquidity({
    user = USER_1.address,
    amountADesired = 200n * _1e18,
    amountBDesired = 200n * _1e18,
    amountAMin = 50n * _1e18,
    amountBMin = 50n * _1e18,
  } = {}) {
    const { erc20TokenA, erc20TokenB } = await this.initialLiquidity({
      user: USER_1.address,
      amountADesired: 200n * _1e18,
      amountBDesired: 400n * _1e18,
    });

    const trace = await this._addLiquidity(
      erc20TokenA,
      erc20TokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      user,
      this.maxUint256()
    );

    return { trace, ercTokenA: erc20TokenA, ercTokenB: erc20TokenB };
  }

  private async _addLiquidity(
    tokenA: UniswapV2ERC20,
    tokenB: UniswapV2ERC20,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    user: Address,
    deadline: bigint,
    trace = true
  ) {
    const { router2 } = this.deployment;

    await this.transferErc20(tokenA, USER_0.address, user, amountADesired);
    await this.transferErc20(tokenB, USER_0.address, user, amountBDesired);

    await this.approve(tokenA, router2.address, amountADesired, user);
    await this.approve(tokenB, router2.address, amountBDesired, user);

    return await this.lensClient.contract(
      router2,
      'addLiquidity',
      [tokenA.address, tokenB.address, amountADesired, amountBDesired, amountAMin, amountBMin, user, deadline],
      user,
      undefined,
      trace
    );
  }

  async swap({ user = USER_1.address, amountIn = 50n * _1e18, amountOutMin = 50n * _1e18 } = {}) {
    const { erc20TokenA, erc20TokenB } = await this.initialLiquidity({
      user: USER_1.address,
      amountADesired: 200n * _1e18,
      amountBDesired: 400n * _1e18,
      traceTx: false,
    });

    const pairAddress = await this.calculatePairAddress(erc20TokenA, erc20TokenB);
    this.lensClient.addressLabeler.markContractAddress(
      pairAddress,
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
    );

    const path: Address[] = [erc20TokenA.address, erc20TokenB.address];
    const trace = await this._swap(erc20TokenA, amountIn, amountOutMin, path, user, this.maxUint256(), user);

    return { trace, erc20TokenA, erc20TokenB };
  }

  private async _swap(
    tokenIn: UniswapV2ERC20,
    amountIn: bigint,
    amountOutMin: bigint,
    path: Address[],
    to: Address,
    deadline: bigint,
    user: Address,
    trace = true
  ) {
    const { router2 } = this.deployment;

    await this.transferErc20(tokenIn, USER_0.address, user, amountIn);
    await this.approve(tokenIn, router2.address, amountIn, user);

    return await this.lensClient.contract(
      router2,
      'swapExactTokensForTokens',
      [amountIn, amountOutMin, path, to, deadline],
      user,
      undefined,
      trace
    );
  }

  private async deployErc20(initialUser: Address, initialSupply: bigint) {
    const ercTokenDeployResult = await this.lensClient.deploy(
      'contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20',
      [initialSupply],
      [],
      initialUser
    );
    return this.lensClient.getContract(
      ercTokenDeployResult.createdAddress!,
      'contracts/uniswap-v2/v2-periphery/contracts/test/ERC20.sol:ERC20'
    );
  }

  private async transferErc20(erc20: UniswapV2ERC20, fromUser: Address, toUser: Address, amount: bigint) {
    await this.lensClient.contract(erc20, 'transfer', [toUser, amount], fromUser, undefined, false);
  }

  private async approve(erc20: UniswapV2ERC20, spender: `0x${string}`, amount: bigint, caller: Address) {
    await this.lensClient.contract(erc20, 'approve', [spender, amount], caller, undefined, false);
  }

  private async calculatePairAddress(tokenA: UniswapV2ERC20, tokenB: UniswapV2ERC20) {
    const { factory } = this.deployment;
    const pairArtifact = await this.resourceLoader.getArtifact(
      'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair'
    );

    // Sort tokens so token0 < token1
    const [token0, token1] = [tokenA.address, tokenB.address].sort() as [Address, Address];

    const salt = keccak256(encodePacked(['address', 'address'], [token0, token1]));

    return getContractAddress({
      bytecodeHash: keccak256(safeCastToHex(pairArtifact.bytecode)),
      from: factory.address,
      opcode: 'CREATE2',
      salt,
    });
  }
}
