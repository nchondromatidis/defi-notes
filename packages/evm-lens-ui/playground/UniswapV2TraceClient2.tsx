import { useState, useEffect } from 'react';
import { createPair } from './uniswap-v2/setup';
import { TraceViewerClient2 } from '../src/components2/TraceViewerClient2.tsx';
import type { TraceResult } from '../src/types/TraceResult.ts';

export function UniswapV2TraceClient2() {
  const [trace, setTrace] = useState<TraceResult | null>(null);

  useEffect(() => {
    createPair().then(setTrace);
  }, []);

  if (!trace) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-on-surface-variant">Initializing trace...</span>
        </div>
      </div>
    );
  }

  return <TraceViewerClient2 trace={trace} />;
}
