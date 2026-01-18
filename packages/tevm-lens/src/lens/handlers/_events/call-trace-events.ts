import { type ExternalCallEvmEvent, type ExternalCallResultEvmEvent, type OpcodeStepEvent } from './lens-evm-events.ts';

export type InternalFunctionCallEvent = {
  _type: 'InternalFunctionCallEvent';
  functionCallId: number;

  contractFQN: string;
  functionName: string;

  opcodeStepEvent: OpcodeStepEvent;
  opcodeSequenceNum: number;
  entryPc: number;

  parameterSlots: number;
  argumentData: string[];
};

export type InternalFunctionCallResultEvent = {
  _type: 'InternalFunctionCallResultEvent';
  functionCallId: number;

  contractFQN: string;
  functionName: string;

  opcodeStepEvent: OpcodeStepEvent;
  opcodeSequenceNum: number;
  exitPc: number;

  returnSlots: number;
  returnData: string[];
};

export type CallTraceEvents =
  | ExternalCallEvmEvent
  | ExternalCallResultEvmEvent
  | InternalFunctionCallEvent
  | InternalFunctionCallResultEvent;

export function isExternalCallEvmEvent(event: CallTraceEvents): event is ExternalCallEvmEvent {
  return event._type === 'ExternalCallEvmEvent';
}

export function isExternalCallResultEvmEvent(event: CallTraceEvents): event is ExternalCallResultEvmEvent {
  return event._type === 'ExternalCallResultEvmEvent';
}

export function isInternalFunctionCallEvent(event: CallTraceEvents): event is InternalFunctionCallEvent {
  return event._type === 'InternalFunctionCallEvent';
}
export function isInternalFunctionCallResultEvent(event: CallTraceEvents): event is InternalFunctionCallEvent {
  return event._type === 'InternalFunctionCallResultEvent';
}

export { type ExternalCallEvmEvent, type ExternalCallResultEvmEvent };
