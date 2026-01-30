import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'log-server-url',
      configureServer(server) {
        server.printUrls = () => {
          const host = server.resolvedUrls?.local[0] || 'http://localhost:5173';
          const openPath = server.config.server.open || '';
          console.log(`\n  ➜  Local:   ${host}${openPath}`);
        };
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    open: '/playground/index.html',
  },
});
