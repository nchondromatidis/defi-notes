import type { Debugger } from 'debug';
import {
  type FunctionCallEvent,
  isExternalCallEvmEvent,
  isExternalCallResultEvmEvent,
  isInternalFunctionCallEvent,
  isInternalFunctionCallResultEvent,
} from './function-call-events.ts';
import { jsonStr } from '../../../_common/debug.ts';

export function debugLog(debug: Debugger, event: FunctionCallEvent) {
  if (!debug.enabled) return;

  if (isInternalFunctionCallEvent(event))
    debug(
      jsonStr({
        type: event._type,
        contractFQN: event.contractFQN,
        functionName: event.functionName,
        depth: event.opcodeStepEvent.depth,
        entryPc: event.entryPc,
        seqNum: event.opcodeSequenceNum,
      })
    );

  if (isInternalFunctionCallResultEvent(event))
    debug(
      jsonStr({
        type: event._type,
        contractFQN: event.contractFQN,
        functionName: event.functionName,
        depth: event.opcodeStepEvent.depth,
        exitPc: event.exitPc,
        seqNum: event.opcodeSequenceNum,
      })
    );

  if (isExternalCallEvmEvent(event))
    debug(
      jsonStr({
        type: event._type,
        contractFQN: event.to,
        functionName: 'N/A',
        depth: event.depth,
        pc: 'N/A',
        seqNum: event.opcodeSequenceNum,
      })
    );

  if (isExternalCallResultEvmEvent(event))
    debug(
      jsonStr({
        type: event._type,
        contractFQN: 'N/A',
        functionName: 'N/A',
        depth: 'N/A',
        pc: 'N/A',
        seqNum: event.opcodeSequenceNum,
      })
    );
}
