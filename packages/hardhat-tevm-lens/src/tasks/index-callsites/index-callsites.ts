import type { BuildInfoPair } from '../../_utils/build-info';
import type { CallSiteIndex } from './types';
import { srcDecoder } from 'solidity-ast/utils.js';
import { getSrcLocation } from '../../_utils/source-location';
import { debug } from './_debug';
import { hardhatConvertFromSourceInputToContractFQN } from '../../_utils/hardhat';
import { decompressSourceMap } from '../../_utils/sourcemap';
import { createByteCodeIndex } from '../../_utils/bytecode';
import type { FunctionIndexes, FunctionIndex } from '../index-functions/types';
import { NestedMap } from '../../_utils/NestedMap';

export async function createCallSiteIndexes(
  buildInfoPair: BuildInfoPair,
  functionIndexes: FunctionIndexes
): Promise<Array<CallSiteIndex>> {
  const { buildInfoInput, buildInfoOutput, buildInfoOutputPath } = buildInfoPair;

  const contracts = buildInfoOutput.output.contracts;
  if (!contracts) {
    throw new Error(`No contracts found in build info output: ${buildInfoOutputPath}`);
  }

  const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

  const fnDataIndex = new NestedMap<[contractFQN: string, jumpDestPc: number], FunctionIndex>();
  for (const item of functionIndexes) {
    if (item.jumpDestPc) fnDataIndex.setNotDuplicate(item.contractFQN, item.jumpDestPc, item);
  }
  const jumpIndexes: Array<CallSiteIndex> = [];

  for (const [inputSourceName, contractsData] of Object.entries(contracts)) {
    for (const [contractName, contractData] of Object.entries(contractsData)) {
      const opcodesMnemonicsString = contractData.evm?.deployedBytecode?.opcodes;
      const sourceMap = contractData.evm?.deployedBytecode?.sourceMap;
      const contractFQN = hardhatConvertFromSourceInputToContractFQN(`${inputSourceName}:${contractName}`);

      if (!opcodesMnemonicsString || !sourceMap) {
        console.warn(`CallSiteIndex: Skipping contract ${contractFQN} due to missing opcodes or source map`);
        continue;
      }

      const contractFqnJumpDest = fnDataIndex.getMapAt(contractFQN)?.keys();
      if (!contractFqnJumpDest) continue;
      const contractFqnJumpDestSet = new Set(contractFqnJumpDest);
      const byteCodeIndex = createByteCodeIndex(opcodesMnemonicsString, contractFqnJumpDestSet);
      const decompressedSourceMap = decompressSourceMap(sourceMap);

      byteCodeIndex.pushValuesOpcodeEntries.forEach((it) => {
        const srcForCallSitePc = decompressedSourceMap[it.opcodeEntry.index];
        const locationForCallSiteSrc = getSrcLocation(srcForCallSitePc.src, decodeSrc, debug);
        if (!locationForCallSiteSrc) return;

        const callSiteIndex: CallSiteIndex = {
          callSitePc: it.opcodeEntry.pc,
          jumpDestPc: Number(it.stackValue),
          callSiteLineStart: locationForCallSiteSrc.lineStart,
          callSiteLineEnd: locationForCallSiteSrc.lineEnd,
          source: locationForCallSiteSrc.source,
          contractFQN,
        };
        jumpIndexes.push(callSiteIndex);
      });
    }
  }

  return jumpIndexes;
}
