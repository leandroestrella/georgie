import { describe, expect, it } from 'vitest'
import { isbnFromBarcode } from './scanner'

describe('isbnFromBarcode', () => {
  it('accepts Bookland EAN-13s from real back covers', () => {
    expect(isbnFromBarcode('9788807816338')).toBe('9788807816338') // Italian edition
    expect(isbnFromBarcode('9780349143590')).toBe('9780349143590') // Less
  })

  it('accepts a 979-prefixed ISBN (the newer Bookland range)', () => {
    // 9791234567896 — 979 prefix, valid EAN-13 checksum.
    expect(isbnFromBarcode('9791234567896')).toBe('9791234567896')
  })

  it('rejects a non-book EAN-13 even though its checksum is valid', () => {
    // 5901234123457 is a textbook-valid EAN-13, but not Bookland — scanning a
    // cereal box must not write a bogus ISBN into the catalog.
    expect(isbnFromBarcode('5901234123457')).toBeNull()
  })

  it('rejects a 978-prefixed code with a broken checksum', () => {
    expect(isbnFromBarcode('9788807816339')).toBeNull()
  })

  it('accepts a bare ISBN-10 from older books, including the X form', () => {
    expect(isbnFromBarcode('0349143595')).toBe('0349143595')
    expect(isbnFromBarcode('080442957x')).toBe('080442957X')
  })

  it('tolerates separators and whitespace', () => {
    expect(isbnFromBarcode(' 978-88-07-81633-8 ')).toBe('9788807816338')
  })

  it('rejects junk and empties', () => {
    expect(isbnFromBarcode('')).toBeNull()
    expect(isbnFromBarcode('hello')).toBeNull()
    expect(isbnFromBarcode('12345')).toBeNull()
  })
})
