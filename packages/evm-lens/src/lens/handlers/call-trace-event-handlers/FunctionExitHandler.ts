import { HandlerBase } from '../HandlerBase.ts';

import type { FunctionCallEvent, FunctionResultEvent } from '../../call-tracer/CallTrace.ts';
import type { InternalFunctionCallResultEvent } from '../_events/call-trace-events.ts';

/*
 * Detects internal function calls returns. <br>
 * Handles JUMPDEST opcode with function exit pc detected by FunctionEntryHandler <br>
 * <b> No argument fetching or decoding takes place for internal functions </b>
 *
 * <i>
 * event.pc + event.depth --depth=>fnExitPc--> function call exit
 * </i>
 */
export class FunctionExitHandler extends HandlerBase {
  public async handle(_event: InternalFunctionCallResultEvent, functionCallEvent: FunctionCallEvent) {
    if (functionCallEvent.callType !== 'INTERNAL') {
      // already decoded by ExternalCallResultHandler
      return undefined;
    }

    const functionResultEvent: FunctionResultEvent = {
      type: 'FunctionResultEvent',
      returnValueRaw: '0x',
      isError: false,
      isCreate: false,
      logs: [],
    };

    return functionResultEvent;
  }
}
