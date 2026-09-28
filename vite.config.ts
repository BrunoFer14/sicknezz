import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    host: true, // permite jogar a partir de outro PC na mesma rede
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
