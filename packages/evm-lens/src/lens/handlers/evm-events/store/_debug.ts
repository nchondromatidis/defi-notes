import type { Debugger } from 'debug';
import { isExternalCallEvmEvent, isExternalCallResultEvmEvent } from '../events/evm-events.ts';

import { type EvmStoreEntry, isExternalCallStoreEntry, isOpcodeStoreEntry } from './evm-store-entry.ts';

export function debugLogEvmEvents(debug: Debugger, event: EvmStoreEntry) {
  if (!debug.enabled) return;

  if (isExternalCallStoreEntry(event)) {
    if (isExternalCallEvmEvent(event.evmEvent)) {
      const { evmEvent } = event;
      debug('ExternalCallEvmEvent stored:', evmEvent.opcodeSequenceNum, evmEvent.depth, evmEvent.to, evmEvent.data);
    }
    if (isExternalCallResultEvmEvent(event.evmEvent)) {
      const { evmEvent } = event;
      debug('ExternalCallResultEvmEvent stored:', evmEvent.opcodeSequenceNum, evmEvent.execResult.returnValue);
    }
  }
  if (isOpcodeStoreEntry(event)) {
    const { evmEvent, pcLocationIndex, functionIndex } = event;
    debug(
      'OpcodeStepEvent stored:',
      evmEvent.opcodeSequenceNum,
      evmEvent.depth,
      pcLocationIndex.pc,
      pcLocationIndex.OpcodeName,
      pcLocationIndex.jumpType,
      `${pcLocationIndex.sourceName}:${pcLocationIndex.startLine}:${pcLocationIndex.endLine}`,
      functionIndex.name
    );
  }
}
