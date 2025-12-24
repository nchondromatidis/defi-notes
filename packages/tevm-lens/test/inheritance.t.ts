// inherit own contracts
// inherit third party contracts

import { beforeEach, describe, expect, test } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import type { GetContractReturnType } from 'viem';
import { getTracedTxFactory } from './_setup/utils.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import { inspect } from './_setup/utils/inspect.ts';

describe('inheritance', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'inheritance', 'test-contracts'>;

  let aContract: GetContractReturnType<ArtifactMap['test-contracts/inheritance/A.sol:A']['abi']>;
  let a2Contract: GetContractReturnType<ArtifactMap['test-contracts/inheritance/A2.sol:A2']['abi']>;

  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('inheritance', 'test-contracts');
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
