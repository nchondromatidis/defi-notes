import type { FunctionDefinition } from 'solidity-ast';
import type { CompilerOutputContract } from 'hardhat/types/solidity';

//************************************* TYPES ***************************************//

// CompilerOutputBytecode types miss legacyAssembly
declare module 'hardhat/types/solidity' {
  export interface CompilerOutputContract {
    legacyAssembly?: LegacyAssembly;
  }
}

type LegacyAssemblyEntry =
  | { begin: number; end: number; name: string; source: number; value?: string }
  | { begin: number; end: number; jumpType: '[in]' | '[out]'; name: 'JUMP'; source: number };
type LegacyAssembly = {
  '.code': LegacyAssemblyEntry[];
  '.data': {
    [key: string]: {
      '.code': LegacyAssemblyEntry[];
    };
  };
  sourceList: [string];
};

type SrcFnDef = {
  start: number;
  end: number;
  sourceId: number;
  fnDef: FunctionDefinition;
};

//************************************* PROCESSOR ***************************************//

/** @deprecated obsolete: cannot reliably determine function entry/exit/callssite pc, modern asm not parseable/stable format */
export function convertToFunctionIndex3(
  legacyAssembly: CompilerOutputContract['legacyAssembly'],
  fnDefs: FunctionDefinition[]
) {
  if (!legacyAssembly) return undefined;

  const srcFnDefs: SrcFnDef[] = fnDefs.map((fnDef) => {
    const [start, length, sourceId] = fnDef.src.split(':').map(Number);
    return {
      start,
      end: start + length,
      sourceId,
      fnDef,
    };
  });

  console.log(srcFnDefs);
}
