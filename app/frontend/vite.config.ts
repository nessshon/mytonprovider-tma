import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    tsconfigPaths(),
    process.env.HTTPS && mkcert(),
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd(), '').BACKEND || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
}));
