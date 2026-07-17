import { useEffect, useState } from 'react'
import { BookIcon } from 'lucide-react'
import type { Book } from '@/api/types'
import { cn } from '@/lib/utils'
import { coverSources, isBlankPixel } from './covers'
import { NEUTRAL_ZONE, type ZoneColors } from './zoneColors'

/**
 * Book cover with a graceful fallback chain (see `coverSources`): the stored
 * Cover URL → Open Library → Amazon → a zone-tinted placeholder.
 *
 * Two different kinds of "miss" have to be handled: Open Library 404s (→ onError),
 * while Amazon serves a 1×1 blank GIF that loads *successfully* (→ onLoad, caught
 * by the naturalWidth check).
 */
export function BookCover({
  book,
  colors = NEUTRAL_ZONE,
  className,
}: {
  book: Book
  colors?: ZoneColors
  className?: string
}) {
  const sources = coverSources(book)
  const [index, setIndex] = useState(0)

  // Reset when the book changes (e.g. detail page navigation).
  useEffect(() => setIndex(0), [book.id])

  const src = sources[index]
  const next = () => setIndex((i) => i + 1)

  if (!src) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center gap-2 p-3 text-center', className)}
        style={{ background: colors.bg, color: colors.fg }}
      >
        <BookIcon className="size-6 opacity-70" aria-hidden />
        <span className="line-clamp-3 text-xs font-medium">{book.title}</span>
      </div>
    )
  }

  return (
    <img
      key={src}
      src={src}
      alt={`cover of ${book.title}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={next}
      onLoad={(e) => {
        const img = e.currentTarget
        if (isBlankPixel(img.naturalWidth, img.naturalHeight)) next()
      }}
      className={cn('object-cover', className)}
    />
  )
}
