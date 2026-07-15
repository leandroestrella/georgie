/**
 * Pure catalog filtering / searching / sorting — no React, fully unit-tested.
 * The catalog page keeps its filter state and hands it here.
 */
import type { Book } from '@/api/types'

export type StatusFilter = 'all' | 'available' | 'borrowed' | 'exchange'
export type SortKey = 'title' | 'author' | 'year'
export type SortDir = 'asc' | 'desc'

export interface CatalogFilters {
  search: string
  zone: string | null
  theme: string | null
  owner: string | null
  language: string | null
  readBy: string | null
  status: StatusFilter
}

export const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  zone: null,
  theme: null,
  owner: null,
  language: null,
  readBy: null,
  status: 'all',
}

/** True when any filter is narrowing the catalog. */
export function hasActiveFilters(f: CatalogFilters): boolean {
  return (
    f.search.trim() !== '' ||
    f.zone !== null ||
    f.theme !== null ||
    f.owner !== null ||
    f.language !== null ||
    f.readBy !== null ||
    f.status !== 'all'
  )
}

/** Lowercases and strips accents so "garcia" matches "García". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function matchesSearch(book: Book, query: string): boolean {
  const q = normalize(query.trim())
  if (!q) return true
  return q
    .split(/\s+/)
    .every((term) => normalize(book.title).includes(term) || normalize(book.author).includes(term))
}

function matchesStatus(book: Book, status: StatusFilter): boolean {
  switch (status) {
    case 'borrowed':
      return book.borrowed
    case 'exchange':
      return book.exchange
    case 'available':
      return !book.borrowed
    default:
      return true
  }
}

/** Applies all active filters (AND-combined) to the catalog. */
export function filterBooks(books: Book[], f: CatalogFilters): Book[] {
  return books.filter(
    (b) =>
      matchesSearch(b, f.search) &&
      (f.zone === null || b.zone === f.zone) &&
      (f.theme === null || b.theme === f.theme) &&
      (f.owner === null || b.owner === f.owner) &&
      (f.language === null || b.language.includes(f.language)) &&
      (f.readBy === null || b.readBy.includes(f.readBy)) &&
      matchesStatus(b, f.status),
  )
}

/** Sorts a copy of the list. Title/author use locale compare; year is numeric. */
export function sortBooks(books: Book[], key: SortKey, dir: SortDir = 'asc'): Book[] {
  const sign = dir === 'asc' ? 1 : -1
  const copy = [...books]
  copy.sort((a, b) => {
    if (key === 'year') {
      // Unknown years sort last regardless of direction.
      if (a.year === null && b.year === null) return 0
      if (a.year === null) return 1
      if (b.year === null) return -1
      return (a.year - b.year) * sign
    }
    return a[key].localeCompare(b[key], undefined, { sensitivity: 'base' }) * sign
  })
  return copy
}

/** The distinct, sorted `readBy` names present across the catalog (for the filter). */
export function readerOptions(books: Book[]): string[] {
  const set = new Set<string>()
  for (const b of books) for (const r of b.readBy) set.add(r)
  return [...set].sort((a, b) => a.localeCompare(b))
}
