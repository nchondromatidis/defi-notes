import { z } from 'zod';

// The user's Hardhat configuration, as exported in their config file.
export const ArtifactsAugmentUserConfigSchema = z.object({
  runOnBuild: z.boolean().optional(),
  artifactContractsPath: z.string(),
  typeBarrel: z.object({
    includeFolders: z.array(z.string()),
    excludeFolders: z.array(z.string()),
  }),
});

export type ArtifactsAugmentUserConfig = z.infer<typeof ArtifactsAugmentUserConfigSchema>;

// The resolved Hardhat configuration.
export type ArtifactsAugmentConfig = ArtifactsAugmentUserConfig;
