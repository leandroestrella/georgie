import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from './AuthProvider'

/**
 * Sign-in control for the header. Renders the official Google button for
 * anonymous visitors and a small identity + admin badge once signed in. This is
 * cosmetic — the backend is the real enforcer of who may write.
 */
export function AuthBar() {
  const { status, user, isAdmin, owner, configured, googleReady, error, signOut, renderButton } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)

  // Draw the Google button whenever we're anonymous and GIS is ready.
  useEffect(() => {
    if (status === 'anonymous' && googleReady) renderButton(buttonRef.current)
  }, [status, googleReady, renderButton])

  if (!configured) {
    return <span className="text-muted-foreground text-xs">sign-in not configured</span>
  }

  if (status === 'signed-in' && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm">{user.email || user.name}</div>
          <div className="text-muted-foreground text-xs">
            {isAdmin ? `admin · ${owner}` : 'not an admin'}
          </div>
          {!isAdmin && error && <div className="text-destructive text-xs">{error}</div>}
        </div>
        {user.picture && (
          <img src={user.picture} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
        )}
        <Button variant="outline" size="sm" onClick={signOut}>
          sign out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={buttonRef} />
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  )
}
