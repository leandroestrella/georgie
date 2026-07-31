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
import type { Book, BookPatch, ExchangeInput, HistoryEntry, LoanInput, NewBook, Taxonomies } from './types'
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

/**
 * Admin-only read that INCLUDES archived books (the public read hides them).
 * Goes through POST so it passes the ID-token gate.
 */
export async function getAllBooks(): Promise<Book[]> {
  if (!hasBackend) return clone(mock.books)
  const data = await post<{ books: Book[] }>({ action: 'allBooks' })
  return data.books
}

/** Admin-only: the audit log of every write, newest first. */
export async function getHistory(): Promise<HistoryEntry[]> {
  if (!hasBackend) return clone(mock.history)
  const data = await post<{ entries: HistoryEntry[] }>({ action: 'history' })
  return data.entries
}

/** Fetches the taxonomy (zones/themes/owners/languages). */
export async function getTaxonomies(): Promise<Taxonomies> {
  if (!hasBackend) return clone(mock.taxonomies)
  const data = await get<{ taxonomies: Taxonomies }>('taxonomies')
  return data.taxonomies
}

/** The caller's admin status, resolved server-side from their ID token. */
export interface Me {
  admin: boolean
  email: string
  owner: string
  reason: string
}

/**
 * Asks the backend whether the current ID token belongs to an admin. In mock
 * mode (offline dev) there is no sign-in, so we grant admin to keep the write
 * UI reachable against the in-memory store.
 */
export async function fetchMe(): Promise<Me> {
  if (!hasBackend) return { admin: true, email: 'dev@local', owner: 'leandro', reason: 'mock mode' }
  return post<Me>({ action: 'me' })
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
  if (!hasBackend) return mockPatch(id, patch, 'update')
  const data = await post<{ book: Book }>({ action: 'updateBook', id, patch })
  return data.book
}

/** Archives a book (soft delete — hidden from the public catalog). */
export async function deleteBook(id: string): Promise<Book> {
  if (!hasBackend) return mockPatch(id, { archived: true }, 'archive', '')
  const data = await post<{ book: Book }>({ action: 'deleteBook', id })
  return data.book
}

/** Restores an archived book. */
export async function restoreBook(id: string): Promise<Book> {
  if (!hasBackend) return mockPatch(id, { archived: false }, 'restore', '')
  const data = await post<{ book: Book }>({ action: 'restoreBook', id })
  return data.book
}

/** Sets a loan (`loan`) or returns the book (`null`). */
export async function setLoan(id: string, loan: LoanInput | null): Promise<Book> {
  if (!hasBackend) {
    if (!loan) return mockPatch(id, { borrowed: false, borrowerName: '', loanDate: '' }, 'return', '')
    const loanDate = loan.loanDate ?? todayIso()
    const changes = `borrower: ${loan.borrowerName || '(unknown)'} · since ${loanDate}`
    return mockPatch(id, { borrowed: true, borrowerName: loan.borrowerName, loanDate }, 'loan', changes)
  }
  const data = await post<{ book: Book }>({ action: 'setLoan', id, loan })
  return data.book
}

/** Sets an exchange stage (`exchange`) or withdraws it (`null`). */
export async function setExchange(id: string, exchange: ExchangeInput | null): Promise<Book> {
  if (!hasBackend) {
    if (!exchange) {
      return mockPatch(id, { exchangeStatus: '', exchangeNote: '', exchangeLink: '' }, 'exchange', 'withdrawn')
    }
    const changes = exchange.status + (exchange.note ? ` · ${exchange.note}` : '')
    return mockPatch(
      id,
      { exchangeStatus: exchange.status, exchangeNote: exchange.note ?? '', exchangeLink: exchange.link ?? '' },
      'exchange',
      changes,
    )
  }
  const data = await post<{ book: Book }>({ action: 'setExchange', id, exchange })
  return data.book
}

/**
 * Finishes an exchange (stage 4, received): archives the outgoing book and, if
 * `Exchange link` names another catalog book, clears that book's loan (the
 * incoming book reuses `Borrowed` to mean "not yet on the shelf" — see
 * `setExchange`'s callers) and its own `Exchange link`.
 */
export async function completeExchange(id: string): Promise<Book> {
  if (!hasBackend) {
    const linkedId = mock.books.find((b) => b.id === id)?.exchangeLink
    const outgoing = mockPatch(
      id,
      { exchangeStatus: '', exchangeNote: '', exchangeLink: '', archived: true },
      'archive',
      '',
    )
    if (linkedId && mock.books.some((b) => b.id === linkedId)) {
      mockPatch(linkedId, { borrowed: false, borrowerName: '', loanDate: '', exchangeLink: '' }, 'return', '')
    }
    return outgoing
  }
  const data = await post<{ book: Book }>({ action: 'completeExchange', id })
  return data.book
}

