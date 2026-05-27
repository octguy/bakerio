import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appAliasRoots = [
  { marker: '/apps/admin/', root: path.resolve(__dirname, 'apps/admin/src') },
  { marker: '/apps/order/', root: path.resolve(__dirname, 'apps/order/src') },
  { marker: '/apps/web/', root: path.resolve(__dirname, 'apps/web/src') },
];

const resolveExtensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

function resolveExistingPath(basePath: string) {
  for (const ext of resolveExtensions) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return basePath;
}

export default defineConfig({
  plugins: [
    {
      name: 'bakerio-app-alias',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!source.startsWith('@/') || !importer) {
          return null;
        }
        const app = appAliasRoots.find((entry) => importer.includes(entry.marker));
        if (!app) {
          return null;
        }
        return resolveExistingPath(path.resolve(app.root, source.slice(2)));
      },
    },
    react(),
  ],
  resolve: {
    alias: [
      { find: '@repo/api-client', replacement: path.resolve(__dirname, 'packages/api-client/src') },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['apps/**/src/**/*.test.{ts,tsx}', 'packages/**/src/**/*.test.{ts,tsx}'],
  },
});
