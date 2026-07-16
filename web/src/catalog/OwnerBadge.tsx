import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ownerLogo } from './ownerLogos'

/**
 * A small round owner marker (their logo, or their initial as a fallback) with a
 * tooltip naming the owner. Used on catalog cards to show whose shelf a book is on.
 */
export function OwnerBadge({ owner, className }: { owner: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  const src = ownerLogo(owner)
  if (!owner) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'ring-background bg-background grid size-6 place-items-center overflow-hidden rounded-full shadow ring-2',
            className,
          )}
        >
          {src && !broken ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground text-[10px] font-semibold uppercase">
              {owner.charAt(0)}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{owner}</TooltipContent>
    </Tooltip>
  )
}
