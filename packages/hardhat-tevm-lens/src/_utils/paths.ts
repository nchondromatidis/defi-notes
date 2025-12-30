export function groupSourcesPerProtocol<T extends { source: string }>(data: T[]) {
  const protocolFunctionIndexes: Record<string, Array<T>> = {};
  for (const functionData of data) {
    const secondFolder = functionData.source.split('/')[1];
    if (!protocolFunctionIndexes[secondFolder]) protocolFunctionIndexes[secondFolder] = [];
    protocolFunctionIndexes[secondFolder].push(functionData);
  }

  return protocolFunctionIndexes;
}

export function groupByFolder(files: string[], folderNumber: number): Record<string, string[]> {
  return files.reduce<Record<string, string[]>>((acc, filePath) => {
    const groupFolder = filePath.split('/')[folderNumber];
    if (!acc[groupFolder]) acc[groupFolder] = [];
    acc[groupFolder].push(filePath);

    return acc;
  }, {});
}
