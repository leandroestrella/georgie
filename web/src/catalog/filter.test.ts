import { describe, expect, it } from 'vitest'
import type { Book } from '@/api/types'
import {
  authorOptions,
  bookOriginality,
  EMPTY_FILTERS,
  filterBooks,
  hasActiveFilters,
  readerOptions,
  sortBooks,
  splitAuthors,
  splitOwners,
} from './filter'

const make = (over: Partial<Book>): Book => ({
  id: 'X',
  title: '',
  author: '',
  year: null,
  yearPrecision: '',
  publisher: '',
  isbn: 'N/A',
  language: [],
  originalLanguage: '',
  coverUrl: '',
  theme: '',
  zone: '',
  owner: '',
  referenceUrl: '',
  readBy: [],
  borrowed: false,
  borrowerName: '',
  loanDate: '',
  exchangeStatus: '',
  exchangeNote: '',
  exchangeLink: '',
  archived: false,
  ...over,
})

const books: Book[] = [
  make({ id: '1', title: '1984', author: 'George Orwell', year: 1950, zone: 'Fiction', theme: 'Dystopia', owner: 'leandro', language: ['English'], readBy: ['leandro'] }),
  make({ id: '2', title: 'Cien años de soledad', author: 'Gabriel García Márquez', year: 1967, zone: 'Fiction', theme: 'Magical', owner: 'maria', language: ['Spanish'], borrowed: true, borrowerName: 'Sam' }),
  make({ id: '3', title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, zone: 'History', theme: 'Macro', owner: 'leandro', language: ['English', 'Italian'], exchangeStatus: 'offered', readBy: ['leandro', 'maria'] }),
]

describe('search', () => {
  it('matches title or author, case/accent-insensitive, all terms', () => {
    expect(filterBooks(books, { ...EMPTY_FILTERS, search: 'orwell' }).map((b) => b.id)).toEqual(['1'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, search: 'garcia' }).map((b) => b.id)).toEqual(['2'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, search: 'gabriel marquez' }).map((b) => b.id)).toEqual(['2'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, search: 'xyz' })).toHaveLength(0)
  })
})

describe('facet filters', () => {
  it('filters by exact author', () => {
    expect(filterBooks(books, { ...EMPTY_FILTERS, author: 'George Orwell' }).map((b) => b.id)).toEqual(['1'])
  })

  it('filters by zone, owner, language (multi-value), and read-by', () => {
    expect(filterBooks(books, { ...EMPTY_FILTERS, zone: 'Fiction' }).map((b) => b.id)).toEqual(['1', '2'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, owner: 'maria' }).map((b) => b.id)).toEqual(['2'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, language: 'Italian' }).map((b) => b.id)).toEqual(['3'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, readBy: 'maria' }).map((b) => b.id)).toEqual(['3'])
  })

  it('filters by status', () => {
    expect(filterBooks(books, { ...EMPTY_FILTERS, status: 'borrowed' }).map((b) => b.id)).toEqual(['2'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, status: 'exchange' }).map((b) => b.id)).toEqual(['3'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, status: 'available' }).map((b) => b.id)).toEqual(['1', '3'])
  })

  it('filters by read/unread', () => {
    expect(filterBooks(books, { ...EMPTY_FILTERS, read: 'read' }).map((b) => b.id)).toEqual(['1', '3'])
    expect(filterBooks(books, { ...EMPTY_FILTERS, read: 'unread' }).map((b) => b.id)).toEqual(['2'])
  })

  it('filters by originality (original / translated / unknown)', () => {
    const originality = [
      make({ id: 'o', language: ['English'], originalLanguage: 'English' }),
      make({ id: 't', language: ['Italian'], originalLanguage: 'English' }),
      make({ id: 'u', language: ['English'], originalLanguage: '' }),
    ]
    expect(bookOriginality(originality[0])).toBe('original')
    expect(bookOriginality(originality[1])).toBe('translated')
    expect(bookOriginality(originality[2])).toBe('unknown')
    expect(filterBooks(originality, { ...EMPTY_FILTERS, originality: 'original' }).map((b) => b.id)).toEqual(['o'])
    expect(filterBooks(originality, { ...EMPTY_FILTERS, originality: 'translated' }).map((b) => b.id)).toEqual(['t'])
    expect(filterBooks(originality, { ...EMPTY_FILTERS, originality: 'unknown' }).map((b) => b.id)).toEqual(['u'])
  })

  it('combines filters with AND', () => {
    expect(
      filterBooks(books, { ...EMPTY_FILTERS, zone: 'Fiction', owner: 'leandro' }).map((b) => b.id),
    ).toEqual(['1'])
  })
})

describe('sort', () => {
  it('sorts by title, author, and numeric year with unknowns last', () => {
    expect(sortBooks(books, 'title', 'asc').map((b) => b.id)).toEqual(['1', '2', '3'])
    expect(sortBooks(books, 'year', 'desc').map((b) => b.id)).toEqual(['3', '2', '1'])
    const withUnknown = [...books, make({ id: '4', title: 'Zzz', year: null })]
    expect(sortBooks(withUnknown, 'year', 'asc').map((b) => b.id).at(-1)).toBe('4')
  })
})

describe('helpers', () => {
  it('hasActiveFilters detects narrowing', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, owner: 'leandro' })).toBe(true)
  })
  it('readerOptions returns distinct sorted names', () => {
    expect(readerOptions(books)).toEqual(['leandro', 'maria'])
  })
  it('splitAuthors splits on , & ; and trims', () => {
    expect(splitAuthors('Éliane Radigue, Julia Eckhardt')).toEqual(['Éliane Radigue', 'Julia Eckhardt'])
    expect(splitAuthors('A & B; C')).toEqual(['A', 'B', 'C'])
    expect(splitAuthors('Solo Author')).toEqual(['Solo Author'])
    expect(splitAuthors('')).toEqual([])
  })
  it('author facet lists and filters individual authors from multi-author books', () => {
    const multi = [make({ id: 'm', author: 'Giuseppe Penone, Alain Elkann' })]
    expect(authorOptions(multi)).toEqual(['Alain Elkann', 'Giuseppe Penone'])
    expect(filterBooks(multi, { ...EMPTY_FILTERS, author: 'Alain Elkann' }).map((b) => b.id)).toEqual(['m'])
    expect(filterBooks(multi, { ...EMPTY_FILTERS, author: 'Giuseppe Penone, Alain Elkann' })).toEqual([])
  })
  it('splitOwners splits on , & ; and trims', () => {
    expect(splitOwners('leandro, maria')).toEqual(['leandro', 'maria'])
    expect(splitOwners('a & b; c')).toEqual(['a', 'b', 'c'])
    expect(splitOwners('leandro')).toEqual(['leandro'])
    expect(splitOwners('')).toEqual([])
  })
  it('owner filter matches any owner of a co-owned book', () => {
    const shared = [make({ id: 's', owner: 'leandro, maria' })]
    expect(filterBooks(shared, { ...EMPTY_FILTERS, owner: 'maria' }).map((b) => b.id)).toEqual(['s'])
    expect(filterBooks(shared, { ...EMPTY_FILTERS, owner: 'leandro' }).map((b) => b.id)).toEqual(['s'])
    expect(filterBooks(shared, { ...EMPTY_FILTERS, owner: 'hugo' })).toEqual([])
  })
})
