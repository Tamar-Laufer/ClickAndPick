/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use the automatic JSX runtime everywhere (incl. Vitest test files), so JSX
  // never needs `React` in scope — matches how the app itself is built.
  esbuild: { jsx: 'automatic' },
  // Vitest (frontend unit/component tests) — the Vite-native test runner with a
  // Jest-compatible API (describe/it/expect/vi). jsdom gives components a DOM.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
