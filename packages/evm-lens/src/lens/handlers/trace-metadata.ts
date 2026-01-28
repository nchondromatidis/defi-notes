import type { FunctionCallEvent } from '../call-tracer/CallTrace.ts';

export type PC = number;
export type Depth = number;

export type RuntimeTraceMetadata = {
  executionContext: Map<Depth, { functionCallEvent: FunctionCallEvent; isJumpDestReached: boolean }>;
};

export function emptyRuntimeTraceMetadata(): RuntimeTraceMetadata {
  return {
    executionContext: new Map(),
  };
}
