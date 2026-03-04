import { fileURLToPath } from 'url';
import path from 'path';
import { Project } from 'ts-morph';
import { trimFirstSpaces } from '@/protocols/extract-code/_utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ACTIONS_DIR = path.join(__dirname, '..', 'workflows');

export function extractProtocolWorkflowCode(protocolWorkflowClassName: string, methodNames: string[]) {
  const result = [];
  for (const methodName of methodNames) {
    const filePath = path.join(ACTIONS_DIR, `${protocolWorkflowClassName}.ts`);
    const extractedMethod = extractMethod(filePath, protocolWorkflowClassName, methodName, true, 2);

    if (!extractedMethod) return undefined;

    const { methodText, startLine, endLine } = extractedMethod;
    const methodTextArray = methodText.split('\n');
    const trimmedMethodTextArray = trimEmptyArrayElements(methodTextArray);
    trimmedMethodTextArray.unshift(`// ${protocolWorkflowClassName}:${methodName}:${startLine}:${endLine}`);

    result.push(...trimmedMethodTextArray);
    result.push('');
  }

  return result.join('\n');
}

function extractMethod(
  filePath: string,
  className: string,
  methodName: string,
  shouldTrimFirstSpaces: boolean,
  trimCount: number
): { methodText: string; startLine: number; endLine: number } | undefined {
  const project = new Project({
    skipFileDependencyResolution: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  const classDeclaration = sourceFile.getClass(className);
  if (!classDeclaration) return undefined;

  const method = classDeclaration.getMethod(methodName);
  if (!method) return undefined;

  let methodText = method.getFullText();
  if (shouldTrimFirstSpaces) {
    methodText = trimFirstSpaces(methodText, trimCount);
  }

  return {
    methodText,
    startLine: method.getStartLineNumber(),
    endLine: method.getEndLineNumber(),
  };
}

function trimEmptyArrayElements(arr: string[]): string[] {
  let start = 0;
  while (start < arr.length && arr[start] === '') {
    start++;
  }

  let end = arr.length - 1;
  while (end >= start && arr[end] === '') {
    end--;
  }

  return arr.slice(start, end + 1);
}
