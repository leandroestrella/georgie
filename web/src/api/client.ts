/**
 * Typed API client for the Georgie backend: a Cloudflare Worker with a JSON
 * API under `/api/v1` (see `server/README.md`). Pages call the functions here
 * and never the network themselves.
 *
 * Reads are kept on the device by the underlying client (`backend.ts`), so the
 * catalog opens on the last copy at once (`peekBooks`) while the fresh one is
 * on its way (`watchBooks` is told when it arrives). Writes change those copies
 * in place. A save made from an outdated copy is refused by the backend, and
 * the copies then show the row as it is now.
 *
 * Visitors read the public catalog (`GET /catalog`, archived books left out);
 * signed-in people read and write the `books` table itself. With no backend
 * configured, all of it runs against the mock fixtures (see `backend.ts`).
 *
 * The backend sends an empty field as `null` and doesn't store a book's zone;
 * `toBook` gives pages the shape they have always had ('' / [] / false, and the
 * zone derived from the theme through the taxonomy).
 */
import { ApiError as BackendError } from '@lndrstrll/pomuku-data'
import type { Book as BookRow } from '../../../server/src/schema'
import { booksTable, client, resetMockBackend } from '@/backend'
import type { Book, BookPatch, ExchangeInput, ExchangeStatus, HistoryEntry, LoanInput, NewBook, Taxonomies } from './types'

/** Raised when the backend refuses a request or can't be reached. */
export { BackendError as ApiError }

/** A book as the backend sends it; a row shown before the backend has it carries no `rev` worth sending. */
type Row = Partial<BookRow> & { id: string }

const CATALOG = 'catalog'
const TAXONOMIES = 'taxonomies'

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Theme → parent zone, from the taxonomy last read (empty until one has been). */
function themeToZone(): Record<string, string> {
  return client.peek<{ taxonomies: Taxonomies }>(TAXONOMIES)?.taxonomies.themeToZone ?? {}
}

/** A backend row as the pages know a book. */
function toBook(row: Row): Book {
  const theme = row.theme ?? ''
  return {
    id: row.id,
    title: row.title ?? '',
    author: row.author ?? '',
    year: row.year ?? null,
    yearPrecision: row.yearPrecision === 'circa' ? 'circa' : '',
    publisher: row.publisher ?? '',
    isbn: row.isbn ?? '',
    language: row.language ?? [],
    originalLanguage: row.originalLanguage ?? '',
    coverUrl: row.coverUrl ?? '',
    theme,
    zone: themeToZone()[theme] ?? '',
    owner: row.owner ?? '',
    referenceUrl: row.referenceUrl ?? '',
    readBy: row.readBy ?? [],
    borrowed: row.borrowed ?? false,
    borrowerName: row.borrowerName ?? '',
    loanDate: row.loanDate ?? '',
    exchangeStatus: (row.exchangeStatus ?? '') as ExchangeStatus,
    exchangeNote: row.exchangeNote ?? '',
    exchangeLink: row.exchangeLink ?? '',
    archived: row.archived ?? false,
  }
}

