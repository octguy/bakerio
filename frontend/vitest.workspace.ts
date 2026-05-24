import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineWorkspace([
  {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/order/src'),
        '@repo/api-client': path.resolve(__dirname, 'packages/api-client/src'),
      },
    },
    test: {
      name: 'order',
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['apps/order/src/**/*.test.{ts,tsx}'],
    },
  },
  {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/web/src'),
        '@repo/api-client': path.resolve(__dirname, 'packages/api-client/src'),
      },
    },
    test: {
      name: 'web',
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['apps/web/src/**/*.test.{ts,tsx}'],
    },
  },
  {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/admin/src'),
        '@repo/api-client': path.resolve(__dirname, 'packages/api-client/src'),
      },
    },
    test: {
      name: 'admin',
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['apps/admin/src/**/*.test.{ts,tsx}'],
    },
  },
  {
    resolve: {
      alias: {
        '@repo/api-client': path.resolve(__dirname, 'packages/api-client/src'),
      },
    },
    test: {
      name: 'packages',
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['packages/**/src/**/*.test.{ts,tsx}'],
    },
  },
]);
