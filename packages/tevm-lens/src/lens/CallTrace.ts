import { InvariantError } from '../common/errors.ts';
import type { Address, Hex } from './types.ts';

type External = 'EXTERNAL';
type InternalCallTypes = 'INTERNAL';
type ExternalCallTypes = 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2';
// TODO: conditional types: eg FunctionCallEvent.to is only undefined when callType equals ('CREATE' || 'CREATE2')
export type FunctionCallEvent = {
  type: 'FunctionCallEvent';
  to: Address | undefined;
  from: Address | undefined;
  depth: number;
  rawData: Hex;
  value: bigint;
  callType: External | ExternalCallTypes | InternalCallTypes;
  precompile: boolean;
  implContractFQN?: string;
  implAddress?: Address;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
  args?: unknown;
  functionLineStart?: number;
  functionLineEnd?: number;
  functionSource?: string;
  functionCallLineStart?: number;
  functionCallLineEnd?: number;
  create2Salt?: Hex;
  createdContractFQN?: string;
  called?: Array<FunctionCallEvent>;
  result?: FunctionResultEvent;
};

export type FunctionResultEvent = {
  type: 'FunctionResultEvent';
  isError: boolean;
  returnValueRaw: Hex;
  isCreate: boolean;
  logs: Array<LensLog>;
  errorType?: unknown;
  errorName?: string;
  errorAbiItem?: unknown;
  errorArgs?: unknown;
  returnValue?: unknown;
  createdAddress?: Address;
  createdContractFQN?: string;
};

export type LensLog = {
  rawData: unknown;
  eventName?: string;
  args?: unknown;
  eventSignature?: string;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
};

export class CallTrace {
  public rootFunction?: FunctionCallEvent;
  private stack: FunctionCallEvent[] = [];

  public addFunctionCall(event: FunctionCallEvent) {
    // Ensure event shape and defaults
    event.called = event.called ?? [];
    event.result = event.result ?? undefined;

    const parent = this.getLatestFunctionCallEvent();

    if (!this.rootFunction) {
      this.rootFunction = event;
    } else if (parent) {
      parent.called!.push(event);
    }

    this.stack.push(event);
  }

  public addResult(event: FunctionResultEvent) {
    const current = this.getLatestFunctionCallEvent();
    if (!current) {
      throw new InvariantError('Result event raised without function call');
    }
    if (current.result) {
      throw new InvariantError('Result already exists');
    }

    current.result = event;
    this.stack.pop();
  }

  public getLatestFunctionCallEvent(): FunctionCallEvent | undefined {
    if (this.stack.length === 0) return undefined;
    return this.stack[this.stack.length - 1];
  }
}
