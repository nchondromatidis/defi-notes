import { type ReadOnlyFunctionCallEvent } from './FunctionTrace.ts';
import { type TxId } from '../types.ts';
import type { TEvmEvent } from './tevm-events/tevm-events.ts';
import type { FunctionCallEventHandler } from './function-call-events/FunctionCallEventHandler.ts';
import type { Hex } from 'viem';
import { EvmEventStore } from './evm-events/store/EvmEventStore.ts';
import { EvmEventHandler } from './evm-events/handler/EvmEventHandler.ts';
import { TevmEventsAdapter } from './tevm-events/TevmEventAdapter.ts';

export class FunctionTracer {
  public readonly succeededTxs: Map<TxId, ReadOnlyFunctionCallEvent> = new Map();
  public readonly failedTxs: Map<TxId, ReadOnlyFunctionCallEvent> = new Map();

  constructor(
    private readonly tevmEventsAdapter: TevmEventsAdapter,
    private readonly evmEventStore: EvmEventStore,
    private readonly evmEventHandler: EvmEventHandler,
    private readonly functionCallEventHandler: FunctionCallEventHandler
  ) {}

  async register(tevmEvent: TEvmEvent) {
    const evmEvent = this.tevmEventsAdapter.toEvmEvent(tevmEvent);
    if (!evmEvent) return;
    this.evmEventStore.store(evmEvent);
  }

  public async process() {
    const storedEvents = this.evmEventStore.getEvmEvents();
    const callTraceEvents = await this.evmEventHandler.detectFunctionCalls(storedEvents);
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
    this.tevmEventsAdapter.reset();
    this.evmEventStore.reset();
    this.evmEventHandler.reset();
    this.functionCallEventHandler.reset();
  }
}
