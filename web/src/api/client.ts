/**
 * Typed API client for the Georgie backend.
 *
 * Mirrors the Apps Script handlers one-to-one. Two modes, chosen automatically:
 *  - **backend mode** (a `VITE_API_URL` is configured): reads via GET, writes via
 *    POST. Writes deliberately use `Content-Type: text/plain` so the browser
 *    treats them as "simple" requests and skips the CORS preflight that Apps
 *    Script web apps can't answer; the backend parses the JSON string body.
 *  - **mock mode** (no backend): serves and mutates an in-memory copy of the
 *    fixtures so the whole UI works offline. Mutations persist for the session.
 *
 * The signed-in admin's ID token is threaded through writes via `getIdToken`
 * (wired up in Phase 2); reads never send it.
 */
import { config, hasBackend } from '@/config'
import type { Book, BookPatch, LoanInput, NewBook, Taxonomies } from './types'
import { MOCK_BOOKS, MOCK_TAXONOMIES } from './mock'
import { uniqueId } from './ids'

/** Supplies the current admin ID token for writes; replaced in Phase 2. */
let getIdToken: () => string | null = () => null

/** Registers the provider used to obtain the admin ID token for write calls. */
export function setIdTokenProvider(provider: () => string | null): void {
  getIdToken = provider
}

/** Shape of every backend JSON response. */
type ApiEnvelope<T> = ({ ok: true } & T) | { ok: false; error: string }

/** Raised when the backend returns `{ ok: false }` or the request fails. */
export class ApiError extends Error {}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetches the public catalog (archived books excluded server-side). */
export async function getBooks(): Promise<Book[]> {
  if (!hasBackend) return clone(mock.books.filter((b) => !b.archived))
  const data = await get<{ books: Book[] }>('books')
  return data.books
}

/** Fetches a single book by ID, or `null` if not found. */
export async function getBook(id: string): Promise<Book | null> {
  const books = await getBooks()
  return books.find((b) => b.id === id) ?? null
}

/** Fetches the taxonomy (zones/themes/owners/languages). */
export async function getTaxonomies(): Promise<Taxonomies> {
  if (!hasBackend) return clone(mock.taxonomies)
  const data = await get<{ taxonomies: Taxonomies }>('taxonomies')
  return data.taxonomies
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Creates a book; the backend assigns its immutable ID and derives its zone. */
export async function addBook(book: NewBook): Promise<Book> {
  if (!hasBackend) return mockAdd(book)
  const data = await post<{ book: Book }>({ action: 'addBook', book })
  return data.book
}

/** Applies a partial patch to an existing book. */
export async function updateBook(id: string, patch: BookPatch): Promise<Book> {
  if (!hasBackend) return mockPatch(id, patch)
  const data = await post<{ book: Book }>({ action: 'updateBook', id, patch })
  return data.book
}

/** Archives a book (soft delete — hidden from the public catalog). */
export async function deleteBook(id: string): Promise<Book> {
  if (!hasBackend) return mockPatch(id, { archived: true })
  const data = await post<{ book: Book }>({ action: 'deleteBook', id })
  return data.book
}

/** Restores an archived book. */
export async function restoreBook(id: string): Promise<Book> {
  if (!hasBackend) return mockPatch(id, { archived: false })
  const data = await post<{ book: Book }>({ action: 'restoreBook', id })
  return data.book
}

/** Sets a loan (`loan`) or returns the book (`null`). */
export async function setLoan(id: string, loan: LoanInput | null): Promise<Book> {
  if (!hasBackend) {
    return loan
      ? mockPatch(id, { borrowed: true, borrowerName: loan.borrowerName, loanDate: loan.loanDate ?? todayIso() })
      : mockPatch(id, { borrowed: false, borrowerName: '', loanDate: '' })
  }
  const data = await post<{ book: Book }>({ action: 'setLoan', id, loan })
  return data.book
}

// ---------------------------------------------------------------------------
// HTTP transport (backend mode)
// ---------------------------------------------------------------------------

async function get<T>(action: string): Promise<T> {
  const url = `${config.apiUrl}?action=${encodeURIComponent(action)}`
  let res: Response
  try {
    res = await fetch(url, { method: 'GET' })
  } catch (err) {
    throw new ApiError(`Network error contacting the backend: ${String(err)}`)
  }
  return unwrap<T>(await res.json())
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const token = getIdToken()
  const payload = token ? { ...body, idToken: token } : body
  let res: Response
  try {
    res = await fetch(config.apiUrl, {
      method: 'POST',
      // text/plain avoids the CORS preflight Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new ApiError(`Network error contacting the backend: ${String(err)}`)
  }
  return unwrap<T>(await res.json())
}

/** Narrows the `{ ok }` envelope, throwing `ApiError` on failure. */
function unwrap<T>(env: ApiEnvelope<T>): T {
  if (!env || (env as { ok?: boolean }).ok !== true) {
    const message = (env as { error?: string })?.error ?? 'Unknown backend error'
    throw new ApiError(message)
  }
  const { ok: _ok, ...rest } = env as { ok: true } & Record<string, unknown>
  return rest as T
}

// ---------------------------------------------------------------------------
// In-memory mock store (mock mode)
// ---------------------------------------------------------------------------

const mock = {
  books: clone(MOCK_BOOKS),
  taxonomies: MOCK_TAXONOMIES,
}

/** Resets the in-memory mock store — used by tests. */
export function __resetMockStore(): void {
  mock.books = clone(MOCK_BOOKS)
}

function mockAdd(input: NewBook): Book {
  const used = new Set(mock.books.map((b) => b.id))
  const book: Book = {
    ...input,
    id: uniqueId(input.title, input.author, input.year, used),
    zone: mock.taxonomies.themeToZone[input.theme] ?? '',
  }
  mock.books.push(book)
  return clone(book)
}

function mockPatch(id: string, patch: BookPatch): Book {
  const book = mock.books.find((b) => b.id === id)
  if (!book) throw new ApiError(`Book not found: ${id}`)
  Object.assign(book, patch)
  if (patch.theme !== undefined) book.zone = mock.taxonomies.themeToZone[patch.theme] ?? ''
  return clone(book)
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return structuredClone(value)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
