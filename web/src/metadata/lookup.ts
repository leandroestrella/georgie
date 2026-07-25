/**
 * Web metadata lookup — "grab book details from the web".
 *
 * Two public, CORS-friendly sources, tried in order:
 *   1. Google Books — per-edition data, includes the language. Unauthenticated
 *      calls share a per-IP daily quota and DO return 429 in the wild, so every
 *      failure must fall through rather than surface as an error.
 *   2. Open Library — better coverage of older/European editions. Its ISBN
 *      endpoint is per-edition but carries no language; its search endpoint is
 *      work-level (editions merged), so those results are coarser.
 *
 * Everything is client-side: no backend, no API key, no secret.
 */

/** A metadata candidate, normalized to the shape of our `Book` fields. */
export interface BookMetadata {
  title: string
  author: string
  year: number | null
  publisher: string
  /** English language names, matching the sheet's vocabulary. Empty when unknown. */
  language: string[]
  coverUrl: string
  isbn: string
  source: 'google' | 'openlibrary'
  /** True when the year is a first-publication year rather than this edition's. */
  yearIsFirstPublication?: boolean
}

/**
 * ISO 639-1 (Google) and 639-2 (Open Library) codes → the English language names
 * used in the sheet's `Lists` tab. Deliberately conservative: ambiguous codes
 * (e.g. `el` modern vs. ancient Greek, `zh` vs. Classical Chinese) are left out
 * so an admin picks them by hand rather than us guessing wrong.
 */
const LANGUAGE_BY_CODE: Record<string, string> = {
  en: 'English', eng: 'English',
  es: 'Spanish', spa: 'Spanish',
  fr: 'French', fre: 'French', fra: 'French',
  it: 'Italian', ita: 'Italian',
  pl: 'Polish', pol: 'Polish',
  pt: 'Portuguese', por: 'Portuguese',
  sv: 'Swedish', swe: 'Swedish',
  cs: 'Czech', cze: 'Czech', ces: 'Czech',
  de: 'German', ger: 'German', deu: 'German',
  gl: 'Galician', glg: 'Galician',
  nl: 'Dutch', dut: 'Dutch', nld: 'Dutch',
  ru: 'Russian', rus: 'Russian',
  no: 'Norwegian', nor: 'Norwegian', nb: 'Norwegian', nn: 'Norwegian',
  ko: 'Korean', kor: 'Korean',
  la: 'Classical Latin', lat: 'Classical Latin',
  kn: 'Kannada', kan: 'Kannada',
}

/** Maps a language code to its English name, or null when unknown/ambiguous. */
export function languageFromCode(code: string): string | null {
  const key = (code ?? '').trim().toLowerCase().replace('/languages/', '')
  return LANGUAGE_BY_CODE[key] ?? null
}

/** Extracts a 4-digit year from a free-form date ("2018", "2018-05-01", "May 2018"). */
export function yearFromDate(value: unknown): number | null {
  const m = /(\d{4})/.exec(String(value ?? ''))
  return m ? Number(m[1]) : null
}

