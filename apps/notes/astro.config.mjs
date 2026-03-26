// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import starlightThemeNext from 'starlight-theme-next';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { astroMultipleAssets } from 'vite-multiple-assets';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [
    react(),
    starlight({
      plugins: [starlightThemeNext()],
      title: 'DeFi Notes',
      routeMiddleware: './src/routeData.ts',
      sidebar: [
        { label: 'Uniswap v2', autogenerate: { directory: 'exchanges/uniswap-v2' } },
        { label: 'Fundamentals', autogenerate: { directory: 'fundamentals/defi' } },
      ],
      customCss: ['./src/styles/global.css', './src/styles/custom.css'],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
    }),
    mdx(),
    astroMultipleAssets([
      '../../packages/protocols/{\x01,artifacts}/**',
      '../../packages/protocols/{\x01,contracts}/**',
    ]),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@defi-notes/workflows'],
    },
    optimizeDeps: {
      exclude: ['@defi-notes/workflows'],
    },
  },
});
