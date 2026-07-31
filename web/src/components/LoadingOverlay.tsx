import { useBusy } from './BusyProvider'
import { LoadingAvatar } from './LoadingAvatar'

/**
 * App-wide overlay shown while any admin write is in flight (see
 * `BusyProvider`) — saving a book, lending/returning, an exchange action, a
 * cover upload. Sits above dialogs (`z-[100]` vs. their `z-50`) so a save
 * triggered from inside an open dialog still gets the same visible feedback,
 * covering the whole viewport rather than a small inline spinner.
 */
export function LoadingOverlay() {
  const { busy } = useBusy()
  if (!busy) return null
  return (
    <div className="bg-background/70 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xs">
      <LoadingAvatar />
    </div>
  )
}
