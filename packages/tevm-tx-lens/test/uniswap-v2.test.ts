import { expect, test } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmSetAccount } from 'tevm';
import { deployUniswapV2 } from './utils/uniswap-v2';
import { Simulator } from '../src/lens/Simulator.ts';

const ETHER_1 = parseEther('1');

test('interact with uniswap v2', async () => {
  // arrange
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const tevmClient = await Simulator.build(deployerAccount);
  await tevmSetAccount(tevmClient.client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });
  const { factory } = await deployUniswapV2(tevmClient, feeToSetAccount.address);

  // act
  const result = await tevmClient.tevmContract(factory, 'feeToSetter', []);

  // assert
  expect(result.data).toEqual(feeToSetAccount.address);
});
