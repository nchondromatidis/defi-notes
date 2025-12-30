export function hardhatConvertFromSourceInputToContractFQN(contractSourceInput: string): string {
  return contractSourceInput?.replace('project/', '');
}
