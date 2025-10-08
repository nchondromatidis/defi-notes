import type { ContractFQN } from '../common/utils.ts';
import type { ProtocolArtifact } from '@defi-notes/protocols/types';

export interface IResourceLoader {
  getContractArtifact(contractFQN: ContractFQN): Promise<ProtocolArtifact>;
  getContractArtifacts(contractFQN: ContractFQN[]): Promise<ProtocolArtifact[]>;
}
