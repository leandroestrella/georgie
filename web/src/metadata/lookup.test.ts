import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanIsbn,
  languageFromCode,
  lookupByIsbn,
  mapGoogleVolume,
  mapOpenLibraryData,
  mapOpenLibrarySearchDoc,
  searchBooks,
  yearFromDate,
} from './lookup'

afterEach(() => vi.restoreAllMocks())

/** Google Books shape, as returned for ISBN 9780349143590 (Less). */
const GOOGLE_VOLUME = {
  title: 'Less',
  subtitle: 'Winner of the Pulitzer Prize for Fiction 2018',
  authors: ['Andrew Sean Greer'],
  publishedDate: '2018-05-03',
  publisher: 'Abacus',
  language: 'en',
  imageLinks: { thumbnail: 'http://books.google.com/books/content?id=x&img=1&edge=curl' },
  industryIdentifiers: [
    { type: 'ISBN_10', identifier: '0349143595' },
    { type: 'ISBN_13', identifier: '9780349143590' },
  ],
}

/** Open Library `jscmd=data` shape, as returned for the same ISBN. */
const OL_DATA = {
  title: 'Less',
  subtitle: 'Winner of the Pulitzer Prize for Fiction 2018',
  authors: [{ name: 'Andrew Sean Greer' }],
  publishers: [{ name: 'Abacus' }],
  publish_date: '2018',
  cover: { medium: 'https://covers.openlibrary.org/b/id/8822609-M.jpg' },
  identifiers: { isbn_10: ['0349143595'], isbn_13: ['9780349143590'] },
}

