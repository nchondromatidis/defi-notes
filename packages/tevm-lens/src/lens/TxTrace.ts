import type { Message } from 'tevm/actions';
import type { EvmResult } from 'tevm/evm';
import { InvariantError } from '../common/errors.ts';
import type { ContractFQN } from './artifact.ts';
import { decodeEventLog } from 'viem';

// TODO: better type safety, less optional keys, discriminant union types?
export type FunctionCallEvent = {
  type: 'FunctionCallEvent';
  contractFQN?: ContractFQN;
  functionName?: string;
  args?: readonly unknown[];
  isCreate?: boolean;
  createdContractFQN?: ContractFQN;
  constructorArgs?: readonly unknown[];
  called?: Array<FunctionCallEvent>;
  result?: FunctionResultEvent;
};
export type FunctionResultEvent = {
  type: 'FunctionResultEvent';
  isCreate?: boolean;
  createdContractFQN?: string;
  logs?: LensLog[];
};
export type LensLog = ReturnType<typeof decodeEventLog> & { eventSignature?: string };

export class TxTrace {
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
