export function toUserSource(contractSourceInput: string): string {
  return contractSourceInput?.replace('project/', '');
}
