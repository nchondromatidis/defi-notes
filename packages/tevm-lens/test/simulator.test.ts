import { test } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmSetAccount } from 'tevm';
import { deployUniswapV2 } from './utils/uniswap-v2.ts';
import { LensClient } from '../src/lens/LensClient.ts';
import { buildClient } from '../src/lens/client.ts';
import { TestResourceLoader } from './utils/TestResourceLoader.ts';
import * as path from 'node:path';
import { LabeledContracts } from '../src/lens/LabeledContracts.ts';
import { SupportedContracts } from '../src/lens/SupportedContracts.ts';
import { Tracer } from '../src/lens/Tracer.ts';

const __dirname = import.meta.dirname;

const ETHER_1 = parseEther('1');

test('uniswap v2', async () => {
  // arrange
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const client = await buildClient(deployerAccount);

  const basePath = path.join(__dirname, '..', '..', 'protocols', 'artifacts');
  const resourceLoader = new TestResourceLoader(basePath);

  const supportedContracts = new SupportedContracts();
  const labeledContracts = new LabeledContracts();
  const tracer = new Tracer(supportedContracts, labeledContracts);
  const lensClient = new LensClient(client, supportedContracts, labeledContracts, tracer);

  const uniswapV2Artifacts = await resourceLoader.getProtocolArtifacts('uniswap-v2');
  await supportedContracts.registerArtifacts(uniswapV2Artifacts);

  await tevmSetAccount(lensClient.client, {
    address: deployerAccount.address,
    balance: ETHER_1,
  });

  const { factory } = await deployUniswapV2(lensClient, feeToSetAccount.address);

  const token1 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );

  const token2 = await lensClient.deploy(
    'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
    []
  );

  // act
  await lensClient.contract(factory, 'createPair', [token1.createdAddress!, token2.createdAddress!]);

  // assert
  console.log(tracer.traced);
});
