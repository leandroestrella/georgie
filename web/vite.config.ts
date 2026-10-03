import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // pomuku's packages must use this app's copy of React and i18next, not one
    // of their own: two copies of either break hooks and translations. Matters
    // while the packages are linked from a checkout next to this repo.
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
  },
  server: {
    fs: {
      // The About page imports the repo-root README.md (?raw), which lives one
      // level above web/, so the dev server must be allowed to read it.
      // And pomuku's packages, while they are linked from a checkout next to
      // this repo rather than installed from npm.
      allow: [path.resolve(__dirname, '..'), path.resolve(__dirname, '../../pomuku')],
    },
  },
})
