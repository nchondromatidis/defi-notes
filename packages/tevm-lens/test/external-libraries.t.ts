import { test, beforeEach, describe, expect } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import { getTracedTxFactory } from './_setup/utils.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { GetContractReturnType } from 'viem';

describe('external-libraries', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'external-libraries', 'test-contracts'>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/external-libraries/CallerContract.sol:CallerContract']['abi']
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('external-libraries', 'test-contracts');
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

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('testExternalLibCall1', async () => {
    const result = await lensClient.contract(callerContract, 'testExternalLibCall1', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('testExternalLibCall2', async () => {
    const result = await lensClient.contract(callerContract, 'testExternalLibCall2', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('testExternalLibCall3', async () => {
    const result = await lensClient.contract(callerContract, 'testExternalLibCall3', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });
});
