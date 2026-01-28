import type { LensClient } from '../../src/lens/LensClient.ts';
import type { ContractResult } from 'tevm/actions';
import { inspect } from './utils/inspect.ts';

export function getTracedTxFactory(lensClient: LensClient<any>) {
  return {
    success: (contractTxResult: ContractResult, log: boolean = false) => {
      if (!contractTxResult?.txHash) return undefined;
      const rootFunction = lensClient.callTracer.succeededTxs.get(contractTxResult.txHash)?.rootFunction;
      if (log) inspect(rootFunction);
      return rootFunction;
    },
    failed: (ordinalNumber: number = 0, log: boolean = false) => {
      const tempIds = [...lensClient.callTracer.failedTxs.keys()];
      const targetTempId = tempIds[ordinalNumber];
      if (!targetTempId) return undefined;
      const rootFunction = lensClient.callTracer.failedTxs.get(targetTempId)?.rootFunction;
      if (log) inspect(rootFunction);
      return rootFunction;
    },
  };
}
