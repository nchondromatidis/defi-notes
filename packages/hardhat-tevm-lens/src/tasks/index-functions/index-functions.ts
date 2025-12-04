import fs from 'fs';
import type { SolidityBuildInfo, SolidityBuildInfoOutput } from 'hardhat/types/solidity';
import path from 'node:path';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../debug.ts';
import { fileURLToPath } from 'node:url';
import { astDereferencer } from 'solidity-ast/utils.js';
import { hardhatConvertFromSourceInputToContractFQN, isNotUndefined, trySync } from '../../utils';
import type { FunctionData, FunctionEntryIndexes } from './types';
import { type SrcDecoder, srcDecoder } from 'solidity-ast/utils.js';

const debug = createDebug(`${DEBUG_PREFIX}:index-functions`);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

//*************************************** TYPES ***************************************//

// build info types
type BuildInfoPairPath = { readonly input: string; readonly output: string; readonly id: string };
type BuildInfoPair = {
  readonly buildInfoInputPath: string;
  readonly buildInfoInput: SolidityBuildInfo;
  readonly buildInfoOutputPath: string;
  readonly buildInfoOutput: SolidityBuildInfoOutput;
  readonly buildInfoId: string;
};

// CompilerOutputBytecode types miss functionDebugData
declare module 'hardhat/types/solidity' {
  export interface CompilerOutputBytecode {
    functionDebugData?: {
      [internalFunctionName: string]: {
        entryPoint: number; // Byte offset into the bytecode where the function starts (optional)
        id: number; // AST ID of the function definition or null for compiler-internal functions (optional)
        parameterSlots: number; // Number of EVM stack slots for the function parameters (optional)
        returnSlots: number; // Number of EVM stack slots for the return values (optional)
      };
    };
  }
}

// index

//*************************************** INDEX CREATION ***************************************//

function createFunctionEntryIndexes(
  buildInfoPair: BuildInfoPair,
  functionEntryIndexes: FunctionEntryIndexes // mutates
) {
  const { buildInfoInput, buildInfoOutput } = buildInfoPair;
  const contracts = buildInfoOutput.output.contracts;
  if (!contracts) return undefined;

  const deref = astDereferencer(buildInfoOutput.output);

  const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

  for (const [inputSourceName, contractsData] of Object.entries(contracts))
    for (const [contractName, contractData] of Object.entries(contractsData)) {
      const contractFQN = hardhatConvertFromSourceInputToContractFQN(`${inputSourceName}:${contractName}`);
      debug(`Indexing contract: ${contractFQN}`);
      const functionDebugData = contractData.evm?.deployedBytecode?.functionDebugData;
      if (!functionDebugData) continue;

      functionEntryIndexes[contractFQN] = Object.fromEntries(
        Object.entries(functionDebugData)
          .filter(([functionName]) => functionName.startsWith('@'))
          .map(([_functionName, functionData]) => {
            const result = trySync(() => deref.withSourceUnit('FunctionDefinition', functionData.id));
            if (!result.ok) return undefined;

            const { node } = result.value;
            const { lineStart, lineEnd } = getLines(node.src, decodeSrc);
            const newFunctionData: FunctionData = {
              name: node.name,
              kind: node.kind,
              visibility: node.visibility,
              stateMutability: node.stateMutability,
              functionSelector: node.functionSelector,
              src: node.src,
              lineStart,
              lineEnd,
              pc: functionData.entryPoint,
              parameterSlots: functionData.parameterSlots,
              returnSlots: functionData.returnSlots,
            };

            const functionId = node.kind === 'function' || node.kind === 'freeFunction' ? node.name : node.kind;
            return [functionId, newFunctionData] as const;
          })
          .filter(isNotUndefined)
      );
    }
}

//*************************************** SAVING FILES ***************************************//

function groupFunctionIndexesPerProtocol(data: Record<string, any>): Record<string, any> {
  const protocolFunctionIndexes: Record<string, any> = {};
  for (const source of Object.keys(data)) {
    const secondFolder = source.split('/')[1];
    if (!protocolFunctionIndexes[secondFolder]) protocolFunctionIndexes[secondFolder] = {};
    protocolFunctionIndexes[secondFolder][source] = data[source];
  }

  return protocolFunctionIndexes;
}

