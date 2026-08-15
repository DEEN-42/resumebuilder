import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom to simulate a browser environment for React component tests
    environment: 'jsdom',
    // Enable Jest-compatible globals (describe, it, expect) without explicit imports
    globals: true,
    // Run setup file before each test suite to load @testing-library/jest-dom matchers
    setupFiles: ['./src/setupTests.js'],
    // Match both .test.jsx and .test.js files inside __tests__ folders
    include: ['src/**/__tests__/**/*.{test,spec}.{js,jsx}'],
    // Exclude node_modules from coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/main.jsx'],
    },
  },
})
