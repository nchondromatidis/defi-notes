import { InvariantError } from '../../../common/errors.ts';
import type { Address, Hex } from '../../types/artifact.ts';

export type FunctionCallEvent = {
  type: 'FunctionCallEvent';
  to: Address | undefined;
  value?: bigint;
  data?: Hex;
  depth?: number;
  isDelegateCall?: boolean;
  proxyContractFQN?: string;
  proxyAddress?: Address;
  contractFQN?: string;
  functionName?: string;
  functionType?: string;
  args?: unknown;
  lineStart?: number;
  lineEnd?: number;
  source?: string;
  isCreate?: boolean;
  create2Salt?: Hex;
  createdContractFQN?: string;
  called?: Array<FunctionCallEvent>;
  result?: FunctionResultEvent;
};

export type FunctionResultEvent = {
  type: 'FunctionResultEvent';
  isError?: boolean;
  rawError?: unknown;
  errorName?: string;
  errorAbiItem?: unknown;
  errorArgs?: unknown;
  returnValueRaw?: unknown;
  returnValue?: unknown;
  isCreate?: boolean;
  createdAddress?: Address;
  createdContractFQN?: string;
  logs?: Array<LensLog>;
};

export type LensLog = {
  rawData: unknown;
  eventName?: string;
  args?: unknown;
  eventSignature?: string;
  contractFQN?: string;
  functionName?: string;
};

export class LensCallTracerResult {
  public rootFunction?: FunctionCallEvent;
  private stack: FunctionCallEvent[] = [];

  public addFunctionCall(event: FunctionCallEvent) {
    // Ensure event shape and defaults
    event.called = event.called ?? [];
    event.result = event.result ?? undefined;

    const parent = this.stack[this.stack.length - 1];

    if (!this.rootFunction) {
      this.rootFunction = event;
    } else if (parent) {
      parent.called!.push(event);
    }

    this.stack.push(event);
  }

  public addResult(event: FunctionResultEvent) {
    const current = this.stack[this.stack.length - 1];
    if (!current) {
      throw new InvariantError('Result event raised without function call');
    }
    if (current.result) {
      throw new InvariantError('Result already exists');
    }

    current.result = event;
    this.stack.pop();
  }

  public getCurrentFunctionCallEvent(): FunctionCallEvent {
    return this.stack[this.stack.length - 1];
  }
}
