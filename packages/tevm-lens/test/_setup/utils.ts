import type { LensClient } from '../../src/lens/LensClient.ts';
import type { ContractResult } from 'tevm/actions';
import { inspect } from './utils/inspect.ts';
import type { FunctionEntryIndexes, ProtocolName, ArtifactMap } from './artifacts';
import { type ContractConstructorArgs, getContract } from 'viem';
import type { TestResourceLoader } from './TestResourceLoader.ts';
import type { Address, LensArtifactsMap } from '../../src/lens/types/artifact.ts';

export function getTracedTxFactory(lensClient: LensClient<any, any, any, any>) {
  return {
    success: (contractTxResult: ContractResult, log: boolean = false) => {
      if (!contractTxResult?.txHash) return undefined;
      const rootFunction = lensClient.tracer.succeededTxs.get(contractTxResult.txHash)?.rootFunction;
      if (log) inspect(rootFunction);
      return rootFunction;
    },
    failed: (ordinalNumber: number = 0, log: boolean = false) => {
      const tempIds = [...lensClient.tracer.failedTxs.keys()];
      const targetTempId = tempIds[ordinalNumber];
      if (!targetTempId) return undefined;
      const rootFunction = lensClient.tracer.failedTxs.get(targetTempId)?.rootFunction;
      if (log) inspect(rootFunction);
      return rootFunction;
    },
  };
}
