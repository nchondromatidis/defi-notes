import { test, beforeEach, describe } from 'vitest';
import { LensClient } from '../../src/lens/LensClient.ts';
import { inspect } from '../_setup/utils/debug.ts';
import type { FunctionTracesArtifactsMap } from './_setup/types.ts';
import { deployFunctionTracesContracts } from './_setup/deploy.ts';
import { testSetup } from './_setup/testSetup.ts';

describe('function traces - 3.delegate-calls', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];

  beforeEach(async () => {
    ({ lensClient, callerContract } = await testSetup());
  });

  test('callDelegateCall', async () => {
    const calldata = '0x'; // Example calldata, adjust as needed
    await lensClient.contract(callerContract, 'callDelegateCall', [calldata]);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('precompile', async () => {});
});
