import { describe, expect, it } from 'vitest'
import {
  amazonCoverUrl,
  coverSources,
  isBlankPixel,
  isbn13to10,
  openLibraryCoverUrl,
  toIsbn10,
  usableIsbn,
} from './covers'

describe('isbn13to10', () => {
  it('converts real 978 ISBN-13s to the ISBN-10 Amazon keys covers by', () => {
    // Verified against Amazon: 8807816334 returns a real cover for this book.
    expect(isbn13to10('9788807816338')).toBe('8807816334')
    expect(isbn13to10('9780349143590')).toBe('0349143595') // Less
    expect(isbn13to10('978-88-07-81633-8')).toBe('8807816334') // separators ok
  })

  it('produces an X check digit where required', () => {
    // 9780804429573 is the ISBN-13 of 080442957X (check digit 10 → "X").
    expect(isbn13to10('9780804429573')).toBe('080442957X')
    expect(isbn13to10('9780306406157')).toBe('0306406152')
  })

  it('returns null for 979 ISBNs (no ISBN-10 exists) and for non-13s', () => {
    expect(isbn13to10('9791234567896')).toBeNull()
    expect(isbn13to10('0349143595')).toBeNull()
    expect(isbn13to10('')).toBeNull()
  })
})

describe('toIsbn10', () => {
  it('passes an ISBN-10 through and converts an ISBN-13', () => {
    expect(toIsbn10('0349143595')).toBe('0349143595')
    expect(toIsbn10('030640615X')).toBe('030640615X')
    expect(toIsbn10('9780349143590')).toBe('0349143595')
  })
  it('returns null when there is no ISBN-10 form', () => {
    expect(toIsbn10('9791234567896')).toBeNull()
    expect(toIsbn10('junk')).toBeNull()
  })
})

describe('usableIsbn', () => {
  it('rejects the N/A sentinel, blanks and malformed lengths', () => {
    expect(usableIsbn('N/A')).toBeNull()
    expect(usableIsbn('n/a')).toBeNull()
    expect(usableIsbn('')).toBeNull()
    expect(usableIsbn('12345')).toBeNull()
  })
  it('accepts and normalizes real ISBNs', () => {
    expect(usableIsbn('978-0-349-14359-0')).toBe('9780349143590')
    expect(usableIsbn('0349143595')).toBe('0349143595')
  })
})

describe('isBlankPixel', () => {
  it("detects Amazon's 1x1 no-cover placeholder", () => {
    expect(isBlankPixel(1, 1)).toBe(true)
    expect(isBlankPixel(120, 180)).toBe(false)
  })
})

describe('coverSources', () => {
  it('orders own cover, then Open Library, then Amazon', () => {
    const s = coverSources({ coverUrl: 'https://example.com/c.jpg', isbn: '9780349143590' })
    expect(s).toEqual([
      'https://example.com/c.jpg',
      openLibraryCoverUrl('9780349143590'),
      amazonCoverUrl('0349143595'),
    ])
  })

  it('still offers ISBN-based covers when the book has no Cover URL', () => {
    const s = coverSources({ coverUrl: '', isbn: '9788807816338' })
    expect(s).toHaveLength(2)
    expect(s[1]).toContain('8807816334') // the Amazon ISBN-10
  })

  it('offers only the stored cover when the ISBN is N/A', () => {
    expect(coverSources({ coverUrl: 'https://example.com/c.jpg', isbn: 'N/A' })).toEqual([
      'https://example.com/c.jpg',
    ])
    expect(coverSources({ coverUrl: '', isbn: 'N/A' })).toEqual([])
  })

  it('skips Amazon for a 979 ISBN but keeps Open Library', () => {
    const s = coverSources({ coverUrl: '', isbn: '9791234567896' })
    expect(s).toEqual([openLibraryCoverUrl('9791234567896')])
  })

  it('open library urls 404 on a miss so the chain can advance', () => {
    expect(openLibraryCoverUrl('9780349143590')).toContain('default=false')
  })
})
