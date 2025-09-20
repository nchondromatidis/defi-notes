import { expect, test } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmContract, tevmSetAccount } from 'tevm';
import { buildTevmClient } from '../src/adapters/vm';
import { deployUniswapV2 } from '../src/adapters/uniswap-v2';

const ETHER_1 = parseEther('1');

test('deploy', async () => {
  // arrange
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const client = await buildTevmClient(deployerAccount);
  await tevmSetAccount(client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });
  const { factory } = await deployUniswapV2(client, feeToSetAccount.address);

  // act
  //const result = await factory.read.feeToSetter();
  // const result = await debugCall(client, factory, 'feeToSetter', []);

  // Read from contract (view function)
  const result = await tevmContract(client, {
    abi: factory.abi,
    to: factory.address,
    functionName: 'feeToSetter',
    args: [],
  });

  // assert
  expect(result.data).toEqual(feeToSetAccount.address);
});
