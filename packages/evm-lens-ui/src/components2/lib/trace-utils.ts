import type {
  ReadOnlyFunctionCallEvent,
  LensLog,
} from '@defi-notes/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';

export type FormattedLog = {
  eventName: string;
  args: Record<string, unknown>;
};

export const formatArgs = (args: unknown): string => {
  if (!args || typeof args !== 'object') return '';
  if (Array.isArray(args)) return args.join(', ');
  return Object.entries(args as Record<string, unknown>)
    .map(([key, value]) => `${key} = ${formatValue(value)}`)
    .join(', ');
};

export const formatResult = (result?: unknown): string => {
  if (result === undefined || result === null) return '';
  if (typeof result === 'object') {
    if (Array.isArray(result)) return `(${result.join(', ')})`;
    const values = Object.values(result as Record<string, unknown>);
    if (values.length > 0) return `(${values.join(', ')})`;
    return '()';
  }
  return `(${String(result)})`;
};

export const formatLogs = (logs: readonly LensLog[]): FormattedLog[] => {
  return logs
    .filter((log) => log.eventName && log.args)
    .map((log) => ({
      eventName: log.eventName!,
      args: (log.args ?? {}) as Record<string, unknown>,
    }));
};

export const getAllPaths = (
  node: ReadOnlyFunctionCallEvent,
  currentPath: string = 'root',
  paths: Set<string> = new Set()
): Set<string> => {
  paths.add(currentPath);
  if (node.called && node.called.length > 0) {
    node.called.forEach((child, index) => {
      getAllPaths(child, `${currentPath}-${index}`, paths);
    });
  }
  return paths;
};

export const getCallTypeStyle = (callType: string, isError: boolean): string => {
  if (isError) return 'text-error font-bold uppercase tracking-tight';
  const type = callType.toUpperCase();
  if (type.includes('JUMP') || type === 'INTERNAL') return 'text-emerald-400 font-bold uppercase tracking-tight';
  if (type === 'STATICCALL') return 'text-purple-400 font-bold uppercase tracking-tight';
  if (type === 'DELEGATECALL') return 'text-orange-400 font-bold uppercase tracking-tight';
  if (type === 'CREATE' || type === 'CREATE2') return 'text-yellow-400 font-bold uppercase tracking-tight';
  return 'text-violet-400 font-bold uppercase tracking-tight';
};

export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'bigint') return value.toString();
  return String(value);
}
