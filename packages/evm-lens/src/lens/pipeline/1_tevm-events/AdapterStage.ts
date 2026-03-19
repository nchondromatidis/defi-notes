import { isEvmResult, isInterpreterStep, isMessage, type TEvmEvent } from './tevm-events.ts';
import type {
  EvmEvent,
  ExternalCallEvmEvent,
  ExternalCallResultEvmEvent,
  OpcodeStepEvent,
} from '../2_evm-events/evm-events.ts';
import { bytesToHex } from 'viem';
import type { Address } from '../../types.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX, jsonStr } from '../../../_common/debug.ts';

const debug = createDebug(`${DEBUG_PREFIX}:evm-events`);

export class AdapterStage {
  public readonly name = 'AdapterStage';

  private currSequenceNum = 0;

  process(event: TEvmEvent): EvmEvent | undefined {
    const evmEvent = this.convertEvent(event);
    debug(jsonStr(evmEvent));

    if (evmEvent && evmEvent._type === 'OpcodeStep') {
      this.currSequenceNum++;
    }

    return evmEvent;
  }

  private convertEvent(event: TEvmEvent): EvmEvent | undefined {
    if (isMessage(event)) {
      return {
        _type: 'ExternalCallEvmEvent',
        data: bytesToHex(event.data),
        to: event?.to?.toString(),
        caller: event.caller.toString(),
        depth: event.depth,
        value: event.value,
        isCompiled: event.isCompiled,
        salt: event.salt,
        isStatic: event.isStatic,
        delegatecall: event.delegatecall,
        _codeAddress: (event as any)?._codeAddress?.toString() as Address,
        opcodeSequenceNum: this.currSequenceNum,
      } satisfies ExternalCallEvmEvent;
    }

    if (isEvmResult(event)) {
      return {
        _type: 'ExternalCallResultEvmEvent',
        execResult: {
          returnValue: event.execResult.returnValue,
          exceptionError: event.execResult.exceptionError,
          logs: event.execResult.logs,
        },
        createdAddress: event?.createdAddress?.toString(),
        opcodeSequenceNum: this.currSequenceNum,
      } satisfies ExternalCallResultEvmEvent;
    }

    if (isInterpreterStep(event)) {
      return {
        _type: 'OpcodeStep',
        to: event.address.toString(),
        pc: event.pc,
        name: event.opcode.name,
        stack: event.stack.map((s: bigint) => s.toString()),
        depth: event.depth,
        opcodeSequenceNum: this.currSequenceNum,
      } satisfies OpcodeStepEvent;
    }

    return undefined;
  }

  reset(): void {
    this.currSequenceNum = 0;
  }
}
