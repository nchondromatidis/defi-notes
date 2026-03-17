import { isEvmResult, isInterpreterStep, isMessage, type TEvmEvent } from './tevm-events.ts';
import type { Address } from '../../types.ts';
import type {
  EvmEvent,
  ExternalCallEvmEvent,
  ExternalCallResultEvmEvent,
  OpcodeStepEvent,
} from '../evm-events/events/evm-events.ts';
import { isJumpDestOpcode, isJumpOpcode } from '../../opcodes';
import { bytesToHex } from 'viem';

export class TevmEventsAdapter {
  private currSequenceNum = 0;

  toEvmEvent(event: TEvmEvent): EvmEvent | undefined {
    switch (true) {
      case isMessage(event): {
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
          // on delegatecal: callEvent type missing _codeAddress, but implementation has it
          _codeAddress: (event as any)?._codeAddress?.toString() as Address,
          opcodeSequenceNum: this.currSequenceNum,
        } satisfies ExternalCallEvmEvent;
      }
      case isEvmResult(event): {
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
      case isInterpreterStep(event): {
        if (this.isSelectedOpcode(event.opcode.name)) {
          const evmEvent: OpcodeStepEvent = {
            _type: 'OpcodeStep',
            to: event.address.toString(),
            pc: event.pc,
            name: event.opcode.name,
            stack: event.stack.map((s: bigint) => s.toString()),
            depth: event.depth,
            opcodeSequenceNum: this.currSequenceNum,
          };
          this.currSequenceNum++;
          return evmEvent;
        }

        this.currSequenceNum++;
        break;
      }
    }
  }

  reset() {
    this.currSequenceNum = 0;
  }

  private isSelectedOpcode(opcodeName: string) {
    return isJumpOpcode(opcodeName) || isJumpDestOpcode(opcodeName);
  }
}