function copyFunctionIndexesTypes(indexFilePath: string) {
  // after compilation in dist folder types inside types.ts go to types.d.ts
  const functionIndexesTypes =
    fs.readFileSync(path.join(__dirname, 'types.ts'), { encoding: 'utf8' }) ??
    fs.readFileSync(path.join(__dirname, 'types.d.ts'), { encoding: 'utf8' });

  fs.writeFileSync(indexFilePath, functionIndexesTypes, {
    encoding: 'utf8',
  });
}

//*************************************** MAIN ***************************************//

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('Index functions task started');

  const artifactsContractPath = hre.config.artifactsAugment.artifactContractsPath;
  const buildInfoPairPaths = await getBuildInfoPairsPath(hre);

  const functionEntryIndexes: FunctionEntryIndexes = {};

  for (const buildInfoPairPath of buildInfoPairPaths) {
    const buildInfoPair = getBuildInfoPair(buildInfoPairPath);
    createFunctionEntryIndexes(buildInfoPair, functionEntryIndexes);
  }

  const protocolFunctionEntryIndexes = groupFunctionIndexesPerProtocol(functionEntryIndexes);

  for (const [protocol, sourceFunctionIndexes] of Object.entries(protocolFunctionEntryIndexes)) {
    const protocolSourceFunctionIndexesPath = path.join(artifactsContractPath, protocol, 'function-indexes.json');
    debug('Paths:', { protocolSourceFunctionIndexesPath });
    fs.writeFileSync(protocolSourceFunctionIndexesPath, JSON.stringify(sourceFunctionIndexes, null, 2), 'utf-8');
  }
  const functionIndexesTypesPath = path.join(artifactsContractPath, 'function-indexes.d.ts');
  debug('Paths:', { functionIndexesTypesPath });

  copyFunctionIndexesTypes(functionIndexesTypesPath);

  debug('Index functions task ended');
}

//*************************************** HELPER FUNCTIONS ***************************************//

async function getBuildInfoPairsPath(hre: HardhatRuntimeEnvironment) {
  const buildInfoIds = await hre.artifacts.getAllBuildInfoIds();
  const pairs: Array<BuildInfoPairPath> = [];
  for (const buildInfoId of buildInfoIds) {
    pairs.push({
      input: (await hre.artifacts.getBuildInfoPath(buildInfoId))!,
      output: (await hre.artifacts.getBuildInfoOutputPath(buildInfoId))!,
      id: buildInfoId,
    });
  }
  return pairs;
}

function getBuildInfoPair(buildInfoPairPath: BuildInfoPairPath): BuildInfoPair {
  const buildInfoInputPath = buildInfoPairPath.input;
  const buildInfoOutputPath = buildInfoPairPath.output;
  const id = buildInfoPairPath.id;
  const buildInfoOutput = JSON.parse(fs.readFileSync(buildInfoOutputPath).toString());
  const buildInfoInput = JSON.parse(fs.readFileSync(buildInfoInputPath).toString());
  assertBuildInfoOutput(buildInfoOutput);
  assertBuildInfoInput(buildInfoInput);
  return { buildInfoInputPath, buildInfoInput, buildInfoOutputPath, buildInfoOutput, buildInfoId: id };
}

function getLines(location: string, decodeSrc: SrcDecoder) {
  const [start, length, fileIndex] = location.split(':').map(Number);
  const endSrc = `${start + length}:0:${fileIndex}`;
  try {
    const lineStart = decodeSrc({ src: location });
    const lineEnd = decodeSrc({ src: endSrc });
    return { lineStart, lineEnd };
  } catch (e: unknown) {
    debug(`Location not found: ${location}: ${e}`);
    return { lineStart: '-1', lineEnd: '-1' };
  }
}

//*************************************** TYPE GUARDS ***************************************//

function assertBuildInfoInput(file: any): asserts file is SolidityBuildInfo {
  if (file['_format'] !== 'hh3-sol-build-info-1') {
    throw new Error(`Invalid build info format. Expected 'hh3-sol-build-info-1', got '${file['_format']}'`);
  }
}

function assertBuildInfoOutput(file: any): asserts file is SolidityBuildInfoOutput {
  if (file['_format'] !== 'hh3-sol-build-info-output-1') {
    throw new Error(`Invalid build info format. Expected 'hh3-sol-build-info-output-1', got '${file['_format']}'`);
  }
}

//*************************************** UTILS ***************************************//
