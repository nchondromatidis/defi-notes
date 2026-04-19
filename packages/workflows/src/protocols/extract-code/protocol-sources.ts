import type { ArtifactMap } from '@protocol-lens/protocols/*';
import path from 'node:path';
import type { LensArtifactsMapSlice } from '@protocol-lens/evm-lens/src/client-utils/type-helpers.ts';
import type { LensArtifactsMap } from '@protocol-lens/evm-lens/src/lens/types.ts';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
import { trimFirstSpaces } from './_utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('Workspace root not found');
}

const workspaceRoot = findWorkspaceRoot(__dirname);
export const PROTOCOLS_RESOURCES_PATH = path.join(workspaceRoot, 'packages', 'protocols');

export type UniswapV2Artifacts = LensArtifactsMapSlice<LensArtifactsMap<ArtifactMap>, 'contracts', 'uniswap-v2'>;

export function extractProtocolCodeSlice<ContractFqtT extends LensArtifactsMap<any>>(
  slices: Array<[contractFqn: keyof ContractFqtT & string, fromLine: number, toLine: number]>
) {
  const result = [];
  for (const [contractFqn, fromLine, toLine] of slices) {
    const userSourceFileName = contractFqn.split(':')[0];
    const userSourcePath = path.join(PROTOCOLS_RESOURCES_PATH, userSourceFileName);
    const codeSlice = extractFileSlice(userSourcePath, fromLine, toLine);
    const trimmedCodeSlice = trimFirstSpaces(codeSlice);

    const augmentedCodeSlice = trimmedCodeSlice.split('\n');
    augmentedCodeSlice.unshift(`// ${userSourceFileName}:${fromLine}:${toLine}`);

    result.push(...augmentedCodeSlice);
    result.push('');
  }
  return result.join('\n');
}

export function extractFileSlice(filePath: string, fromLine: number, toLine: number) {
  const userSourcePath = path.join(filePath);
  const content = fs.readFileSync(userSourcePath, 'utf-8');
  const lines = content.split('\n');
  return lines.slice(fromLine - 1, toLine).join('\n');
}
