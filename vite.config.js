import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext' // Important for WebGPU
  }
});
