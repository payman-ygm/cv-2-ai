import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext' // Forces modern JavaScript that supports import.meta
  },
  esbuild: {
    target: 'esnext' // Ensures the dev server also supports it
  }
})