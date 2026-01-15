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

/**
 * @deprecated
 * - legacy asm: cannot reliably determine functions
 * - modern asm: not meant to be parsed, may brake in later solidity versions
 *
 * Note: Initially tried to combine creating function index with entry pc, now function PC is a different task
 */
export function convertToFunctionIndex(
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
