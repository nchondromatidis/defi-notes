import { test, beforeEach, describe } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import { getTracedTxFactory } from './_setup/utils.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { inspect } from './_setup/utils/inspect.ts';
import type { GetContractReturnType } from 'viem';

describe('internal-calls', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'internal-calls', 'test-contracts'>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/internal-calls/CallerContract.sol:CallerContract']['abi']
  >;

  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('internal-calls', 'test-contracts');
    lensClient = _lensClient;

    // deploy
    const calleeContractDeployment = await lensClient.deploy(
      'test-contracts/internal-calls/CalleeContract.sol:CalleeContract',
      []
    );
    const callerContractDeployment = await lensClient.deploy(
      'test-contracts/internal-calls/CallerContract.sol:CallerContract',
      [calleeContractDeployment.createdAddress!]
    );

    callerContract = lensClient.getContract(
      callerContractDeployment.createdAddress!,
      'test-contracts/internal-calls/CallerContract.sol:CallerContract'
    );

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('callPublicInternallyAndExternally', async () => {
    const result = await lensClient.contract(callerContract, 'callPublicInternallyAndExternally', [2n]);
    inspect(getTracedTx.success(result));
  }, 999999);

  test('callInternalAndPrivate2', async () => {
    // todo wrong abi: callInternalAndPrivate2
    const result = await lensClient.contract(callerContract, 'callInternalAndPrivate', []);
    inspect(getTracedTx.success(result));
    inspect(getTracedTx.failed(0));
  }, 999999);
});