/** Mocks fetch with a url→response map; unmatched urls 404. */
function mockFetch(routes: { match: string; ok?: boolean; body?: unknown }[]) {
  const fn = vi.fn(async (url: string) => {
    const route = routes.find((r) => url.includes(r.match))
    if (!route) return { ok: false, status: 404, json: async () => ({}) } as Response
    return {
      ok: route.ok !== false,
      status: route.ok === false ? 429 : 200,
      json: async () => route.body ?? {},
    } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('pure helpers', () => {
  it('yearFromDate pulls a 4-digit year from any date form', () => {
    expect(yearFromDate('2018-05-03')).toBe(2018)
    expect(yearFromDate('2018')).toBe(2018)
    expect(yearFromDate('May 2018')).toBe(2018)
    expect(yearFromDate('')).toBeNull()
    expect(yearFromDate(undefined)).toBeNull()
  })

  it('languageFromCode maps 2- and 3-letter codes to sheet names', () => {
    expect(languageFromCode('en')).toBe('English')
    expect(languageFromCode('eng')).toBe('English')
    expect(languageFromCode('ITA')).toBe('Italian')
    expect(languageFromCode('/languages/pol')).toBe('Polish')
  })

  it('languageFromCode returns null for ambiguous/unknown codes', () => {
    // `el` (modern Greek) must not silently become "Ancient Greek".
    expect(languageFromCode('el')).toBeNull()
    expect(languageFromCode('zh')).toBeNull()
    expect(languageFromCode('')).toBeNull()
  })

  it('cleanIsbn strips separators', () => {
    expect(cleanIsbn('978-0-349 14359 0')).toBe('9780349143590')
  })
})

describe('mappers', () => {
  it('maps a Google volume, joining subtitle, https-ing the cover and preferring ISBN-13', () => {
    const m = mapGoogleVolume(GOOGLE_VOLUME)
    expect(m.title).toBe('Less: Winner of the Pulitzer Prize for Fiction 2018')
    expect(m.author).toBe('Andrew Sean Greer')
    expect(m.year).toBe(2018)
    expect(m.publisher).toBe('Abacus')
    expect(m.language).toEqual(['English'])
    expect(m.isbn).toBe('9780349143590')
    expect(m.coverUrl).toMatch(/^https:\/\//)
    expect(m.coverUrl).not.toContain('edge=curl')
    expect(m.source).toBe('google')
  })

  it('maps an Open Library record (which carries no language)', () => {
    const m = mapOpenLibraryData(OL_DATA)
    expect(m.title).toBe('Less: Winner of the Pulitzer Prize for Fiction 2018')
    expect(m.author).toBe('Andrew Sean Greer')
    expect(m.year).toBe(2018)
    expect(m.publisher).toBe('Abacus')
    expect(m.language).toEqual([])
    expect(m.coverUrl).toContain('covers.openlibrary.org')
    expect(m.source).toBe('openlibrary')
  })

  it('flags Open Library search hits as first-publication and skips merged languages', () => {
    const m = mapOpenLibrarySearchDoc({
      title: 'Less',
      author_name: ['Andrew Sean Greer'],
      first_publish_year: 2017,
      publisher: ['Abacus', 'Wydawnictwo WAB'],
      isbn: ['9782330150044'],
      cover_i: 8596367,
      language: ['eng', 'ger', 'pol'], // merged editions → ambiguous
    })
    expect(m.year).toBe(2017)
    expect(m.yearIsFirstPublication).toBe(true)
    expect(m.publisher).toBe('Abacus')
    expect(m.language).toEqual([]) // must not guess from merged editions
    expect(m.coverUrl).toContain('/b/id/8596367-M.jpg')
  })
})

describe('lookupByIsbn', () => {
  it('uses Google Books when it answers', async () => {
    mockFetch([{ match: 'googleapis.com', body: { totalItems: 1, items: [{ volumeInfo: GOOGLE_VOLUME }] } }])
    const m = await lookupByIsbn('978-0-349-14359-0')
    expect(m?.source).toBe('google')
    expect(m?.title).toContain('Less')
  })

  it('falls back to Open Library when Google is quota-limited (429)', async () => {
    const fetchMock = mockFetch([
      { match: 'googleapis.com', ok: false }, // the real-world 429
      { match: 'openlibrary.org/api/books', body: { 'ISBN:9780349143590': OL_DATA } },
    ])
    const m = await lookupByIsbn('9780349143590')
    expect(m?.source).toBe('openlibrary')
    expect(m?.title).toContain('Less')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falls back when Google answers with zero results', async () => {
    mockFetch([
      { match: 'googleapis.com', body: { totalItems: 0 } },
      { match: 'openlibrary.org/api/books', body: { 'ISBN:9780349143590': OL_DATA } },
    ])
    expect((await lookupByIsbn('9780349143590'))?.source).toBe('openlibrary')
  })

  it('returns null when neither source knows the ISBN, and for an empty ISBN', async () => {
    mockFetch([
      { match: 'googleapis.com', body: { totalItems: 0 } },
      { match: 'openlibrary.org/api/books', body: {} },
    ])
    expect(await lookupByIsbn('9788807816338')).toBeNull()
    expect(await lookupByIsbn('N/A')).toBeNull()
    expect(await lookupByIsbn('')).toBeNull()
  })

  it('survives a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await lookupByIsbn('9780349143590')).toBeNull()
  })
})

describe('searchBooks', () => {
  it('searches Google by title and author', async () => {
    const fetchMock = mockFetch([{ match: 'googleapis.com', body: { items: [{ volumeInfo: GOOGLE_VOLUME }] } }])
    const results = await searchBooks('Less', 'Greer')
    expect(results).toHaveLength(1)
    expect(results[0].source).toBe('google')
    const url = fetchMock.mock.calls[0][0] as string
    expect(decodeURIComponent(url)).toContain('intitle:Less')
    expect(decodeURIComponent(url)).toContain('inauthor:Greer')
  })

  it('falls back to Open Library search when Google is unavailable', async () => {
    mockFetch([
      { match: 'googleapis.com', ok: false },
      { match: 'openlibrary.org/search.json', body: { docs: [{ title: 'Less', author_name: ['Andrew Sean Greer'], first_publish_year: 2017 }] } },
    ])
    const results = await searchBooks('Less', 'Greer')
    expect(results[0].source).toBe('openlibrary')
    expect(results[0].yearIsFirstPublication).toBe(true)
  })

  it('returns nothing when given no terms', async () => {
    const fetchMock = mockFetch([])
    expect(await searchBooks('  ', '')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
