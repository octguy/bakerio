import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: '',
        customResolver(source, importer) {
          if (!importer) return undefined;
          if (importer.includes('/apps/web/')) {
            return path.resolve(__dirname, 'apps/web/src', source);
          }
          if (importer.includes('/apps/admin/')) {
            return path.resolve(__dirname, 'apps/admin/src', source);
          }
          return path.resolve(__dirname, 'apps/order/src', source);
        },
      },
      { find: '@repo/api-client', replacement: path.resolve(__dirname, 'packages/api-client/src') },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['apps/**/src/**/*.test.{ts,tsx}', 'packages/**/src/**/*.test.{ts,tsx}'],
  },
});
