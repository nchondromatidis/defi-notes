import type {
  FunctionCallEvent,
  InternalFunctionCallEvent,
  InternalFunctionCallResultEvent,
} from '../../3_function-call-events/function-call-events.ts';
import { isJumpDestOpcode } from '../../../opcodes';
import { matchJumpOpcodes } from './match-jump-opcodes.ts';

import type { EnrichedEvmEvent, EnrichedOpcodeEvent } from './enriched-evm-events.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../../../_common/debug.ts';
import { debugLog } from './../../3_function-call-events/_debugLog.ts';

export type InternalFunctionEvents = InternalFunctionCallEvent | InternalFunctionCallResultEvent;

const debug = createDebug(`${DEBUG_PREFIX}:function-call-events`);

export class OpcodeAnalysisStage {
  public readonly name = 'OpcodeAnalysisStage';

  private buffer: EnrichedEvmEvent[] = [];

  register(event: EnrichedEvmEvent): void {
    this.buffer.push(event);
  }

  processRegistered(): FunctionCallEvent[] {
    const functionCallEvents: FunctionCallEvent[] = [];

    // Push all external call events
    for (const entry of this.buffer) {
      if (entry._type === 'ExternalCall') {
        functionCallEvents.push(entry.evmEvent);
      }
    }

    // Process opcode entries to find internal function calls
    const opcodeEntries = this.buffer.filter((e): e is EnrichedOpcodeEvent => e._type === 'Opcode');
    const matchedJumps = matchJumpOpcodes(opcodeEntries);
    const internalFunctionCallEvents = this.generateInternalFunctionCallEvents(matchedJumps);

    functionCallEvents.push(...internalFunctionCallEvents);
    functionCallEvents.sort((a, b) => a.opcodeSequenceNum - b.opcodeSequenceNum);

    return functionCallEvents;
  }

  reset(): void {
    this.buffer = [];
  }

  private generateInternalFunctionCallEvents(
    matchedJumpOpcodes: ReturnType<typeof matchJumpOpcodes>
  ): InternalFunctionEvents[] {
    const events: InternalFunctionEvents[] = [];

    for (const matchedJumpOpcode of matchedJumpOpcodes) {
      const jumpDest = matchedJumpOpcode.jumpDest;
      if (!isJumpDestOpcode(jumpDest.evmEvent.name)) {
        throw new Error('Expected JUMPDEST after function entry JUMP');
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
        entryPc: matchedJumpOpcode.jumpIn.evmEvent.pc,
        opcodeSequenceNum: matchedJumpOpcode.jumpIn.evmEvent.opcodeSequenceNum,
        parameterSlots,
        argumentData: Array.from({ length: parameterSlots }, (_, j) => stack[stack.length - 2 - j]),
      };
      events.push(internalFunctionCallEvent);
      debugLog(debug, internalFunctionCallEvent);

      const jumpOut = matchedJumpOpcode.jumpOut;
      const returnSlots = matchedJumpOpcode.jumpDest.functionIndex.returnSlots;
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
      debugLog(debug, internalFunctionCallResultEvent);
    }

    return events;
  }
}
