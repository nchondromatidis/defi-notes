import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';

import { createLensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { ArtifactMap } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';
import type { LensArtifactsMap } from '../src/lens/types.ts';
import type { LensArtifactsMapSlice } from '../src/client-utils/type-helpers.ts';

describe('delegate-calls', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'test-contracts', 'delegate-calls'>>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/delegate-calls/CallerContract.sol:CallerContract']['abi']
  >;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await createLensTracerTestSetup<LensArtifactsMap<ArtifactMap>>()(
      'test-contracts',
      'delegate-calls'
    );
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
  });

  test('callDelegateCall', async () => {
    const calldata = '0x01'; // Example calldata, adjust as needed
    const result = await lensClient.contract(callerContract, 'callDelegateCall', [calldata]);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test.skip('callWithDelegateCallAndCall', async () => {});

  test.skip('emitted different log with same log signature from different contracts', async () => {});
});
