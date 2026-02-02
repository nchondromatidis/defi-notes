import { useState, useEffect } from 'react';
import { TraceViewer } from '@/index';
import { setupUniswapV2 } from './uniswap-v2/setup';
import type { ReadOnlyFunctionCallEvent } from '@defi-notes/evm-lens/src/lens/call-tracer/CallTrace.ts';
import { DEFAULT_INITIAL_EXPANDED_ITEMS, DEFAULT_ITEMS } from './mock-data/project-files';

export function TraceViewerClient() {
  const [functionTrace, setFunctionTrace] = useState<ReadOnlyFunctionCallEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { lensClient, factory } = await setupUniswapV2();

      const token1 = await lensClient.deploy(
        'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
        []
      );
      const token2 = await lensClient.deploy(
        'contracts/uniswap-v2/v2-core/contracts/UniswapV2ERC20.sol:UniswapV2ERC20',
        []
      );

      const result = await lensClient.contract(factory, 'createPair', [token1.createdAddress!, token2.createdAddress!]);

      const trace = lensClient.getSucceeded(result);
      if (trace) {
        setFunctionTrace(trace);
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!functionTrace) return <div>No trace</div>;

  return (
    <TraceViewer
      functionTrace={functionTrace}
      projectFiles={DEFAULT_ITEMS}
      initialExpandedFolders={DEFAULT_INITIAL_EXPANDED_ITEMS}
    />
  );
}
