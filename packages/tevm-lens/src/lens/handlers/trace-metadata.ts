import type { FunctionCallEvent } from '../CallTrace.ts';
import type { LensFunctionIndex } from '../types.ts';

export type PC = number;
export type Depth = number;
export type TraceId = number;

export type RuntimeTraceMetadata = {
  executionContext: Map<Depth, { functionCallEvent: FunctionCallEvent; isJumpDestReached: boolean }>;
  functionExits: Map<Depth, Map<PC, FunctionCallEvent>>;
  callstack: CallStack;
};

export function emptyRuntimeTraceMetadata(): RuntimeTraceMetadata {
  return {
    executionContext: new Map(),
    functionExits: new Map(),
    callstack: new CallStack(),
  };
}

export class CallStack {
  private callstack: LensFunctionIndex[] = [];

  push(functionIndex: LensFunctionIndex) {
    if (this.equals(functionIndex, this.getLast())) return undefined;
    this.callstack.push(functionIndex);
    return functionIndex;
  }

  pop() {
    console.log('popped', this.callstack.pop()?.name);
  }

  private getLast(): LensFunctionIndex | undefined {
    return this.callstack[this.callstack.length - 1];
  }

  private equals(index1: LensFunctionIndex, index2: LensFunctionIndex | undefined): boolean {
    if (!index2) return false;
    return index1.name === index2.name && index1.kind === index2.kind && index1.contractFQN === index2.contractFQN;
  }
}
