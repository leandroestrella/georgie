/**
 * Client tests in BACKEND mode. We stub VITE_API_URL before importing the client
 * (so `hasBackend` is true) and stand in for `fetch` to assert the wire
 * protocol: REST routes under `/api/v1`, a bearer token once signed in, a
 * `rev` with every update, and the backend's rows turned into the shape pages use.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const API = 'https://georgie.example.workers.dev'

/** Fresh import of the client (and its wiring) with the backend URL stubbed in. */
async function loadClient() {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', API)
  const client = await import('./client')
  const backend = await import('@/backend')
  return { ...client, backend }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

interface Call {
  method: string
  path: string
  headers: Headers
  body: unknown
}

/** A stand-in backend: answers each `METHOD /path` with the given body (and status), and records the calls. */
function mockBackend(routes: Record<string, unknown | { status: number; body: unknown }>) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const path = request.url.replace(`${API}/api/v1`, '')
      const text = await request.text()
      calls.push({ method: request.method, path, headers: request.headers, body: text ? JSON.parse(text) : undefined })
      const route = routes[`${request.method} ${path}`]
      if (route === undefined) return Response.json({ ok: false, error: `no such endpoint: ${request.method} ${path}` }, { status: 404 })
      const { status, body } = route !== null && typeof route === 'object' && 'status' in route ? (route as { status: number; body: unknown }) : { status: 200, body: route }
      return Response.json(body, { status })
    }),
  )
  return calls
}

const TAXONOMIES = { zones: [], themeToZone: { Dystopia: 'The Reading Room' }, owners: [], languages: [], ownerMarkers: {}, users: [] }
const ROW = {
  id: 'ORW-198-1950', rev: 3, updatedAt: '2026-10-03T10:00:00.000Z',
  title: '1984', author: 'George Orwell', year: 1950, yearPrecision: null, publisher: null, isbn: 'N/A',
  language: ['Italian'], originalLanguage: null, coverUrl: null, theme: 'Dystopia', owner: 'leandro', referenceUrl: null,
  readBy: null, borrowed: null, borrowerName: null, loanDate: null, exchangeStatus: null, exchangeNote: null, exchangeLink: null, archived: false,
}

describe('backend reads', () => {
  it('getBooks reads the public catalog and the taxonomy, and gives pages the shape they expect', async () => {
    const { getBooks } = await loadClient()
    const calls = mockBackend({ 'GET /catalog': { ok: true, rows: [ROW] }, 'GET /taxonomies': { ok: true, taxonomies: TAXONOMIES } })
    const [book] = await getBooks()
    expect(calls.map((call) => `${call.method} ${call.path}`).sort()).toEqual(['GET /catalog', 'GET /taxonomies'])
    expect(calls.every((call) => !call.headers.has('authorization'))).toBe(true)
    // empty fields are '' / [] / false, not null; the zone is derived from the theme
    expect(book).toEqual({
      id: 'ORW-198-1950', title: '1984', author: 'George Orwell', year: 1950, yearPrecision: '', publisher: '', isbn: 'N/A',
      language: ['Italian'], originalLanguage: '', coverUrl: '', theme: 'Dystopia', zone: 'The Reading Room', owner: 'leandro',
      referenceUrl: '', readBy: [], borrowed: false, borrowerName: '', loanDate: '', exchangeStatus: '', exchangeNote: '', exchangeLink: '', archived: false,
    })
  })

  it('keeps what it read: a second read within moments asks nothing, and the copy can be shown at once', async () => {
    const { getBooks, peekBooks, peekTaxonomies } = await loadClient()
    const calls = mockBackend({ 'GET /catalog': { ok: true, rows: [ROW] }, 'GET /taxonomies': { ok: true, taxonomies: TAXONOMIES } })
    expect(peekBooks(false)).toBeNull()
    await getBooks()
    await getBooks()
    expect(calls).toHaveLength(2)
    expect(peekBooks(false)?.[0]?.zone).toBe('The Reading Room')
    expect(peekTaxonomies()).toEqual(TAXONOMIES)
  })

  it('getHistory shows changes to books only, naming each by what its diff amounts to', async () => {
    const { getHistory, backend } = await loadClient()
    backend.client.signIn({ token: 'pms_session', account: 'a' })
    const entry = (seq: number, action: string, changes: string, entity = 'books') => ({ seq, at: '2026-10-03T10:00:00.000Z', actor: 'leandro', actorKind: 'person', action, entity, entityId: 'ORW-198-1950', label: '1984', changes })
    const calls = mockBackend({
      'GET /history?limit=500': {
        ok: true,
        entries: [
          entry(9, 'conflict', 'publisher: the sheet\'s "A" was replaced by the app\'s "B"'),
          entry(8, 'update', 'exchangeStatus: offered → in transit; archived: false → true'),
          entry(7, 'update', 'archived: true → false'),
          entry(6, 'update', 'archived:  → true'),
          entry(5, 'update', 'borrowed: true → false; borrowerName: Ada → ; loanDate: 2026-10-01 → '),
          entry(4, 'update', 'borrowed:  → true; borrowerName:  → Ada'),
          entry(3, 'update', 'title: borrowed: a memoir → Borrowed'),
          entry(2, 'create', 'name: maria', 'users'),
          entry(1, 'create', 'title: 1984'),
        ],
      },
    })
    const history = await getHistory()
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer pms_session')
    expect(history.map((item) => [item.seq, item.action])).toEqual([
      [9, 'conflict'], [8, 'exchange'], [7, 'restore'], [6, 'archive'], [5, 'return'], [4, 'loan'], [3, 'update'], [1, 'add'],
    ])
    expect(history[0]).toMatchObject({ timestamp: '2026-10-03T10:00:00.000Z', actor: 'leandro', entityId: 'ORW-198-1950', title: '1984' })
  })
})

