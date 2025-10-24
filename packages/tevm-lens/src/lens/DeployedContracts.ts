import type { Address, LensArtifactsMap, LensContractFQN } from './artifact.ts';

type DeployedContract<ArtifactMapT extends LensArtifactsMap<ArtifactMapT>> = {
  name: LensContractFQN<ArtifactMapT>;
  isDeployedByCA: boolean;
};

export class DeployedContracts<TMap extends LensArtifactsMap<TMap>> {
  public readonly addressLabel: Map<Address, DeployedContract<TMap>> = new Map();

  public markContractAddress(address: Address, contractFQN: LensContractFQN<TMap>, isDeployedByCA = false): void {
    this.addressLabel.set(this.toLowerCase(address), { name: contractFQN, isDeployedByCA });
  }

  public getContractFqnForAddress(address: Address) {
    return this.addressLabel.get(this.toLowerCase(address))?.name;
  }

  private toLowerCase(address: Address): Address {
    return address.toLowerCase() as Address;
  }
}
