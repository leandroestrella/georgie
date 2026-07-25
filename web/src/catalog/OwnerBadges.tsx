import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { OwnerBadge } from './OwnerBadge'
import { splitOwners } from './filter'

const enc = encodeURIComponent

/**
 * All of a book's owners as linked marker badges (logos). A book can be co-owned
 * (a `,`/`&`/`;`-separated Owner cell), so every owner's marker is shown, each
 * linking to that owner's catalog filter. Renders nothing when there's no owner.
 *
 * Used in the compact contexts (card foot, table) where only the logos show and
 * the name lives in each badge's tooltip.
 */
export function OwnerBadges({
  owner,
  badgeClassName,
  onClick,
  className,
}: {
  owner: string
  badgeClassName?: string
  /** e.g. stop row-click propagation in the desktop table. */
  onClick?: (e: MouseEvent) => void
  className?: string
}) {
  const owners = splitOwners(owner)
  if (owners.length === 0) return null
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {owners.map((o) => (
        <Link key={o} to={`/?owner=${enc(o)}`} onClick={onClick} className="relative z-[1]">
          <OwnerBadge owner={o} className={badgeClassName} />
        </Link>
      ))}
    </div>
  )
}
