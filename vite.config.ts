import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { resources: 'usable' },
    },
    setupFiles: ['./tests/test-setup.ts', './tests/setup.js'],
  },
});
