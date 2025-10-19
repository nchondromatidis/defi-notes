import { InvariantError } from '../common/errors.ts';
import type { LensArtifactsMap, LensContractFQN } from './artifact.ts';

export type FunctionCallEvent<TMap extends LensArtifactsMap<TMap>> = {
  type: 'FunctionCallEvent';
  depth?: number;
  contractFQN?: LensContractFQN<TMap>;
  functionName?: string;
  args?: readonly unknown[];
  isCreate?: boolean;
  createdContractFQN?: LensContractFQN<TMap>;
  constructorArgs?: readonly unknown[];
  called?: Array<FunctionCallEvent<TMap>>;
  result?: FunctionResultEvent<TMap>;
};

export type FunctionResultEvent<TMap extends LensArtifactsMap<TMap>> = {
  type: 'FunctionResultEvent';
  isCreate?: boolean;
  createdContractFQN?: LensContractFQN<TMap>;
  logs?: LensLog[];
};

export type LensLog = { eventName: string; args: Array<unknown>; eventSignature?: string };

export class TxTrace<TMap extends LensArtifactsMap<TMap>> {
  public rootFunction?: FunctionCallEvent<TMap>;
  private stack: FunctionCallEvent<TMap>[] = [];

  public addFunctionCall(event: FunctionCallEvent<TMap>) {
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

  public addResult(event: FunctionResultEvent<TMap>) {
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

  public getCurrentFunctionCallEvent(): FunctionCallEvent<TMap> {
    return this.stack[this.stack.length - 1];
  }
}
