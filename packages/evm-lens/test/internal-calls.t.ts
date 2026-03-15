import { test, beforeEach, describe, expect } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap } from './_setup/artifacts';
import { createLensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { GetContractReturnType } from 'viem';
import type { Address, LensArtifactsMap } from '../src/lens/types.ts';
import type { LensArtifactsMapSlice } from '../src/client-utils/type-helpers.ts';
import { inspect } from './_setup/utils/inspect.ts';

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
    const txHash = lensClient.functionTracer.succeededTxs.keys().next().value;
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
    const txHash = lensClient.functionTracer.succeededTxs.keys().next().value;
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

  test('richStackFunction - function with rich EVM stack', async () => {
    const path: Address[] = [
      '0x0000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000002',
    ];
    const to = '0x0000000000000000000000000000000000000004';

    const result = await lensClient.contract(callerContract, 'richStackFunction', [
      100n, // amountIn
      90n, // amountOutMin
      path,
      to,
      9999999999n, // deadline
    ]);
    const trace = lensClient.getTracedTx(result);
    inspect(trace);
  });
});
