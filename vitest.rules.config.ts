import { defineConfig } from 'vitest/config';

// Firestore security rules tests; run against the emulator with `npm run test:rules`.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    fileParallelism: false,
  },
});
