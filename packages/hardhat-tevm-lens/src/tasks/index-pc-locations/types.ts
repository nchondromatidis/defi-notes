export type PC = number;
export type ContractFQN = string;
export type JumpType = 'i' | 'o' | '-';
export type Location = [startLine: number, endLine: number, sourceIndex: number];

export type PcLocationIndex = {
  contractFQN: ContractFQN;
  locationSources: Array<string>;
  pcLocations: Array<[PC, JumpType, Location]>;
};
