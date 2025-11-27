import { test, beforeEach, describe } from 'vitest';
import { LensClient } from '../../src/lens/LensClient.ts';
import { inspect } from '../_setup/utils/debug.ts';
import { ETHER_1 } from '../_setup/utils/constants.ts';
import type { FunctionTracesArtifactsMap } from './_setup/types.ts';
import { deployFunctionTracesContracts } from './_setup/deploy.ts';
import { testSetup } from './_setup/testSetup.ts';

describe('function traces - 1.external-functions', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];

  beforeEach(async () => {
    ({ lensClient, callerContract } = await testSetup());
  });

  test('callPublicFunction', async () => {
    await lensClient.contract(callerContract, 'callPublicFunction', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('callExternalFunction', async () => {
    await lensClient.contract(callerContract, 'callExternalFunction', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('callPublicAndExternal', async () => {
    await lensClient.contract(callerContract, 'callPublicAndExternal', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('callStaticCallViewFunction', async () => {
    await lensClient.contract(callerContract, 'callStaticCallViewFunction', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('callWithFallback', async () => {
    const calldata = '0x20';
    await lensClient.contract(callerContract, 'callWithFallback', [calldata], ETHER_1);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('callReceiveFunction', async () => {
    await lensClient.contract(callerContract, 'callReceiveFunction', [], ETHER_1);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('emitted different log with same log signature from different contracts', async () => {});
});
