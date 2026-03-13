import type { EvmStoreEntry } from '../EvmEventStore.ts';
import type { OpcodeStepEvent } from '../events/evm-events.ts';
import type {
  InternalFunctionCallEvent,
  InternalFunctionCallResultEvent,
} from '../../function-call-events/events/function-call-events.ts';

export type OpcodeStepEventEntry = Extract<EvmStoreEntry, { evmEvent: OpcodeStepEvent }>;

export type InternalFunctionCallTraceEvent = InternalFunctionCallEvent | InternalFunctionCallResultEvent;

export function detectInternalCallsFromOpcodeSequence(
  entries: OpcodeStepEventEntry[]
): InternalFunctionCallTraceEvent[] {
  const validJumpIns = new Set<number>();
  const jumpInTempStack: { index: number; returnPc: number }[] = [];

  // Pass 1: Find valid JUMP i/o pairs
  for (let i = 0; i < entries.length; i++) {
    const jumpEntry = entries[i];
    if (jumpEntry.evmEvent.name !== 'JUMP') continue;

    if (
      jumpEntry.pcLocationIndex.jumpType === 'i' &&
      i + 1 < entries.length &&
      entries[i + 1].evmEvent.name === 'JUMPDEST' &&
      jumpEntry.evmEvent.opcodeSequenceNum + 1 == entries[i + 1].evmEvent.opcodeSequenceNum
    ) {
      const jumpDestEntry = entries[i + 1];
      const jumpDestStack = jumpDestEntry.evmEvent.stack;
      const returnPc = parseInt(jumpDestStack[jumpDestStack.length - 1 - jumpDestEntry.functionIndex.parameterSlots]);
      jumpInTempStack.push({ index: i, returnPc });
    } else if (jumpEntry.pcLocationIndex.jumpType === 'o') {
      const jumpOutStack = jumpEntry.evmEvent.stack;
      const jumpOutRet = parseInt(jumpOutStack[jumpOutStack.length - 1]);
      for (let j = jumpInTempStack.length - 1; j >= 0; j--) {
        if (jumpInTempStack[j].returnPc === jumpOutRet) {
          validJumpIns.add(jumpInTempStack[j].index);
          jumpInTempStack.splice(j, 1);
          break;
        }
      }
    }
  }

  // Pass 2: Emit enter + result events into one list
  const events: InternalFunctionCallTraceEvent[] = [];
  let nextFunctionCallId = 1;

  const functionCallIdStack: number[] = [];
  const metaById = new Map<number, { contractFQN: string; functionName: string }>();

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.evmEvent.name !== 'JUMP') continue;

    // Enter (JUMP i)
    if (e.pcLocationIndex.jumpType === 'i' && validJumpIns.has(i)) {
      const jumpDest = entries[i + 1]; // guaranteed by pass1 conditions
      const contractFQN = jumpDest.functionIndex.contractFQN;
      const functionName = jumpDest.functionIndex.name;
      const parameterSlots = jumpDest.functionIndex.parameterSlots;

      const stack = jumpDest.evmEvent.stack;
      const functionCallId = nextFunctionCallId++;

      const internalFunctionCallEvent: InternalFunctionCallEvent = {
        _type: 'InternalFunctionCallEvent',
        functionCallId,
        contractFQN,
        functionName,
        opcodeStepEvent: jumpDest.evmEvent,
        entryPc: parseInt(stack[stack.length - 1], 10),
        opcodeSequenceNum: e.evmEvent.opcodeSequenceNum,
        parameterSlots,
        argumentData: Array.from({ length: parameterSlots }, (_, j) => stack[stack.length - 2 - j]),
      };
      events.push(internalFunctionCallEvent);

      functionCallIdStack.push(functionCallId);
      metaById.set(functionCallId, { contractFQN, functionName });
      continue;
    }

    // Exit (JUMP o)
    if (e.pcLocationIndex.jumpType === 'o' && functionCallIdStack.length > 0) {
      const functionCallId = functionCallIdStack.pop()!;
      const meta = metaById.get(functionCallId);
      if (!meta) continue;

      const returnSlots = e.functionIndex.returnSlots;
      const returnData = returnSlots > 0 ? e.evmEvent.stack.slice(-(returnSlots + 1), -1).reverse() : [];

      const internalFunctionCallResultEvent: InternalFunctionCallResultEvent = {
        _type: 'InternalFunctionCallResultEvent',
        functionCallId,
        contractFQN: meta.contractFQN,
        functionName: meta.functionName,
        opcodeStepEvent: e.evmEvent,
        exitPc: e.evmEvent.pc,
        opcodeSequenceNum: e.evmEvent.opcodeSequenceNum,
        returnSlots,
        returnData,
      };
      events.push(internalFunctionCallResultEvent);
    }
  }

  return events;
}
