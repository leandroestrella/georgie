/**
 * Client tests in BACKEND mode. We stub VITE_API_URL before importing the client
 * (so `hasBackend` is true) and mock `fetch` to assert the wire protocol:
 * GET for reads, text/plain POST for writes, and `{ ok }` envelope unwrapping.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const API = 'https://script.example.com/exec'

/** Fresh import of the client with the backend URL stubbed in. */
async function loadClient() {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', API)
  return import('./client')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

type FetchArgs = [url: string, init?: RequestInit]

function mockFetch(response: unknown, ok = true) {
  const fetchMock = vi.fn(
    async (..._args: FetchArgs) => ({ ok, json: async () => response }) as Response,
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Reads the RequestInit of the first recorded fetch call (asserts it exists). */
function firstInit(fetchMock: ReturnType<typeof mockFetch>): RequestInit & {
  headers: Record<string, string>
  body: string
} {
  const init = fetchMock.mock.calls[0]?.[1]
  if (!init) throw new Error('fetch was not called with an init object')
  return init as RequestInit & { headers: Record<string, string>; body: string }
}

describe('backend reads', () => {
  it('getBooks GETs ?action=books and unwraps the envelope', async () => {
    const { getBooks } = await loadClient()
    const books = [{ id: 'ORW-198-1950', title: '1984' }]
    const f = mockFetch({ ok: true, books })
    const result = await getBooks()
    expect(result).toEqual(books)
    expect(f).toHaveBeenCalledWith(`${API}?action=books`, { method: 'GET' })
  })

  it('getTaxonomies GETs ?action=taxonomies', async () => {
    const { getTaxonomies } = await loadClient()
    const taxonomies = { zones: [], themeToZone: {}, owners: [], languages: [] }
    const f = mockFetch({ ok: true, taxonomies })
    expect(await getTaxonomies()).toEqual(taxonomies)
    expect(f).toHaveBeenCalledWith(`${API}?action=taxonomies`, { method: 'GET' })
  })
})

describe('backend writes', () => {
  it('addBook POSTs text/plain JSON and returns the created book', async () => {
    const { addBook, setIdTokenProvider } = await loadClient()
    setIdTokenProvider(() => 'token-123')
    const created = { id: 'NEW-BOO-2020', title: 'New' }
    const f = mockFetch({ ok: true, book: created })

    const result = await addBook({ title: 'New' } as never)
    expect(result).toEqual(created)

    expect(f.mock.calls[0]?.[0]).toBe(API)
    const init = firstInit(f)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toMatch(/^text\/plain/)
    const body = JSON.parse(init.body)
    expect(body.action).toBe('addBook')
    expect(body.idToken).toBe('token-123') // token threaded through
  })

  it('does not attach an idToken when none is available', async () => {
    const { updateBook } = await loadClient()
    const f = mockFetch({ ok: true, book: { id: 'X' } })
    await updateBook('X', { title: 'y' })
    const body = JSON.parse(firstInit(f).body)
    expect('idToken' in body).toBe(false)
  })
})

describe('error handling', () => {
  it('throws ApiError with the backend message on { ok: false }', async () => {
    const { getBooks, ApiError } = await loadClient()
    mockFetch({ ok: false, error: 'Book not found: X' })
    await expect(getBooks()).rejects.toBeInstanceOf(ApiError)
    await expect(getBooks()).rejects.toThrow('Book not found: X')
  })

  it('wraps network failures in ApiError', async () => {
    const { getBooks, ApiError } = await loadClient()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') }))
    await expect(getBooks()).rejects.toBeInstanceOf(ApiError)
  })
})
