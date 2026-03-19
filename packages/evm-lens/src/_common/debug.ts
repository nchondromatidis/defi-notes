export const DEBUG_PREFIX = 'evm-lens';

export function jsonStr(obj: unknown) {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  });
}
