import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { useCatalog } from './CatalogProvider'
import { zoneEmoji } from './zoneEmojis'

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
 * The book's zone shown as an emoji, with the zone name + description in a
 * tooltip. Sits at a book's bottom-left, mirroring the owner logo at bottom-right.
 */
export function ZoneEmoji({ zone, className }: { zone: string; className?: string }) {
  const tv = useVocab()
  const emoji = zoneEmoji(zone)
  if (!emoji) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          // ~20px to match the size-5 status icons and owner logo.
          className={cn('inline-flex text-[1.15rem] leading-none select-none', className)}
          role="img"
          aria-label={tv('zone', zone)}
        >
          {emoji}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <ZoneTooltip zone={zone} />
      </TooltipContent>
    </Tooltip>
  )
}
