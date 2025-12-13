import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';
import { ETHER_1, ZERO_ADDRESS } from './_setup/utils/constants.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { getTracedTxFactory } from './_setup/utils.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';

describe('external-calls', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'external-calls', 'test-contracts'>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/external-calls/CallerContract.sol:CallerContract']['abi']
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('external-calls', 'test-contracts');
    lensClient = _lensClient;

    // deploy
    const calleeContractDeployment = await lensClient.deploy(
      'test-contracts/external-calls/CalleeContract.sol:CalleeContract',
      []
    );
    const callerContractDeployment = await lensClient.deploy(
      'test-contracts/external-calls/CallerContract.sol:CallerContract',
      [calleeContractDeployment.createdAddress!]
    );

    callerContract = lensClient.getContract(
      callerContractDeployment.createdAddress!,
      'test-contracts/external-calls/CallerContract.sol:CallerContract'
    );

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('external call to public function', async () => {
    const result = await lensClient.contract(callerContract, 'callPublicFunction', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('external call to external function', async () => {
    const result = await lensClient.contract(callerContract, 'callExternalFunction', [[1n, 2n, 3n], ZERO_ADDRESS]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('external static call to public function', async () => {
    const result = await lensClient.contract(callerContract, 'callStaticCallViewFunction', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('external call with unmatched selector, args, value', async () => {
    const result = await lensClient.contract(callerContract, 'callWithFallback', ['0x20'], ETHER_1);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('external call with unmatched selector, no args, value', async () => {
    const result = await lensClient.contract(callerContract, 'callReceiveFunction', [], ETHER_1);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('external call with revert', async () => {
    const result = await lensClient.contract(callerContract, 'callRevert', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });
});
