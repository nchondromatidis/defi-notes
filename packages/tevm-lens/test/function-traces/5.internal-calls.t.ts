import { test, beforeEach, describe } from 'vitest';
import { LensClient } from '../../src/lens/LensClient.ts';
import { inspect } from '../_setup/utils/debug.ts';
import type { FunctionTracesArtifactsMap } from './_setup/types.ts';
import { deployFunctionTracesContracts } from './_setup/deploy.ts';
import { testSetup } from './_setup/testSetup.ts';

describe('function traces - 5.internal-calls', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];

  beforeEach(async () => {
    ({ lensClient, callerContract } = await testSetup());
  });

  test('callInternalAndPrivate', async () => {
    await lensClient.contract(callerContract, 'callInternalAndPrivate', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('callPublicAndExternal', async () => {
    await lensClient.contract(callerContract, 'callPublicAndExternal', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });
});
