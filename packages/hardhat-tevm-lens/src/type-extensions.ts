import 'hardhat/types/config';
import type { ArtifactsAugmentConfig, ArtifactsAugmentUserConfig } from './types.ts';

declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    artifactsAugment: ArtifactsAugmentUserConfig;
  }

  interface HardhatConfig {
    artifactsAugment: ArtifactsAugmentConfig;
  }
}
