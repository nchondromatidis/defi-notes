import { test, beforeEach, describe, expect } from 'vitest';
import { LensClient } from '../../src/lens/LensClient.ts';
import type { FunctionTracesArtifactsMap } from './_setup/types.ts';
import { deployFunctionTracesContracts } from './_setup/deploy.ts';
import type { Hex } from '../../src/lens/types/artifact.ts';
import { testSetup } from './_setup/testSetup.ts';
import { getTracedTxFactory } from './_setup/utils.ts';

describe('function traces - 2.create-functions', () => {
  let lensClient: LensClient<FunctionTracesArtifactsMap>;
  let callerContract: Awaited<ReturnType<typeof deployFunctionTracesContracts>>['callerContract'];
  let getTracedTx: ReturnType<typeof getTracedTxFactory>;

  beforeEach(async () => {
    ({ lensClient, callerContract } = await testSetup());
    getTracedTx = getTracedTxFactory(lensClient);
  });

  test('deployContract', async () => {
    const result = await lensClient.contract(callerContract, 'deployContract', []);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });

  test('create2Contract', async () => {
    const hex32Pattern = ('0x' + '11'.repeat(32)) as Hex;
    const result = await lensClient.contract(callerContract, 'create2Contract', [hex32Pattern]);
    expect(getTracedTx.success(result)).toMatchSnapshot();
  });
});
