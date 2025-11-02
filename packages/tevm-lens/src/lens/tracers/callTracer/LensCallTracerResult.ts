import { InvariantError } from '../../../common/errors.ts';
import type { LensArtifactsMap, LensContractFQN } from '../../types/artifact.ts';

export type FunctionCallEvent<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> = {
  type: 'FunctionCallEvent';
  depth?: number;
  contractFQN?: LensContractFQN<ArtifactMapT>;
  functionName?: string;
  args?: readonly unknown[];
  lineStart?: number;
  lineEnd?: number;
  source?: string;
  isCreate?: boolean;
  createdContractFQN?: LensContractFQN<ArtifactMapT>;
  constructorArgs?: readonly unknown[];
  called?: Array<FunctionCallEvent<ArtifactMapT>>;
  result?: FunctionResultEvent<ArtifactMapT>;
};

export type FunctionResultEvent<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> = {
  type: 'FunctionResultEvent';
  isError?: boolean;
  errorType?: string;
  errorName?: string;
  errorAbiItem?: unknown;
  errorArgs?: unknown;
  returnValueRaw?: unknown;
  returnValue?: unknown;
  isCreate?: boolean;
  createdContractFQN?: LensContractFQN<ArtifactMapT>;
  logs?: LensLog[];
};

export type LensLog = { eventName: string; args: Array<unknown>; eventSignature?: string };

export class LensCallTracerResult<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> {
  public rootFunction?: FunctionCallEvent<ArtifactMapT>;
  private stack: FunctionCallEvent<ArtifactMapT>[] = [];

  public addFunctionCall(event: FunctionCallEvent<ArtifactMapT>) {
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

  public addResult(event: FunctionResultEvent<ArtifactMapT>) {
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

  public getCurrentFunctionCallEvent(): FunctionCallEvent<ArtifactMapT> {
    return this.stack[this.stack.length - 1];
  }
}
