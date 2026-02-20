import { Project } from 'ts-morph';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows', 'protocols');

export function extractMethod(
  fileName: string,
  className: string,
  methodName: string,
  trimFirstSpaces = true,
  trimCount = 2
): string | null {
  const project = new Project({
    skipFileDependencyResolution: true,
  });

  const filePath = path.join(WORKFLOWS_DIR, fileName);
  const sourceFile = project.addSourceFileAtPath(filePath);

  const classDeclaration = sourceFile.getClass(className);
  if (!classDeclaration) {
    return null;
  }

  const method = classDeclaration.getMethod(methodName);
  if (!method) {
    return null;
  }

  let methodText = method.getFullText();
  if (trimFirstSpaces) {
    const regex = new RegExp(`^ {${trimCount}}`, 'gm');
    methodText = methodText.replace(regex, '');
  }

  return methodText;
}
