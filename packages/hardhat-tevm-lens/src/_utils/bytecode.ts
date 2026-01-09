import { getPushSizeOrZero } from './opcodes';

type OpcodeEntry = { name: string; stack: string[]; pc: number; index: number };
type ByteCodeIndex = {
  opcodeEntries: OpcodeEntry[];
  pushValuesOpcodeEntries: Array<{ stackValue: string; opcodeEntry: OpcodeEntry }>;
};

export function createByteCodeIndex(opcodesMnemonicsString: string, pushValuesToIndex?: Set<number>): ByteCodeIndex {
  const opcodesMnemonicsArray = opcodesMnemonicsString.split(' ').filter(Boolean);

  const bytecodeIndex: ByteCodeIndex = {
    opcodeEntries: [],
    pushValuesOpcodeEntries: [],
  };
  let pc = 0;
  let evmInstructionsCount = 0;
  for (const opcodeNameOrStackValue of opcodesMnemonicsArray) {
    if (!opcodeNameOrStackValue.startsWith('0x')) {
      const opcodeName = opcodeNameOrStackValue;
      const opcodeEntry = { name: opcodeName, stack: [], pc: pc, index: evmInstructionsCount };
      bytecodeIndex.opcodeEntries.push(opcodeEntry);
      evmInstructionsCount++;
      const pushSize = getPushSizeOrZero(opcodeName);
      pc += pushSize + 1;
    } else {
      // push opcode
      const stackValue = opcodeNameOrStackValue;
      const opcodeEntry = bytecodeIndex.opcodeEntries.at(-1)!;
      opcodeEntry.stack.push(stackValue);

      if (pushValuesToIndex && pushValuesToIndex.has(Number(stackValue))) {
        bytecodeIndex.pushValuesOpcodeEntries.push({ stackValue, opcodeEntry });
      }
    }
  }

  return bytecodeIndex;
}
