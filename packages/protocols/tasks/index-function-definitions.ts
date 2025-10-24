import url from 'node:url';
import { artifactsBuildInfoPath, artifactsContractPath } from '../tasks-config.ts';
import { glob } from 'glob';
import fs from 'fs';
import type { SolidityBuildInfoOutput, SolidityBuildInfo } from 'hardhat/types/solidity';
import { findAll, srcDecoder } from 'solidity-ast/utils.js'; // force common.js resolution
import path from 'node:path';

// types

export type FunctionIndex = {
  name: string;
  kind: string;
  lineStart: number;
  lineEnd: number;
};

export type SourceFunctionIndexes = {
  [source: string]: Array<FunctionIndex>;
};

export type ProtocolFunctionIndexes = {
  [protocol: string]: SourceFunctionIndexes;
};

// index creation

function getBuildInfoPairs() {
  const allFiles = glob.sync('**/*.json', {
    cwd: artifactsBuildInfoPath,
    dot: true,
    absolute: true,
  });

  const fileMap = new Map<string, { input?: string; output?: string }>();

  for (const file of allFiles) {
    const fileName = path.basename(file);

    if (fileName.endsWith('.output.json')) {
      // Output file
      const baseName = fileName.replace('.output.json', '');
      const entry = fileMap.get(baseName) || {};
      entry.output = file;
      fileMap.set(baseName, entry);
    } else {
      // Input file
      const baseName = fileName.replace('.json', '');
      const entry = fileMap.get(baseName) || {};
      entry.input = file;
      fileMap.set(baseName, entry);
    }
  }

  // Convert map to an array of pairs
  const pairs: Array<{ input: string; output: string }> = [];
  for (const { input, output } of fileMap.values()) {
    if (input && output) pairs.push({ input, output });
  }

  return pairs;
}

function createSourceFunctionIndexes(buildInfoPairs: ReturnType<typeof getBuildInfoPairs>): SourceFunctionIndexes {
  const sourceFunctionIndex: SourceFunctionIndexes = {};

  for (const { input, output } of buildInfoPairs) {
    const buildInfoOutput = JSON.parse(fs.readFileSync(output).toString());
    const buildInfoInput = JSON.parse(fs.readFileSync(input).toString());
    assertBuildInfoOutput(buildInfoOutput);
    assertBuildInfoInput(buildInfoInput);

    // build decoder
    const decodeSrc = srcDecoder(buildInfoInput.input, buildInfoOutput.output);

    // get function defs from sources
    for (const [sourceName, sourceData] of Object.entries(buildInfoOutput.output.sources)) {
      const ast = sourceData.ast;
      const sourceFunctionDefinitions: Array<FunctionIndex> = [];
      // remove projects folder
      const sourceNormalized = sourceName.split('/').slice(1).join('/');

      for (const functionDef of findAll('FunctionDefinition', ast)) {
        const [start, length, fileIndex] = functionDef.src.split(':').map(Number);
        const endSrc = `${start + length}:0:${fileIndex}`;
        const functionLineStart = getLineNumber(decodeSrc(functionDef));
        const functionLineEnd = getLineNumber(decodeSrc({ src: endSrc }));
        // create function index
        const functionIndex: FunctionIndex = {
          name: functionDef.name,
          kind: functionDef.kind,
          lineStart: functionLineStart,
          lineEnd: functionLineEnd,
        };
        sourceFunctionDefinitions.push(functionIndex);
      }
      sourceFunctionIndex[sourceNormalized] = sourceFunctionDefinitions;
    }
  }
  return sourceFunctionIndex;
}

function createProtocolFunctionIndexes(sourceFunctionIndexes: SourceFunctionIndexes): ProtocolFunctionIndexes {
  const protocolFunctionIndexes: ProtocolFunctionIndexes = {};
  for (const source of Object.keys(sourceFunctionIndexes)) {
    const secondFolder = source.split('/')[1];
    if (!protocolFunctionIndexes[secondFolder]) protocolFunctionIndexes[secondFolder] = {};
    protocolFunctionIndexes[secondFolder][source] = sourceFunctionIndexes[source];
  }

  return protocolFunctionIndexes;
}

// helpers

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

function getLineNumber(location: string) {
  return Number.parseInt(location.split(':')[1]);
}

// main

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const buildInfoPairs = getBuildInfoPairs();
  const sourceFunctionIndexes = createSourceFunctionIndexes(buildInfoPairs);
  const protocolFunctionIndexes = createProtocolFunctionIndexes(sourceFunctionIndexes);

  for (const [protocol, sourceFunctionIndexes] of Object.entries(protocolFunctionIndexes)) {
    const protocolSourceFunctionIndexesPath = path.join(artifactsContractPath, protocol, 'function-indexes.json');
    fs.writeFileSync(protocolSourceFunctionIndexesPath, JSON.stringify(sourceFunctionIndexes, null, 2), 'utf-8');
  }
}