describe('backend writes', () => {
  it('updateBook PATCHes only the fields given, with the session and the rev of the copy it was made from', async () => {
    const { getAllBooks, updateBook, peekBooks, backend } = await loadClient()
    backend.client.signIn({ token: 'pms_session', account: 'a' })
    const calls = mockBackend({
      'GET /books': { ok: true, rows: [ROW] },
      'GET /taxonomies': { ok: true, taxonomies: TAXONOMIES },
      'PATCH /books/ORW-198-1950': { ok: true, row: { ...ROW, rev: 4, title: 'Nineteen Eighty-Four' } },
    })
    await getAllBooks()
    const updated = await updateBook('ORW-198-1950', { title: 'Nineteen Eighty-Four', zone: 'ignored' })

    const patch = calls.find((call) => call.method === 'PATCH')!
    expect(patch.headers.get('authorization')).toBe('Bearer pms_session')
    expect(patch.headers.get('content-type')).toBe('application/json')
    // the derived zone is never sent
    expect(patch.body).toEqual({ title: 'Nineteen Eighty-Four', rev: 3 })
    expect(updated.title).toBe('Nineteen Eighty-Four')
    // the device's copy changed in place: no second read of the table
    expect(peekBooks(true)?.[0]?.title).toBe('Nineteen Eighty-Four')
    expect(calls.filter((call) => call.path === '/books')).toHaveLength(1)
  })

  it('addBook POSTs the new book and returns it with the id the backend minted', async () => {
    const { addBook, backend } = await loadClient()
    backend.client.signIn({ token: 'pms_session', account: 'a' })
    const calls = mockBackend({ 'POST /books': { status: 201, body: { ok: true, row: { ...ROW, rev: 1 } } } })
    const created = await addBook({ title: '1984', author: 'George Orwell', year: 1950 } as never)
    expect(created.id).toBe('ORW-198-1950')
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/books', body: { title: '1984', author: 'George Orwell', year: 1950 } })
  })

  it('a save made from an outdated copy is refused, and the copy then shows the row as it is now', async () => {
    const { getAllBooks, setLoan, peekBooks, backend } = await loadClient()
    backend.client.signIn({ token: 'pms_session', account: 'a' })
    const latest = { ...ROW, rev: 4, publisher: 'Mondadori' }
    mockBackend({
      'GET /books': { ok: true, rows: [ROW] },
      'GET /taxonomies': { ok: true, taxonomies: TAXONOMIES },
      'PATCH /books/ORW-198-1950': { status: 409, body: { ok: false, error: 'this row has changed since you opened it', details: { row: latest } } },
    })
    await getAllBooks()
    await expect(setLoan('ORW-198-1950', { borrowerName: 'Sam' })).rejects.toThrow('this row has changed since you opened it')
    expect(peekBooks(true)?.[0]?.publisher).toBe('Mondadori')
  })

  it('saveCover posts to the book\'s cover endpoint and keeps the row that comes back', async () => {
    const { getAllBooks, saveCover, peekBooks, backend } = await loadClient()
    backend.client.signIn({ token: 'pms_session', account: 'a' })
    const calls = mockBackend({
      'GET /books': { ok: true, rows: [ROW] },
      'GET /taxonomies': { ok: true, taxonomies: TAXONOMIES },
      'POST /books/ORW-198-1950/cover': { ok: true, row: { ...ROW, rev: 4, coverUrl: 'https://covers.example/ORW-198-1950.jpg?v=1' } },
    })
    await getAllBooks()
    const saved = await saveCover('ORW-198-1950', { url: 'https://example.com/cover.jpg' })
    expect(calls.at(-1)?.body).toEqual({ url: 'https://example.com/cover.jpg' })
    expect(saved.coverUrl).toBe('https://covers.example/ORW-198-1950.jpg?v=1')
    expect(peekBooks(true)?.[0]?.coverUrl).toBe(saved.coverUrl)
  })
})

describe('error handling', () => {
  it('throws ApiError with the backend message on { ok: false }', async () => {
    const { getAllBooks, ApiError } = await loadClient()
    mockBackend({ 'GET /books': { status: 401, body: { ok: false, error: 'sign in first' } }, 'GET /taxonomies': { ok: true, taxonomies: TAXONOMIES } })
    const error = await getAllBooks().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as Error).message).toBe('sign in first')
  })

  it('tries a read again when the backend cannot be reached, then gives up with an ApiError', async () => {
    vi.useFakeTimers()
    try {
      const { getBooks, ApiError } = await loadClient()
      const fetchMock = vi.fn(async () => {
        throw new Error('boom')
      })
      vi.stubGlobal('fetch', fetchMock)
      const outcome = getBooks().catch((e: unknown) => e)
      await vi.runAllTimersAsync()
      expect(await outcome).toBeInstanceOf(ApiError)
      // the catalog and the taxonomy, each tried three times
      expect(fetchMock).toHaveBeenCalledTimes(6)
    } finally {
      vi.useRealTimers()
    }
  })
})
