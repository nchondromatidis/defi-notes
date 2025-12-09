import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';
import type { Hex } from '../src/lens/types/artifact.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { deployFactory, getTracedTxFactory } from './_setup/utils.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';

describe('function traces - create-functions', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'create-functions', 'test-contracts'>;
  let callerContract: Awaited<
    ReturnType<ReturnType<typeof deployFactory<ProtocolName, 'create-functions', 'test-contracts'>>>
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient, resourceLoader } = await lensTracerTestSetup('create-functions', 'test-contracts');
    lensClient = _lensClient;

    // deploy
    const deploy = deployFactory<ProtocolName, 'create-functions', 'test-contracts'>(lensClient, resourceLoader);
    callerContract = await deploy('test-contracts/create-functions/CallerContract.sol:CallerContract', []);

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('deployContract', async () => {
    const result = await lensClient.contract(callerContract, 'deployContract', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('create2Contract', async () => {
    const hex32Pattern = ('0x' + '11'.repeat(32)) as Hex;
    const result = await lensClient.contract(callerContract, 'create2Contract', [hex32Pattern]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });
});
