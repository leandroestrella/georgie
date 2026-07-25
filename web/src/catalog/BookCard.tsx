import { Link } from 'react-router-dom'
import type { Book } from '@/api/types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { AuthorLinks } from './AuthorLinks'
import { BookCover } from './BookCover'
import { OwnerBadges } from './OwnerBadges'
import { StatusIcons } from './StatusIcons'
import { ZoneEmoji } from './ZoneEmoji'
import type { ZoneColors } from './zoneColors'

const enc = encodeURIComponent

/**
 * A single catalog card. The cover opens the book; its `::after` stretches over
 * the whole card so any empty area opens it too. The author/theme/zone/owner are
 * their own links (raised with `relative z-[1]` above that overlay) that filter
 * the catalog, mirroring the clickable facets on the detail page.
 */
export function BookCard({ book, colors }: { book: Book; colors: ZoneColors }) {
  const tv = useVocab()
  return (
    <Card
      className={cn(
        'group relative h-full overflow-hidden p-0 transition-shadow hover:shadow-md',
        // On loan → not on the shelf: muted + dimmed so it reads as unavailable.
        book.borrowed && 'bg-muted-foreground/15',
      )}
    >
      <Link to={`/book/${enc(book.id)}`} aria-label={book.title} className="after:absolute after:inset-0">
        {/* object-contain (overriding BookCover's default object-cover) fits the
            whole cover at its own aspect ratio inside the 3:4 slot, so nothing is
            trimmed; the muted slot shows as thin bars around it. */}
        <div className="bg-muted aspect-[3/4] w-full overflow-hidden">
          <BookCover
            book={book}
            colors={colors}
            className={cn(
              'size-full object-contain transition-transform group-hover:scale-[1.03]',
              book.borrowed && 'opacity-70 grayscale-[60%]',
            )}
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">{book.title}</h3>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          <AuthorLinks author={book.author} className="hover:text-foreground relative z-[1] hover:underline" />
          {book.year ? `${book.author ? ' · ' : ''}${book.year}` : ''}
        </p>
        {/* Theme chip, below the author/year. */}
        {book.zone && (
          <Link
            to={`/?theme=${enc(book.theme)}`}
            className="relative z-[1] w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium hover:brightness-95"
            style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
          >
            {tv('theme', book.theme)}
          </Link>
        )}
        {/* Foot markers spread evenly across the width; sized to the theme chip.
            StatusIcons render as individual flex children (each raised above the
            stretched-link overlay via z-[1]) so 1–2 status icons stay evenly
            spaced between the zone and owner rather than clustering in the middle. */}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1 [&_svg]:size-4">
          {book.zone ? (
            <Link to={`/?zone=${enc(book.zone)}`} className="relative z-[1]" aria-label={tv('zone', book.zone)}>
              <ZoneEmoji zone={book.zone} className="text-[15px]" />
            </Link>
          ) : (
            <span />
          )}
          <StatusIcons book={book} className="relative z-[1]" />
          {book.owner ? (
            <OwnerBadges owner={book.owner} badgeClassName="size-4 shrink-0" />
          ) : (
            <span />
          )}
        </div>
      </div>
    </Card>
  )
}
