import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['app/**/*.test.{js,jsx}', 'tests/unit/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
    },
  },
})
