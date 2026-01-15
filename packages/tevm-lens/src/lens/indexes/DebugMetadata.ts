import { FunctionIndexesRegistry } from './FunctionIndexesRegistry.ts';
import { ArtifactsProvider } from './ArtifactsProvider.ts';
import { PcLocationIndexesRegistry } from './PcLocationIndexesRegistry.ts';

export class DebugMetadata {
  constructor(
    public readonly artifacts: ArtifactsProvider,
    public readonly functions: FunctionIndexesRegistry,
    public readonly pcLocations: PcLocationIndexesRegistry
  ) {}
}
