import type { Address } from '../types/artifact.ts';

type DeployedContract = {
  name: string;
  isDeployedByCA: boolean;
};

export class DeployedContracts {
  public readonly addressLabel: Map<Address, DeployedContract> = new Map();

  public markContractAddress(address: Address, contractFQN: string, isDeployedByCA = false): void {
    this.addressLabel.set(this.toLowerCase(address), { name: contractFQN, isDeployedByCA });
  }

  public getContractFqnForAddress(address: Address) {
    return this.addressLabel.get(this.toLowerCase(address))?.name;
  }

  private toLowerCase(address: Address): Address {
    return address.toLowerCase() as Address;
  }
}
