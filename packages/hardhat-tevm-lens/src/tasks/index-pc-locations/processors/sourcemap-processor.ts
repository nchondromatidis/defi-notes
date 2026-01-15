import type { BuildInfoPair } from '../../../_utils/build-info';
import { findAll, srcDecoder } from 'solidity-ast/utils.js';
import type { PcLocationIndex } from '../types';
import type { SourceUnit } from 'solidity-ast';
import { createByteCodeIndex } from '../../../_utils/bytecode';
import { decompressSourceMap } from '../../../_utils/sourcemap';
import { toUserSource } from '../../../_utils/hardhat';
import { isExternalCallOpcode, isJumpDestOpcode, isJumpOpcode } from '../../../_utils/opcodes';
import { getSrcLocation } from '../../../_utils/source-location';
import type { Debugger } from 'debug';

export function createIndex(buildInfoPair: BuildInfoPair, debug: Debugger) {
  const { buildInfoInput, buildInfoOutput } = buildInfoPair;

  const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

  const pcLocationIndexes: PcLocationIndex[] = [];

  for (const [inputSourceName, outputContract] of Object.entries(buildInfoOutput.output.contracts!)) {
    for (const [contractName, contractData] of Object.entries(outputContract)) {
      const opcodesMnemonicsString = contractData!.evm!.deployedBytecode!.opcodes;
      const sourcemap = contractData.evm!.deployedBytecode!.sourceMap;
      const sourceAst = buildInfoOutput.output.sources?.[inputSourceName]?.ast as SourceUnit;

      if (!opcodesMnemonicsString || !sourcemap || !sourceAst) {
        console.warn(
          `Skipping ${inputSourceName}:${contractName}, missing bytecode or sourcemap or ast - probably interface`
        );
        continue;
      }
      const contractDef = Array.from(findAll('ContractDefinition', sourceAst)).find((it) => it.name === contractName);
      if (!contractDef) {
        console.warn(`Skipping ${inputSourceName}:${contractName}, missing ast contract definition `);
        continue;
      }

      const bytecodeIndex = createByteCodeIndex(opcodesMnemonicsString);
      const sourceMapD = decompressSourceMap(sourcemap);

      const userSource = toUserSource(inputSourceName);
      const contractFQN = `${userSource}:${contractName}`;

      const pcLocationIndex: PcLocationIndex = {
        contractFQN,
        locationSources: [],
        pcLocations: [],
      };

      bytecodeIndex.opcodeEntries
        // track specific opcodes for efficiency
        .filter(
          (opcodeEntry) =>
            isJumpOpcode(opcodeEntry.name) ||
            isJumpDestOpcode(opcodeEntry.name) ||
            isExternalCallOpcode(opcodeEntry.name)
        )
        // ignore opcodes after the sourcemap (eg create contract opcodes)
        .filter((opcodeEntry) => opcodeEntry.index <= sourceMapD.length)
        // get location of opcodes in a "compressed" form
        .forEach((it) => {
          const src = sourceMapD[it.index];
          const pcLocation = getSrcLocation(src.src, decodeSrc, debug);
          if (!pcLocation) return;
          if (!pcLocationIndex.locationSources.includes(pcLocation.userSource)) {
            pcLocationIndex.locationSources.push(pcLocation.userSource);
          }

          pcLocationIndex.pcLocations.push([
            it.pc,
            src.jump,
            [
              pcLocation.lineStart,
              pcLocation.lineEnd,
              pcLocationIndex.locationSources.indexOf(pcLocation.userSource),
            ] as const,
          ]);
        });

      pcLocationIndexes.push(pcLocationIndex);
    }
  }
  return pcLocationIndexes;
}
