// build info types
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { SolidityBuildInfo, SolidityBuildInfoOutput } from 'hardhat/types/solidity';
import fs from 'fs';

type BuildInfoPairPath = { readonly input: string; readonly output: string; readonly id: string };
export type BuildInfoPair = {
  readonly buildInfoInputPath: string;
  readonly buildInfoInput: SolidityBuildInfo;
  readonly buildInfoOutputPath: string;
  readonly buildInfoOutput: SolidityBuildInfoOutput;
  readonly buildInfoId: string;
};

export async function getBuildInfoPairsPath(hre: HardhatRuntimeEnvironment) {
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

export function getBuildInfoPair(buildInfoPairPath: BuildInfoPairPath): BuildInfoPair {
  const buildInfoInputPath = buildInfoPairPath.input;
  const buildInfoOutputPath = buildInfoPairPath.output;
  const id = buildInfoPairPath.id;
  const buildInfoOutput = JSON.parse(fs.readFileSync(buildInfoOutputPath).toString());
  const buildInfoInput = JSON.parse(fs.readFileSync(buildInfoInputPath).toString());
  assertBuildInfoOutput(buildInfoOutput);
  assertBuildInfoInput(buildInfoInput);
  return { buildInfoInputPath, buildInfoInput, buildInfoOutputPath, buildInfoOutput, buildInfoId: id };
}

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
