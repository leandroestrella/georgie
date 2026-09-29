import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { config, hasBackend } from '@/config'
import { fetchMe, setIdTokenProvider } from '@/api/client'
import { decodeJwt, readStoredToken, writeStoredToken } from './token'

/** The signed-in person's public profile (decoded from the Google ID token). */
export interface AuthUser {
  email: string
  name: string
  picture: string
}

type AuthStatus = 'loading' | 'anonymous' | 'signed-in'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** True when the backend confirmed this user is on the admin allowlist. */
  isAdmin: boolean
  /** Owner label mapped from the admin's email (e.g. `leandro`). */
  owner: string
  /** Whether Google sign-in is configured (a client ID is present). */
  configured: boolean
  /** Whether the GIS library has loaded and initialized. */
  googleReady: boolean
  /** Whether the GIS library is being loaded after a "sign in" click. */
  googleLoading: boolean
  error: string | null
  /** Triggers the Google account chooser / One Tap. */
  signIn: () => void
  /** Loads Google sign-in on demand (never on page load). */
  startSignIn: () => void
  signOut: () => void
  /** Renders the official Google button into the given element. */
  renderButton: (el: HTMLElement | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GSI_SRC = 'https://accounts.google.com/gsi/client'

/** Loads the GIS client script once; resolves when `window.google` is ready. */
function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('failed to load Google sign-in')))
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('failed to load Google sign-in'))
    document.head.appendChild(script)
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = config.googleClientId.length > 0
  // A still-valid stored token (a previous admin session) is re-validated by
  // the effect below; until it resolves, admin-only routes wait instead of
  // bouncing to the catalog.
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasBackend && configured && readStoredToken() ? 'loading' : 'anonymous',
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [owner, setOwner] = useState('')
  const [googleReady, setGoogleReady] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  /** Set once GIS loading has started, so repeated clicks don't reload it. */
  const gsiStartedRef = useRef(false)
  /** Set once the stored session has been sent for re-validation, so it happens once per load. */
  const restoreStartedRef = useRef(false)

  // Writes carry the current ID token; register the provider once.
  useEffect(() => {
    setIdTokenProvider(() => tokenRef.current)
  }, [])

  /**
   * Shows this page as a signed-out visitor looking at the public catalog. The
   * stored session is left alone: other tabs may be using it, and the next
   * load can try it again.
   */
  const showAsVisitor = useCallback(() => {
    tokenRef.current = null
    setUser(null)
    setIsAdmin(false)
    setOwner('')
    setError(null)
    setStatus('anonymous')
  }, [])

  /** Signs out for good: forgets the stored session too, for every tab. */
  const forgetSession = useCallback(() => {
    writeStoredToken(null)
    showAsVisitor()
  }, [showAsVisitor])

  /**
   * `restored` marks a token replayed from a previous visit rather than one the
   * admin just consented to. The distinction only matters when re-validation
   * fails: an interactive sign-in that fails deserves a visible error, while a
   * stale stored token should quietly drop back to the public catalog.
   */
  const handleCredential = useCallback(async (credential: string, restored = false) => {
    tokenRef.current = credential
    // The backend check can take several seconds; show "signing in…" meanwhile
    // (a restore already starts in this state).
    if (!restored) setStatus('loading')
    try {
      const claims = decodeJwt(credential)
      const me = await fetchMe()
      // The backend answers an expired or revoked token with `admin: false`
      // rather than an error, and only admin tokens are ever stored — so a
      // restored token that isn't an admin's any more is a dead session.
      if (restored && !me.admin) return forgetSession()
      // The backstop below may have given up on a slow restore in the meantime;
      // a late "yes" still signs this page in, and needs the token back for writes.
      tokenRef.current = credential
      setUser({
        email: String(claims.email ?? ''),
        name: String(claims.name ?? claims.email ?? ''),
        picture: String(claims.picture ?? ''),
      })
      setIsAdmin(me.admin)
      setOwner(me.owner)
      setStatus('signed-in')
      if (!me.admin) setError(`Signed in, but not an admin (${me.reason}).`)
      else setError(null)
      // Only worth replaying a token the backend actually accepted.
      writeStoredToken(me.admin ? credential : null)
    } catch (err) {
      // No verdict on a restored token (backend unreachable, overloaded or
      // erroring): show this load as a visitor, without an error — they never
      // asked to sign in on it. Keep the stored token, though: it is most
      // likely fine, and deleting it would sign out every other open tab.
      if (restored) return showAsVisitor()
      // An interactive sign-in the backend couldn't confirm: back to the
      // sign-in button, with the reason next to it so they can retry.
      tokenRef.current = null
      setError(String(err))
      setStatus('anonymous')
    }
  }, [forgetSession, showAsVisitor])

  // Offline mock mode: no sign-in, treat the local dev as an admin.
  useEffect(() => {
    if (hasBackend) return
    setUser({ email: 'dev@local', name: 'dev', picture: '' })
    setIsAdmin(true)
    setOwner('leandro')
    setStatus('signed-in')
  }, [])

  // Backend mode: re-validate a stored admin session. Google Identity Services
  // is deliberately NOT loaded here: google.accounts.id.initialize() writes
  // Google's g_state cookie and every load of the script contacts Google, for
  // visitors who never sign in. It waits until someone asks to (startSignIn
  // below). Restoring only needs the stored token and the backend.
  useEffect(() => {
    if (!hasBackend || !configured || restoreStartedRef.current) return
    const stored = readStoredToken()
    if (!stored) return
    // Effects run twice in development (StrictMode); one backend check is enough.
    restoreStartedRef.current = true
    void handleCredential(stored, true)
  }, [configured, handleCredential])

  // Backstop: admin-only pages wait while `status` is 'loading', so a restore
  // that never resolves (backend unreachable, a hung request) must not leave
  // them waiting indefinitely. Generous, because Apps Script cold starts are
  // slow. Giving up only affects this page, not the stored session.
  useEffect(() => {
    if (status !== 'loading') return
    const id = setTimeout(showAsVisitor, 50_000)
    return () => clearTimeout(id)
  }, [status, showAsVisitor])

  /**
   * Loads and initializes Google Identity Services on demand, the first time
   * a visitor clicks "sign in". Once it's ready, AuthBar swaps its plain
   * button for the official Google one.
   */
  const startSignIn = useCallback(() => {
    if (gsiStartedRef.current) return
    gsiStartedRef.current = true
    setGoogleLoading(true)
    loadGsi()
      .then(() => {
        if (!window.google) throw new Error('failed to load Google sign-in')
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (resp) => void handleCredential(resp.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        })
        setGoogleReady(true)
      })
      .catch((err) => {
        // Let the visitor try again.
        gsiStartedRef.current = false
        setError(String(err))
      })
      .finally(() => setGoogleLoading(false))
  }, [handleCredential])

  const signIn = useCallback(() => {
    window.google?.accounts.id.prompt()
  }, [])

  const signOut = useCallback(() => {
    window.google?.accounts.id.disableAutoSelect()
    forgetSession()
  }, [forgetSession])

  const renderButton = useCallback((el: HTMLElement | null) => {
    if (el && window.google) {
      el.innerHTML = ''
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'medium', shape: 'pill' })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, isAdmin, owner, configured, googleReady, googleLoading, error, signIn, startSignIn, signOut, renderButton }),
    [status, user, isAdmin, owner, configured, googleReady, googleLoading, error, signIn, startSignIn, signOut, renderButton],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

/** Access the auth state. Must be used within an {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
