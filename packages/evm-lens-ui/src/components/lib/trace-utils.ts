import type {
  ReadOnlyFunctionCallEvent,
  LensLog,
} from '@protocol-lens/evm-lens/src/lens/pipeline/4_function-trace/FunctionTraceBuilder.ts';

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
  if (isError) return 'text-destructive font-bold uppercase tracking-tight';
  const type = callType.toUpperCase();
  if (type.includes('JUMP') || type === 'INTERNAL')
    return 'text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tight';
  if (type === 'STATICCALL') return 'text-purple-600 dark:text-purple-400 font-bold uppercase tracking-tight';
  if (type === 'DELEGATECALL') return 'text-orange-600 dark:text-orange-400 font-bold uppercase tracking-tight';
  if (type === 'CREATE' || type === 'CREATE2')
    return 'text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-tight';
  return 'text-violet-600 dark:text-violet-400 font-bold uppercase tracking-tight';
};

export const countArgs = (args: unknown): number => {
  if (!args || typeof args !== 'object') return 0;
  if (Array.isArray(args)) return args.length;
  return Object.keys(args as Record<string, unknown>).length;
};

export const countReturnValues = (returnValue: unknown): number => {
  if (returnValue === undefined || returnValue === null) return 0;
  if (typeof returnValue === 'object') {
    if (Array.isArray(returnValue)) return returnValue.length;
    return Object.keys(returnValue as Record<string, unknown>).length;
  }
  return 1;
};

export const formatAggregates = (args: unknown, returnValue: unknown, logs?: readonly LensLog[]): string => {
  const argc = countArgs(args);
  const retc = countReturnValues(returnValue);
  const logc = logs?.length ?? 0;
  if (argc === 0 && retc === 0 && logc === 0) return '';
  return `(args: ${argc}, ret: ${retc}, logs: ${logc})`;
};

export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'bigint') return value.toString();
  return String(value);
}
