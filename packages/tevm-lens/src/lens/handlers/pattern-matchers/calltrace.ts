import type { JumpType, LensFunctionIndex } from '../../types.ts';

type OpcodeEntry = {
  sequenceNum: number;
  pc: number;
  name: string;
  stack: string[];
  jumpType: JumpType;
  depth: number;
};
export type TraceEntry = {
  functionIndex: LensFunctionIndex;
  opcode: OpcodeEntry;
};

type CallTraceNode = {
  functionName: string;
  entryPc: number;
  exitPc?: number;
  argsRaw: string[];
  returnValues?: string[];
  children: CallTraceNode[];
  depth: number;
};

function buildCallTrace(entries: TraceEntry[]): CallTraceNode[] {
  const rootCalls: CallTraceNode[] = [];
  const nodeStack: CallTraceNode[] = [];
  const validJumpIns = new Set<number>();
  const jumpInTempStack: { index: number; returnPc: number }[] = [];

  // Pass 1: Find valid JUMP i/o pairs
  for (let i = 0; i < entries.length; i++) {
    const jumpEntry = entries[i];
    if (jumpEntry.opcode.name !== 'JUMP') continue;

    if (
      jumpEntry.opcode.jumpType === 'i' &&
      i + 1 < entries.length &&
      entries[i + 1].opcode.name === 'JUMPDEST' &&
      jumpEntry.opcode.sequenceNum == entries[i + 1].opcode.sequenceNum + 1
    ) {
      const jumpDestEntry = entries[i + 1];
      const jumpDestStack = jumpDestEntry.opcode.stack;
      const returnPc = parseInt(jumpDestStack[jumpDestStack.length - 1 - jumpDestEntry.functionIndex.parameterSlots]);
      jumpInTempStack.push({ index: i, returnPc });
    } else if (jumpEntry.opcode.jumpType === 'o') {
      const jumpOutStack = jumpEntry.opcode.stack;
      const jumpOutRet = parseInt(jumpOutStack[jumpOutStack.length - 1]);
      for (let j = jumpInTempStack.length - 1; j >= 0; j--) {
        if (jumpInTempStack[j].returnPc === jumpOutRet) {
          validJumpIns.add(jumpInTempStack[j].index);
          jumpInTempStack.splice(j, 1);
          break;
        }
      }
    }
  }

  // Pass 2: Build tree
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.opcode.name !== 'JUMP') continue;

    if (e.opcode.jumpType === 'i' && validJumpIns.has(i)) {
      const functionName = entries[i + 1].functionIndex.name;
      const numArgs = entries[i + 1].functionIndex.parameterSlots;
      const stack = e.opcode.stack;
      const node: CallTraceNode = {
        functionName: functionName,
        entryPc: parseInt(stack[stack.length - 1]),
        argsRaw: Array.from({ length: numArgs }, (_, j) => stack[stack.length - 2 - j]),
        children: [],
        depth: nodeStack.length,
      };
      (nodeStack.length > 0 ? nodeStack[nodeStack.length - 1].children : rootCalls).push(node);
      nodeStack.push(node);
    } else if (e.opcode.jumpType === 'o' && nodeStack.length > 0) {
      const node = nodeStack.pop()!;
      node.exitPc = e.opcode.pc;
      const returnSlots = e.functionIndex.returnSlots;
      if (returnSlots > 0) {
        node.returnValues = e.opcode.stack.slice(-(returnSlots + 1), -1).reverse();
      }
    }
  }

  return rootCalls;
}
