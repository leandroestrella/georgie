import { Link } from 'react-router-dom'
import type { Book } from '@/api/types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { BookCover } from './BookCover'
import { OwnerBadge } from './OwnerBadge'
import { StatusIcons } from './StatusIcons'
import { ZoneEmoji } from './ZoneEmoji'
import type { ZoneColors } from './zoneColors'

/** A single catalog card linking to the book's detail page. */
export function BookCard({ book, colors }: { book: Book; colors: ZoneColors }) {
  const tv = useVocab()
  return (
    <Link to={`/book/${encodeURIComponent(book.id)}`} className="group">
      <Card
        className={cn(
          'h-full overflow-hidden p-0 transition-shadow hover:shadow-md',
          // On loan → not on the shelf: muted + dimmed so it reads as unavailable.
          book.borrowed && 'bg-muted-foreground/15',
        )}
      >
        <div className="bg-muted aspect-[3/4] w-full overflow-hidden">
          <BookCover
            book={book}
            colors={colors}
            className={cn(
              'size-full transition-transform group-hover:scale-[1.03]',
              book.borrowed && 'opacity-70 grayscale-[60%]',
            )}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">{book.title}</h3>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {book.author}
            {book.year ? ` · ${book.year}` : ''}
          </p>
          {/* Theme chip, below the author/year. */}
          {book.zone && (
            <span
              className="w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
            >
              {tv('theme', book.theme)}
            </span>
          )}
          {/* Foot markers spread evenly across the width; sized to the theme chip. */}
          <div className="mt-auto flex items-center justify-between gap-1 pt-1 [&_svg]:size-4">
            <ZoneEmoji zone={book.zone} className="text-[15px]" />
            <StatusIcons book={book} />
            <OwnerBadge owner={book.owner} className="size-4 shrink-0" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
