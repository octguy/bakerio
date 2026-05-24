import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@repo/api-client', replacement: path.resolve(__dirname, 'packages/api-client/src') },
      {
        find: /^@\/(.*)$/,
        replacement: '$1',
        customResolver(source, importer, options) {
          if (importer) {
            const cleanSource = source.startsWith('@/') ? source.substring(2) : source;
            let resolved = null;
            if (importer.includes('/apps/admin/')) {
              resolved = path.resolve(__dirname, 'apps/admin/src', cleanSource);
            } else if (importer.includes('/apps/order/')) {
              resolved = path.resolve(__dirname, 'apps/order/src', cleanSource);
            } else if (importer.includes('/apps/web/')) {
              resolved = path.resolve(__dirname, 'apps/web/src', cleanSource);
            }
            if (resolved) {
              const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
              for (const ext of extensions) {
                if (fs.existsSync(resolved + ext)) {
                  resolved = resolved + ext;
                  break;
                }
              }
            }
            return resolved;
          }
          return null;
        }
      }
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['apps/**/src/**/*.test.{ts,tsx}', 'packages/**/src/**/*.test.{ts,tsx}'],
  },
});
