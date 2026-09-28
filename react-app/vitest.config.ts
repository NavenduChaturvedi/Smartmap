import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Day-boundary logic is tested in IST, where local and UTC dates differ
    // for the first 5.5 hours of every day.
    env: { TZ: 'Asia/Kolkata' },
    include: ['src/**/*.test.ts'],
  },
})
