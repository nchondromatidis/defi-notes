import type { SrcDecoder } from 'solidity-ast/utils.js';
import type { FunctionDefinition } from 'solidity-ast';
import { createByteCodeIndex } from '../../../_utils/bytecode';
import { decompressSourceMap } from '../../../_utils/sourcemap';
import { trySync } from '../../../_utils/type-utils';

/** @deprecated obsolete: cannot reliably determine function entry/exit/callsite pc */
export function convertToFunctionIndex1(
  contractFQN: string,
  opcodesMnemonicsString: string | undefined,
  sourcemap: string | undefined,
  decodeSrc: SrcDecoder,
  fnDefs: FunctionDefinition[]
) {
  if (!sourcemap || !fnDefs || !opcodesMnemonicsString) return;

  const srcFnDefs = new Map(
    fnDefs.map((fnDef) => {
      const [start, length, sourceId] = fnDef.src.split(':').map(Number);
      return [
        fnDef.src,
        {
          src: fnDef.src,
          start,
          end: start + length,
          sourceId,
          fnDef,
        },
      ];
    })
  );

  const bytecodeIndex = createByteCodeIndex(opcodesMnemonicsString);
  const sourceMapD = decompressSourceMap(sourcemap);

  console.log(
    contractFQN,
    bytecodeIndex.opcodeEntries.length == sourceMapD.length,
    bytecodeIndex.opcodeEntries.length,
    sourceMapD.length
  );

  for (const opcodeEntry of bytecodeIndex.opcodeEntries) {
    if (opcodeEntry.name == 'JUMPDEST') {
      if (opcodeEntry.index > sourceMapD.length) continue;
      const src = sourceMapD[opcodeEntry.index].src;
      if (srcFnDefs.has(src)) {
        const lines = trySync(() => decodeSrc({ src: sourceMapD[opcodeEntry.index].src }));
        if (lines.ok) console.log(lines.value);
      }
    }
  }
}
