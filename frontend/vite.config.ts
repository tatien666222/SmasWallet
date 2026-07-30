import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/arc-rpc': {
        target: 'https://rpc.testnet.arc.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arc-rpc/, ''),
      },
    },
  },
});
