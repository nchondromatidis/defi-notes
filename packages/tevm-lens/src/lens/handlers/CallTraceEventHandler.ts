import { ExternalCallHandler } from './call-trace-event-handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from './call-trace-event-handlers/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from './call-trace-event-handlers/FunctionEntryHandler.ts';
import { FunctionExitHandler } from './call-trace-event-handlers/FunctionExitHandler.ts';
import { CallTrace } from '../CallTrace.ts';
import { emptyRuntimeTraceMetadata, type RuntimeTraceMetadata } from './trace-metadata.ts';
import { InvariantError } from '../../common/errors.ts';

import type { DeepReadonly } from '../../common/utils.ts';
import {
  type CallTraceEvents,
  type InternalFunctionCallEvent,
  type InternalFunctionCallResultEvent,
  isInternalFunctionCallEvent,
  isInternalFunctionCallResultEvent,
  isExternalCallResultEvmEvent,
  isExternalCallEvmEvent,
  type ExternalCallEvmEvent,
  type ExternalCallResultEvmEvent,
} from './_events/call-trace-events.ts';

export class CallTraceEventHandler {
  private callTrace: CallTrace;
  private runtimeTraceMetadata: RuntimeTraceMetadata;

  constructor(
    private readonly externalCallHandler: ExternalCallHandler,
    private readonly externalCallResultHandler: ExternalCallResultHandler,
    private readonly functionEntryHandler: FunctionEntryHandler,
    private readonly functionExitHandler: FunctionExitHandler
  ) {
    this.callTrace = new CallTrace();
    this.runtimeTraceMetadata = emptyRuntimeTraceMetadata();
  }

  public getCallTrace(): DeepReadonly<CallTrace> {
    return this.callTrace;
  }

  public reset() {
    this.callTrace = new CallTrace();
    this.runtimeTraceMetadata = emptyRuntimeTraceMetadata();
    this.externalCallResultHandler.reset();
  }

  //** Route **/

  public async route(event: CallTraceEvents) {
    switch (true) {
      case isExternalCallEvmEvent(event): {
        await this.handleExternalCall(event);
        break;
      }
      case isExternalCallResultEvmEvent(event): {
        await this.handleExternalCallResult(event);
        break;
      }
      case isInternalFunctionCallEvent(event): {
        await this.handleFunctionEntryHandler(event);
        break;
      }
      case isInternalFunctionCallResultEvent(event): {
        await this.handleFunctionExitHandler(event);
        break;
      }
      default:
        throw new InvariantError('Missing routing entry for event type');
    }
  }

  //** Event Handlers **/

  private async handleExternalCall(callEvent: ExternalCallEvmEvent): Promise<void> {
    const functionCallEvent = await this.externalCallHandler.handle(callEvent);

    this.callTrace.addFunctionCall(functionCallEvent);

    this.runtimeTraceMetadata.executionContext.set(functionCallEvent.depth, {
      functionCallEvent,
      isJumpDestReached: false,
    });
  }

  private async handleExternalCallResult(resultEvent: ExternalCallResultEvmEvent) {
    const functionCallEvent = this.callTrace.getLatestFunctionCallEvent();
    if (!functionCallEvent) throw new InvariantError('handleExternalCallResult without call registered');
    const functionResultEvent = await this.externalCallResultHandler.handle(resultEvent, functionCallEvent);

    this.callTrace.addResult(functionResultEvent);
    this.runtimeTraceMetadata.executionContext.delete(functionCallEvent.depth);
  }

  private async handleFunctionEntryHandler(internalCallEvent: InternalFunctionCallEvent) {
    const parentFunctionCallEvent = this.callTrace.getLatestFunctionCallEvent();
    if (!parentFunctionCallEvent) {
      throw new InvariantError('handleFunctionEntryHandler called before external call handers');
    }
    const executionContext = this.runtimeTraceMetadata.executionContext;

    const functionCallEvent = await this.functionEntryHandler.handle(
      internalCallEvent,
      executionContext,
      parentFunctionCallEvent
    );

    if (!functionCallEvent) return;

    if (functionCallEvent !== executionContext.get(internalCallEvent.opcodeStepEvent.depth)!.functionCallEvent) {
      this.callTrace.addFunctionCall(functionCallEvent);
    }
  }

  private async handleFunctionExitHandler(internalCallResultEvent: InternalFunctionCallResultEvent) {
    const functionCallEvent = this.callTrace.getLatestFunctionCallEvent()!;

    const functionResultEvent = await this.functionExitHandler.handle(internalCallResultEvent, functionCallEvent);

    if (functionResultEvent) this.callTrace.addResult(functionResultEvent);
  }
}
