import type { FunctionCallEvent } from '../tx-tracer/TxTrace.ts';

export type FunctionCallEventHandlers = {
  externalCallHandler: boolean;
  opcodesCallHandler: boolean;
};

export type PC = bigint;
export type Depth = number;
export type RuntimeTraceMetadata = {
  functionHandlers: Map<FunctionCallEvent, FunctionCallEventHandlers>;
  functionExits: Map<PC, FunctionCallEvent>;
  executionContext: Map<Depth, FunctionCallEvent>;
};

export function emptyRuntimeTraceMetadata(): RuntimeTraceMetadata {
  return {
    functionHandlers: new Map(),
    functionExits: new Map(),
    executionContext: new Map(),
  };
}