/**
 * Snapshots a cover to the library's own host and updates the book's `Cover URL`.
 * The image is either fetched from a URL (`url` — the cover currently shown) or
 * supplied as base64 bytes (`image` — a photo of the physical cover).
 */
export async function saveCover(
  id: string,
  source: { url: string } | { image: string; contentType: string },
): Promise<Book> {
  if (!hasBackend) throw new ApiError('Saving covers requires the backend.')
  const data = await post<{ book: Book }>({ action: 'saveCover', id, ...source })
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
// Mock-mode audit log — re-implements apps-script/catalog.js's diffBook and
// logHistory_ as plain TS (can't share code across the two runtimes) so the
// /history page behaves the same whether backed by the real sheet or these
// in-memory fixtures. Declared before `mock` below since its initializer
// calls seedMockHistory() immediately.
// ---------------------------------------------------------------------------

/** Same field list + exclusions as the backend's `DIFF_FIELDS` in catalog.js. */
const DIFF_FIELDS: (keyof Book)[] = [
  'title', 'author', 'year', 'yearPrecision', 'publisher', 'isbn',
  'language', 'originalLanguage', 'coverUrl', 'theme', 'owner',
  'referenceUrl', 'readBy',
]

function diffFieldText(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ') || '—'
  return v == null || v === '' ? '—' : String(v)
}

function diffBookMock(before: Book, after: Book): string {
  const parts: string[] = []
  for (const f of DIFF_FIELDS) {
    const a = diffFieldText(before[f])
    const b = diffFieldText(after[f])
    if (a !== b) parts.push(`${f}: ${a} → ${b}`)
  }
  return parts.join('; ')
}

/** The identity `fetchMe()` reports in mock mode — writes are attributed to it. */
const MOCK_ACTOR = 'leandro'

function pushMockHistory(action: HistoryEntry['action'], book: Book, changes: string): void {
  mock.history.unshift({
    timestamp: new Date().toISOString(),
    actor: MOCK_ACTOR,
    action,
    entityId: book.id,
    title: book.title,
    author: book.author,
    theme: book.theme,
    changes,
  })
}

/**
 * A handful of plausible entries referencing real mock-book ids (so they
 * click through), rather than an empty "no activity yet" on first load.
 */
function seedMockHistory(): HistoryEntry[] {
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString()
  const entry = (
    id: string,
    action: HistoryEntry['action'],
    changes: string,
    minutesAgo: number,
  ): HistoryEntry | null => {
    const book = MOCK_BOOKS.find((b) => b.id === id)
    if (!book) return null
    return {
      timestamp: at(minutesAgo),
      actor: MOCK_ACTOR,
      action,
      entityId: book.id,
      title: book.title,
      author: book.author,
      theme: book.theme,
      changes,
    }
  }
  return [
    entry('GRE-LES-2018', 'add', '', 60 * 24 * 3),
    entry('KAP-LAP-2007', 'loan', 'borrower: RebelBooks · since 2024-05-01', 60 * 24 * 2),
    entry('ROV-ORD-2017', 'update', 'year: 2016 → 2017', 45),
  ].filter((e): e is HistoryEntry => e !== null)
}

// ---------------------------------------------------------------------------
// In-memory mock store (mock mode)
// ---------------------------------------------------------------------------

const mock = {
  books: clone(MOCK_BOOKS),
  taxonomies: MOCK_TAXONOMIES,
  history: seedMockHistory(),
}

/** Resets the in-memory mock store — used by tests. */
export function __resetMockStore(): void {
  mock.books = clone(MOCK_BOOKS)
  mock.history = seedMockHistory()
}

function mockAdd(input: NewBook): Book {
  const used = new Set(mock.books.map((b) => b.id))
  const book: Book = {
    ...input,
    id: uniqueId(input.title, input.author, input.year, used),
    zone: mock.taxonomies.themeToZone[input.theme] ?? '',
  }
  mock.books.push(book)
  pushMockHistory('add', book, '')
  return clone(book)
}

function mockPatch(id: string, patch: BookPatch, action: HistoryEntry['action'], changes?: string): Book {
  const book = mock.books.find((b) => b.id === id)
  if (!book) throw new ApiError(`Book not found: ${id}`)
  const before = clone(book)
  Object.assign(book, patch)
  if (patch.theme !== undefined) book.zone = mock.taxonomies.themeToZone[patch.theme] ?? ''
  pushMockHistory(action, book, changes !== undefined ? changes : action === 'update' ? diffBookMock(before, book) : '')
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
