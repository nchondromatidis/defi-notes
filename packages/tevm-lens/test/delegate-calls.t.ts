import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';

import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { deployFactory, getTracedTxFactory } from './_setup/utils.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';

describe('delegate-calls', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'delegate-calls', 'test-contracts'>;
  let callerContract: Awaited<
    ReturnType<ReturnType<typeof deployFactory<ProtocolName, 'delegate-calls', 'test-contracts'>>>
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient, resourceLoader } = await lensTracerTestSetup('delegate-calls', 'test-contracts');
    lensClient = _lensClient;

    // deploy
    const deploy = deployFactory<ProtocolName, 'delegate-calls', 'test-contracts'>(lensClient, resourceLoader);
    const calleeContract = await deploy('test-contracts/delegate-calls/CalleeContract.sol:CalleeContract', []);
    callerContract = await deploy('test-contracts/delegate-calls/CallerContract.sol:CallerContract', [
      calleeContract.address,
    ]);

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('callDelegateCall', async () => {
    const calldata = '0x01'; // Example calldata, adjust as needed
    const result = await lensClient.contract(callerContract, 'callDelegateCall', [calldata]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('emitted different log with same log signature from different contracts', async () => {});
});
