import type { ExternalCallEvmEvent, ExternalCallResultEvmEvent, OpcodeStepEvent } from '../evm-events.ts';
import type { LensFunctionIndex, PcLocationReadable } from '../../../types.ts';

export type EnrichedOpcodeEvent = {
  _type: 'Opcode';
  evmEvent: OpcodeStepEvent;
  functionIndex: LensFunctionIndex;
  pcLocationIndex: PcLocationReadable;
};
export type EnrichedExternalCallEvent = {
  _type: 'ExternalCall';
  evmEvent: ExternalCallResultEvmEvent | ExternalCallEvmEvent;
};
export type EnrichedEvmEvent = EnrichedOpcodeEvent | EnrichedExternalCallEvent;

export function isEnrichedOpcodeEvent(event: EnrichedEvmEvent): event is EnrichedOpcodeEvent {
  return event._type === 'Opcode';
}

export function isEnrichedExternalCallEvent(event: EnrichedEvmEvent): event is EnrichedExternalCallEvent {
  return event._type === 'ExternalCall';
}
