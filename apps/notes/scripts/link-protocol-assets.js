import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve('public');
const links = [
  ['../../../packages/protocols/artifacts', path.join(publicDir, 'artifacts')],
  ['../../../packages/protocols/contracts', path.join(publicDir, 'contracts')],
];

for (const [src, dest] of links) {
  if (!fs.existsSync(dest)) fs.symlinkSync(src, dest, 'dir');
}
