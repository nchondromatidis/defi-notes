import { test } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseEther, tevmSetAccount } from 'tevm';
import { deployUniswapV2 } from './utils/uniswap-v2.ts';
import { LensClient } from '../src/lens/LensClient.ts';
import { buildClient } from '../src/lens/client.ts';
import { TestResourceLoader } from './utils/TestResourceLoader.ts';
import * as path from 'node:path';
import { DeployedContracts } from '../src/lens/DeployedContracts.ts';
import { SupportedContracts } from '../src/lens/SupportedContracts.ts';
import { Tracer } from '../src/lens/Tracer.ts';
import * as util from 'node:util';

const __dirname = import.meta.dirname;

const ETHER_1 = parseEther('1');

test('tracer test', async () => {
  // arrange
  const deployerAccount = privateKeyToAccount(generatePrivateKey());
  const feeToSetAccount = privateKeyToAccount(generatePrivateKey());

  const client = await buildClient(deployerAccount);

  const basePath = path.join(__dirname, '..', '..', 'protocols', 'artifacts');
  const resourceLoader = new TestResourceLoader(basePath);

  const supportedContracts = new SupportedContracts();
  const labeledContracts = new DeployedContracts();
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
  Uint8Array.prototype[util.inspect.custom] = function () {
    return `0x${Buffer.from(this).toString('hex')}`;
  };
  console.log(util.inspect(tracer.tracedTx, { depth: 4, colors: true }));
});

declare global {
  interface Uint8Array {
    [util.inspect.custom]: () => string;
  }
}
