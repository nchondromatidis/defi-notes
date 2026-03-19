import { isInterpreterStep, type TEvmEvent } from './tevm-events.ts';
import { isExternalCallOpcode, isExternalCalReturnOpcode, isJumpDestOpcode, isJumpOpcode } from '../../opcodes';
import createDebug from 'debug';
import { DEBUG_PREFIX, jsonStr } from '../../../_common/debug.ts';

const debug = createDebug(`${DEBUG_PREFIX}:opcodes`);

export class FilterStage {
  public readonly name = 'FilterStage';

  process(event: TEvmEvent): TEvmEvent | undefined {
    if (!isInterpreterStep(event)) return event;
    debug(
      jsonStr({ depth: event.depth, address: event.address.toString(), pc: event.pc, opcodeName: event.opcode.name })
    );
    if (this.isSelectedOpcode(event.opcode.name)) return event;

    return undefined;
  }

  private isSelectedOpcode(opcodeName: string): boolean {
    return (
      isJumpOpcode(opcodeName) ||
      isJumpDestOpcode(opcodeName) ||
      isExternalCallOpcode(opcodeName) ||
      isExternalCalReturnOpcode(opcodeName)
    );
  }

  reset(): void {
    // No state to reset
  }
}
