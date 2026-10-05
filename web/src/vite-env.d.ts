/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The backend's address (the Worker deployed from `server/`), without `/api/v1`. */
  readonly VITE_API_URL?: string
  /** Google OAuth 2.0 Web client ID for Google Identity Services. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
