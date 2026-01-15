import { logInput_2 } from './logInputs.ts';

export type TraceEntry = {
  contract: string;
  //depth: number;
  opcode: 'JUMPDEST' | 'JUMP' | 'CALL';
  jumpType: '-' | 'i' | 'o';
  functionName: string;
  pc: number;
  stack: string[];
};

type CallTraceNode = {
  functionName: string;
  entryPc: number;
  exitPc?: number;
  args: string[];
  returnValues?: string[];
  children: CallTraceNode[];
  depth: number;
};

function getNumArgs(functionName: string): number {
  const counts: Record<string, number> = {
    internalFunction: 1,
    privateFunction: 1,
    publicFunction: 1,
    internalFunction2: 0,
    mixedCall: 1,
  };
  return counts[functionName] ?? 1;
}

function getNumReturns(functionName: string): number {
  const counts: Record<string, number> = {
    internalFunction: 1,
    privateFunction: 1,
    publicFunction: 1,
    internalFunction2: 0,
    mixedCall: 1,
  };
  return counts[functionName] ?? 1;
}

function buildCallTrace(entries: TraceEntry[]): CallTraceNode[] {
  const rootCalls: CallTraceNode[] = [];
  const nodeStack: CallTraceNode[] = [];
  const validJumpIns = new Set<number>();
  const jumpInTempStack: { entryIdx: number; ret: number }[] = [];

  // Pass 1: Find valid JUMP i/o pairs
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.opcode !== 'JUMP') continue;

    if (e.jumpType === 'i' && i + 1 < entries.length && entries[i + 1].opcode === 'JUMPDEST') {
      const ret = parseInt(e.stack[e.stack.length - 2 - getNumArgs(entries[i + 1].functionName)]);
      jumpInTempStack.push({ entryIdx: i, ret });
    } else if (e.jumpType === 'o') {
      const jumpOutRet = parseInt(e.stack[e.stack.length - 1]);
      for (let j = jumpInTempStack.length - 1; j >= 0; j--) {
        if (jumpInTempStack[j].ret === jumpOutRet) {
          validJumpIns.add(jumpInTempStack[j].entryIdx);
          jumpInTempStack.splice(j, 1);
          break;
        }
      }
    }
  }

  // Pass 2: Build tree
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.opcode !== 'JUMP') continue;

    if (e.jumpType === 'i' && validJumpIns.has(i)) {
      const functionName = entries[i + 1].functionName;
      const numArgs = getNumArgs(functionName);
      const stack = e.stack;
      const node: CallTraceNode = {
        functionName: functionName,
        entryPc: parseInt(stack[stack.length - 1]),
        args: Array.from({ length: numArgs }, (_, j) => stack[stack.length - 2 - j]),
        children: [],
        depth: nodeStack.length,
      };
      (nodeStack.length > 0 ? nodeStack[nodeStack.length - 1].children : rootCalls).push(node);
      nodeStack.push(node);
    } else if (e.jumpType === 'o' && nodeStack.length > 0) {
      const node = nodeStack.pop()!;
      node.exitPc = e.pc;
      const numRet = getNumReturns(node.functionName);
      if (numRet > 0) {
        node.returnValues = Array.from({ length: numRet }, (_, j) => e.stack[e.stack.length - 2 - j]);
      }
    }
  }

  return rootCalls;
}

function printCallTrace(nodes: CallTraceNode[], indent = ''): void {
  for (const n of nodes) {
    const ret = n.returnValues ? ` → [${n.returnValues.join(', ')}]` : '';
    console.log(
      `${indent}${n.functionName}(${n.args.join(', ')})${ret} [pc=${n.entryPc}${n.exitPc ? `→${n.exitPc}` : ''}]`
    );
    if (n.children.length > 0) printCallTrace(n.children, indent + '  ');
  }
}

// Usage example

const callTrace = buildCallTrace(logInput_2);
console.log('Call Trace:');
printCallTrace(callTrace);
console.dir(callTrace, { depth: 10 });
