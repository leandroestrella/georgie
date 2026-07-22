import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { useCatalog } from './CatalogProvider'
import { isImageUrl } from './markers'

/** Tooltip body for a zone: its (translated) name and curatorial description. */
export function ZoneTooltip({ zone }: { zone: string }) {
  const tv = useVocab()
  const { zoneDescription } = useCatalog()
  const description = zoneDescription(zone)
  return (
    <div className="max-w-56">
      <div className="font-medium">{tv('zone', zone)}</div>
      {description && <div className="text-background/70 mt-0.5">{description}</div>}
    </div>
  )
}

/**
 * The book's zone shown as its marker (an emoji or an image URL from the sheet,
 * via the catalog taxonomy), with the zone name + description in a tooltip. Sits
 * at a book's bottom-left, mirroring the owner logo at bottom-right. Callers set
 * the size via `className` (font-size); the image marker scales to `1em` to match.
 */
export function ZoneEmoji({ zone, className }: { zone: string; className?: string }) {
  const tv = useVocab()
  const { zoneMarker } = useCatalog()
  const marker = zoneMarker(zone)
  if (!marker) return null
  const label = tv('zone', zone)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isImageUrl(marker) ? (
          <img
            src={marker}
            alt={label}
            loading="lazy"
            referrerPolicy="no-referrer"
            // ~20px by default; scales with the caller's font-size (1em).
            className={cn('inline-block size-[1em] object-contain align-[-0.15em] text-[1.15rem] select-none', className)}
          />
        ) : (
          <span
            className={cn('inline-flex text-[1.15rem] leading-none select-none', className)}
            role="img"
            aria-label={label}
          >
            {marker}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <ZoneTooltip zone={zone} />
      </TooltipContent>
    </Tooltip>
  )
}
