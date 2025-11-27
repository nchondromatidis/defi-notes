import { test, beforeEach, describe } from 'vitest';
import { LensClient } from '../../src/lens/LensClient.ts';
import { inspect } from '../_setup/utils/debug.ts';
import type { FunctionTracesArtifactsMap } from './_setup/types.ts';
import { deployFunctionTracesContracts } from './_setup/deploy.ts';
import type { Hex } from '../../src/lens/types/artifact.ts';
import { testSetup } from './_setup/testSetup.ts';

describe('function traces - 2.create-functions', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];

  beforeEach(async () => {
    ({ lensClient, callerContract } = await testSetup());
  });

  test('deployContract', async () => {
    await lensClient.contract(callerContract, 'callPublicFunction', []);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });

  test('create2Contract', async () => {
    const hex32Pattern = ('0x' + '11'.repeat(32)) as Hex;
    await lensClient.contract(callerContract, 'create2Contract', [hex32Pattern]);
    inspect(lensClient.callDecodeTracer.succeededTxs);
  });
});
