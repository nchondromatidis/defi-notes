import fs from 'fs';
import path from 'path';
import { artifactsContractPath, artifactsPath } from '../tasks-config.ts';
import url from 'node:url';
import ts from 'typescript';

function listJsonFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      fileList = listJsonFilesRecursively(path.join(dir, file), fileList);
    } else {
      const filePath = path.relative(artifactsPath, path.join(dir, file));
      if (filePath.endsWith('.json')) {
        const lastSlashIndex = filePath.lastIndexOf('/');
        const filePathColon = filePath.slice(0, lastSlashIndex) + ':' + filePath.slice(lastSlashIndex + 1);
        const filePathColonNoJson = filePathColon.replace('.json', '');
        fileList.push(filePathColonNoJson);
      }
    }
  });

  return fileList;
}

function groupBySecondFolder(files: string[]): Record<string, string[]> {
  return files.reduce<Record<string, string[]>>((acc, filePath) => {
    const secondFolder = filePath.split('/')[1];
    if (!acc[secondFolder]) acc[secondFolder] = [];
    acc[secondFolder].push(filePath);

    return acc;
  }, {});
}

function createProtocolsType(values: string[]) {
  // 1) Sanitize: dedupe + sort for stable output
  const unique = Array.from(new Set(values)).sort();

  // 2) Create a SourceFile context for the printer
  const sf = ts.createSourceFile('protocols.d.ts', '', ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);

  // 3) Build one flat array of literal members
  const f = ts.factory;
  const members = unique.length === 0 ? [] : unique.map((v) => f.createLiteralTypeNode(f.createStringLiteral(v)));

  // 4) Create a single flat union node (no nesting, so no parentheses)
  const unionType =
    members.length === 0 ? f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword) : f.createUnionTypeNode(members);

  // 5) Create: export type Protocol = "..." | "...";
  const typeAlias = f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    'ProtocolName',
    /* typeParameters */ undefined,
    unionType
  );

  // 6) Prepare the output file and print
  const outFile = f.updateSourceFile(sf, [typeAlias]);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const code = printer.printFile(outFile);

  // 7) Write to disk
  const protocolsTypeFilePath = path.join(artifactsContractPath, 'protocols-list.d.ts');
  fs.writeFileSync(protocolsTypeFilePath, code);
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const fileList = listJsonFilesRecursively(artifactsContractPath);
  const groupedBySecondFolder = groupBySecondFolder(fileList);

  for (const [group, files] of Object.entries(groupedBySecondFolder)) {
    const protocolContractsListPath = path.join(artifactsContractPath, group, 'contract-fqn-list.json');
    fs.writeFileSync(protocolContractsListPath, JSON.stringify(files, null, 2));
  }
  const protocolList = Object.keys(groupedBySecondFolder);
  createProtocolsType(protocolList);
}
