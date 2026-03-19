import type {
  FunctionTraceCall,
  FunctionTraceEntry,
  FunctionTraceResult,
} from '../4_function-trace/FunctionTraceBuilder.ts';
import {
  isExternalCallEvmEvent,
  isExternalCallResultEvmEvent,
  isInternalFunctionCallEvent,
  isInternalFunctionCallResultEvent,
  type ExternalCallEvmEvent,
  type ExternalCallResultEvmEvent,
  type InternalFunctionCallEvent,
  type InternalFunctionCallResultEvent,
  type FunctionCallEvent,
} from './function-call-events.ts';
import type { ExternalCallDecoder } from './decoders/ExternalCallDecoder.ts';
import type { ExternalCallResultDecoder } from './decoders/ExternalCallResultDecoder.ts';
import type { FunctionEntryDecoder } from './decoders/FunctionEntryDecoder.ts';
import type { FunctionExitDecoder } from './decoders/FunctionExitDecoder.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX, jsonStr } from '../../../_common/debug.ts';

export type ExecutionContext = Map<number, { functionCallEvent: FunctionTraceCall; isJumpDestReached: boolean }>;

const debug = createDebug(`${DEBUG_PREFIX}:function-trace-events`);

export class DecodingStage {
  public readonly name = 'RoutingStage';

  private executionContext: ExecutionContext = new Map();
  private callStack: FunctionTraceCall[] = [];

  constructor(
    private externalCallDecoder: ExternalCallDecoder,
    private externalCallResultDecoder: ExternalCallResultDecoder,
    private functionEntryDecoder: FunctionEntryDecoder,
    private functionExitDecoder: FunctionExitDecoder
  ) {}

  async process(event: FunctionCallEvent): Promise<FunctionTraceEntry | undefined> {
    if (isExternalCallEvmEvent(event)) {
      return this.onExternalCall(event);
    } else if (isExternalCallResultEvmEvent(event)) {
      return await this.onExternalCallResult(event);
    } else if (isInternalFunctionCallEvent(event)) {
      return this.onInternalFunctionCall(event);
    } else if (isInternalFunctionCallResultEvent(event)) {
      return this.onInternalFunctionCallResult(event);
    }

    return undefined;
  }

  private onExternalCall(event: ExternalCallEvmEvent): FunctionTraceCall {
    const decoded = this.externalCallDecoder.decode(event);

    // Track execution context
    this.executionContext.set(event.depth, {
      functionCallEvent: decoded,
      isJumpDestReached: false,
    });
    this.callStack.push(decoded);

    return decoded;
  }

  private async onExternalCallResult(event: ExternalCallResultEvmEvent): Promise<FunctionTraceResult> {
    const currentCall = this.callStack.pop();
    if (!currentCall) {
      throw new Error('ExternalCallResultEvmEvent without matching call');
    }

    const decoded = await this.externalCallResultDecoder.decode(event, currentCall);

    this.executionContext.delete(currentCall.depth);

    debug(jsonStr(decoded));
    return decoded;
  }

  private onInternalFunctionCall(event: InternalFunctionCallEvent): FunctionTraceEntry | undefined {
    const parentCall = this.callStack[this.callStack.length - 1];
    if (!parentCall) {
      throw new Error('InternalFunctionCallEvent without parent call');
    }

    const context = this.executionContext.get(event.opcodeStepEvent.depth);
    const isJumpDestReached = context?.isJumpDestReached ?? false;

    const decoded = this.functionEntryDecoder.decode(event, isJumpDestReached, parentCall);

    if (decoded) {
      context!.isJumpDestReached = true;
      if (decoded === parentCall) return undefined;
      this.callStack.push(decoded);
      debug(jsonStr(decoded));
      return decoded;
    }

    return undefined;
  }

  private onInternalFunctionCallResult(event: InternalFunctionCallResultEvent): FunctionTraceEntry | undefined {
    const currentCall = this.callStack[this.callStack.length - 1];
    if (!currentCall) {
      throw new Error('InternalFunctionCallResultEvent without current call');
    }

    const decoded = this.functionExitDecoder.decode(event, currentCall);

    if (decoded) {
      this.callStack.pop();
      debug(jsonStr(decoded));
      return decoded;
    }

    return undefined;
  }

  reset(): void {
    this.executionContext.clear();
    this.callStack = [];

    this.externalCallDecoder.reset();
    this.externalCallResultDecoder.reset();
    this.functionEntryDecoder.reset();
    this.functionExitDecoder.reset();
  }
}
