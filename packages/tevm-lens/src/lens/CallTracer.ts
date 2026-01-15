import type { Message } from 'tevm/actions';
import type { EvmResult, InterpreterStep } from 'tevm/evm';
import { InvariantError } from '../common/errors.ts';
import { CallTrace } from './CallTrace.ts';
import { type Hex, type TracingId, type TxId } from './types.ts';
import { ExternalCallHandler } from './handlers/trace-events/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from './handlers/trace-events/ExternalCallResultHandler.ts';
import { FunctionEntryHandler } from './handlers/trace-events/FunctionEntryHandler.ts';
import { emptyRuntimeTraceMetadata, type RuntimeTraceMetadata } from './handlers/trace-metadata.ts';
import { FunctionExitHandler } from './handlers/trace-events/FunctionExitHandler.ts';
import type { FunctionCallMatcher } from './handlers/pattern-matchers/FunctionCallMatcher.ts';

export class CallTracer {
  public readonly tracingTx: Map<TracingId, CallTrace> = new Map();
  public readonly runtimeTraceMetadata: Map<TracingId, RuntimeTraceMetadata> = new Map();

  public readonly succeededTxs: Map<TxId, CallTrace> = new Map();
  public readonly failedTxs: Map<TxId, CallTrace> = new Map();

  constructor(
    private readonly externalCallHandler: ExternalCallHandler,
    private readonly externalCallResultHandler: ExternalCallResultHandler,
    private readonly functionEntryHandler: FunctionEntryHandler,
    private readonly functionExitHandler: FunctionExitHandler,
    private readonly functionCallMatcher: FunctionCallMatcher
  ) {}

  //** Start-Stop Tracing **/

  public startTracing(tracingId: string) {
    const callTrace = new CallTrace();
    this.tracingTx.set(tracingId, callTrace);
    this.runtimeTraceMetadata.set(tracingId, emptyRuntimeTraceMetadata());
  }

  public stopTracing(txHash: Hex, tracingId: string, status: 'success' | 'failed') {
    const currentTxTrace = this.tracingTx.get(tracingId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    if (status == 'failed') this.failedTxs.set(txHash, currentTxTrace);
    if (status == 'success') this.succeededTxs.set(txHash, currentTxTrace);

    this.tracingTx.delete(tracingId);
    this.runtimeTraceMetadata.delete(tracingId);
    this.externalCallResultHandler.cleanCache(tracingId);
  }

  //** Router **/

  public async route(event: Message | EvmResult | InterpreterStep, tracingId: string) {
    // Message
    if ('value' in event) {
      await this.handleExternalCall(event as Message, tracingId);
      return;
    }
    // EvmResult
    if ('execResult' in event) {
      const evmResult = event as EvmResult;
      await this.handleExternalCallResult(evmResult, tracingId);
      return;
    }
    // InterpreterStep
    if ('opcode' in event) {
      const stepEvent = event as InterpreterStep;
      await this.handleFunctionCallMatcher(stepEvent, tracingId);
      // await this.handleFunctionEntryHandler(stepEvent, tracingId);
      // await this.handleFunctionExitHandler(stepEvent, tracingId);
      return;
    }
  }

  //** Event Handlers **/

  private async handleExternalCall(callEvent: Message, tracingId: string): Promise<void> {
    const functionCallEvent = await this.externalCallHandler.handle(callEvent);

    this.tracingTx.get(tracingId)!.addFunctionCall(functionCallEvent);

    this.runtimeTraceMetadata
      .get(tracingId)!
      .executionContext.set(functionCallEvent.depth, { functionCallEvent, isJumpDestReached: false });
  }

  private async handleExternalCallResult(resultEvent: EvmResult, tracingId: string) {
    const functionCallEvent = this.tracingTx.get(tracingId)!.getLatestFunctionCallEvent();
    if (!functionCallEvent) throw new InvariantError('handleExternalCallResult without call registered');
    const functionResultEvent = await this.externalCallResultHandler.handle(resultEvent, tracingId, functionCallEvent);

    this.tracingTx.get(tracingId)!.addResult(functionResultEvent);
    this.runtimeTraceMetadata.get(tracingId)!.executionContext.delete(functionCallEvent.depth);
  }

  private async handleFunctionEntryHandler(stepEvent: InterpreterStep, tracingId: string) {
    const parentFunctionCallEvent = this.tracingTx.get(tracingId)!.getLatestFunctionCallEvent();
    if (!parentFunctionCallEvent) {
      throw new InvariantError('handleFunctionEntryHandler called before external call handers');
    }
    const executionContext = this.runtimeTraceMetadata.get(tracingId)!.executionContext;
    const callStack = this.runtimeTraceMetadata.get(tracingId)!.callstack;

    const result = await this.functionEntryHandler.handle(
      stepEvent,
      executionContext,
      parentFunctionCallEvent,
      callStack
    );

    if (!result) return;

    const { functionCallEvent, functionExitPc } = result;

    if (functionCallEvent !== executionContext.get(stepEvent.depth)!.functionCallEvent) {
      this.tracingTx.get(tracingId)!.addFunctionCall(functionCallEvent);
    }

    const depth = stepEvent.depth;
    if (!this.runtimeTraceMetadata.get(tracingId)!.functionExits.has(depth)) {
      this.runtimeTraceMetadata.get(tracingId)!.functionExits.set(depth, new Map());
    }
    this.runtimeTraceMetadata.get(tracingId)!.functionExits.get(depth)!.set(functionExitPc, functionCallEvent);
  }

  private async handleFunctionExitHandler(stepEvent: InterpreterStep, tracingId: string) {
    const functionCallEvent = this.tracingTx.get(tracingId)!.getLatestFunctionCallEvent()!;
    const functionExits = this.runtimeTraceMetadata.get(tracingId)!.functionExits;

    const functionResultEvent = await this.functionExitHandler.handle(stepEvent, functionCallEvent, functionExits);

    if (functionResultEvent) this.tracingTx.get(tracingId)!.addResult(functionResultEvent);
  }

  private async handleFunctionCallMatcher(stepEvent: InterpreterStep, tracingId: string) {
    const executionContext = this.runtimeTraceMetadata.get(tracingId)!.executionContext;
    await this.functionCallMatcher.handle(stepEvent, executionContext);
  }
}
