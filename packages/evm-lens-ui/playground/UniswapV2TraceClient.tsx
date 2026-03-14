import { useState, useEffect } from 'react';
import { createPair } from './uniswap-v2/setup';
import { TraceViewerClient, type TraceResult } from '../src/components/TraceViewerClient';

export function UniswapV2TraceClient() {
  const [trace, setTrace] = useState<TraceResult | null>(null);

  useEffect(() => {
    createPair().then(setTrace);
  }, []);

  if (!trace) {
    return <div>Loading...</div>;
  }

  return <TraceViewerClient trace={trace} />;
}