/** The fields of a patch as the backend takes them: everything but the derived zone. An empty value clears the field. */
function toFields(patch: BookPatch | NewBook): Partial<Omit<BookRow, 'id' | 'rev' | 'updatedAt'>> {
  const { zone: _zone, ...fields } = patch as BookPatch
  return fields as Partial<Omit<BookRow, 'id' | 'rev' | 'updatedAt'>>
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetches the public catalog (archived books excluded server-side). */
export async function getBooks(): Promise<Book[]> {
  const [{ rows }] = await Promise.all([client.read<{ rows: Row[] }>(CATALOG, '/catalog'), getTaxonomies()])
  return rows.map(toBook)
}

/** Fetches a single book by ID from the public catalog, or `null` if not found. */
export async function getBook(id: string): Promise<Book | null> {
  const books = await getBooks()
  return books.find((b) => b.id === id) ?? null
}

/** Signed-in read that INCLUDES archived books (the public read hides them). */
export async function getAllBooks(): Promise<Book[]> {
  const [rows] = await Promise.all([booksTable.list(), getTaxonomies()])
  return rows.map(toBook)
}

/**
 * The copy of the books kept on this device, to show at once; `null` on a
 * first visit. `signedIn` picks whose copy: the whole table, or the public catalog.
 */
export function peekBooks(signedIn: boolean): Book[] | null {
  const rows = signedIn ? booksTable.peek() : (client.peek<{ rows: Row[] }>(CATALOG)?.rows ?? null)
  return rows ? rows.map(toBook) : null
}

/**
 * Calls `listener` with the books whenever the device's copy changes: a fresh
 * read arriving, a save, a refused save bringing the row as it is now. Returns
 * the function that stops it.
 */
export function watchBooks(signedIn: boolean, listener: (books: Book[]) => void): () => void {
  if (signedIn) return booksTable.onFresh((rows) => listener(rows.map(toBook)))
  return client.onFresh<{ rows: Row[] } | null>(CATALOG, (answer) => answer && listener(answer.rows.map(toBook)))
}

/** Fetches the taxonomy (zones/themes/owners/languages). */
export async function getTaxonomies(): Promise<Taxonomies> {
  return (await client.read<{ taxonomies: Taxonomies }>(TAXONOMIES, '/taxonomies')).taxonomies
}

/** The copy of the taxonomy kept on this device; `null` on a first visit. */
export function peekTaxonomies(): Taxonomies | null {
  return client.peek<{ taxonomies: Taxonomies }>(TAXONOMIES)?.taxonomies ?? null
}

/** One entry of the backend's log: who changed which row of which table, and how. */
interface LogEntry {
  seq: number
  at: string
  actor: string
  action: 'create' | 'update' | 'delete' | 'conflict'
  entity: string
  entityId: string
  label: string
  changes: string
}

/**
 * What a logged change to a book amounts to. The backend records every edit as
 * an `update` with a `field: before → after` diff; the fields that changed say
 * whether it was a loan, a return, an exchange step, an archive or a restore.
 */
export function historyAction(action: LogEntry['action'], changes: string): HistoryEntry['action'] {
  if (action === 'create') return 'add'
  if (action !== 'update') return action
  const changed = (field: string) => new RegExp(`(?:^|; )${field}: `).test(changes)
  const became = (field: string, value: string) => new RegExp(`(?:^|; )${field}: [^;]*→ ${value}(?:;|$)`).test(changes)
  if (changed('exchangeStatus') || changed('exchangeNote') || changed('exchangeLink')) return 'exchange'
  if (changed('borrowed')) return became('borrowed', 'true') ? 'loan' : 'return'
  if (changed('archived')) return became('archived', 'true') ? 'archive' : 'restore'
  return 'update'
}

/** Signed-in read: the log of every change to a book, newest first. */
export async function getHistory(): Promise<HistoryEntry[]> {
  const { entries } = await client.request<{ entries: LogEntry[] }>('GET', '/history?limit=500')
  return entries
    .filter((entry) => entry.entity === 'books')
    .map((entry) => ({
      seq: entry.seq,
      timestamp: entry.at,
      actor: entry.actor,
      action: historyAction(entry.action, entry.changes),
      entityId: entry.entityId,
      title: entry.label,
      changes: entry.changes,
    }))
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** The `rev` of the device's copy of a book, so a save made from an outdated copy is refused. */
function revOf(id: string): number | undefined {
  return booksTable.peek()?.find((row) => row.id === id)?.rev || undefined
}

async function patch(id: string, fields: BookPatch): Promise<Book> {
  return toBook(await booksTable.update(id, toFields(fields), revOf(id)))
}

/** Creates a book; the backend assigns its immutable ID. */
export async function addBook(book: NewBook): Promise<Book> {
  return toBook(await booksTable.create(toFields(book)))
}

/** Applies a partial patch to an existing book. */
export async function updateBook(id: string, fields: BookPatch): Promise<Book> {
  return patch(id, fields)
}

/** Archives a book (soft delete — hidden from the public catalog). */
export async function deleteBook(id: string): Promise<Book> {
  return patch(id, { archived: true })
}

/** Restores an archived book. */
export async function restoreBook(id: string): Promise<Book> {
  return patch(id, { archived: false })
}

/** Sets a loan (`loan`) or returns the book (`null`). The loan date defaults to today. */
export async function setLoan(id: string, loan: LoanInput | null): Promise<Book> {
  if (!loan) return patch(id, { borrowed: false, borrowerName: '', loanDate: '' })
  return patch(id, { borrowed: true, borrowerName: loan.borrowerName, loanDate: loan.loanDate || todayIso() })
}

/**
 * Sets an exchange stage (`exchange`) or withdraws it (`null`, restoring the
 * book to the active catalog). `in transit` also archives the book in the
 * same write — once mailed out it's gone for good, unlike a loan, so it
 * shouldn't linger active with just a status badge.
 */
export async function setExchange(id: string, exchange: ExchangeInput | null): Promise<Book> {
  if (!exchange) return patch(id, { exchangeStatus: '', exchangeNote: '', exchangeLink: '', archived: false })
  return patch(id, {
    exchangeStatus: exchange.status,
    exchangeNote: exchange.note ?? '',
    exchangeLink: exchange.link ?? '',
    archived: exchange.status === 'in transit',
  })
}

/**
 * Finishes an exchange (stage 4, received). The outgoing book was already
 * archived when it went `in transit`; this clears its exchange fields (it
 * stays archived for good) and, if `Exchange link` names another catalog
 * book, clears that book's loan (the incoming book reuses `Borrowed` to mean
 * "not yet on the shelf" — see `setExchange`'s callers) and its own
 * `Exchange link`. A missing or stale link is not an error.
 *
 * Returns BOTH books, for callers that keep their own copy of either.
 */
export async function completeExchange(id: string): Promise<{ book: Book; linked: Book | null }> {
  const linkedId = (await booksTable.get(id))?.exchangeLink
  const book = await patch(id, { exchangeStatus: '', exchangeNote: '', exchangeLink: '', archived: true })
  let linked: Book | null = null
  if (linkedId) {
    try {
      linked = await patch(linkedId, { borrowed: false, borrowerName: '', loanDate: '', exchangeLink: '' })
    } catch {
      // The linked book may have been renamed or removed by hand; the outgoing
      // book is still correctly archived, so this isn't fatal.
    }
  }
  return { book, linked }
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
  const { row } = await client.request<{ row: BookRow }>('POST', `/books/${encodeURIComponent(id)}/cover`, source)
  booksTable.keep(row)
  return toBook(row)
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Today as `YYYY-MM-DD`, in the browser's own timezone. */
function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Resets the mock backend to its fixtures — used by tests. */
export function __resetMockStore(): void {
  resetMockBackend()
}
