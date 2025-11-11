import path from 'node:path';
import fs from 'node:fs';
import * as url from 'node:url';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';
import { artifactsBuildInfoPath, artifactsPath } from '../../tasks-config.ts';
import { IndentationText, Project } from 'ts-morph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function augmentContractTypes(artifactTypePath: string, contractName: string): void {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const sourceFile = project.addSourceFileAtPath(artifactTypePath);

  const contractTypeInterface = sourceFile.getInterface((i) => i.getName() === `${contractName}$Type`);

  if (contractTypeInterface) {
    if (!contractTypeInterface.getProperty('storageLayout')) {
      contractTypeInterface.addProperty({
        name: 'storageLayout',
        type: 'StorageLayout',
        isReadonly: true,
      });
    }
    if (!contractTypeInterface.getProperty('bytecodeSourceMap')) {
      contractTypeInterface.addProperty({
        name: 'bytecodeSourceMap',
        type: 'String',
        isReadonly: true,
      });
    }
    if (!contractTypeInterface.getProperty('deployedBytecodeSourceMap')) {
      contractTypeInterface.addProperty({
        name: 'deployedBytecodeSourceMap',
        type: 'String',
        isReadonly: true,
      });
    }
    sourceFile.saveSync();
  }
}

/*
 * Finds source maps and storage layout from build-info
 * Adds source maps and storage layout to each contract artifact .json file
 * Also adds types to it's artifacts.d.ts.
 */
export function augmentArtifacts(artifactsPath: string) {
  const outputFilePaths = glob.sync(`${artifactsBuildInfoPath}/*.output.json`);

  const storageLayoutTypes = fs.readFileSync(path.join(__dirname, 'storageLayout.d.ts'), 'utf-8');

  for (const outputFilePath of outputFilePaths) {
    const buildInfo = JSON.parse(fs.readFileSync(outputFilePath, 'utf-8'));
    for (const [sourceFile, contracts] of Object.entries<any>(buildInfo.output.contracts)) {
      for (const [contractName, contractData] of Object.entries<any>(contracts)) {
        const sourceFileCleaned = sourceFile.replace('project/', '');
        const artifactPath = path.join(artifactsPath, sourceFileCleaned, `${contractName}.json`);
        if (!fs.existsSync(artifactPath)) continue;

        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));

        artifact.bytecodeSourceMap = contractData.evm.bytecode.sourceMap ?? {};
        artifact.deployedBytecodeSourceMap = contractData.evm.deployedBytecode.sourceMap ?? {};
        artifact.storageLayout = contractData.storageLayout ?? {};

        fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

        const artifactTypePath = path.join(artifactsPath, sourceFileCleaned, `artifacts.d.ts`);
        if (!fs.existsSync(artifactTypePath)) continue;

        fs.appendFileSync(artifactTypePath, '\n\n' + storageLayoutTypes, 'utf-8');
        augmentContractTypes(artifactTypePath, contractName);
      }
    }
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  augmentArtifacts(artifactsPath);
}
