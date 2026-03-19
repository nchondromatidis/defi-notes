import { FilterStage } from './1_tevm-events/FilterStage.ts';
import { AdapterStage } from './1_tevm-events/AdapterStage.ts';
import { EnrichEvmEventStage } from './2_evm-events/jump-strategy/EnrichEvmEventStage.ts';
import { OpcodeAnalysisStage } from './2_evm-events/jump-strategy/OpcodeAnalysisStage.ts';
import { DecodingStage } from './3_function-call-events/DecodingStage.ts';
import { FunctionTraceBuilderStage } from './4_function-trace/FunctionTraceBuilderStage.ts';
import type { TEvmEvent } from './1_tevm-events/tevm-events.ts';
import type { ReadOnlyFunctionCallEvent } from './4_function-trace/FunctionTraceBuilder.ts';

export class FunctionTracePipeline {
  constructor(
    private filterStage: FilterStage,
    private adapterStage: AdapterStage,
    private enrichEvmEventStage: EnrichEvmEventStage,
    private opcodeAnalysisStage: OpcodeAnalysisStage,
    private decodingStage: DecodingStage,
    private functionTraceBuilderStage: FunctionTraceBuilderStage
  ) {}

  process(event: TEvmEvent): void {
    // Stage 1: Filters TEvmEvents
    const filtered = this.filterStage.process(event);
    if (!filtered) return;

    // Stage 2: Maps TEvmEvents to EvmEvents
    const evmEvents = this.adapterStage.process(filtered);
    if (!evmEvents) return;

    // Stage 3: Enriches EvmEvents, needed for Opcode Analysis Stage
    const evmEventsEnriched = this.enrichEvmEventStage.process(evmEvents);
    if (!evmEventsEnriched) return;

    // Stage 4: OpcodeAnalysis (buffers internally)
    this.opcodeAnalysisStage.register(evmEventsEnriched);
  }

  // Client needs to signal when all events are sent
  async flush(): Promise<ReadOnlyFunctionCallEvent | undefined> {
    // Flush Stage 4: Analyzes enriched EvmEvents to generate FunctionCallEvents
    const functionCallEvents = this.opcodeAnalysisStage.processRegistered();

    if (functionCallEvents.length === 0) return undefined;

    // Stage 5: Decoding: Labels addresses, decodes params/results/logs/errors for public functions
    for (const event of functionCallEvents) {
      const functionTraceEvents = await this.decodingStage.process(event);
      if (functionTraceEvents) {
        // Stage 6: TraceBuilder: builds function trace
        this.functionTraceBuilderStage.process(functionTraceEvents);
      }
    }

    // Get result from TraceBuilderStage
    return this.functionTraceBuilderStage.getResult();
  }

  reset(): void {
    this.filterStage.reset();
    this.adapterStage.reset();
    this.enrichEvmEventStage.reset();
    this.opcodeAnalysisStage.reset();
    this.decodingStage.reset();
    this.functionTraceBuilderStage.reset();
  }
}
