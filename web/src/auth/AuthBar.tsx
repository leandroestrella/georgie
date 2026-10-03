import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuth } from './AuthProvider'

/**
 * Renders the official Google button and tears it down on unmount. Isolating it
 * in its own component (with a `key` on each AuthBar branch) guarantees the GIS
 * button DOM is discarded when the user signs in — otherwise React reuses the
 * container node and Google's imperatively-injected button lingers.
 */
function GoogleButton() {
  const { renderButton } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    renderButton(ref.current)
    const el = ref.current
    return () => {
      if (el) el.innerHTML = ''
    }
  }, [renderButton])
  return <div ref={ref} />
}

/**
 * Sign-in control for the header: a sign-in button (then the Google one) for anonymous visitors, an
 * identity + admin badge once signed in. Cosmetic only — the backend enforces
 * who may write.
 */
export function AuthBar() {
  const { status, user, isAdmin, owner, configured, mock, googleReady, googleLoading, error, signOut, startSignIn } = useAuth()
  const { t } = useTranslation()

  if (!configured) {
    // Dev-only hint; it is long, so keep it off the narrow header.
    return <span className="text-muted-foreground hidden text-xs sm:inline">{t('auth.notConfigured')}</span>
  }

  if (status === 'loading') {
    // A remembered session is being re-checked with the backend, which can take
    // a few seconds; a "sign in" button here would read as "you were signed out".
    return (
      <span key="restoring" className="text-muted-foreground text-xs">
        {t('auth.restoring')}
      </span>
    )
  }

  if (status === 'signed-in' && user) {
    return (
      <div key="signed-in" className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* The name is the widest thing in the header — desktop only. */}
        <div className="hidden min-w-0 text-right leading-tight sm:block">
          <div className="truncate text-sm">{user.name}</div>
          <div className="text-muted-foreground text-xs">
            {isAdmin ? t('auth.admin', { owner }) : t('auth.notAdmin')}
          </div>
          {!isAdmin && error && <div className="text-destructive text-xs">{error}</div>}
        </div>
        {user.picture && (
          <img
            src={user.picture}
            alt=""
            title={user.name}
            className="size-7 shrink-0 rounded-full sm:size-8"
            referrerPolicy="no-referrer"
          />
        )}
        {/* Mock mode is signed in as a sample person; there is nothing to sign out of. */}
        {!mock && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={signOut}>
            {t('auth.signOut')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div key="anonymous" className="flex min-w-0 flex-col items-end gap-1">
      {/* Google's script only loads after this click; the official
          button replaces the plain one once it's ready. */}
      {googleReady ? (
        <GoogleButton />
      ) : (
        <Button variant="outline" size="sm" className="shrink-0" onClick={startSignIn} disabled={googleLoading}>
          {t('auth.signIn')}
        </Button>
      )}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  )
}
