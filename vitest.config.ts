import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/split.ts', 'lib/money.ts'],
      thresholds: {
        'lib/split.ts': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
