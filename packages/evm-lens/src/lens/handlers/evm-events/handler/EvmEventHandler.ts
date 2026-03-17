import { EventsHandlerBase } from '../../EventsHandlerBase.ts';
import { isExternalCallEvmEvent, isExternalCallResultEvmEvent } from '../events/evm-events.ts';
import type {
  FunctionCallEvent,
  InternalFunctionCallEvent,
  InternalFunctionCallResultEvent,
} from '../../function-call-events/events/function-call-events.ts';
import { type FunctionEntry, matchJumpOpcodes } from './match-jump-opcodes.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../../../_common/debug.ts';
import { InvariantError } from '../../../../_common/errors.ts';
import { isJumpDestOpcode } from '../../../opcodes';
import { debugLogFunctionCallEvents } from '../../function-call-events/_debug.ts';
import type { EvmStoreEntry } from '../store/evm-store-entry.ts';

export type InternalFunctionCallTraceEvent = InternalFunctionCallEvent | InternalFunctionCallResultEvent;

const debug = createDebug(`${DEBUG_PREFIX}:EvmEventHandler`);

export class EvmEventHandler extends EventsHandlerBase {
  public async detectFunctionCalls(
    evmStoreEntries: ReadonlyArray<EvmStoreEntry>
  ): Promise<ReadonlyArray<FunctionCallEvent>> {
    const callTraceEvents: Array<FunctionCallEvent> = [];
    for (const evmStoreEntry of evmStoreEntries) {
      if (isExternalCallEvmEvent(evmStoreEntry.evmEvent)) callTraceEvents.push(evmStoreEntry.evmEvent);
      if (isExternalCallResultEvmEvent(evmStoreEntry.evmEvent)) callTraceEvents.push(evmStoreEntry.evmEvent);
    }
    const opcodeStepEvents = evmStoreEntries.filter((it) => it._type == 'Opcode');
    const matchedJumpsPerDepth = matchJumpOpcodes(opcodeStepEvents);
    const functionCallEvents = this.generateFunctionCallEventsFromFunctionEntryJumpOpcodes(matchedJumpsPerDepth);

    callTraceEvents.push(...functionCallEvents);
    callTraceEvents.sort((a, b) => a.opcodeSequenceNum - b.opcodeSequenceNum);

    debugLogFunctionCallEvents(debug, callTraceEvents);

    return callTraceEvents;
  }

  private generateFunctionCallEventsFromFunctionEntryJumpOpcodes(
    functionEntries: FunctionEntry[]
  ): InternalFunctionCallTraceEvent[] {
    const events: InternalFunctionCallTraceEvent[] = [];

    for (const functionEntry of functionEntries) {
      // Enter function
      const jumpDest = functionEntry.jumpDest; // guaranteed by matchJumpOpcodes conditions
      if (!isJumpDestOpcode(jumpDest.evmEvent.name)) {
        throw new InvariantError('Expected JUMPDEST after function entry JUMP');
      }

      const contractFQN = jumpDest.functionIndex.contractFQN;
      const functionName = jumpDest.functionIndex.name;
      const parameterSlots = jumpDest.functionIndex.parameterSlots;
      const stack = jumpDest.evmEvent.stack;

      const internalFunctionCallEvent: InternalFunctionCallEvent = {
        _type: 'InternalFunctionCallEvent',
        contractFQN,
        functionName,
        opcodeStepEvent: jumpDest.evmEvent,
        entryPc: functionEntry.jumpIn.evmEvent.pc,
        opcodeSequenceNum: functionEntry.jumpIn.evmEvent.opcodeSequenceNum,
        parameterSlots,
        argumentData: Array.from({ length: parameterSlots }, (_, j) => stack[stack.length - 2 - j]),
      };
      events.push(internalFunctionCallEvent);

      // Exit function
      const jumpOut = functionEntry.jumpOut;
      const returnSlots = functionEntry.jumpDest.functionIndex.returnSlots;
      const returnData = returnSlots > 0 ? jumpOut.evmEvent.stack.slice(-(returnSlots + 1), -1).reverse() : [];

      const internalFunctionCallResultEvent: InternalFunctionCallResultEvent = {
        _type: 'InternalFunctionCallResultEvent',
        contractFQN: contractFQN,
        functionName: functionName,
        opcodeStepEvent: jumpDest.evmEvent,
        exitPc: jumpOut.evmEvent.pc,
        opcodeSequenceNum: jumpOut.evmEvent.opcodeSequenceNum,
        returnSlots,
        returnData,
      };
      events.push(internalFunctionCallResultEvent);
    }

    return events;
  }

  reset() {}
}
