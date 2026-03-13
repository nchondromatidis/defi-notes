import { EventsHandlerBase } from '../../EventsHandlerBase.ts';
import { isExternalCallEvmEvent, isExternalCallResultEvmEvent } from '../events/evm-events.ts';
import type { EvmStoreEntry } from '../EvmEventStore.ts';
import type { FunctionCallEvent } from '../../function-call-events/events/function-call-events.ts';
import { detectInternalCallsFromOpcodeSequence } from './internal-calls-opcode-sequence.ts';

export class EvmEventPreprocessor extends EventsHandlerBase {
  public async matchFunctionCallOpcodeSequence(
    evmStoreEntries: ReadonlyArray<EvmStoreEntry>
  ): Promise<ReadonlyArray<FunctionCallEvent>> {
    const callTraceEvents: Array<FunctionCallEvent> = [];
    for (const evmStoreEntry of evmStoreEntries) {
      if (isExternalCallEvmEvent(evmStoreEntry.evmEvent)) callTraceEvents.push(evmStoreEntry.evmEvent);
      if (isExternalCallResultEvmEvent(evmStoreEntry.evmEvent)) callTraceEvents.push(evmStoreEntry.evmEvent);
    }
    const opcodeStepEvents = evmStoreEntries.filter((it) => it._type == 'Opcode');
    const internalFunctionCallEvents = detectInternalCallsFromOpcodeSequence(opcodeStepEvents);

    callTraceEvents.push(...internalFunctionCallEvents);
    callTraceEvents.sort((a, b) => a.opcodeSequenceNum - b.opcodeSequenceNum);

    return callTraceEvents;
  }

  reset() {}
}
