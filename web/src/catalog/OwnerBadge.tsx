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

  const showLogo = src && !broken

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'bg-background grid size-5 shrink-0 place-items-center overflow-hidden rounded-[3px]',
            className,
          )}
        >
          {showLogo ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
              // contain, not cover: these are logos, and cropping them mangles the mark.
              className="size-full object-contain"
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
