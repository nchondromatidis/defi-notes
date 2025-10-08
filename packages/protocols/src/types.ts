export type { ArtifactMap, LinkReferences, ImmutableReferences } from 'hardhat/types/artifacts';

import type { Artifact as HardhatArtifact } from 'hardhat/types/artifacts';
export type ProtocolArtifact = HardhatArtifact & { bytecodeSourceMap: string; deployedBytecodeSourceMap: string };
