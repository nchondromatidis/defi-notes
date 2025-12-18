import { HandlerBase } from './HandlerBase.ts';

import type { InterpreterStep } from 'tevm/evm';
import type { FunctionCallEvent, FunctionResultEvent } from '../tx-tracer/TxTrace.ts';
import type { PC } from './trace-metadata.ts';

export class FunctionExitHandler extends HandlerBase {
  public async handle(
    stepEvent: InterpreterStep,
    functionCallEvent: FunctionCallEvent,
    functionExits: Map<PC, FunctionCallEvent>
  ) {
    if (functionCallEvent.callType !== 'INTERNAL') return undefined; // already decoded
    const pc = BigInt(stepEvent.pc);
    if (!functionExits.has(pc)) return undefined;

    const functionCallEvent2 = functionExits.get(pc)!;
    const functionResultEvent: FunctionResultEvent = {
      type: 'FunctionResultEvent',
      returnValueRaw: '',
      isError: false,
      isCreate: false,
      logs: [],
    };

    console.log(
      'FunctionExitHandler',
      functionCallEvent2.callType,
      functionCallEvent2.contractFQN,
      functionCallEvent2.functionName
    );
  }
}
