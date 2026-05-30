import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** GitHub Pages project site: https://alysoun.github.io/tripoley/ */
export default defineConfig({
  base: '/tripoley/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
