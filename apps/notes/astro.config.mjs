// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import starlightThemeNext from 'starlight-theme-next';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'node:path';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://nchondromatidis.github.io',
  base: '/defi-notes',
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
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    define: {
      __filename: JSON.stringify('/virtual/file.ts'),
      __dirname: JSON.stringify('/virtual'),
    },
    plugins: [
      tailwindcss(),
      {
        name: 'buffer-constants-polyfill',
        enforce: 'post',
        renderChunk(code) {
          // Replace buffer.constants.MAX_STRING_LENGTH with actual value
          return code.replace(/buffer\.constants\.MAX_STRING_LENGTH/g, '536870888');
        },
      },
      {
        ...nodePolyfills({
          include: ['events', 'buffer', 'constants', 'stream', 'util', 'process'],
          globals: {
            Buffer: true,
            global: true,
            process: false,
          },
          protocolImports: true,
        }),
        apply: 'build',
      },
    ],
  },
});
