// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNext from 'starlight-theme-next';

export default defineConfig({
  integrations: [
    starlight({
      plugins: [starlightThemeNext()],
      title: 'DeFi Notes',
      routeMiddleware: './src/routeData.ts',
      sidebar: [
        { label: 'Uniswap v2', autogenerate: { directory: 'exchanges/uniswap-v2' } },
        { label: 'Uniswap v3', autogenerate: { directory: 'exchanges/uniswap-v3' } },
        { label: 'Cureve', autogenerate: { directory: 'exchanges/curve' } },
      ],
    }),
  ],
});
