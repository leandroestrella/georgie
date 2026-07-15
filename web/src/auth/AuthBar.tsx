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
 * Sign-in control for the header: the Google button for anonymous visitors, an
 * identity + admin badge once signed in. Cosmetic only — the backend enforces
 * who may write.
 */
export function AuthBar() {
  const { status, user, isAdmin, owner, configured, googleReady, error, signOut } = useAuth()
  const { t } = useTranslation()

  if (!configured) {
    return <span className="text-muted-foreground text-xs">{t('auth.notConfigured')}</span>
  }

  if (status === 'signed-in' && user) {
    return (
      <div key="signed-in" className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm">{user.email || user.name}</div>
          <div className="text-muted-foreground text-xs">
            {isAdmin ? t('auth.admin', { owner }) : t('auth.notAdmin')}
          </div>
          {!isAdmin && error && <div className="text-destructive text-xs">{error}</div>}
        </div>
        {user.picture && (
          <img src={user.picture} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
        )}
        <Button variant="outline" size="sm" onClick={signOut}>
          {t('auth.signOut')}
        </Button>
      </div>
    )
  }

  return (
    <div key="anonymous" className="flex flex-col items-end gap-1">
      {googleReady && <GoogleButton />}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  )
}
