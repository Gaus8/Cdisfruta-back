import { defineConfig } from 'vitest/config';

process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.JWT_TOKEN = 'secreto-de-prueba-cdisfruta';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.WOMPI_PUBLIC_KEY = '';
process.env.WOMPI_PRIVATE_KEY = '';
process.env.WOMPI_INTEGRITY_SECRET = '';
process.env.WOMPI_EVENTS_SECRET = '';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    isolate: false,
    pool: 'forks',
    forks: { singleFork: true },
    hookTimeout: 120000,
    testTimeout: 20000,
    teardownTimeout: 30000,
  },
});
