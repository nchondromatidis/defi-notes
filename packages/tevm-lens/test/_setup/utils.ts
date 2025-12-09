import type { LensClient } from '../../src/lens/LensClient.ts';
import type { ContractResult } from 'tevm/actions';
import { inspect } from './utils/inspect.ts';
import type { FunctionEntryIndexes, ProtocolName, ArtifactMap } from './artifacts';
import { getContract } from 'viem';
import type { TestResourceLoader } from './TestResourceLoader.ts';

export function getTracedTxFactory(lensClient: LensClient<any, any, any, any>) {
  return {
    success: (contractTxResult: ContractResult, log: boolean = false) => {
      if (!contractTxResult?.txHash) return undefined;
      const rootFunction = lensClient.callDecodeTracer.succeededTxs.get(contractTxResult.txHash)?.rootFunction;
      if (log) inspect(rootFunction);
      return rootFunction;
    },
    failed: (ordinalNumber: number = 0, log: boolean = false) => {
      const tempIds = [...lensClient.callDecodeTracer.failedTxs.keys()];
      const targetTempId = tempIds[ordinalNumber];
      if (!targetTempId) return undefined;
      const rootFunction = lensClient.callDecodeTracer.failedTxs.get(targetTempId)?.rootFunction;
      if (log) inspect(rootFunction);
      return rootFunction;
    },
  };
}

export function deployFactory<ProjectsT extends ProtocolName, ProjectT extends ProjectsT, RootT extends string>(
  lensClient: LensClient<ArtifactMap, ProtocolName, ProjectT, RootT>,
  resourceLoader: TestResourceLoader<ArtifactMap, ProtocolName, ProjectT, RootT, FunctionEntryIndexes>
) {
  return async (...params: Parameters<(typeof lensClient)['deploy']>) => {
    const deploymentResult = await lensClient.deploy(...params);
    const deployedContractAbi = await resourceLoader.getArtifactPart(params[0], 'abi');
    return getContract({
      address: deploymentResult.createdAddress!,
      abi: deployedContractAbi,
      client: lensClient.client,
    });
  };
}
