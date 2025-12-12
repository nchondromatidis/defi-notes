import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { InvariantError } from '../../common/errors.ts';
import { LensCallTracerResult } from './LensCallTracerResult.ts';
import { type Hex } from '../types/artifact.ts';
import { ExternalCallHandler } from '../handlers/ExternalCallHandler.ts';
import { ExternalCallResultHandler } from '../handlers/ExternalCallResultHandler.ts';

type TempTxId = string;
type TxId = Hex;

export class LensCallTracer {
  public readonly tracingTxs: Map<string, LensCallTracerResult> = new Map();
  public readonly succeededTxs: Map<TxId, LensCallTracerResult> = new Map();
  public readonly failedTxs: Map<TempTxId, LensCallTracerResult> = new Map();

  constructor(
    private readonly externalCallHandler: ExternalCallHandler,
    private readonly externalCallResultHandler: ExternalCallResultHandler
  ) {}

  //** Start-Stop tracing **/

  public startTracing(tempId: string) {
    const txTrace = new LensCallTracerResult();
    this.tracingTxs.set(tempId, txTrace);
  }

  public stopTracingSuccess(txHash: Hex | undefined, tempId: string) {
    if (!txHash) throw new InvariantError('tx hash is empty');
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.succeededTxs.set(txHash, currentTxTrace);
    this.tracingTxs.delete(tempId);
    this.externalCallResultHandler.cleanCache(tempId);
  }

  public stopTracingFailed(txHash: string, tempId: string) {
    const currentTxTrace = this.tracingTxs.get(tempId);
    if (!currentTxTrace) throw new InvariantError('current tx trace is empty');

    this.failedTxs.set(txHash, currentTxTrace);
    this.tracingTxs.delete(tempId);
    this.externalCallResultHandler.cleanCache(tempId);
  }

  //** Event Handlers **/

  public async handleFunctionCall(callEvent: Message, tempId: string): Promise<void> {
    const tempIdTxTrace = this.getTracingTx(tempId);
    const functionCallEvent = await this.externalCallHandler.handleFunctionCall(callEvent);
    tempIdTxTrace.addFunctionCall(functionCallEvent);
  }

  public async handleFunctionResult(resultEvent: EvmResult, tempId: string) {
    const tempIdTxTrace = this.getTracingTx(tempId);
    const functionCallEvent = tempIdTxTrace.getCurrentFunctionCallEvent();
    const functionResultEvent = await this.externalCallResultHandler.handleFunctionResult(
      resultEvent,
      tempId,
      functionCallEvent
    );
    tempIdTxTrace.addResult(functionResultEvent);
  }

  //** Helper Functions **/

  private getTracingTx(tempId: string) {
    if (!this.tracingTxs.has(tempId)) {
      throw new InvariantError('getTracingTx called without startTxTrace');
    }
    return this.tracingTxs.get(tempId)!;
  }
}
