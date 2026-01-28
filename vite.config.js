import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'esnext', // Required for WebGPU top-level await
    outDir: 'dist'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
});
