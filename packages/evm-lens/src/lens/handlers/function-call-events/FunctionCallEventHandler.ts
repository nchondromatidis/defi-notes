import { ExternalCallHandler } from './handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from './handlers/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from './handlers/FunctionEntryHandler.ts';
import { FunctionExitHandler } from './handlers/FunctionExitHandler.ts';
import { FunctionTrace, type ReadOnlyFunctionCallEvent } from '../FunctionTrace.ts';
import { emptyRuntimeTraceMetadata, type RuntimeTraceMetadata } from './trace-metadata.ts';
import { InvariantError } from '../../../_common/errors.ts';

import {
  type FunctionCallEvent,
  type InternalFunctionCallEvent,
  type InternalFunctionCallResultEvent,
  isInternalFunctionCallEvent,
  isInternalFunctionCallResultEvent,
  isExternalCallResultEvmEvent,
  isExternalCallEvmEvent,
  type ExternalCallEvmEvent,
  type ExternalCallResultEvmEvent,
} from './events/function-call-events.ts';

export class FunctionCallEventHandler {
  private callTrace: FunctionTrace;
  private runtimeTraceMetadata: RuntimeTraceMetadata;

  constructor(
    private readonly externalCallHandler: ExternalCallHandler,
    private readonly externalCallResultHandler: ExternalCallResultHandler,
    private readonly functionEntryHandler: FunctionEntryHandler,
    private readonly functionExitHandler: FunctionExitHandler
  ) {
    this.callTrace = new FunctionTrace();
    this.runtimeTraceMetadata = emptyRuntimeTraceMetadata();
  }

  public getCallTrace(): ReadOnlyFunctionCallEvent | undefined {
    return this.callTrace.rootFunction;
  }

  public reset() {
    this.callTrace = new FunctionTrace();
    this.runtimeTraceMetadata = emptyRuntimeTraceMetadata();
    this.externalCallResultHandler.reset();
  }

  //** Route **/

  public async route(event: FunctionCallEvent) {
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
