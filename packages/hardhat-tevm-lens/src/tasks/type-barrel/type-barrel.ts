import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../debug.ts';

const debug = createDebug(`${DEBUG_PREFIX}:type-barrel`);

// Find all .d.ts files matching include patterns
async function findDtsFiles(includeFolderPatterns: string[]): Promise<string[]> {
  const allFiles: Set<string> = new Set();

  // Find files matching patterns
  for (const pattern of includeFolderPatterns) {
    const matches = await glob(pattern, {
      absolute: true,
      nodir: true,
    });
    matches.forEach((file) => allFiles.add(file));
  }

  return Array.from(allFiles);
}

// Generate export statements from file paths
function generateExportStatements(files: string[], destinationFile: string): string[] {
  const outputDir = path.dirname(path.resolve(destinationFile));
  const exports: string[] = [];

  for (const file of files) {
    // Calculate relative path from destination file
    let relativePath = path.relative(outputDir, file);

    // Convert to POSIX-style paths (forward slashes)
    relativePath = relativePath.split(path.sep).join('/');

    // Remove .d.ts extension
    relativePath = relativePath.replace(/\.d\.ts$/, '');

    // Ensure path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    exports.push(`export * from '${relativePath}';`);
  }

  exports.push("export type { ArtifactMap } from 'hardhat/types/artifacts';");

  return exports;
}

function writeBarrelFile(destinationFile: string, exports: string[]): void {
  const content = exports.join('\n') + '\n';
  fs.writeFileSync(destinationFile, content, 'utf-8');
}

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('Type barrel task started');

  const includeFoldersPatterns = [hre.config.paths.artifacts + '/**/*.d.ts'];
  const destinationFile = path.join(hre.config.paths.artifacts, 'index.d.ts');
  debug('Paths:', { includeFoldersPatterns, destinationFile });

  const files = await findDtsFiles(includeFoldersPatterns);
  const exports = generateExportStatements(files, destinationFile);

  writeBarrelFile(destinationFile, exports);

  debug('Type barrel task ended');
}
