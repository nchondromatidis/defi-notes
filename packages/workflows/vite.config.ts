import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { DynamicPublicDirectory } from 'vite-multiple-assets';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const dynamicPublicDir = (command: string) =>
  command !== 'build'
    ? DynamicPublicDirectory(['../protocols/{0x01,artifacts}/**', '../protocols/{0x01,contracts}/**'])
    : undefined;

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      tsconfigPath: resolve(__dirname, 'tsconfig.web.json'),
      insertTypesEntry: true, // generates index.d.ts at root of dist
      include: ['src'],
      exclude: ['src/**/*.test.*', 'src/**/*.stories.*'],
    }),
    {
      name: 'log-server-url',
      configureServer(server) {
        server.printUrls = () => {
          const host = server.resolvedUrls?.local[0] || 'http://localhost:5173';
          const openPath = server.config.server.open || '';
          console.log(`\n ➜ Local: ${host}${openPath}playground/index.html`);
        };
      },
    },
    dynamicPublicDir(command),
    viteStaticCopy({
      targets: [{ src: 'src/styles/custom.css', dest: 'styles' }],
    }),
  ],

  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      name: '@defi-notes/evm-lens-ui',
      fileName: 'index',
      formats: ['es'], // ESM only
    },
    rollupOptions: {
      input: 'src/index.ts',
      external: ['react', 'react-dom'], // Peer deps
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
}));
