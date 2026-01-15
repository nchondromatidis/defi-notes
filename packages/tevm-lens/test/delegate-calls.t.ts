import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/adapters/LensClient.ts';

import { type LensArtifactsMapSlice, lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { getTracedTxFactory } from './_setup/utils.ts';
import type { ArtifactMap } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';

describe('delegate-calls', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<ArtifactMap, 'test-contracts', 'delegate-calls'>>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/delegate-calls/CallerContract.sol:CallerContract']['abi']
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('test-contracts', 'delegate-calls');
    lensClient = _lensClient;

    // deploy
    const calleeContractDeployment = await lensClient.deploy(
      'test-contracts/delegate-calls/CalleeContract.sol:CalleeContract',
      []
    );
    const callerContractDeployment = await lensClient.deploy(
      'test-contracts/delegate-calls/CallerContract.sol:CallerContract',
      [calleeContractDeployment.createdAddress!]
    );

    callerContract = lensClient.getContract(
      callerContractDeployment.createdAddress!,
      'test-contracts/delegate-calls/CallerContract.sol:CallerContract'
    );

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('callDelegateCall', async () => {
    const calldata = '0x01'; // Example calldata, adjust as needed
    const result = await lensClient.contract(callerContract, 'callDelegateCall', [calldata]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test.skip('callWithDelegateCallAndCall', async () => {});

  test.skip('emitted different log with same log signature from different contracts', async () => {});
});
