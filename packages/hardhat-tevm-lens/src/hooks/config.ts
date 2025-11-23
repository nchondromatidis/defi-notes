import type { ConfigHooks, HardhatUserConfigValidationError } from 'hardhat/types/hooks';
import type { HardhatConfig } from 'hardhat/types/config';
import { ArtifactsAugmentUserConfigSchema } from '../types.ts';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../debug.ts';

const debug = createDebug(`${DEBUG_PREFIX}:config-hooks`);

export default async (): Promise<Partial<ConfigHooks>> => {
  return {
    async validateUserConfig(userConfig: any): Promise<HardhatUserConfigValidationError[]> {
      debug('Validating user config...');

      const result = ArtifactsAugmentUserConfigSchema.safeParse(userConfig.artifactsAugment);
      if (!result.success) {
        return [{ path: [], message: JSON.stringify(result.error) }];
      }
      return [];
    },

    async resolveUserConfig(userConfig, resolveConfigurationVariable, next): Promise<HardhatConfig> {
      debug('Resolving user config...');

      const partiallyResolvedConfig = await next(userConfig, resolveConfigurationVariable);

      return {
        ...partiallyResolvedConfig,
        artifactsAugment: userConfig.artifactsAugment,
      };
    },
  };
};
