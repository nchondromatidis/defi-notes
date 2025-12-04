import type { Address } from '../types/artifact.ts';

type DeployedContractFQN = string;

export class DeploymentTracer {
  public readonly addressLabel: Map<Address, DeployedContractFQN> = new Map();

  public markContractAddress(address: Address, contractFQN: string): void {
    this.addressLabel.set(this.toLowerCase(address), contractFQN);
  }

  public getContractFqnForAddress(address: Address) {
    return this.addressLabel.get(this.toLowerCase(address));
  }

  private toLowerCase(address: Address): Address {
    return address.toLowerCase() as Address;
  }
}
