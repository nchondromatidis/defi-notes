import type { Address, Hex } from '../../../types.ts';

export type ExternalCallEvmEvent = {
  _type: 'ExternalCallEvmEvent';
  data: Hex;
  to?: Address;
  caller: Address;
  depth: number;
  value: bigint;
  isCompiled: boolean;
  salt?: Uint8Array;
  isStatic: boolean;
  delegatecall: boolean;
  _codeAddress?: Address;
  opcodeSequenceNum: number;
};

export type ExternalCallResultEvmEvent = {
  _type: 'ExternalCallResultEvmEvent';
  execResult: {
    returnValue: Uint8Array;
    exceptionError?: any;
    logs?: Array<[Uint8Array, Uint8Array[], Uint8Array]>;
  };
  createdAddress?: Address;
  opcodeSequenceNum: number;
};

export type OpcodeStepEvent = {
  _type: 'OpcodeStep';
  to: Address;
  pc: number;
  name: string;
  stack: string[];
  depth: number;
  opcodeSequenceNum: number;
};

export type EvmEvent = ExternalCallEvmEvent | ExternalCallResultEvmEvent | OpcodeStepEvent;

export function isExternalCallEvmEvent(event: EvmEvent): event is ExternalCallEvmEvent {
  return event._type === 'ExternalCallEvmEvent';
}

export function isExternalCallResultEvmEvent(event: EvmEvent): event is ExternalCallResultEvmEvent {
  return event._type === 'ExternalCallResultEvmEvent';
}

export function isOpcodeStepEvent(event: EvmEvent): event is OpcodeStepEvent {
  return event._type === 'OpcodeStep';
}
