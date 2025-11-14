import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../debug.js';

const debug = createDebug(`${DEBUG_PREFIX}:type-barrel`);

interface BarrelGeneratorOptions {
  /** Array of folder paths or glob patterns to include */
  includeFolders: string[];
  /** Array of folder paths or patterns to exclude */
  excludeFolders?: string[];
  /** Destination file path for the barrel file */
  destinationFile: string;
  /** Root directory to resolve relative paths from (defaults to cwd) */
  rootDir?: string;
}

/**
 * Generate a TypeScript barrel file with export statements
 */
export async function generateBarrel(options: BarrelGeneratorOptions): Promise<void> {
  const { includeFolders, excludeFolders = [], destinationFile, rootDir = process.cwd() } = options;

  // Find all .d.ts files
  const files = await findDtsFiles(includeFolders, excludeFolders, rootDir, destinationFile);

  // Generate export statements
  const exports = generateExportStatements(files, destinationFile);

  // Write barrel file
  writeBarrelFile(destinationFile, exports);

  console.log(`✓ Generated barrel file: ${destinationFile}`);
  console.log(`  Exported ${exports.length} modules`);
}

/**
 * Find all .d.ts files matching include/exclude patterns
 */
async function findDtsFiles(
  includeFolders: string[],
  excludeFolders: string[],
  rootDir: string,
  destinationFile: string
): Promise<string[]> {
  const allFiles: Set<string> = new Set();

  // Build include patterns
  const includePatterns = includeFolders.map((folder) => {
    const resolved = path.resolve(rootDir, folder);
    return `${resolved}/**/*.d.ts`;
  });

  // Build exclude patterns
  const excludePatterns = [
    '**/node_modules/**',
    path.resolve(destinationFile),
    ...excludeFolders.map((folder) => {
      const resolved = path.resolve(rootDir, folder);
      return `${resolved}/**`;
    }),
  ];

  // Find files matching patterns
  for (const pattern of includePatterns) {
    const matches = await glob(pattern, {
      ignore: excludePatterns,
      absolute: true,
      nodir: true,
    });
    matches.forEach((file) => allFiles.add(file));
  }

  // Sort files for consistent output
  return Array.from(allFiles).sort();
}

/**
 * Generate export statements from file paths
 */
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

  return exports;
}

/**
 * Write barrel file to disk
 */
function writeBarrelFile(destinationFile: string, exports: string[]): void {
  // Ensure directory exists
  const dir = path.dirname(destinationFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  exports.push("export type { ArtifactMap } from 'hardhat/types/artifacts';");
  // Generate content with blank lines between exports
  const content = exports.join('\n') + '\n';

  // Write to file
  fs.writeFileSync(destinationFile, content, 'utf-8');
}

/**
 * Convenience function for simple barrel generation
 */
export async function createBarrel(
  includeFolders: string[],
  destinationFile: string,
  excludeFolders?: string[]
): Promise<void> {
  return generateBarrel({
    includeFolders,
    excludeFolders,
    destinationFile,
  });
}

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('Type barrel task started');

  const includeFolders = hre.config.artifactsAugment.typeBarrel.includeFolders;
  const excludeFolders = hre.config.artifactsAugment.typeBarrel.excludeFolders;
  const destinationFile = path.join(hre.config.paths.artifacts, 'index.d.ts');
  debug('Paths:', { destinationFile });

  await generateBarrel({ includeFolders, excludeFolders, destinationFile });

  debug('Type barrel task ended');
}
