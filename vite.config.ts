/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 4000 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
})
