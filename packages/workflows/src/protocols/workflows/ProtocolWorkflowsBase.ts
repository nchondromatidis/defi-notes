import type { ReadOnlyFunctionCallEvent } from '@protocol-lens/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';
import type { TraceResult } from '@protocol-lens/evm-lens-ui/types/TraceResult';
import type { LensClient } from '@protocol-lens/evm-lens/src/lens/LensClient.ts';
import type { IResourceLoader } from '@protocol-lens/evm-lens/src/lens/_ports/IResourceLoader.ts';
import { buildCallTracer } from '@protocol-lens/evm-lens/src/lens';
import { _1e18 } from './_constants.ts';
import type { Account } from 'viem';

export abstract class ProtocolWorkflowsBase<T extends object> {
  // CACHE
  protected protocolsFqnListCache: string[] | undefined;

  constructor(
    protected readonly lensClient: LensClient<T>,
    protected readonly resourceLoader: IResourceLoader
  ) {}

  static async buildLens<T extends object>(resourceLoader: IResourceLoader, defaultAccount: Account) {
    const { lensClient } = await buildCallTracer<T>(defaultAccount);
    await lensClient.registerIndexes(resourceLoader, 'uniswap-v2');
    await lensClient.fundAccount(defaultAccount.address, 1000n * _1e18);

    return lensClient;
  }

  async getProjectFiles() {
    if (!this.protocolsFqnListCache) {
      this.protocolsFqnListCache = await this.resourceLoader.getProtocolContractsFqn('uniswap-v2');
    }
    return this.protocolsFqnListCache;
  }

  async toTraceResult(trace: ReadOnlyFunctionCallEvent | undefined): Promise<TraceResult | undefined> {
    if (!trace) return undefined;
    return { resourceLoader: this.resourceLoader, trace, contractFqnList: await this.getProjectFiles() };
  }

  maxUint256() {
    return 2n ** 256n - 1n;
  }
}
