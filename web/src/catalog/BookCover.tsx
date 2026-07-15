import { useEffect, useState } from 'react'
import { BookIcon } from 'lucide-react'
import type { Book } from '@/api/types'
import { cn } from '@/lib/utils'
import { NEUTRAL_ZONE, type ZoneColors } from './zoneColors'

/** True when an ISBN can be used for a cover lookup (present and not the N/A sentinel). */
function usableIsbn(isbn: string): string | null {
  const clean = isbn.replace(/[^0-9Xx]/g, '')
  if (!clean || isbn.trim().toUpperCase() === 'N/A') return null
  return clean.length === 10 || clean.length === 13 ? clean : null
}

/**
 * The ordered cover sources for a book: its stored Cover URL, then Open Library
 * by ISBN (`default=false` so a miss 404s and triggers the next fallback).
 */
function coverSources(book: Book): string[] {
  const sources: string[] = []
  if (book.coverUrl) sources.push(book.coverUrl)
  const isbn = usableIsbn(book.isbn)
  if (isbn) sources.push(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`)
  return sources
}

/**
 * Book cover with a graceful fallback chain: Cover URL → Open Library → a
 * generated placeholder tinted with the book's zone colour.
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
      src={src}
      alt={`cover of ${book.title}`}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
      className={cn('object-cover', className)}
    />
  )
}
