/**
 * Pure catalog filtering / searching / sorting — no React, fully unit-tested.
 * The catalog page keeps its filter state and hands it here.
 */
import type { Book } from '@/api/types'
import { needsAttention } from './validation'

export type StatusFilter = 'all' | 'available' | 'borrowed' | 'exchange'
/** Whether *anyone* has read the edition — unrelated to which user. */
export type ReadFilter = 'all' | 'read' | 'unread'
/** A book's relationship between `language` and `originalLanguage` — see `bookOriginality`. */
export type OriginalityFilter = 'all' | 'original' | 'translated' | 'unknown'
export type SortKey = 'title' | 'author' | 'year'
export type SortDir = 'asc' | 'desc'

export interface CatalogFilters {
  search: string
  author: string | null
  zone: string | null
  theme: string | null
  owner: string | null
  language: string | null
  readBy: string | null
  status: StatusFilter
  read: ReadFilter
  originality: OriginalityFilter
  /** Admin-only: show only records that still need work (see `needsAttention`). */
  attention: boolean
}

export const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  author: null,
  zone: null,
  theme: null,
  owner: null,
  language: null,
  readBy: null,
  status: 'all',
  read: 'all',
  originality: 'all',
  attention: false,
}

/** How many filters are currently narrowing the catalog (search excluded — it has its own box). */
export function activeFilterCount(f: CatalogFilters): number {
  return (
    (f.author !== null ? 1 : 0) +
    (f.zone !== null ? 1 : 0) +
    (f.theme !== null ? 1 : 0) +
    (f.owner !== null ? 1 : 0) +
    (f.language !== null ? 1 : 0) +
    (f.readBy !== null ? 1 : 0) +
    (f.status !== 'all' ? 1 : 0) +
    (f.read !== 'all' ? 1 : 0) +
    (f.originality !== 'all' ? 1 : 0) +
    (f.attention ? 1 : 0)
  )
}

/** True when any filter is narrowing the catalog. */
export function hasActiveFilters(f: CatalogFilters): boolean {
  return f.search.trim() !== '' || activeFilterCount(f) > 0
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
      return book.exchangeStatus !== ''
    case 'available':
      return !book.borrowed
    default:
      return true
  }
}

function matchesRead(book: Book, read: ReadFilter): boolean {
  switch (read) {
    case 'read':
      return book.readBy.length > 0
    case 'unread':
      return book.readBy.length === 0
    default:
      return true
  }
}

/**
 * Classifies a book's edition against the language it was originally
 * written in: `unknown` when `Original language` is blank (already flagged
 * elsewhere by "needs attention" rather than guessed), `original` when this
 * edition's language(s) include it, `translated` otherwise. Shared by the
 * Overview page's original-vs-translated chart and this filter so the two
 * never drift apart.
 */
export function bookOriginality(book: Book): 'original' | 'translated' | 'unknown' {
  if (!book.originalLanguage.trim()) return 'unknown'
  return book.language.includes(book.originalLanguage) ? 'original' : 'translated'
}

function matchesOriginality(book: Book, originality: OriginalityFilter): boolean {
  return originality === 'all' || bookOriginality(book) === originality
}

/** Applies all active filters (AND-combined) to the catalog. */
export function filterBooks(books: Book[], f: CatalogFilters): Book[] {
  return books.filter(
    (b) =>
      matchesSearch(b, f.search) &&
      (f.author === null || splitAuthors(b.author).includes(f.author)) &&
      (f.zone === null || b.zone === f.zone) &&
      (f.theme === null || b.theme === f.theme) &&
      (f.owner === null || splitOwners(b.owner).includes(f.owner)) &&
      (f.language === null || b.language.includes(f.language)) &&
      (f.readBy === null || b.readBy.includes(f.readBy)) &&
      matchesStatus(b, f.status) &&
      matchesRead(b, f.read) &&
      matchesOriginality(b, f.originality) &&
      (!f.attention || needsAttention(b)),
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

/**
 * Splits a possibly multi-author string into individual author names, using the
 * same separators as the ID scheme (`,` `&` `;`). So "Éliane Radigue, Julia
 * Eckhardt" becomes two authors, each independently filterable.
 */
export function splitAuthors(author: string): string[] {
  return String(author ?? '')
    .split(/[,&;]/)
    .map((a) => a.trim())
    .filter(Boolean)
}

/**
 * Splits a possibly multi-owner cell into individual owner names — a book can be
 * co-owned. Same separators as authors (`,` `&` `;`), so each owner shows its own
 * marker and is independently filterable.
 */
export function splitOwners(owner: string): string[] {
  return String(owner ?? '')
    .split(/[,&;]/)
    .map((o) => o.trim())
    .filter(Boolean)
}

/** The distinct, sorted authors present across the catalog (for the filter). */
export function authorOptions(books: Book[]): string[] {
  const set = new Set<string>()
  for (const b of books) for (const a of splitAuthors(b.author)) set.add(a)
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/**
 * The distinct, sorted *edition* languages a book is actually available in.
 * Derived from books rather than the `Lists` vocabulary so the filter never
 * offers an original-only language (e.g. Ancient Greek) that no edition is in.
 */
export function languageOptions(books: Book[]): string[] {
  const set = new Set<string>()
  for (const b of books) for (const l of b.language) if (l) set.add(l)
  return [...set].sort((a, b) => a.localeCompare(b))
}
