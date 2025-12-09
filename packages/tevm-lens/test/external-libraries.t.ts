import { test, beforeEach, describe } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import { deployFactory, getTracedTxFactory } from './_setup/utils.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { inspect } from './_setup/utils/inspect.ts';

describe('function traces - 4.external-libraries', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'external-libraries', 'test-contracts'>;
  let callerContract: Awaited<
    ReturnType<ReturnType<typeof deployFactory<ProtocolName, 'external-libraries', 'test-contracts'>>>
  >;
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient, resourceLoader } = await lensTracerTestSetup(
      'external-libraries',
      'test-contracts'
    );
    lensClient = _lensClient;

    // deploy
    const externalLibDeployResult = await lensClient.deploy(
      'test-contracts/external-libraries/ExternalLib.sol:ExternalLib',
      []
    );
    const externalLib2DeployResult = await lensClient.deploy(
      'test-contracts/external-libraries/ExternalLib2.sol:ExternalLib2',
      []
    );
    const deploy = deployFactory<ProtocolName, 'external-libraries', 'test-contracts'>(lensClient, resourceLoader);
    callerContract = await deploy(
      'test-contracts/external-libraries/CallerContract.sol:CallerContract',
      [],
      [
        {
          libFQN: 'test-contracts/external-libraries/ExternalLib.sol:ExternalLib',
          address: externalLibDeployResult.createdAddress!,
        },
        {
          libFQN: 'test-contracts/external-libraries/ExternalLib2.sol:ExternalLib2',
          address: externalLib2DeployResult.createdAddress!,
        },
      ]
    );

    getTracedTx = getTracedTxFactory(lensClient);
  });

  // TODO: continue here
  test('testExternalLibCall', async () => {
    const result = await lensClient.contract(callerContract, 'testExternalLibCall3', []);
    inspect(getTracedTx.success(result));
    // TODO: fails to decode external library call with argument typed storage
    // https://docs.soliditylang.org/en/latest/contracts.html#function-signatures-and-selectors-in-libraries
  });

  // does not support user defined types E(StructDefinition, EnumDefinition, UserDefinedValueTypeDefinition)
});
