import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Project } from 'ts-morph';
import { trimFirstSpaces } from './_utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ACTIONS_DIR = path.join(__dirname, '..', 'workflows');

export function extractProtocolWorkflowCode(
  workflows: Array<[protocolWorkflowClassName: string, methodNames: string]>
) {
  const result = [];
  for (const [protocolWorkflowClassName, methodName] of workflows) {
    const filePath = path.join(ACTIONS_DIR, `${protocolWorkflowClassName}.ts`);
    let extractedMethod = extractMethod(filePath, protocolWorkflowClassName, methodName, false);
    if (!extractedMethod) {
      extractedMethod = extractMethod(filePath, protocolWorkflowClassName, methodName, true);
    }
    if (!extractedMethod) return undefined;

    const { methodText, startLine, endLine } = extractedMethod;
    const methodTextArray = methodText.split('\n');
    const trimmedMethodTextArray = trimEmptyLines(methodTextArray);
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
  isStatic: boolean
): { methodText: string; startLine: number; endLine: number } | undefined {
  const project = new Project({
    skipFileDependencyResolution: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  const classDeclaration = sourceFile.getClass(className);
  if (!classDeclaration) return undefined;

  const method = isStatic ? classDeclaration.getStaticMethod(methodName) : classDeclaration.getMethod(methodName);

  if (!method) return undefined;

  let methodText = method.getFullText();
  methodText = trimFirstSpaces(methodText);

  return {
    methodText,
    startLine: method.getStartLineNumber(),
    endLine: method.getEndLineNumber(),
  };
}

function trimEmptyLines(arr: string[]): string[] {
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
