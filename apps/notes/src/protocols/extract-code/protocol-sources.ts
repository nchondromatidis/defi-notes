import type { ArtifactMap } from '@defi-notes/protocols/*';
import path from 'path';
import type { LensArtifactsMapSlice } from '@defi-notes/evm-lens/src/client-utils/type-helpers.ts';
import type { LensArtifactsMap } from '@defi-notes/evm-lens/src/lens/types.ts';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
import { trimFirstSpaces } from '@/protocols/extract-code/_utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROTOCOLS_RESOURCES_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'packages', 'protocols');

export type UniswapV2Artifacts = LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'contracts', 'uniswap-v2'>;

export function extractProtocolCodeSlice<ContractFqtT extends LensArtifactsMap<any>>(
  contractFqnOrUserSource: keyof ContractFqtT & string,
  fromLine: number,
  toLine: number
) {
  const userSourceFileName = contractFqnOrUserSource.split(':')[0];
  const userSourcePath = path.join(PROTOCOLS_RESOURCES_PATH, userSourceFileName);
  const codeSlice = extractFileSlice(userSourcePath, fromLine, toLine);
  const trimmedCodeSlice = trimFirstSpaces(codeSlice, 8);

  const augmentedCodeSlice = trimmedCodeSlice.split('\n');
  augmentedCodeSlice.unshift(`// ${userSourceFileName}:${fromLine}:${toLine}`);

  return augmentedCodeSlice.join('\n');
}

export function extractFileSlice(filePath: string, fromLine: number, toLine: number) {
  const userSourcePath = path.join(filePath);
  const content = fs.readFileSync(userSourcePath, 'utf-8');
  const lines = content.split('\n');
  return lines.slice(fromLine - 1, toLine).join('\n');
}

// const a = extractProtocolCodeSlice<UniswapV2Artifacts>(
//   'contracts/uniswap-v2/v2-core/contracts/UniswapV2Pair.sol:UniswapV2Pair',
//   119,
//   122
// );
