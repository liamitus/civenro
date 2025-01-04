// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force Vite to use a single copy of these packages
    dedupe: ['vite'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
