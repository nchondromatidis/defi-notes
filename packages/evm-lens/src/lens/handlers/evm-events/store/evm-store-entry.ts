import type { ExternalCallEvmEvent, ExternalCallResultEvmEvent, OpcodeStepEvent } from '../events/evm-events.ts';
import type { LensFunctionIndex, PcLocationReadable } from '../../../types.ts';

export type OpcodeStoreEntry = {
  _type: 'Opcode';
  evmEvent: OpcodeStepEvent;
  functionIndex: LensFunctionIndex;
  pcLocationIndex: PcLocationReadable;
};

export type ExternalCallStoreEntry = {
  _type: 'ExternalCall';
  evmEvent: ExternalCallResultEvmEvent | ExternalCallEvmEvent;
};

export type EvmStoreEntry = OpcodeStoreEntry | ExternalCallStoreEntry;

export function isOpcodeStoreEntry(event: EvmStoreEntry): event is OpcodeStoreEntry {
  return event._type === 'Opcode';
}

export function isExternalCallStoreEntry(event: EvmStoreEntry): event is ExternalCallStoreEntry {
  return event._type === 'ExternalCall';
}
