import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../../src/lens/LensClient.ts';
import type { FunctionTracesArtifactsMap } from './_setup/types.ts';
import { deployFunctionTracesContracts } from './_setup/deploy.ts';
import { testSetup } from './_setup/testSetup.ts';
import { getTracedTxFactory } from './_setup/utils.ts';

describe('function traces - 3.delegate-calls', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    ({ lensClient, callerContract } = await testSetup());
    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('callDelegateCall', async () => {
    const calldata = '0x01'; // Example calldata, adjust as needed
    const result = await lensClient.contract(callerContract, 'callDelegateCall', [calldata]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('emitted different log with same log signature from different contracts', async () => {});
});
