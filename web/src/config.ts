/**
 * Public runtime configuration for the Georgie SPA.
 *
 * Everything here is safe to commit and ship in the client bundle:
 *  - the backend's address is a public endpoint (writes are gated server-side:
 *    every one needs a session of someone on the `Users` tab), and
 *  - a Google OAuth *client ID* is public by design (it is not a secret).
 *
 * Values are read from Vite env vars (`VITE_*`) when present so that anyone
 * cloning the repo can point their own instance at their own backend without
 * editing source — see `.env.example` and the README "run your own instance"
 * guide. The fallbacks below are empty on purpose: with no backend URL the app
 * runs on mock data.
 */
export const config = {
  /** The backend's address, without `/api/v1`, e.g. https://georgie.<account>.workers.dev */
  apiUrl: import.meta.env.VITE_API_URL ?? '',

  /** Google OAuth 2.0 Web client ID used by Google Identity Services sign-in. */
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
} as const

/** True when the SPA has a backend URL to talk to (otherwise it runs on mock data). */
export const hasBackend = config.apiUrl.length > 0
