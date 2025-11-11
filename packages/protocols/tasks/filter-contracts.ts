import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as url from 'node:url';
import { minimatch } from 'minimatch';
import { sourceContractsPath, excludeFolders, includeFolders, libPath } from '../tasks-config.ts';

async function copySymlinkRecursive(src: string, dest: string, include: string[], exclude: string[]) {
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });

  const pattern = '**/*';
  const files = glob.sync(pattern, { cwd: src, dot: true, nodir: false, absolute: true });

  for (const filePath of files) {
    const relativePath = path.relative(src, filePath);

    // Exclude check (glob patterns relative to src)
    if (exclude.some((pattern) => minimatch(relativePath, pattern, { dot: true }))) continue;

    // Include check (glob patterns relative to src)
    if (!include.some((pattern) => minimatch(relativePath, pattern, { dot: true }))) continue;

    const targetPath = path.join(dest, relativePath);
    const stat = await fs.lstat(filePath);

    if (stat.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.symlink(filePath, targetPath);
    }
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  copySymlinkRecursive(libPath, sourceContractsPath, includeFolders, excludeFolders).catch(console.error);
}
