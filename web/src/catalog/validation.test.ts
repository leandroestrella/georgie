import { describe, expect, it } from 'vitest'
import type { Book } from '@/api/types'
import {
  attentionReasons,
  isValidIsbn,
  isValidIsbn10,
  isValidIsbn13,
  isbnIsAbsent,
  needsAttention,
  normalizeIsbn,
  validateBook,
} from './validation'

const draft = (over: Partial<Parameters<typeof validateBook>[0]> = {}) => ({
  title: 'A Book',
  year: 2000 as number | null,
  isbn: 'N/A',
  theme: 'Poetry',
  ...over,
})

describe('isbn absence (the N/A sentinel)', () => {
  it('treats blank and N/A (any case) as absent, not malformed', () => {
    expect(isbnIsAbsent('')).toBe(true)
    expect(isbnIsAbsent('  ')).toBe(true)
    expect(isbnIsAbsent('N/A')).toBe(true)
    expect(isbnIsAbsent('n/a')).toBe(true)
    expect(isbnIsAbsent('9780349143590')).toBe(false)
    // absent ISBNs must pass validation
    expect(isValidIsbn('N/A')).toBe(true)
    expect(isValidIsbn('')).toBe(true)
  })
})

describe('isbn checksums', () => {
  it('validates real ISBN-13s from the catalog', () => {
    expect(isValidIsbn13('9780349143590')).toBe(true) // Less
    expect(isValidIsbn13('9788807816338')).toBe(true) // Kapuscinski
    expect(isValidIsbn13('978-0-349-14359-0')).toBe(true) // separators tolerated
  })
  it('rejects a bad ISBN-13 check digit', () => {
    expect(isValidIsbn13('9780349143591')).toBe(false)
  })
  it('validates ISBN-10 including the trailing X form', () => {
    expect(isValidIsbn10('0306406152')).toBe(true)
    expect(isValidIsbn10('080442957X')).toBe(true)
    expect(isValidIsbn10('0306406153')).toBe(false)
  })
  it('isValidIsbn accepts both lengths and rejects junk', () => {
    expect(isValidIsbn('0306406152')).toBe(true)
    expect(isValidIsbn('9780349143590')).toBe(true)
    expect(isValidIsbn('12345')).toBe(false)
    expect(isValidIsbn('not-an-isbn')).toBe(false)
  })
  it('normalizeIsbn strips separators and uppercases X', () => {
    expect(normalizeIsbn('978-0-349 14359 0')).toBe('9780349143590')
    expect(normalizeIsbn('080442957x')).toBe('080442957X')
  })
})

describe('validateBook', () => {
  it('accepts a valid draft', () => {
    expect(validateBook(draft())).toEqual({})
  })
  it('requires a title and a theme', () => {
    expect(validateBook(draft({ title: '  ' })).title).toBeDefined()
    expect(validateBook(draft({ theme: '' })).theme).toBeDefined()
  })
  it('allows an unknown (null) year but rejects nonsense years', () => {
    expect(validateBook(draft({ year: null })).year).toBeUndefined()
    expect(validateBook(draft({ year: 0 })).year).toBeDefined()
    expect(validateBook(draft({ year: 9999 })).year).toBeDefined()
  })
  it('rejects a malformed ISBN but accepts N/A', () => {
    expect(validateBook(draft({ isbn: '12345' })).isbn).toBeDefined()
    expect(validateBook(draft({ isbn: 'N/A' })).isbn).toBeUndefined()
    expect(validateBook(draft({ isbn: '9780349143590' })).isbn).toBeUndefined()
  })
})

const book = (over: Partial<Book>): Book => ({
  id: 'X', title: 'T', author: 'A', year: 2000, yearPrecision: '', publisher: '',
  isbn: 'N/A', language: [], originalLanguage: 'English', coverUrl: 'http://c/x.jpg',
  theme: '', zone: '', owner: '', referenceUrl: '', readBy: [], borrowed: false,
  borrowerName: '', loanDate: '', exchange: false, archived: false,
  ...over,
})

describe('needs attention', () => {
  it('is clean for a complete book', () => {
    expect(needsAttention(book({}))).toBe(false)
    expect(attentionReasons(book({}))).toEqual([])
  })
  it('flags missing year, circa, missing cover and missing original language', () => {
    expect(attentionReasons(book({ year: null }))).toContain('missingYear')
    expect(attentionReasons(book({ yearPrecision: 'circa' }))).toContain('circaYear')
    expect(attentionReasons(book({ coverUrl: '' }))).toContain('missingCover')
    expect(attentionReasons(book({ originalLanguage: '' }))).toContain('missingOriginalLanguage')
  })
  it('collects multiple reasons at once', () => {
    expect(attentionReasons(book({ year: null, coverUrl: '', originalLanguage: '' }))).toHaveLength(3)
  })
})
