/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Apps Script web-app `/exec` endpoint. */
  readonly VITE_API_URL?: string
  /** Google OAuth 2.0 Web client ID for Google Identity Services. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
