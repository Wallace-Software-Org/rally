import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` has no bundler condition to resolve against under vitest;
      // stub it so server modules (e.g. the email module) import cleanly in tests.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
