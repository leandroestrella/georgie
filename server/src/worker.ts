/**
 * Georgie's backend: a Cloudflare Worker serving a JSON API under `/api/v1`,
 * with a D1 database in the middle and the library spreadsheet kept in sync
 * both ways. Sign-in, the allowlist, the history log, the REST routes of the
 * `books` table and the sheet sync all come from pomuku; this file adds only
 * what is Georgie's own:
 *
 *   GET  /catalog          public — the books on the shelves (archived ones left out)
 *   GET  /taxonomies       public — zones, themes, owners, languages, markers
 *   POST /books/:id/cover  signed in — stores a cover on the cover host
 *
 * Reads are public; every write needs a signed-in person from the `Users` tab.
 */
import { ApiError, createApp, type AppOptions, type Env } from '@lndrstrll/pomuku-server'
import { schema } from './schema.js'
import { parseLists, parseZones, type Taxonomies } from './taxonomy.js'

export interface GeorgieEnv extends Env {
  /** The cover host's upload endpoint (cpanel/upload-cover.php). */
  COVERS_UPLOAD_URL?: string
  /** Secret shared with the cover host. */
  COVERS_UPLOAD_SECRET?: string
}

/** The largest cover accepted, matching the cover host's own limit. */
const MAX_COVER_BYTES = 10 * 1024 * 1024

/** The app, with the parts a test replaces (the clock, Google, the sheet, the network) left open. */
export function georgie(overrides: Partial<AppOptions<typeof schema, GeorgieEnv>> & { fetch?: typeof fetch } = {}) {
  const { fetch: request = (input, init) => fetch(input, init), ...options } = overrides
  return createApp<typeof schema, GeorgieEnv>({
    name: 'georgie',
    version: '1.0.0',
    schema,
    routes: (api, { store, tab, allow }) => {
      api.get('/catalog', async (c) => {
        const rows = await store(c, 'books').list()
        return c.json({ ok: true, rows: rows.filter((book) => !book.archived) })
      })

      api.get('/taxonomies', async (c) => {
        // Only the owner label of a user is ever sent out, never the email.
        const people = await c.var.db.query<{ name: string | null }>('SELECT name FROM users ORDER BY id')
        const users = [...new Set(people.rows.map((user) => user.name ?? '').filter(Boolean))]
        const taxonomies: Taxonomies = { ...parseZones(await tab(c, 'zones')), ...parseLists(await tab(c, 'lists')), users }
        return c.json({ ok: true, taxonomies })
      })

      /**
       * Snapshots a cover to the cover host and points the book's `Cover URL`
       * at the stored copy, so the cover no longer depends on a live external
       * source. The image is either fetched from a URL (`url` — the cover
       * currently shown) or supplied as base64 bytes (`image` — a photo of the
       * physical cover).
       */
      api.post('/books/:id/cover', async (c) => {
        allow(c, 'member', 'write')
        const endpoint = c.env.COVERS_UPLOAD_URL
        const secret = c.env.COVERS_UPLOAD_SECRET
        if (!endpoint || !secret) throw new ApiError(503, 'the cover host is not configured (COVERS_UPLOAD_URL / COVERS_UPLOAD_SECRET)')
        const id = c.req.param('id')
        const books = store(c, 'books')
        if (!(await books.get(id))) throw new ApiError(404, `no books row with id ${id}`)

        let body: { url?: unknown; image?: unknown; contentType?: unknown }
        try {
          body = await c.req.json()
        } catch {
          throw new ApiError(400, 'the request body must be json')
        }
        let image: Blob
        if (typeof body.image === 'string' && body.image) {
          let bytes: Uint8Array<ArrayBuffer>
          try {
            bytes = Uint8Array.from(atob(body.image), (char) => char.charCodeAt(0))
          } catch {
            throw new ApiError(422, 'image must be base64')
          }
          image = new Blob([bytes], { type: typeof body.contentType === 'string' ? body.contentType : 'image/jpeg' })
        } else if (typeof body.url === 'string' && /^https?:\/\//.test(body.url)) {
          const fetched = await request(body.url, { redirect: 'follow' }).catch(() => null)
          if (!fetched?.ok) throw new ApiError(502, `could not fetch the cover (HTTP ${fetched?.status ?? 'none'})`)
          image = await fetched.blob()
          if (!image.type.startsWith('image/')) throw new ApiError(422, `that URL is not an image (${image.type || 'unknown type'})`)
          if (image.size < 1024) throw new ApiError(422, 'the cover image looks empty')
        } else {
          throw new ApiError(422, 'provide a cover url or an uploaded image')
        }
        if (image.size > MAX_COVER_BYTES) throw new ApiError(422, 'the cover image is larger than 10 MB')

        const form = new FormData()
        form.set('id', id)
        form.set('file', image, id)
        const uploaded = await request(endpoint, { method: 'POST', headers: { 'X-Upload-Secret': secret }, body: form }).catch(() => null)
        const answer = (await uploaded?.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null
        if (!uploaded?.ok || !answer?.ok || !answer.url) {
          throw new ApiError(502, `the cover host refused the upload (HTTP ${uploaded?.status ?? 'none'}): ${answer?.error ?? 'unknown'}`)
        }
        // Cache-buster, so saving a new cover under the same ID shows at once.
        const coverUrl = `${answer.url}${answer.url.includes('?') ? '&' : '?'}v=${Date.now()}`
        return c.json({ ok: true, row: await books.update(id, { coverUrl }) })
      })
    },
    ...options,
  })
}

export default georgie()
