import fs from 'fs';
import hre from 'hardhat';
import path from 'path';
import url from 'node:url';
import { Project } from 'ts-morph';
import { artifactsContractPath } from '../tasks-config.ts';

function groupByFolder(files: string[], folderNumber: number): Record<string, string[]> {
  return files.reduce<Record<string, string[]>>((acc, filePath) => {
    const groupFolder = filePath.split('/')[folderNumber];
    if (!acc[groupFolder]) acc[groupFolder] = [];
    acc[groupFolder].push(filePath);

    return acc;
  }, {});
}

function createProtocolsType(values: string[]) {
  const unique = Array.from(new Set(values)).sort();

  const project = new Project();
  const protocolsTypeFilePath = path.join(artifactsContractPath, 'protocols-list.d.ts');
  const sourceFile = project.createSourceFile(protocolsTypeFilePath, '', { overwrite: true });

  const unionTypes = unique.length === 0 ? ['never'] : unique.map((v) => `'${v}'`);

  sourceFile.addTypeAlias({
    isExported: true,
    name: 'ProtocolName',
    type: unionTypes.join(' | '),
  });

  const code = sourceFile.getFullText();
  fs.writeFileSync(protocolsTypeFilePath, code);
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const fileList = Array.from(await hre.artifacts.getAllFullyQualifiedNames());
  const groupedByProtocol = groupByFolder(fileList, 1);

  for (const [group, files] of Object.entries(groupedByProtocol)) {
    const protocolContractsListPath = path.join(artifactsContractPath, group, 'contract-fqn-list.json');

    fs.writeFileSync(protocolContractsListPath, JSON.stringify(files, null, 2));
  }
  const protocolList = Object.keys(groupedByProtocol);
  createProtocolsType(protocolList);
}
