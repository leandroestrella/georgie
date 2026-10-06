/**
 * Georgie's backend end to end: the real app on a D1 database from wrangler's
 * local runtime, a pretend Google for sign-in, and a spreadsheet kept in memory
 * shaped like the real one (same tabs, same headers, hand-edited quirks).
 *
 */
import { d1, migrate, type Cell } from '@lndrstrll/pomuku-server'
import { memorySheets, testD1, testGoogle } from '@lndrstrll/pomuku-server/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { schema } from './schema.js'
import { georgie, type GeorgieEnv } from './worker.js'

const SECRET = 'a-long-sync-secret'
const LEANDRO = 'leandro@example.com'

// The sheet's own column order, with the derived `Zone` column the app no longer writes.
const CATALOG = [
  'ID', 'Title', 'Author', 'Year', 'Year precision', 'Publisher', 'ISBN / EAN', 'Language', 'Original language', 'Cover URL',
  'Theme', 'Zone', 'Owner', 'Reference URL', 'Read by', 'Borrowed', 'Borrower name', 'Loan date',
  'Exchange status', 'Exchange note', 'Exchange link', 'Archived',
]
const TABS: Record<string, Cell[][]> = {
  Catalog: [
    CATALOG,
    // an ISBN typed as a number, a checkbox, a real date cell (the sheet's day count)
    ['ORW-198-1950', '1984', 'George Orwell', 1950, '', 'Mondadori', 9788804668237, 'Italian', 'English', '', 'Dystopia', 'stale zone', 'leandro', '', 'leandro, maria', true, 'Ada', 45000, '', '', '', false],
    ['PRO-QUE-2007', '¿Qué es la propiedad?', 'Pierre-Joseph Proudhon', 2007, '', 'Utopia Libertaria', 'N/A', 'Spanish', 'French', '', 'Political Theory', '', 'leandro', '', '', false, '', '', 'offered', '', '', false],
    ['LEG-DIS-1974', 'The Dispossessed', 'Ursula K. Le Guin', 1974, 'circa', '', '', 'English', 'English', '', 'Dystopia', '', 'maria', '', '', false, '', '', '', '', '', true],
    // typed by hand, no ID yet
    ['', 'La peste', 'Albert Camus', 1947, '', '', '', 'French'],
  ],
  Zones: [
    ['Title', 'Title (it)', 'Description', 'Themes', 'Themes (es)', 'Theme description', 'Marker'],
    ['The Reading Room', 'La Sala di Lettura', 'Fiction being written now', 'Dystopia', 'Distopía', 'Imagined futures', '🌐'],
    ['', '', '', 'Classics'],
    ['The Commons', '', 'Power and collective life', 'Political Theory', '', '', 'https://example.com/commons.png'],
  ],
  Lists: [
    ['Owner options', 'Owner marker', 'Languages'],
    ['leandro', '🦊', 'English'],
    ['maria', '', 'Italian'],
    ['hugo', '🐕', 'Spanish'],
    ['', '', 'French'],
  ],
  Users: [['Email', 'Owner', 'Language', 'Role'], ['Leandro@Example.com', 'leandro'], ['maria@example.com', 'maria']],
}

let env: GeorgieEnv & { DB: D1Database }
let google: Awaited<ReturnType<typeof testGoogle>>
let dispose: () => Promise<void>
let sheet: ReturnType<typeof memorySheets>
let app: ReturnType<typeof georgie>
let token: string
const deferred: Promise<unknown>[] = []
const context = { waitUntil: (work: Promise<unknown>) => void deferred.push(work), passThroughOnException() {} } as unknown as ExecutionContext
/** What the worker asked of the network: the cover's source, then the cover host. */
const network: { url: string; init?: RequestInit }[] = []

