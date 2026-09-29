/**
 * Pure helpers for the Google ID token the SPA holds after sign-in. Kept
 * framework-free so they can be unit-tested without a browser or React.
 */

/**
 * `localStorage` key for the remembered admin session. Written only once the
 * backend has confirmed the token belongs to an admin, and removed on sign-out
 * or as soon as the backend stops accepting it.
 */
export const TOKEN_STORAGE_KEY = 'georgie.idToken'

/** Decodes the payload of a JWT (no verification — display only). */
export function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? ''
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((ch) => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json)
}

/**
 * Whether a stored token is unusable. Treats "expires in the next minute" as
 * already expired, so we don't restore a session only for the very next
 * request to be rejected mid-flight.
 */
export function tokenUnusable(token: string, now = Date.now()): boolean {
  try {
    const exp = Number(decodeJwt(token).exp ?? 0)
    return !exp || exp * 1000 <= now + 60_000
  } catch {
    return true
  }
}

/**
 * Reads the stored session token, or null when there is none worth
 * re-validating. An expired one is removed on the way. Storage can throw
 * (blocked site data, some private modes); that just means no session.
 */
export function readStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return null
    if (tokenUnusable(stored)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    return stored
  } catch {
    return null
  }
}

/** Remembers (or, with null, forgets) the admin session. Storage failures are ignored. */
export function writeStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // No storage: the session simply won't survive a reload.
  }
}
