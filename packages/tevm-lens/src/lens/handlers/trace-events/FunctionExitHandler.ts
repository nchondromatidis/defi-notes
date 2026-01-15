import { HandlerBase } from '../HandlerBase.ts';

import type { InterpreterStep } from 'tevm/evm';
import type { FunctionCallEvent, FunctionResultEvent } from '../../CallTrace.ts';
import { type RuntimeTraceMetadata } from '../trace-metadata.ts';

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
  public async handle(
    stepEvent: InterpreterStep,
    functionCallEvent: FunctionCallEvent,
    functionExits: RuntimeTraceMetadata['functionExits']
  ) {
    // TODO: maybe check executionContext, like in  FunctionEntryHandler
    if (stepEvent.opcode.name !== 'JUMPDEST') return undefined;
    if (functionCallEvent.callType !== 'INTERNAL') {
      // already decoded by ExternalCallResultHandler
      return undefined;
    }

    const pc = stepEvent.pc;
    const depth = stepEvent.depth;
    if (functionExits.get(depth)?.has(pc)) {
      const functionResultEvent: FunctionResultEvent = {
        type: 'FunctionResultEvent',
        returnValueRaw: '',
        isError: false,
        isCreate: false,
        logs: [],
      };
      // console.log('FunctionResultEvent', functionCallEvent.contractFQN, functionCallEvent.functionName);
      functionExits.get(depth)!.delete(pc);
      return functionResultEvent;
    }

    return undefined;
  }
}
