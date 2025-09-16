import { expect, test } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createMemoryClient, parseEther } from 'tevm';
import { type Hex } from 'viem';
import UniswapV2Factory from '@definest/protocols/artifacts/contracts/uniswap-v2/v2-core/contracts/UniswapV2Factory.sol/UniswapV2Factory.json';
import { iUniswapV2FactoryAbi } from '@definest/protocols/artifacts/types/uniswap-v2/v2-core.ts';

const ETHER_1 = parseEther('1');

test('deploy', async () => {
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const client = createMemoryClient({
    account: deployerAccount,
    miningConfig: {
      type: 'auto',
    },
  });

  await client.setBalance({ address: deployerAccount.address, value: ETHER_1 });

  const deployment = await client.tevmDeploy({
    abi: UniswapV2Factory.abi,
    bytecode: UniswapV2Factory.bytecode as Hex,
    args: [feeToSetAccount.address],
  });

  const result = await client.readContract({
    abi: iUniswapV2FactoryAbi,
    functionName: 'feeToSetter',
    address: deployment.createdAddress!,
  });

  expect(result).toEqual(feeToSetAccount.address);
});
