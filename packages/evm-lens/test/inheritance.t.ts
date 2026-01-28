import { beforeEach, describe, expect, test } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';
import { getTracedTxFactory } from './_setup/utils.ts';
import { createLensTracerTestSetup, type LensArtifactsMapSlice } from './_setup/lensTracerTestSetup.ts';
import type { LensArtifactsMap } from '../src/lens/types.ts';

describe('inheritance', () => {
  let lensClient: LensClient<LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'test-contracts', 'inheritance'>>;

  let aContract: GetContractReturnType<ArtifactMap['test-contracts/inheritance/A.sol:A']['abi']>;
  let a2Contract: GetContractReturnType<ArtifactMap['test-contracts/inheritance/A2.sol:A2']['abi']>;

  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await createLensTracerTestSetup<LensArtifactsMap<ArtifactMap>>()(
      'test-contracts',
      'inheritance'
    );
    lensClient = _lensClient;

    // deploy
    const AContractDeployment = await lensClient.deploy('test-contracts/inheritance/A.sol:A', [1n]);
    const A2ContractDeployment = await lensClient.deploy('test-contracts/inheritance/A2.sol:A2', [2n]);

    aContract = lensClient.getContract(AContractDeployment.createdAddress!, 'test-contracts/inheritance/A.sol:A');
    a2Contract = lensClient.getContract(A2ContractDeployment.createdAddress!, 'test-contracts/inheritance/A2.sol:A2');

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('inheritance contract A', async () => {
    const result = await lensClient.contract(aContract, 'ping', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('inheritance contract A2', async () => {
    const result = await lensClient.contract(a2Contract, 'ping', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });
});

// inherit own contracts
// inherit third party contracts
