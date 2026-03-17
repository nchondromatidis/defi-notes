import {
  type ExternalCallEvmEvent,
  type ExternalCallResultEvmEvent,
  type OpcodeStepEvent,
} from '../../evm-events/events/evm-events.ts';

export type InternalFunctionCallEvent = {
  _type: 'InternalFunctionCallEvent';

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

  contractFQN: string;
  functionName: string;

  opcodeStepEvent: OpcodeStepEvent;
  opcodeSequenceNum: number;
  exitPc: number;

  returnSlots: number;
  returnData: string[];
};

export type FunctionCallEvent =
  | ExternalCallEvmEvent
  | ExternalCallResultEvmEvent
  | InternalFunctionCallEvent
  | InternalFunctionCallResultEvent;

export function isExternalCallEvmEvent(event: FunctionCallEvent): event is ExternalCallEvmEvent {
  return event._type === 'ExternalCallEvmEvent';
}

export function isExternalCallResultEvmEvent(event: FunctionCallEvent): event is ExternalCallResultEvmEvent {
  return event._type === 'ExternalCallResultEvmEvent';
}

export function isInternalFunctionCallEvent(event: FunctionCallEvent): event is InternalFunctionCallEvent {
  return event._type === 'InternalFunctionCallEvent';
}
export function isInternalFunctionCallResultEvent(event: FunctionCallEvent): event is InternalFunctionCallResultEvent {
  return event._type === 'InternalFunctionCallResultEvent';
}

export { type ExternalCallEvmEvent, type ExternalCallResultEvmEvent };
