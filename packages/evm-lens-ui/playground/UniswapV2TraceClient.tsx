import { TraceViewerClient } from '@/components/TraceViewerClient.tsx';
import { createPair } from './uniswap-v2/setup';

export function UniswapV2TraceClient() {
  return <TraceViewerClient setup={createPair} />;
}
