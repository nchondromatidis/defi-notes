import { Project } from 'ts-morph';

export function extractMethod(
  filePath: string,
  className: string,
  methodName: string,
  trimFirstSpaces: boolean,
  trimCount: number
): string | undefined {
  const project = new Project({
    skipFileDependencyResolution: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  const classDeclaration = sourceFile.getClass(className);
  if (!classDeclaration) {
    return undefined;
  }

  const method = classDeclaration.getMethod(methodName);
  if (!method) {
    return undefined;
  }

  let methodText = method.getFullText();
  if (trimFirstSpaces) {
    const regex = new RegExp(`^ {${trimCount}}`, 'gm');
    methodText = methodText.replace(regex, '');
  }

  return methodText;
}
