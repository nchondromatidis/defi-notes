import { fileURLToPath } from 'url';
import path from 'path';
import { extractMethod } from '@/utils/method-extractor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ACTIONS_DIR = path.join(__dirname, 'actions');

export function extractActionCode(protocolClass: string, actionName: string) {
  const filePath = path.join(ACTIONS_DIR, `${protocolClass}.ts`);
  return extractMethod(filePath, protocolClass, actionName, true, 2);
}
