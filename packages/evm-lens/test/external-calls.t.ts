import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';
import { ETHER_1, ZERO_ADDRESS } from './_setup/utils/constants.ts';
import { createLensTracerTestSetup, type LensArtifactsMapSlice } from './_setup/lensTracerTestSetup.ts';
import { getTracedTxFactory } from './_setup/utils.ts';
import type { ArtifactMap } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';
import type { LensArtifactsMap } from '../src/lens/types.ts';

describe('external-calls', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'test-contracts', 'external-calls'>>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/external-calls/CallerContract.sol:CallerContract']['abi']
  >;
  let calleeContractAddress: `0x${string}`;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await createLensTracerTestSetup<LensArtifactsMap<ArtifactMap>>()(
      'test-contracts',
      'external-calls'
    );
    lensClient = _lensClient;

    // deploy
    const calleeContractDeployment = await lensClient.deploy(
      'test-contracts/external-calls/CalleeContract.sol:CalleeContract',
      []
    );
    calleeContractAddress = calleeContractDeployment.createdAddress!;

    const callerContractDeployment = await lensClient.deploy(
      'test-contracts/external-calls/CallerContract.sol:CallerContract',
      [calleeContractAddress]
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

  test('revert restores balances after state changes', async () => {
    // Get initial balance of callee contract
    const initialBalance = await lensClient.client.getBalance({ address: calleeContractAddress });

    // Send ETH to callee contract via caller (modifies state)
    await lensClient.contract(callerContract, 'callReceiveFunction', [], ETHER_1);

    // Verify callee balance increased
    const balanceAfterCall = await lensClient.client.getBalance({ address: calleeContractAddress });
    expect(balanceAfterCall).toBe(initialBalance + ETHER_1);

    // Revert to snapshot
    await lensClient.revert();

    // Verify balance restored in the initial state
    const balanceAfterRevert = await lensClient.client.getBalance({ address: calleeContractAddress });
    expect(balanceAfterRevert).toBe(initialBalance);
  });
});
