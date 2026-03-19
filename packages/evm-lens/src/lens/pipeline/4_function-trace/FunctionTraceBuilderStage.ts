import type {
  FunctionTraceCall,
  FunctionTraceEntry,
  FunctionTraceResult,
  ReadOnlyFunctionCallEvent,
} from './FunctionTraceBuilder.ts';

export class FunctionTraceBuilderStage {
  public readonly name = 'TraceBuilderStage';

  private traceBuilder: FunctionTraceBuilder;

  constructor() {
    this.traceBuilder = new FunctionTraceBuilder();
  }

  process(event: FunctionTraceEntry): void {
    if (event.type === 'FunctionCallEvent') {
      this.traceBuilder.addFunctionCall(event);
    } else if (event.type === 'FunctionResultEvent') {
      this.traceBuilder.addResult(event);
    }
  }

  getResult(): ReadOnlyFunctionCallEvent | undefined {
    const result = this.traceBuilder.getRootFunction();
    if (!result) {
      return undefined;
    }
    return result as ReadOnlyFunctionCallEvent;
  }

  reset(): void {
    this.traceBuilder = new FunctionTraceBuilder();
  }
}

class FunctionTraceBuilder {
  private rootFunction?: FunctionTraceCall;
  private stack: FunctionTraceCall[] = [];

  addFunctionCall(event: FunctionTraceCall) {
    const callWithDefaults: FunctionTraceCall = {
      ...event,
      called: event.called ?? [],
      result: event.result ?? undefined,
    };

    const parent = this.getLatestFunctionCallEvent();

    if (!this.rootFunction) {
      this.rootFunction = callWithDefaults;
    } else if (parent) {
      parent.called!.push(callWithDefaults);
    }

    this.stack.push(callWithDefaults);
  }

  addResult(event: FunctionTraceResult) {
    const current = this.getLatestFunctionCallEvent();
    if (!current) {
      throw new Error('Result event raised without function call');
    }
    if (current.result) {
      throw new Error('Result already exists for this function call');
    }

    current.result = event;
    this.stack.pop();
  }

  getLatestFunctionCallEvent(): FunctionTraceCall | undefined {
    if (this.stack.length === 0) return undefined;
    return this.stack[this.stack.length - 1];
  }

  getRootFunction(): FunctionTraceCall | undefined {
    return this.rootFunction;
  }
}
