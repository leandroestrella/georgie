import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { zoneEmoji } from './zoneEmojis'

/**
 * The book's zone shown as an emoji, with the zone name in a tooltip. Sits at a
 * book's bottom-left, mirroring the owner logo at bottom-right.
 */
export function ZoneEmoji({ zone, className }: { zone: string; className?: string }) {
  const tv = useVocab()
  const emoji = zoneEmoji(zone)
  if (!emoji) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('text-lg leading-none select-none', className)}
          role="img"
          aria-label={tv('zone', zone)}
        >
          {emoji}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tv('zone', zone)}</TooltipContent>
    </Tooltip>
  )
}
