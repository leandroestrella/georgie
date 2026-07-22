import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useCatalog } from './CatalogProvider'
import { isImageUrl } from './markers'

/**
 * A small round owner marker with a tooltip naming the owner, used to show whose
 * shelf a book is on. The marker comes from the sheet (`Owner marker` column, via
 * the catalog taxonomy) and is an image URL, an emoji, or — failing both — the
 * owner's initial.
 */
export function OwnerBadge({ owner, className }: { owner: string; className?: string }) {
  const { ownerMarker } = useCatalog()
  const [broken, setBroken] = useState(false)
  if (!owner) return null

  const marker = ownerMarker(owner)
  const showImage = marker && isImageUrl(marker) && !broken

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'bg-background grid size-5 shrink-0 place-items-center overflow-hidden rounded-[3px]',
            className,
          )}
        >
          {showImage ? (
            <img
              src={marker}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
              // contain, not cover: these are logos, and cropping them mangles the mark.
              className="size-full object-contain"
            />
          ) : marker && !isImageUrl(marker) ? (
            <span className="text-[0.85em] leading-none">{marker}</span>
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
