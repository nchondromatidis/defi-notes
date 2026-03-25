import type { Debugger } from 'debug';
import { isExternalCallEvmEvent, isExternalCallResultEvmEvent } from '../evm-events.ts';
import { type EnrichedEvmEvent, isEnrichedExternalCallEvent, isEnrichedOpcodeEvent } from './enriched-evm-events.ts';

export function debugLog(debug: Debugger, event: EnrichedEvmEvent) {
  if (!debug.enabled) return;

  if (isEnrichedExternalCallEvent(event)) {
    if (isExternalCallEvmEvent(event.evmEvent)) {
      const { evmEvent } = event;
      debug(evmEvent.opcodeSequenceNum, evmEvent.depth, evmEvent.to, evmEvent.data);
    }
    if (isExternalCallResultEvmEvent(event.evmEvent)) {
      const { evmEvent } = event;
      debug(evmEvent.opcodeSequenceNum, evmEvent.execResult.returnValue);
    }
  }
  if (isEnrichedOpcodeEvent(event)) {
    const { evmEvent, pcLocationIndex, functionIndex } = event;
    debug(
      evmEvent.opcodeSequenceNum,
      evmEvent.depth,
      pcLocationIndex.pc,
      pcLocationIndex.opcodeName,
      pcLocationIndex.jumpType,
      `${pcLocationIndex.sourceName}:${pcLocationIndex.startLine}:${pcLocationIndex.endLine}`,
      functionIndex.name,
      JSON.stringify(evmEvent.stack)
    );
  }
}
