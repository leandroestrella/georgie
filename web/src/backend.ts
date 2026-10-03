/**
 * The SPA's wiring to its backend: one client (which keeps what it reads on the
 * device, so a page opens on the last copy at once), who is signed in, and the
 * `books` table. Everything in `api/client.ts` and `auth/` goes through these.
 *
 * With no backend URL configured the app runs on the mock fixtures instead: a
 * backend that lives in the page, signed in as a sample person, so the whole
 * UI — writes included — can be developed and tried with no server.
 */
import { createAuth } from '@lndrstrll/pomuku-auth'
import { createClient, demoFetch } from '@lndrstrll/pomuku-data'
import { isLanguage } from '@lndrstrll/pomuku-i18n'
import { makeId, type Book as BookRow } from '../../server/src/schema'
import { config, hasBackend } from '@/config'
import { MOCK_BOOKS, MOCK_TAXONOMIES } from '@/api/mock'
import { i18n } from '@/i18n'

/** The owner label mock mode is signed in as; mock writes are attributed to it. */
export const MOCK_OWNER = 'leandro'

/**
 * The mock backend: pomuku's in-page demo over the fixtures, plus the two
 * things of Georgie's own it has to imitate — the public reads, and a
 * call-number ID minted for every new book (never clashing with one in use).
 */
function mockBackend(): typeof fetch {
  const demo = demoFetch({
    // A book's zone is derived, never stored.
    tables: { books: MOCK_BOOKS.map(({ zone: _zone, ...book }) => book) },
    routes: {
      '/catalog': (tables) => ({ rows: tables.books!.filter((book) => !book.archived) }),
      '/taxonomies': { taxonomies: MOCK_TAXONOMIES },
      '/history': { entries: [] },
    },
  })
  return async (input, init) => {
    const request = new Request(input, init)
    if (request.method !== 'POST' || !new URL(request.url).pathname.endsWith('/books')) return demo(request)
    const fields = (await request.json()) as { title?: string; author?: string; year?: number | null }
    const { rows } = (await (await demo(request.url)).json()) as { rows: { id: string }[] }
    const used = new Set(rows.map((row) => row.id))
    const base = makeId(fields.title ?? '', fields.author, fields.year)
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    return demo(request.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...fields, id }) })
  }
}

let mock = hasBackend ? null : mockBackend()

export const client = createClient({
  baseUrl: hasBackend ? config.apiUrl : 'https://mock.invalid',
  app: 'georgie',
  // Mock mode keeps nothing, on the device or in memory: every read asks the
  // in-page backend, which is instant.
  ...(hasBackend ? {} : { fetch: (input, init) => mock!(input, init), storage: null, cacheMs: 0 }),
})

export const auth = createAuth({
  client,
  app: 'georgie',
  demo: hasBackend ? undefined : { name: MOCK_OWNER, role: 'member' },
  // The language saved on the account, unless a link asked for one with `?lng=`.
  onLanguage: (language) => {
    if (isLanguage(language) && !new URLSearchParams(window.location.search).has('lng')) void i18n.changeLanguage(language)
  },
})

/**
 * Every book, archived ones included: only for people who are signed in, and
 * kept on the device only while they are. Visitors read the public catalog
 * instead (`GET /catalog`).
 */
export const booksTable = client.table<BookRow>('books', { scope: 'account' })

/** Starts the mock backend over from the fixtures — used by tests. */
export function resetMockBackend(): void {
  if (!hasBackend) mock = mockBackend()
}
