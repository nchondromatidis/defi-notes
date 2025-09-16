import { defineConfig } from '@wagmi/cli';
import { hardhat } from '@wagmi/cli/plugins';
import { glob } from 'glob';


const repoDirectoryPaths = await glob('artifacts/contracts/*/*/');
const protocolAndRepoFolderNames = repoDirectoryPaths.map(dir => {
  const parts = dir.split('/').filter(Boolean);
  const [protocolFolderName, repoFolderName] = parts.slice(-2);
  return [protocolFolderName, repoFolderName] as const;

});


const configPerProtocolRepo = protocolAndRepoFolderNames.map(dir => {
  return {
    out: `artifacts/types/${dir[0]}/${dir[1]}.ts`,
    plugins: [
      hardhat({
        artifacts: './artifacts',
        project: '.',
        include: [`${dir[0]}/${dir[1]}/**/*.json`],
        exclude: ['test/**', 'examples/**']
      }),
    ],
  }
});

export default defineConfig(configPerProtocolRepo);

