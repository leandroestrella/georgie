import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { languageFlag } from './languageFlags'

/**
 * A book language shown as its flag emoji, with the (translated) language name in
 * a tooltip. Falls back to the name itself when there's no flag for the language.
 * Callers wrap it in a Link to make it filter the catalog.
 */
export function LanguageFlag({ language, className }: { language: string; className?: string }) {
  const tv = useVocab()
  if (!language) return null
  const flag = languageFlag(language)
  const name = tv('language', language)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {flag ? (
          <span
            role="img"
            aria-label={name}
            className={cn('inline-flex text-[1.1rem] leading-none select-none', className)}
          >
            {flag}
          </span>
        ) : (
          <span className={cn('text-muted-foreground inline-flex whitespace-nowrap text-xs', className)}>
            {name}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  )
}
