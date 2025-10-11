import type { Address, ContractFQN } from '../common/utils.ts';

type DeployedContract = { name: ContractFQN; isDeployedByCA: boolean };

export class LabeledContracts {
  public readonly addressLabel: Map<Address, DeployedContract> = new Map();

  public labelAddress(address: Address, contractFQN: ContractFQN, isDeployedByCA = false): void {
    this.addressLabel.set(this.toLowerCase(address), { name: contractFQN, isDeployedByCA });
  }

  public getLabelForAddress(address: Address) {
    return this.addressLabel.get(this.toLowerCase(address))?.name;
  }

  private toLowerCase(address: Address): Address {
    return address.toLowerCase() as Address;
  }
}