/** Upgrades an http image URL to https and drops Google's page-curl overlay. */
function cleanCover(url: string): string {
  return (url ?? '').replace(/^http:\/\//, 'https://').replace(/&edge=curl/g, '')
}

// ---------------------------------------------------------------------------
// Google Books
// ---------------------------------------------------------------------------

interface GoogleVolumeInfo {
  title?: string
  subtitle?: string
  authors?: string[]
  publishedDate?: string
  publisher?: string
  language?: string
  imageLinks?: { thumbnail?: string; smallThumbnail?: string }
  industryIdentifiers?: { type?: string; identifier?: string }[]
}

/** Picks the best ISBN from Google's identifier list (prefers ISBN-13). */
function isbnFromGoogle(info: GoogleVolumeInfo): string {
  const ids = info.industryIdentifiers ?? []
  return (
    ids.find((i) => i.type === 'ISBN_13')?.identifier ??
    ids.find((i) => i.type === 'ISBN_10')?.identifier ??
    ''
  )
}

/** Maps a Google Books volumeInfo to our metadata shape. */
export function mapGoogleVolume(info: GoogleVolumeInfo): BookMetadata {
  const language = info.language ? languageFromCode(info.language) : null
  return {
    title: [info.title, info.subtitle].filter(Boolean).join(': '),
    author: (info.authors ?? []).join(', '),
    year: yearFromDate(info.publishedDate),
    publisher: info.publisher ?? '',
    language: language ? [language] : [],
    coverUrl: cleanCover(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? ''),
    isbn: isbnFromGoogle(info),
    source: 'google',
  }
}

// ---------------------------------------------------------------------------
// Open Library
// ---------------------------------------------------------------------------

interface OpenLibraryData {
  title?: string
  subtitle?: string
  authors?: { name?: string }[]
  publishers?: { name?: string }[]
  publish_date?: string
  cover?: { small?: string; medium?: string; large?: string }
  identifiers?: { isbn_13?: string[]; isbn_10?: string[] }
}

/** Maps an Open Library `jscmd=data` record. Note: it carries no language. */
export function mapOpenLibraryData(data: OpenLibraryData): BookMetadata {
  return {
    title: [data.title, data.subtitle].filter(Boolean).join(': '),
    author: (data.authors ?? []).map((a) => a.name ?? '').filter(Boolean).join(', '),
    year: yearFromDate(data.publish_date),
    publisher: data.publishers?.[0]?.name ?? '',
    language: [], // not provided by this endpoint
    coverUrl: data.cover?.medium ?? data.cover?.large ?? '',
    isbn: data.identifiers?.isbn_13?.[0] ?? data.identifiers?.isbn_10?.[0] ?? '',
    source: 'openlibrary',
  }
}

interface OpenLibrarySearchDoc {
  title?: string
  author_name?: string[]
  first_publish_year?: number
  publisher?: string[]
  isbn?: string[]
  cover_i?: number
  language?: string[]
}

/**
 * Maps an Open Library search hit. These are WORK-level (all editions merged),
 * so the year is a first-publication year and publisher/ISBN are only indicative
 * — flagged via `yearIsFirstPublication` so the UI can warn.
 */
export function mapOpenLibrarySearchDoc(doc: OpenLibrarySearchDoc): BookMetadata {
  const language = (doc.language ?? []).map(languageFromCode).filter((l): l is string => !!l)
  return {
    title: doc.title ?? '',
    author: (doc.author_name ?? []).join(', '),
    year: doc.first_publish_year ?? null,
    publisher: doc.publisher?.[0] ?? '',
    language: language.length === 1 ? language : [], // multi-language = merged editions; don't guess
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
    isbn: doc.isbn?.[0] ?? '',
    source: 'openlibrary',
    yearIsFirstPublication: true,
  }
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

/** Fetches JSON, returning null on any failure (incl. Google's 429 quota errors). */
async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Strips separators from an ISBN for use in a query. */
export function cleanIsbn(isbn: string): string {
  return (isbn ?? '').replace(/[^0-9Xx]/g, '')
}

/**
 * Looks up an exact edition by ISBN: Google Books first, then Open Library.
 * Returns null when neither source knows it.
 */
export async function lookupByIsbn(isbn: string): Promise<BookMetadata | null> {
  const clean = cleanIsbn(isbn)
  if (!clean) return null

  const google = await getJson<{ totalItems?: number; items?: { volumeInfo: GoogleVolumeInfo }[] }>(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(clean)}`,
  )
  const volume = google?.items?.[0]?.volumeInfo
  if (volume) return mapGoogleVolume(volume)

  const ol = await getJson<Record<string, OpenLibraryData>>(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=data`,
  )
  const record = ol ? Object.values(ol)[0] : undefined
  return record ? mapOpenLibraryData(record) : null
}

/**
 * Searches by title and/or author and returns candidates to pick from — the path
 * for the ~third of the catalog with no ISBN. Google Books first (per-edition);
 * falls back to Open Library search (work-level) if Google is unavailable.
 */
export async function searchBooks(
  title: string,
  author: string,
  limit = 8,
): Promise<BookMetadata[]> {
  const terms = [
    title.trim() ? `intitle:${title.trim()}` : '',
    author.trim() ? `inauthor:${author.trim()}` : '',
  ].filter(Boolean)
  if (!terms.length) return []

  const google = await getJson<{ items?: { volumeInfo: GoogleVolumeInfo }[] }>(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(terms.join(' '))}&maxResults=${limit}`,
  )
  if (google?.items?.length) return google.items.map((i) => mapGoogleVolume(i.volumeInfo))

  const params = new URLSearchParams({ limit: String(limit) })
  if (title.trim()) params.set('title', title.trim())
  if (author.trim()) params.set('author', author.trim())
  params.set('fields', 'title,author_name,first_publish_year,publisher,isbn,cover_i,language')

  const ol = await getJson<{ docs?: OpenLibrarySearchDoc[] }>(
    `https://openlibrary.org/search.json?${params.toString()}`,
  )
  return (ol?.docs ?? []).map(mapOpenLibrarySearchDoc)
}
