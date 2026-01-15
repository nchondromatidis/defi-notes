import type { InterpreterStep } from 'tevm/evm';
export function debugLog(
  contactName: string,
  stepEvent: InterpreterStep,
  jumpType: JumpType,
  count: number,
  functionIndex?: LensFunctionIndex
) {
  if (!functionIndex) return;

  function str(arr: any) {
    return JSON.stringify(arr, (_key, value) => (typeof value === 'bigint' ? value.toString() : value));
  }

  console.log(
    contactName,
    stepEvent.depth,
    count,
    stepEvent.opcode.name,
    jumpType,
    functionIndex.name,
    stepEvent.pc,
    str(stepEvent.stack)
  );
}

import type { JumpType, LensFunctionIndex } from '../../types.ts';
