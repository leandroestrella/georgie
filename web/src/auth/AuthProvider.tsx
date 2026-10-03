import type { ReactNode } from 'react'
import { AuthProvider as SessionProvider, useAuth as useSession } from '@lndrstrll/pomuku-auth'
import { auth } from '@/backend'
import { config } from '@/config'

/**
 * Sign-in for the SPA. Google vouches for a person once; the backend trades
 * Google's ID token for a session, which every later request carries and which
 * is remembered on this device — so the next visit opens signed in at once and
 * re-checks with the backend in the background. Google's own script is not
 * loaded with the page, only when someone asks to sign in.
 *
 * All of that lives in pomuku's auth package; this file only shapes it for
 * Georgie's pages, where "may write" has always been called `isAdmin` and the
 * person's name on the `Users` tab their `owner` label.
 */

/** The signed-in person as the header shows them. The email never reaches the page. */
export interface AuthUser {
  name: string
  picture: string
}

type AuthStatus = 'loading' | 'anonymous' | 'signed-in'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** True when this person is on the `Users` tab, and so may write. */
  isAdmin: boolean
  /** Their owner label on the `Users` tab (e.g. `leandro`); '' when not on it. */
  owner: string
  /** Whether sign-in can work here: a Google client ID is set, or the app runs on mock data. */
  configured: boolean
  /** Whether the app runs on mock data, signed in as a sample person. */
  mock: boolean
  /** Whether Google's sign-in library has loaded and initialized. */
  googleReady: boolean
  /** Whether Google's sign-in library is being loaded after a "sign in" click. */
  googleLoading: boolean
  error: string | null
  /** Loads Google sign-in on demand (never on page load). */
  startSignIn: () => void
  signOut: () => void
  /** Renders the official Google button into the given element. */
  renderButton: (el: HTMLElement | null) => void
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider auth={auth} googleClientId={config.googleClientId}>
      {children}
    </SessionProvider>
  )
}

/** Access the auth state. Must be used within an {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const session = useSession()
  return {
    status: session.status,
    user: session.status === 'signed-in' ? { name: session.name, picture: session.picture } : null,
    isAdmin: session.authorized,
    owner: session.authorized ? session.name : '',
    configured: session.configured || session.demo,
    mock: session.demo,
    googleReady: session.googleReady,
    googleLoading: session.googleLoading,
    error: session.error,
    startSignIn: session.startSignIn,
    signOut: session.signOut,
    renderButton: session.renderButton,
  }
}
