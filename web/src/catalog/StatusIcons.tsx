import { useTranslation } from 'react-i18next'
import { CircleCheckIcon, HandCoinsIcon, RepeatIcon } from 'lucide-react'
import type { Book } from '@/api/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** An icon with a hover/focus tooltip. */
export function IconWithTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={label} className="inline-flex">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The on-loan / for-exchange status icons (no text), shared by cards, table and
 * list. Hovering the on-loan icon names the borrower. Sized to match the owner
 * logo and zone emoji (size-5) so a book's foot markers line up.
 *
 * Renders as a fragment (no wrapper) so the icons can be laid out directly by
 * the parent — e.g. spread evenly across the card foot via `justify-between`.
 * Where they should stay grouped (the table cell), wrap them in a flex.
 *
 * By default an available book (not on loan, not for exchange) shows nothing;
 * pass `showAvailable` to render a check for it too — used in the table's Status
 * column so every row shows an explicit state.
 */
export function StatusIcons({ book, showAvailable = false }: { book: Book; showAvailable?: boolean }) {
  const { t } = useTranslation()
  const available = !book.borrowed && !book.exchange
  if (available && !showAvailable) return null
  return (
    <>
      {book.borrowed && (
        <IconWithTip
          label={
            book.borrowerName ? t('book.borrowedBy', { name: book.borrowerName }) : t('filters.borrowed')
          }
        >
          <HandCoinsIcon className="text-muted-foreground size-5" />
        </IconWithTip>
      )}
      {book.exchange && (
        <IconWithTip label={t('book.forExchange')}>
          <RepeatIcon className="text-muted-foreground size-5" />
        </IconWithTip>
      )}
      {available && showAvailable && (
        <IconWithTip label={t('filters.available')}>
          <CircleCheckIcon className="text-muted-foreground size-5" />
        </IconWithTip>
      )}
    </>
  )
}
