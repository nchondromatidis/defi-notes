import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';

import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { getTracedTxFactory } from './_setup/utils.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';

describe('delegate-calls', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'delegate-calls', 'test-contracts'>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/delegate-calls/CallerContract.sol:CallerContract']['abi']
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('delegate-calls', 'test-contracts');
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

  test('emitted different log with same log signature from different contracts', async () => {});
});