async function call(method: string, path: string, options: { token?: string; body?: unknown; secret?: string } = {}) {
  const headers: Record<string, string> = {}
  if (options.token) headers.authorization = `Bearer ${options.token}`
  if (options.secret) headers['x-sync-secret'] = options.secret
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  const response = await app.fetch(
    new Request(`https://api.example/api/v1${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) }),
    env,
    context,
  )
  return { status: response.status, json: (await response.json()) as any }
}
/** Waits for whatever was left running after the answers so far (the push to the sheet). */
const settle = async () => {
  while (deferred.length) await deferred.shift()
}
/** The sheet's "Sync now": asks until there is nothing more. */
async function syncNow() {
  for (let round = 0; round < 20; round++) {
    const { json } = await call('POST', '/sync', { secret: SECRET })
    if (json.done !== false) return json
  }
}
const sheetRow = (id: string) => sheet.tabs.Catalog!.find((row) => row[0] === id)!
const cell = (id: string, header: string) => sheetRow(id)[CATALOG.indexOf(header)]

beforeAll(async () => {
  const database = await testD1()
  dispose = database.dispose
  google = await testGoogle()
  env = {
    DB: database.binding,
    GOOGLE_CLIENT_ID: google.clientId,
    SYNC_SECRET: SECRET,
    COVERS_UPLOAD_URL: 'https://covers.example/upload-cover.php',
    COVERS_UPLOAD_SECRET: 'cover-secret',
  }
  await migrate(d1(env.DB), schema)
  sheet = memorySheets(TABS)
  app = georgie({
    verifyGoogleToken: google.verify,
    sheets: () => sheet,
    fetch: async (input, init) => {
      const url = String(input)
      network.push({ url, init })
      if (url === env.COVERS_UPLOAD_URL) return Response.json({ ok: true, url: 'https://covers.example/covers/ORW-198-1950.jpg' })
      if (url.endsWith('.jpg')) return new Response(new Uint8Array(2048), { headers: { 'content-type': 'image/jpeg' } })
      return new Response('<html>', { headers: { 'content-type': 'text/html' } })
    },
  })
})
afterAll(() => dispose?.())

describe('the first import', () => {
  it('builds the database from the existing sheet, keeping ids and giving one to a row without', async () => {
    expect((await syncNow()).done).toBe(true)
    expect(sheet.tabs.Catalog![4]![0]).toBe('CAM-PES-1947')
    expect(sheet.tabs.Validation).toBeUndefined()
  })

  it('serves the public catalog without archived books, typed from the cells as a person left them', async () => {
    const { status, json } = await call('GET', '/catalog')
    expect(status).toBe(200)
    expect(json.rows.map((book: any) => book.id)).toEqual(['CAM-PES-1947', 'ORW-198-1950', 'PRO-QUE-2007'])
    expect(json.rows[1]).toMatchObject({
      title: '1984', year: 1950, isbn: '9788804668237', language: ['Italian'], readBy: ['leandro', 'maria'],
      borrowed: true, borrowerName: 'Ada', loanDate: '2023-03-15', owner: 'leandro', archived: false,
    })
    expect(json.rows[2]).toMatchObject({ isbn: 'N/A', exchangeStatus: 'offered', readBy: null })
  })

  it('keeps the whole table, archived books included, for people who are signed in', async () => {
    expect((await call('GET', '/books')).status).toBe(401)
    token = (await call('POST', '/session', { body: { credential: await google.sign({ email: LEANDRO }) } })).json.token
    const { json } = await call('GET', '/books', { token })
    expect(json.rows).toHaveLength(4)
    expect(json.rows.find((book: any) => book.id === 'LEG-DIS-1974')).toMatchObject({ archived: true, yearPrecision: 'circa' })
  })

  it('serves the taxonomy parsed from the Zones and Lists tabs, with only the owner labels of users', async () => {
    const { json } = await call('GET', '/taxonomies')
    expect(json.taxonomies).toEqual({
      // a row with a Title starts a zone; the rows under it with only a theme belong to it
      zones: [
        {
          name: 'The Reading Room', names: { it: 'La Sala di Lettura' }, description: 'Fiction being written now', descriptions: {}, marker: '🌐',
          themes: [
            { name: 'Dystopia', names: { es: 'Distopía' }, description: 'Imagined futures', descriptions: {} },
            { name: 'Classics', names: {}, description: '', descriptions: {} },
          ],
        },
        {
          name: 'The Commons', names: {}, description: 'Power and collective life', descriptions: {}, marker: 'https://example.com/commons.png',
          themes: [{ name: 'Political Theory', names: {}, description: '', descriptions: {} }],
        },
      ],
      themeToZone: { Dystopia: 'The Reading Room', Classics: 'The Reading Room', 'Political Theory': 'The Commons' },
      // three independent lists; a marker sits on its owner's row
      owners: ['leandro', 'maria', 'hugo'],
      languages: ['English', 'Italian', 'Spanish', 'French'],
      ownerMarkers: { leandro: '🦊', hugo: '🐕' },
      users: ['leandro', 'maria'],
    })
    expect(JSON.stringify(json)).not.toContain('@')
  })
})

describe('a signed-in person', () => {
  it('is whoever the users tab names, and nobody else', async () => {
    expect((await call('GET', '/session', { token })).json.user).toMatchObject({ name: 'leandro', role: 'member' })
    const stranger = await call('POST', '/session', { body: { credential: await google.sign({ email: 'stranger@example.com' }) } })
    expect(stranger.status).toBe(403)
  })

  it('returns a loan, which reaches the sheet and the history log under their owner label', async () => {
    const saved = await call('PATCH', '/books/ORW-198-1950', { token, body: { borrowed: false, borrowerName: null, loanDate: null } })
    expect(saved.status).toBe(200)
    await settle()
    expect([cell('ORW-198-1950', 'Borrowed'), cell('ORW-198-1950', 'Borrower name'), cell('ORW-198-1950', 'Loan date')]).toEqual([false, '', ''])
    // a column the app doesn't own is left as it was
    expect(cell('ORW-198-1950', 'Zone')).toBe('stale zone')
    const { json } = await call('GET', '/history?limit=1', { token })
    expect(json.entries[0]).toMatchObject({ actor: 'leandro', action: 'update', entityId: 'ORW-198-1950', label: '1984' })
    expect(json.entries[0].changes).toBe('borrowed: true → false; borrowerName: Ada → ; loanDate: 2023-03-15 → ')
  })

  it('lends a book, whose loan date reaches the sheet as a date cell and not as text', async () => {
    const saved = await call('PATCH', '/books/PRO-QUE-2007', { token, body: { borrowed: true, borrowerName: 'Ada', loanDate: '2026-10-02' } })
    expect(saved.status).toBe(200)
    await settle()
    // the sheet's day count, which the column's own format shows as a date
    expect([cell('PRO-QUE-2007', 'Borrowed'), cell('PRO-QUE-2007', 'Borrower name'), cell('PRO-QUE-2007', 'Loan date')]).toEqual([true, 'Ada', 46297])
  })

  it('adds a book, whose id is minted once and never clashes', async () => {
    const added = await call('POST', '/books', { token, body: { title: '1984', author: 'George Orwell', year: 1950, language: ['English'], owner: 'maria' } })
    expect([added.status, added.json.row.id]).toEqual([201, 'ORW-198-1950-2'])
    await settle()
    expect(cell('ORW-198-1950-2', 'Language')).toBe('English')
    expect((await call('POST', '/books', { token, body: { author: 'Nobody' } })).status).toBe(422)
    expect((await call('POST', '/books', { token, body: { title: 'X', exchangeStatus: 'lost' } })).status).toBe(422)
  })

  it('cannot reach what is kept for admins', async () => {
    expect((await call('GET', '/users', { token })).status).toBe(403)
  })
})

describe('an edit in the sheet', () => {
  it('archives a book whose row was deleted there, so it leaves the public catalog', async () => {
    sheet.edit((tabs) => void tabs.Catalog!.splice(tabs.Catalog!.indexOf(sheetRow('PRO-QUE-2007')), 1))
    await syncNow()
    expect((await call('GET', '/catalog')).json.rows.map((book: any) => book.id)).not.toContain('PRO-QUE-2007')
    expect((await call('GET', '/books/PRO-QUE-2007', { token })).json.row.archived).toBe(true)
  })

  it('reaches the taxonomy too', async () => {
    sheet.edit((tabs) => void tabs.Zones!.push(['', '', '', 'Poetry']))
    await syncNow()
    expect((await call('GET', '/taxonomies')).json.taxonomies.themeToZone.Poetry).toBe('The Commons')
  })
})

describe('saving a cover', () => {
  it('fetches the image, hands it to the cover host with the secret, and points the book at the stored copy', async () => {
    const saved = await call('POST', '/books/ORW-198-1950/cover', { token, body: { url: 'https://covers.openlibrary.org/b/isbn/9788804668237-L.jpg' } })
    expect(saved.status).toBe(200)
    expect(saved.json.row.coverUrl).toMatch(/^https:\/\/covers\.example\/covers\/ORW-198-1950\.jpg\?v=\d+$/)
    const upload = network[1]!
    expect(upload.url).toBe(env.COVERS_UPLOAD_URL)
    expect((upload.init!.headers as Record<string, string>)['X-Upload-Secret']).toBe('cover-secret')
    expect((upload.init!.body as FormData).get('id')).toBe('ORW-198-1950')
  })

  it('takes an uploaded photo as well', async () => {
    const saved = await call('POST', '/books/ORW-198-1950/cover', { token, body: { image: btoa('x'.repeat(2000)), contentType: 'image/png' } })
    expect(saved.status).toBe(200)
  })

  it('refuses what is not an image, a book that does not exist, and anyone not signed in', async () => {
    expect((await call('POST', '/books/ORW-198-1950/cover', { token, body: { url: 'https://example.com/page' } })).status).toBe(422)
    expect((await call('POST', '/books/ORW-198-1950/cover', { token, body: {} })).status).toBe(422)
    expect((await call('POST', '/books/NOPE/cover', { token, body: { url: 'https://example.com/a.jpg' } })).status).toBe(404)
    expect((await call('POST', '/books/ORW-198-1950/cover', { body: { url: 'https://example.com/a.jpg' } })).status).toBe(401)
  })
})
