import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { config, hasBackend } from '@/config'
import { fetchMe, setIdTokenProvider } from '@/api/client'

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
  error: string | null
  /** Triggers the Google account chooser / One Tap. */
  signIn: () => void
  signOut: () => void
  /** Renders the official Google button into the given element. */
  renderButton: (el: HTMLElement | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GSI_SRC = 'https://accounts.google.com/gsi/client'

/** Decodes the payload of a JWT (no verification — display only). */
function decodeJwt(token: string): Record<string, unknown> {
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
  const [status, setStatus] = useState<AuthStatus>(hasBackend && configured ? 'loading' : 'anonymous')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [owner, setOwner] = useState('')
  const [googleReady, setGoogleReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

  // Writes carry the current ID token; register the provider once.
  useEffect(() => {
    setIdTokenProvider(() => tokenRef.current)
  }, [])

  const handleCredential = useCallback(async (credential: string) => {
    tokenRef.current = credential
    try {
      const claims = decodeJwt(credential)
      setUser({
        email: String(claims.email ?? ''),
        name: String(claims.name ?? claims.email ?? ''),
        picture: String(claims.picture ?? ''),
      })
      const me = await fetchMe()
      setIsAdmin(me.admin)
      setOwner(me.owner)
      setStatus('signed-in')
      if (!me.admin) setError(`Signed in, but not an admin (${me.reason}).`)
      else setError(null)
    } catch (err) {
      setError(String(err))
      setStatus('signed-in')
    }
  }, [])

  // Offline mock mode: no sign-in, treat the local dev as an admin.
  useEffect(() => {
    if (hasBackend) return
    setUser({ email: 'dev@local', name: 'dev', picture: '' })
    setIsAdmin(true)
    setOwner('leandro')
    setStatus('signed-in')
  }, [])

  // Backend mode: load + initialize Google Identity Services.
  useEffect(() => {
    if (!hasBackend || !configured) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !window.google) return
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (resp) => void handleCredential(resp.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        })
        setGoogleReady(true)
        setStatus('anonymous')
      })
      .catch((err) => {
        setError(String(err))
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [configured, handleCredential])

  const signIn = useCallback(() => {
    window.google?.accounts.id.prompt()
  }, [])

  const signOut = useCallback(() => {
    tokenRef.current = null
    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
    setIsAdmin(false)
    setOwner('')
    setError(null)
    setStatus('anonymous')
  }, [])

  const renderButton = useCallback((el: HTMLElement | null) => {
    if (el && window.google) {
      el.innerHTML = ''
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'medium', shape: 'pill' })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, isAdmin, owner, configured, googleReady, error, signIn, signOut, renderButton }),
    [status, user, isAdmin, owner, configured, googleReady, error, signIn, signOut, renderButton],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

/** Access the auth state. Must be used within an {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
