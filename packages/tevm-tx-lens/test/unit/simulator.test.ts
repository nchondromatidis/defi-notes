import { expect, test } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmSetAccount } from 'tevm';
import { deployUniswapV2 } from './utils/uniswap-v2.ts';
import { LensClient } from '../../src/lens/LensClient.ts';
import { buildClient } from '../../src/lens/client.ts';
import { TestResourceLoader } from './utils/TestResourceLoader.ts';
import * as path from 'node:path';
import { DeployedContracts } from '../../src/lens/DeployedContracts.ts';
import { SupportedContracts } from '../../src/lens/SupportedContracts.ts';
import type { ContractFQN } from '../../src/common/utils.ts';

const __dirname = import.meta.dirname;

const ETHER_1 = parseEther('1');

test('uniswap v2', async () => {
  // arrange
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const client = await buildClient(deployerAccount);

  const basePath = path.join(__dirname, '..', '..', '..', 'protocols', 'artifacts');
  const resourceLoader = new TestResourceLoader(basePath);
  const supportedContracts = new SupportedContracts(resourceLoader);

  const uniswapV2Contracts: ContractFQN[] = [];
  await supportedContracts.register(uniswapV2Contracts);

  const deployedContracts = new DeployedContracts();

  const simulator = new LensClient(client, supportedContracts, deployedContracts);

  await tevmSetAccount(simulator.client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });

  const { factory } = await deployUniswapV2(simulator, feeToSetAccount.address);

  // act
  const result = await simulator.tevmContract(factory, 'feeToSetter', []);

  // assert
  expect(result.data).toEqual(feeToSetAccount.address);
});
