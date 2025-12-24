import { test, beforeEach, describe, expect } from 'vitest';
import type { LensClient } from '../src/lens/LensClient.ts';
import type { ArtifactMap, ProtocolName } from './_setup/artifacts';
import { getTracedTxFactory } from './_setup/utils.ts';
import { lensTracerTestSetup } from './_setup/lensTracerTestSetup.ts';
import type { GetContractReturnType } from 'viem';

describe('internal-calls', () => {
  let lensClient: LensClient<ArtifactMap, ProtocolName, 'internal-calls', 'test-contracts'>;
  let callerContract: GetContractReturnType<
    ArtifactMap['test-contracts/internal-calls/CallerContract.sol:CallerContract']['abi']
  >;

  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    const { lensClient: _lensClient } = await lensTracerTestSetup('internal-calls', 'test-contracts');
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

    getTracedTx = getTracedTxFactory(lensClient);
  });

  test.skip('debug_traceTransaction.structLogs', async () => {
    await lensClient.contract(callerContract, 'mixedCall', [2n]);
    const txHash = lensClient.txTracer.succeededTxs.keys().next().value;
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
    const txHash = lensClient.txTracer.succeededTxs.keys().next().value;
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

  test('mixedCall', async () => {
    const result = await lensClient.contract(callerContract, 'mixedCall', [2n]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('callAnotherContract', async () => {
    const result = await lensClient.contract(callerContract, 'callAnotherContract', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('test function fallback', async () => {
    const result = await lensClient.contract(callerContract, 'callAnotherContractWithFallback', [1n]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });
});
