import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import type { TraceResult } from '@defi-notes/evm-lens-ui';
import type { LensClient } from '@defi-notes/evm-lens/src/lens/LensClient.ts';
import type { IResourceLoader } from '@defi-notes/evm-lens/src/lens/_ports/IResourceLoader.ts';
import { buildCallTracer } from '@defi-notes/evm-lens/src/lens';
import { ETHER_1 } from '@/protocols/_constants.ts';

export abstract class ProtocolActionsBase<T extends object> {
  protected protocolsFqnListCache: string[] | undefined;

  constructor(
    protected readonly lensClient: LensClient<T>,
    protected resourceLoader: IResourceLoader
  ) {}

  static async buildLens<T extends object>(resourceLoader: IResourceLoader) {
    const { lensClient, deployerAccount } = await buildCallTracer<T>();
    await lensClient.registerIndexes(resourceLoader, 'uniswap-v2');
    await lensClient.fundAccount(deployerAccount.address, ETHER_1);

    return lensClient;
  }

  abstract deploy(): unknown;

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
}
