/**
 * Cover image sources, tried in order at render time.
 *
 * Nothing here is ever written back to the sheet: covers are resolved live, so
 * every book benefits without a data migration and a source that breaks is a
 * one-function fix.
 *
 * Order: the book's own Cover URL → Open Library by ISBN → Amazon by ISBN-10.
 *
 * ⚠️ The Amazon source is undocumented and outside Amazon's terms (those images
 * are intended for Associates linking to Amazon). It is included deliberately
 * because it is the only source with covers for much of this catalog's Italian
 * and European editions — Google Books and Open Library have neither the
 * metadata nor the cover for many of them. It may break without notice; if it
 * does, drop it from `coverSources` and nothing else changes.
 */
import { NO_ISBN } from './constants'
import { normalizeIsbn } from './validation'

/** The ISBN usable for cover lookups, or null when absent (`N/A`) or malformed. */
export function usableIsbn(isbn: string): string | null {
  if ((isbn ?? '').trim().toUpperCase() === NO_ISBN) return null
  const clean = normalizeIsbn(isbn)
  return clean.length === 10 || clean.length === 13 ? clean : null
}

/**
 * Converts a 978-prefixed ISBN-13 to its ISBN-10 equivalent (Amazon keys covers
 * by ISBN-10). Returns null for 979-prefixed ISBNs, which have no ISBN-10.
 */
export function isbn13to10(isbn: string): string | null {
  const s = normalizeIsbn(isbn)
  if (!/^978\d{10}$/.test(s)) return null
  const core = s.slice(3, 12)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(core[i])
  const check = sum % 11
  return core + (check === 10 ? 'X' : String(check))
}

/** The ISBN-10 form of an ISBN, if one exists. */
export function toIsbn10(isbn: string): string | null {
  const s = normalizeIsbn(isbn)
  if (/^\d{9}[\dX]$/.test(s)) return s
  return isbn13to10(s)
}

/** Open Library cover; `default=false` makes a miss 404 so the chain advances. */
export function openLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
}

/**
 * Amazon cover by ISBN-10. A miss returns a 1×1 blank GIF (not a 404), so
 * callers must detect the tiny image — see `isBlankPixel`.
 */
export function amazonCoverUrl(isbn10: string): string {
  return `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`
}

/** True when a loaded image is Amazon's 1×1 "no cover" placeholder. */
export function isBlankPixel(naturalWidth: number, naturalHeight: number): boolean {
  return naturalWidth <= 2 || naturalHeight <= 2
}

/** The ordered cover URLs to try for a book. */
export function coverSources(book: { coverUrl: string; isbn: string }): string[] {
  const sources: string[] = []
  if (book.coverUrl?.trim()) sources.push(book.coverUrl.trim())

  const isbn = usableIsbn(book.isbn)
  if (isbn) {
    sources.push(openLibraryCoverUrl(isbn))
    const isbn10 = toIsbn10(isbn)
    if (isbn10) sources.push(amazonCoverUrl(isbn10))
  }
  return sources
}
