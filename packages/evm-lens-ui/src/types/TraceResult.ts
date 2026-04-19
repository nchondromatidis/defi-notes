import type { IResourceLoader } from '@protocol-lens/evm-lens/src/lens/_ports/IResourceLoader.ts';
import type { ReadOnlyFunctionCallEvent } from '@protocol-lens/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';

export type TraceResultSuccess = {
  resourceLoader: IResourceLoader;
  trace: ReadOnlyFunctionCallEvent;
  contractFqnList: string[];
};
export type TraceResultError = {
  error: string;
};

export type TraceResult = TraceResultSuccess | TraceResultError;
