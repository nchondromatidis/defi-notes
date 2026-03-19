import { test, beforeEach, describe, expect } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap } from './_setup/artifacts';
import { createLensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { GetContractReturnType } from 'viem';
import type { LensArtifactsMap } from '../src/lens/types.ts';
import type { LensArtifactsMapSlice } from '../src/client-utils/type-helpers.ts';

describe('external-libraries', () => {
  let lensClient: LensClient<
    LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'test-contracts', 'external-libraries'>
  >;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/external-libraries/CallerContract.sol:CallerContract']['abi']
  >;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await createLensTracerTestSetup<LensArtifactsMap<ArtifactMap>>()(
      'test-contracts',
      'external-libraries'
    );
    lensClient = _lensClient;

    // deploy
    const externalLibDeployment = await lensClient.deploy(
      'test-contracts/external-libraries/ExternalLib.sol:ExternalLib',
      []
    );
    const externalLib2Deployment = await lensClient.deploy(
      'test-contracts/external-libraries/ExternalLib2.sol:ExternalLib2',
      []
    );
    const callerContractDeployment = await lensClient.deploy(
      'test-contracts/external-libraries/CallerContract.sol:CallerContract',
      [],
      [
        {
          libFQN: 'test-contracts/external-libraries/ExternalLib.sol:ExternalLib',
          address: externalLibDeployment.createdAddress!,
        },
        {
          libFQN: 'test-contracts/external-libraries/ExternalLib2.sol:ExternalLib2',
          address: externalLib2Deployment.createdAddress!,
        },
      ]
    );

    callerContract = lensClient.getContract(
      callerContractDeployment.createdAddress!,
      'test-contracts/external-libraries/CallerContract.sol:CallerContract'
    );
  });

  test('testExternalLibCall1', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'testExternalLibCall1', []);
    expect(functionTrace).toMatchSnapshot();
  });

  test('testExternalLibCall2', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'testExternalLibCall2', []);
    expect(functionTrace).toMatchSnapshot();
  });

  test('testExternalLibCall3', async () => {
    const functionTrace = await lensClient.contract(callerContract, 'testExternalLibCall3', []);
    expect(functionTrace).toMatchSnapshot();
  });
});
