import { HardhatEvmLensHttpRL } from '@protocol-lens/evm-lens/src/adapters/resource-loader/HardhatEvmLensHttpRL.ts';

import type { TraceResult } from '../../src/types/TraceResult.ts';
import { UniswapV2Workflows } from '@protocol-lens/workflows/protocols/workflows/UniswapV2Workflows';

export async function createPair(): Promise<TraceResult> {
  try {
    const resourceLoader = new HardhatEvmLensHttpRL('http://localhost:5173', 'contracts');
    const contractFqnList = await resourceLoader.getProtocolContractsFqn('uniswap-v2');

    const uniswapV2Workflows = await UniswapV2Workflows.create(resourceLoader);

    const result = await uniswapV2Workflows.addLiquidity();

    if (!result.trace) {
      return { error: 'Failed to get trace from transaction' };
    }

    return {
      resourceLoader,
      trace: result.trace,
      contractFqnList,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
