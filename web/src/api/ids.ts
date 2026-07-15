/**
 * Call-number ID generation — the TypeScript twin of the logic in
 * `apps-script/catalog.js`. Kept byte-for-byte equivalent so the ID the app
 * previews for a new book matches the one the backend ultimately assigns.
 *
 * Format: `AAA-TTT-YYYY` (author surname / title / edition year), with `-2`,
 * `-3`… collision suffixes. IDs are immutable once assigned (see PLAN.md §1).
 */

/** Leading articles skipped when deriving the title token (EN/IT/ES/FR). */
export const ARTICLES = [
  'the', 'a', 'an', 'il', 'lo', 'la', 'i', 'gli', 'le', 'l',
  'un', 'una', 'uno', 'el', 'los', 'las', 'les', 'une', 'des',
]

/** Reduces text to a 3-char uppercase token (accents/punctuation/articles stripped, padded with X). */
export function threeOf(text: string): string {
  const words = String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !ARTICLES.includes(w))
  return (words.join('').toUpperCase().slice(0, 3) || 'XXX').padEnd(3, 'X')
}

/** Builds the base ID `AAA-TTT-YYYY`. Unknown year → `0000`. */
export function makeId(title: string, author: string, year: number | string | null): string {
  const firstAuthor = String(author ?? '').split(/[,&;]/)[0].trim()
  const surname = firstAuthor.split(/\s+/).pop() ?? ''
  const y = /^\d{4}$/.test(String(year ?? '').trim()) ? String(year).trim() : '0000'
  return `${threeOf(surname)}-${threeOf(title)}-${y}`
}

/** Returns a collision-free ID against a set of already-used IDs. */
export function uniqueId(
  title: string,
  author: string,
  year: number | string | null,
  used: ReadonlySet<string>,
): string {
  const base = makeId(title, author, year)
  let id = base
  let n = 2
  while (used.has(id)) id = `${base}-${n++}`
  return id
}
