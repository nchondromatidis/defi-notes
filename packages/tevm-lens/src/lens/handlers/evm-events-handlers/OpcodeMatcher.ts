import { HandlerBase } from '../HandlerBase.ts';
import { isExternalCallEvmEvent, isExternalCallResultEvmEvent } from '../_events/lens-evm-events.ts';
import type { EvmStoreEntry } from './EventStore.ts';
import type { CallTraceEvents } from '../_events/call-trace-events.ts';
import { detectInternalCallsFromOpcodeSequence } from './pattern-matchers/internal-calls-opcode-sequence.ts';

export class OpcodeMatcher extends HandlerBase {
  public async matchFunctionCallOpcodeSequence(
    evmStoreEntries: ReadonlyArray<EvmStoreEntry>
  ): Promise<ReadonlyArray<CallTraceEvents>> {
    const callTraceEvents: Array<CallTraceEvents> = [];
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
