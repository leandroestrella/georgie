import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Dedicated Vitest config so unit tests stay HERMETIC: without this, Vite would
// load .env.local (which sets VITE_API_URL for local dev) and the client's
// "mock mode" tests would hit the real backend over the network — and mutate the
// live dev sheet. We force the API/client-id env empty here; the HTTP-mode test
// opts back in per-test with vi.stubEnv.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    env: {
      VITE_API_URL: '',
      VITE_GOOGLE_CLIENT_ID: '',
    },
  },
})
