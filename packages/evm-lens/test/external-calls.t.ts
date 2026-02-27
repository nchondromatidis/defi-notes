import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../src/lens/LensClient.ts';
import { ETHER_1, ZERO_ADDRESS } from './_setup/utils/constants.ts';
import { createLensTracerTestSetup, TEST_ACCOUNT } from './_setup/lensTracerTestSetup.ts';
import type { ArtifactMap } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';
import type { LensArtifactsMap } from '../src/lens/types.ts';
import type { LensArtifactsMapSlice } from '../src/client-utils/type-helpers.ts';

describe('external-calls', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'test-contracts', 'external-calls'>>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/external-calls/CallerContract.sol:CallerContract']['abi']
  >;
  let calleeContractAddress: `0x${string}`;

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
  });

  test('external call to public function', async () => {
    const result = await lensClient.contract(callerContract, 'callPublicFunction', []);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('external call to external function', async () => {
    const result = await lensClient.contract(callerContract, 'callExternalFunction', [[1n, 2n, 3n], ZERO_ADDRESS]);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('external static call to public function', async () => {
    const result = await lensClient.contract(callerContract, 'callStaticCallViewFunction', []);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('external call with unmatched selector, args, value', async () => {
    await lensClient.fundAccount(TEST_ACCOUNT.address, ETHER_1 * 2n);
    const result = await lensClient.contract(callerContract, 'callWithFallback', ['0x20'], undefined, ETHER_1);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('external call with unmatched selector, no args, value', async () => {
    await lensClient.fundAccount(TEST_ACCOUNT.address, ETHER_1 * 2n);
    const result = await lensClient.contract(callerContract, 'callReceiveFunction', [], undefined, ETHER_1);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('external call with revert', async () => {
    const result = await lensClient.contract(callerContract, 'callRevert', []);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('revert restores balances after state changes', async () => {
    // Get initial balance of callee contract
    const initialBalance = await lensClient.client.getBalance({ address: calleeContractAddress });

    // Send ETH to callee contract via caller (modifies state)
    await lensClient.fundAccount(TEST_ACCOUNT.address, ETHER_1 * 2n);
    await lensClient.contract(callerContract, 'callReceiveFunction', [], undefined, ETHER_1);

    // Verify callee balance increased
    const balanceAfterCall = await lensClient.client.getBalance({ address: calleeContractAddress });
    expect(balanceAfterCall).toBe(initialBalance + ETHER_1);

    // Revert to snapshot
    await lensClient.reset();

    // Verify balance restored in the initial state
    const balanceAfterRevert = await lensClient.client.getBalance({ address: calleeContractAddress });
    expect(balanceAfterRevert).toBe(initialBalance);
  });
});
