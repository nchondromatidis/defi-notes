import { test, beforeEach, describe, expect } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap } from './_setup/artifacts';
import { createLensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { GetContractReturnType } from 'viem';
import type { LensArtifactsMap } from '../src/lens/types.ts';
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

  test.skip('debug_traceTransaction.structLogs', async () => {
    await lensClient.contract(callerContract, 'mixedCall', [2n]);
    const txHash = lensClient.callTracer.succeededTxs.keys().next().value;
    const callTraceResult = await lensClient.client.transport.tevm.request({
      method: 'debug_traceTransaction',
      params: [
        {
          transactionHash: txHash,
          tracer: 'structLogs',
          tracerConfig: {
            enableMemory: true,
          },
        },
      ],
    });

    // fs.writeFileSync('./structLogs.json', JSON.stringify(callTraceResult, null, 2), 'utf8');
    console.log(callTraceResult);
  });

  test.skip('debug_traceTransaction.callTracer', async () => {
    await lensClient.contract(callerContract, 'mixedCall', [2n]);
    const txHash = lensClient.callTracer.succeededTxs.keys().next().value;
    const callTraceResult = await lensClient.client.transport.tevm.request({
      method: 'debug_traceTransaction',
      params: [
        {
          transactionHash: txHash,
          tracer: 'callTracer',
          tracerConfig: { onlyTopCall: false },
        },
      ],
    });

    console.log(callTraceResult);
  });

  test('publicFunction', async () => {
    const result = await lensClient.contract(callerContract, 'publicFunction', [2n]);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('mixedCall', async () => {
    const result = await lensClient.contract(callerContract, 'mixedCall', [2n]);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('callAnotherContract', async () => {
    const result = await lensClient.contract(callerContract, 'callAnotherContract', []);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });

  test('test function fallback', async () => {
    const result = await lensClient.contract(callerContract, 'callAnotherContractWithFallback', [1n]);
    expect(lensClient.getSucceeded(result)).toMatchSnapshot();
  });
});
