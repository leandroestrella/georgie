# Georgie's backend

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) with a D1
(SQLite) database, built on [pomuku](https://github.com/leandroestrella/pomuku)'s
server package. The app reads and writes only this database, so it answers in a
fraction of a second; the library spreadsheet stays a complete, editable copy,
kept in sync in both directions.

It replaces the Apps Script web app in [`../apps-script`](../apps-script), which
read the sheet on every request and took seconds to answer. While both exist,
`npm run compare` checks that they give the same answers.

```
src/schema.ts     the data model: the Catalog tab as a table, Users as the allowlist, Zones and Lists kept whole
src/taxonomy.ts   zones, themes, owners and languages, parsed from the Zones and Lists tabs
src/worker.ts     the app: pomuku's routes plus Georgie's own
migrations/       the database's tables, generated from the schema
scripts/          compare.mjs: both backends side by side
```

## What it answers

Everything is under `/api/v1`, as JSON shaped `{ ok: true, … }` or
`{ ok: false, error }`, with real HTTP status codes.

| Route | Who | What |
| --- | --- | --- |
| `GET /health` | anyone | name and version; doesn't touch the database |
| `GET /catalog` | anyone | the books on the shelves (archived ones left out) |
| `GET /taxonomies` | anyone | zones, themes, owners, languages, markers, and the owner labels of users |
| `POST /session` | anyone | trades a Google ID token for a session token |
| `GET /books`, `GET /books/:id` | signed in | every book, archived ones included |
| `POST /books` | signed in | adds a book; its call-number ID is minted here, once |
| `PATCH /books/:id` | signed in | changes the fields sent: an edit, a loan, a return, an exchange stage, archive, restore |
| `POST /books/:id/cover` | signed in | stores a cover on the cover host (`{ url }` or `{ image, contentType }`) |
| `GET /history` | signed in | the log of every write, newest first |
| `POST /sync/visit` | anyone | looks at the sheet if the last look is a few minutes old |
| `POST /sync` | the sync secret | the sheet's "Sync now" |

A book comes back with its fields plus `id`, `rev` and `updatedAt`; an empty
field is `null`. A book's zone isn't stored: it is derived from its theme through
the taxonomy's `themeToZone`. The rest (users, access tokens, the sync's rules)
is described in pomuku's server readme.

Signed in means on the `Users` tab. Only the `Owner` label of a user is ever sent
to a browser, never the email.

## Deploy your own

You need a Cloudflare account (the free plan is enough) and Node 22.

```bash
cd server && npm install
cp wrangler.jsonc wrangler.local.jsonc      # your instance's settings; gitignored
npx wrangler login
npx wrangler d1 create georgie              # prints a database_id
```

Fill in `wrangler.local.jsonc`:

| Setting | Value |
| --- | --- |
| `database_id` | from `d1 create` |
| `GOOGLE_CLIENT_ID` | the Google OAuth client ID the SPA signs in with |
| `ALLOWED_ORIGINS` | the SPA's origins, comma-separated (e.g. `https://books.example.com,http://localhost:5173`) |
| `ADMIN_EMAILS` | your own email: an admin even with an empty `Users` tab |
| `SHEET_ID` | the spreadsheet's ID, from its address |
| `COVERS_UPLOAD_URL` | *(optional)* the cover host's endpoint — see [cover hosting](../cpanel/README.md) |

Then:

```bash
npm run migrate     # creates the database's tables
npm run deploy      # prints the worker's address
```

### Connecting the sheet

1. **A service account.** In Google Cloud, a project with the **Google Sheets
   API** and the **Google Drive API** enabled (Drive is only asked when the sheet
   last changed), and a service account with a JSON key.
2. **Share the spreadsheet** with the service account's email, as an **editor**.
3. **The worker's secrets:**

   ```bash
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT -c wrangler.local.jsonc   # paste the key file's whole JSON
   npx wrangler secret put SYNC_SECRET -c wrangler.local.jsonc              # a long random text
   npx wrangler secret put COVERS_UPLOAD_SECRET -c wrangler.local.jsonc     # only if you host covers
   ```

4. **The `Users` tab** needs two more columns next to `Email` and `Owner`:
   `Language` and `Role`. Both can stay empty; `Role` takes `admin` for someone
   who may manage users and access tokens.
5. **The sheet's script.** In the spreadsheet, Extensions → Apps Script: add
   pomuku's `sheet-script/Code.js` (in `node_modules/@lndrstrll/pomuku-server/`),
   and set two script properties: `SYNC_URL`
   (`https://<the worker's address>/api/v1/sync`) and `SYNC_SECRET` (the same
   text as the worker's). Reload the sheet: a **Sync** menu appears.
6. **Sync → Sync now.** With an existing sheet this is the first import: every
   row of `Catalog` and `Users` goes into the database, a hundred per request,
   and a book without an `ID` gets one, written back to the sheet.

From then on a save in the app reaches the sheet a few seconds later, and an edit
in the sheet reaches the app on the next "Sync now" or when someone next opens
the app. A value the app can't take (a `Year` that isn't a number, an unknown
`Exchange status`) is listed on a `Validation` tab until it's fixed. Deleting a
book's row in the sheet archives the book.

The `Zone` column of the `Catalog` tab is no longer written: the zone is derived
from the theme. Keep the column as a formula of your own, or remove it.

## What it costs on the free plan

Cloudflare's free plan allows 10 ms of CPU per request, and D1 caps the rows
read (5 million) and written (100,000) per day. Measured on the deployed Worker
from Cloudflare's own logs, with a catalog of 380 books (`npm run measure`):

| Request | CPU | Rows read | Rows written |
| --- | --- | --- | --- |
| `GET /catalog` (237 KB) | 6–8 ms | 380 | 0 |
| `GET /taxonomies` | 2–4 ms | 4 | 0 |
| a save, with the push to the sheet that follows it | 9 ms, 12 at most | about 10 | about 6 |
| a visit, the last look at the sheet recent | 0 ms | 0 | 0 |
| a pull of the `Catalog` tab, nothing changed | 20–23 ms | 764 | 1 |
| the first import, 100 books per request | 18–38 ms | up to 603 | about 500 |

A pull of the whole `Catalog` tab takes about twice the CPU the plan allows.
Cloudflare let every one of them finish (it tolerates occasional overruns), and a
pull only runs when the sheet has changed — after "Sync now", or on a visit once
the last look is five minutes old. A library several times this size, or a sheet
edited all day, should expect to need the paid plan.

## Commands

```bash
npm run dev          # the worker on localhost:8787, with a local database (run `npm run migrate:local` first)
npm test             # the whole backend on a local D1, against a spreadsheet kept in memory
npm run typecheck
npm run migrations   # after changing src/schema.ts: writes the next migration file
npm run migrate      # applies migrations to the deployed database
npm run deploy
npm run compare      # both backends side by side; see scripts/compare.mjs
npm run measure      # CPU time and rows per request, from the deployed worker's logs; see scripts/measure.mjs
```
