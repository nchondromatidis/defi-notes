import type { Hex } from 'viem';
import type { ContractFQN, Option } from '../common/utils.ts';

type DeployedContract = { name: Option<ContractFQN>; isDeployedByCA: boolean };

export class DeployedContracts {
  // address -> contract fqn
  protected readonly deployedContracts: Map<Hex, DeployedContract> = new Map();

  public register(address: Hex, contractFQN: Option<ContractFQN>, isDeployedByCA = false): void {
    this.deployedContracts.set(address, { name: contractFQN, isDeployedByCA });
  }

  public get(address: Hex): Option<DeployedContract> {
    return this.deployedContracts.get(address);
  }
}
