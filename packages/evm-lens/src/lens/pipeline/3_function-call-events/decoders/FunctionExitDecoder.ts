import type { FunctionTraceCall, FunctionTraceResult } from '../../4_function-trace/FunctionTraceBuilder.ts';
import type { InternalFunctionCallResultEvent } from '../function-call-events.ts';

export class FunctionExitDecoder {
  public readonly name = 'FunctionExitTransform';

  decode(
    _event: InternalFunctionCallResultEvent,
    functionCallEvent: FunctionTraceCall
  ): FunctionTraceResult | undefined {
    if (functionCallEvent.callType !== 'INTERNAL') {
      // Already decoded by ExternalCallResultTransform
      return undefined;
    }

    const functionResultEvent: FunctionTraceResult = {
      type: 'FunctionResultEvent',
      returnValueRaw: '0x',
      isError: false,
      isCreate: false,
      logs: [],
    };

    return functionResultEvent;
  }

  reset(): void {
    // No state to reset
  }
}
