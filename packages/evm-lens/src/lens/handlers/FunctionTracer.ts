import { type ReadOnlyFunctionCallEvent } from './FunctionTrace.ts';
import { type TxId } from '../types.ts';
import type { TEvmEvent } from './tevm-events/tevm-events.ts';
import type { FunctionCallEventHandler } from './function-call-events/FunctionCallEventHandler.ts';
import type { Hex } from 'viem';
import { EvmEventStore } from './evm-events/EvmEventStore.ts';
import { EvmEventPreprocessor } from './evm-events/preprocessor/EvmEventPreprocessor.ts';

export class FunctionTracer {
  public readonly succeededTxs: Map<TxId, ReadOnlyFunctionCallEvent> = new Map();
  public readonly failedTxs: Map<TxId, ReadOnlyFunctionCallEvent> = new Map();

  constructor(
    private readonly evmEventStore: EvmEventStore,
    private readonly evmEventPreprocessor: EvmEventPreprocessor,
    private readonly functionCallEventHandler: FunctionCallEventHandler
  ) {}

  async register(event: TEvmEvent) {
    this.evmEventStore.store(event);
  }

  public async process() {
    const callTraceEvents = await this.evmEventPreprocessor.matchFunctionCallOpcodeSequence(
      this.evmEventStore.getEvmEvents()
    );
    for (const callTraceEvent of callTraceEvents) {
      await this.functionCallEventHandler.route(callTraceEvent);
    }
  }

  public save(txHash: Hex, status: 'success' | 'failed') {
    const callTrace = this.functionCallEventHandler.getCallTrace();

    if (callTrace && status == 'failed') this.failedTxs.set(txHash, callTrace);
    if (callTrace && status == 'success') this.succeededTxs.set(txHash, callTrace);
  }

  public reset() {
    this.evmEventStore.reset();
    this.evmEventPreprocessor.reset();
    this.functionCallEventHandler.reset();
  }
}
