import { test, beforeEach, describe, expect } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap } from './_setup/artifacts';
import { createLensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { GetContractReturnType } from 'viem';
import type { Address, LensArtifactsMap } from '../src/lens/types.ts';
import type { LensArtifactsMapSlice } from '../src/client-utils/type-helpers.ts';

describe('internal-calls', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'test-contracts', 'internal-calls'>>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/internal-calls/CallerContract.sol:CallerContract']['abi']
  >;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await createLensTracerTestSetup<LensArtifactsMap<ArtifactMap>>()(
      'test-contracts',
      'internal-calls'
    );
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
  });

  test('publicFunction', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'publicFunction', [2n]);
    expect(functionTrace).toMatchSnapshot();
  });

  test('mixedCall', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'mixedCall', [2n]);
    expect(functionTrace).toMatchSnapshot();
  });

  test('callAnotherContract', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'callAnotherContract', []);
    expect(functionTrace).toMatchSnapshot();
  });

  test('test function fallback', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'callAnotherContractWithFallback', [1n]);
    expect(functionTrace).toMatchSnapshot();
  });

  test('richStackFunction - function with rich EVM stack', async () => {
    const path: Address[] = [
      '0x0000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000002',
    ];
    const to = '0x0000000000000000000000000000000000000004';

    const functionTrace = await lensClient.contract(callerContract, 'richStackFunction', [
      100n, // amountIn
      90n, // amountOutMin
      path,
      to,
      9999999999n, // deadline
    ]);
    expect(functionTrace).toMatchSnapshot();
  });
});
