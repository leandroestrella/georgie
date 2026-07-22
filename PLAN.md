# Georgie — Home Library Manager: Implementation Plan

A web app to manage a physical home library shared by multiple logged-in users, using an existing Google Sheet as the database.

- **Repo:** https://github.com/leandroestrella/georgie *(private, currently empty — Claude Code will need push access, e.g. via `gh auth` on your machine)*
- **Data source:** a private Google Sheet, "library home" (ID kept out of this public repo — the sheet is the private data store; see the local config)

---

## 1. Data model (confirmed schema)

The **`Catalog`** tab is the source of truth. Confirmed header row (map columns by **header name**, never by position):

`ID | Title | Author | Year | Publisher | ISBN / EAN | Language | Original language | Cover URL | Theme | Zone | Owner | Reference URL | Read by | Borrowed | Borrower name | Loan date | Exchange | Archived`

| Column | Notes |
|---|---|
| ID | Call-number-style unique ID (see below); immutable, never reused |
| Title | Required. Duplicate titles are legitimate (e.g. two *albedo* exhibition catalogs by different artists) — the ID disambiguates |
| Author | Free text, sometimes multiple authors; may be an institution ("Lonely Planet", "AA. VV.") |
| Year | Integer (edition year). For no-ISBN multi-edition classics where the exact printing is unknown, holds the **first-publication** year, marked `circa` in `Year precision` |
| Year precision | Empty = exact/known edition year (default). `circa` = first-publication year filled from research, still wants a colophon check. Never contaminates `Year` itself (which must stay a clean 4-digit integer for IDs and sorting) |
| Publisher | Optional |
| ISBN / EAN | Key for web metadata lookup. Both ISBN-10 and ISBN-13 occur; the app must accept, validate, and look up both. Books with no ISBN/EAN carry the literal sentinel **`N/A`** (meaning "this printing genuinely has none"), which all ISBN-consuming code treats as absent |
| Language | Language(s) of this edition; multi-value, comma-separated; **English names** ("English, Polish"). Existing endonyms (Italiano→Italian, Español→Spanish, Français→French, Polski→Polish, Svenska→Swedish) to be normalized |
| Original language | Name of the language the work was first written in (English convention: English, Spanish, German, Russian…). Derived from the old TRUE/FALSE flag: TRUE rows inherit their own `Language`; FALSE rows (translations) get the author's working language |
| Cover URL | External image URL only, no image files stored anywhere *(under review — §3.6 cover photos would retire this rule for photographed covers)*; populated by metadata lookup (Google Books thumbnail), with a render-time fallback chain: Open Library Covers → Amazon by ISBN-10 → generated placeholder |
| Theme | The book's specific category — one of the Themes defined in the `Zones` tab |
| Zone | The Theme's parent group — derived automatically from the `Zones` tab, never chosen independently |
| Owner | `leandro`, `maria` |
| Reference URL | Optional link |
| Read by | Multi-value, comma-separated first names (e.g. `leandro, maria`) |
| Borrowed | Flag |
| Borrower name | Free text — convention: first name or nickname only (catalog is public) |
| Loan date | Date the current loan started; blank = unknown (pre-existing loans), displayed as "unknown"; auto-filled with today for new loans |
| Exchange | Flag — offered for exchange on a platform like rebelbooks; a completed exchange archives the book and its replacement is added |
| Archived | Checkbox (checked = archived) — soft delete; hidden from the public catalog, visible to admins |

### Taxonomy structure (`Zones` tab)
The `Zones` tab defines a two-level hierarchy, one row-group per Zone:
- **Title** — the Zone name (e.g. "Radical Politics, Philosophy & Society"), with a **background color** per zone
- **Description** — a short curatorial description of the zone
- **Themes** — the list of Themes belonging to that zone (e.g. "Political Theory & Utopia", "Philosophy & Existence", "Macro-History & Geopolitics"), entered as dropdown chips

Implications for the app:
- `getTaxonomies()` parses the `Zones` tab into `{ zone, description, color?, themes: [...] }`.
- The book form offers a **Theme picker grouped by Zone**; choosing a Theme writes both `Theme` and its parent `Zone` to the Catalog row. Zone is never edited directly.
- Validation: a book's `Theme` must exist in the `Zones` tab, and its `Zone` must match that Theme's parent.
- **UI opportunity:** reuse each zone's color as its accent color in the catalog (badges, filters, section headers) so the app visually mirrors the physical shelves. If cell colors prove awkward to read via Apps Script, mirror them in a small color column instead.
- The `Lists` tab holds the remaining vocabularies. Confirmed columns: **Owner options** (`leandro`, `maria`, `hugo`) and **Languages**. The Languages list is to be normalized to English names and expanded to cover originals introduced by the `Original language` column (German, Russian, Greek, Latin, Turkish, Korean, Norwegian…); **both** `Language` and `Original language` draw from this one shared list. `getTaxonomies()` reads Owner and Language options from here.

### ID scheme: call-number style (readable and meaningful)
Format: **`AAA-TTT-YYYY`** — three letters of the author's surname + three letters of the title + edition year. Examples from the actual catalog:
- *1984*, George Orwell, 1950 → `ORW-198-1950`
- *albedo*, Studio++ → `STU-ALB-<year>`; *albedo*, Yuki Ichihashi → `ICH-ALB-<year>` (the twin titles get naturally distinct IDs)

Generation rules (same logic in the backfill script and the app):
- **AAA:** first 3 letters of the first author's surname (last word of the first author; accents stripped, uppercased). Institutions just use their name ("Lonely Planet" → `PLA`). Padded with `X` if too short.
- **TTT:** first 3 characters of the title, skipping leading articles in EN/IT/ES/FR (*the, a, an, il, lo, la, i, gli, le, l', un, una, uno, el, los, las, les, le, une, des*); accents stripped, uppercased, digits allowed (`198` for *1984*).
- **YYYY:** edition year, or `0000` if unknown.
- **Collisions** (same author+title+year, e.g. two copies): append `-2`, `-3`, …
- **Immutability still rules:** the ID is generated once from these fields at creation. Later fixing a typo in title/author/year does NOT regenerate the ID — a slightly "wrong" but stable ID is better than a broken reference.

**Filling missing Years — three-bucket strategy.** Books span three cases: (1) **has ISBN** → `fillMissingYears` fetches the exact edition year automatically; (2) **no ISBN, single-edition** (art/exhibition/self-published) → year researched from the web, accurate to the copy, first-edition year used for the rare reprinted title; (3) **no ISBN, multi-edition classic** → exact printing unknowable without the physical book, so the **first-publication** year is filled and marked `circa` in `Year precision` for a later colophon check. Buckets 2–3 arrive as an `applyResearchedYears` script (a `title→{year, precision}` map) that only writes blank `Year` cells and reports what it filled vs. skipped. The app surfaces `circa` years with a "first published" hint and a "needs verification" filter. Run order: `fillMissingYears` → `applyResearchedYears` → `backfillIds` (so IDs get real years).

**Data-prep utility — fill missing Years (and Cover URLs) from ISBNs.** For rows that have an ISBN, the exact edition year and cover can be fetched automatically (Google Books, falling back to Open Library). Only empty cells are filled; nothing is overwritten. Run `fillMissingYears` *before* `backfillIds` so IDs get real years:

```javascript
function fillMissingYears() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Catalog');
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const iT = h.indexOf('Title'), iIsbn = h.indexOf('ISBN / EAN'),
        iY = h.indexOf('Year'), iC = h.indexOf('Cover URL');
  for (let r = 1; r < data.length; r++) {
    const raw = String(data[r][iIsbn]).trim();
    if (raw.toUpperCase() === 'N/A') continue;        // explicit no-ISBN sentinel
    const isbn = raw.replace(/[^0-9Xx]/g, '');
    if (!isbn || !data[r][iT]) continue;
    const needYear = !data[r][iY], needCover = iC !== -1 && !data[r][iC];
    if (!needYear && !needCover) continue;
    const info = lookupIsbn(isbn);
    if (!info) continue;
    if (needYear && info.year) sh.getRange(r + 1, iY + 1).setValue(info.year);
    if (needCover && info.cover) sh.getRange(r + 1, iC + 1).setValue(info.cover);
    Utilities.sleep(400); // be polite to the APIs
  }
}

function lookupIsbn(isbn) {
  try { // 1) Google Books — exact edition data
    const res = UrlFetchApp.fetch(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn,
      { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.totalItems > 0) {
      const v = json.items[0].volumeInfo;
      const year = v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) : null;
      const cover = v.imageLinks
        ? (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail || '') : '';
      return { year: year, cover: cover.replace('http://', 'https://') };
    }
  } catch (e) {}
  try { // 2) Open Library fallback
    const res = UrlFetchApp.fetch(
      'https://openlibrary.org/isbn/' + isbn + '.json',
      { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const b = JSON.parse(res.getContentText());
      const m = /(\d{4})/.exec(String(b.publish_date || ''));
      return { year: m ? Number(m[1]) : null,
               cover: 'https://covers.openlibrary.org/b/isbn/' + isbn + '-M.jpg' };
    }
  } catch (e) {}
  return null;
}
```

**One-time backfill** — clear the ID data cells first (they contain the old values), then run from Extensions → Apps Script:

```javascript
function backfillIds() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Catalog');
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const iId = h.indexOf('ID'), iT = h.indexOf('Title'),
        iA = h.indexOf('Author'), iY = h.indexOf('Year');
  if (iId === -1) throw new Error('Add an "ID" header first');
  const used = new Set(
    data.slice(1).map(r => String(r[iId]).trim()).filter(Boolean));
  for (let r = 1; r < data.length; r++) {
    if (data[r][iId] || !data[r][iT]) continue; // keep existing IDs, skip blank rows
    const base = makeId(data[r][iT], data[r][iA], data[r][iY]);
    let id = base, n = 2;
    while (used.has(id)) id = base + '-' + (n++);
    used.add(id);
    sh.getRange(r + 1, iId + 1).setValue(id);
  }
}

const ARTICLES = ['the','a','an','il','lo','la','i','gli','le','l',
                  'un','una','uno','el','los','las','les','une','des'];

function threeOf(text) {
  const words = String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/)
    .filter(w => w && ARTICLES.indexOf(w) === -1);
  return (words.join('').toUpperCase().slice(0, 3) || 'XXX').padEnd(3, 'X');
}

function makeId(title, author, year) {
  const firstAuthor = String(author || '').split(/[,&;]/)[0].trim();
  const surname = firstAuthor.split(/\s+/).pop();       // last word = surname
  const y = /^\d{4}$/.test(String(year).trim()) ? String(year).trim() : '0000';
  return threeOf(surname) + '-' + threeOf(title) + '-' + y;
}
```

---

## 2. Architecture

### Stack (decided — cPanel has no Node.js support)
- **Frontend:** static SPA — Vite + React + TypeScript, uploaded to the subdomain's docroot
- **UI:** Tailwind CSS + shadcn/ui components
- **Backend:** **Google Apps Script web app** bound to the spreadsheet — exposes a small JSON API (`doGet`/`doPost`) at its `/exec` URL
- **Auth:** Google Identity Services (GIS) sign-in in the SPA; the Google ID token is sent with every API call and verified server-side in Apps Script against an email allowlist
- **Sheets access:** native `SpreadsheetApp` inside Apps Script — **no GCP project, service account, or key management needed**
- **Metadata lookup:** Google Books API (primary) + Open Library API (fallback), called directly from the SPA (both are public, CORS-friendly APIs)
- **i18n:** `react-i18next` with translation JSON files — UI available in **English, Italiano, Español**, switchable via a flag/language menu; choice persisted in `localStorage`
- **Hosting:** cPanel, on the subdomain `https://georgie.leandroestrella.com/` (subdomain still to be created); the backend is hosted by Google for free
- **CI/CD:** GitHub Actions with `SamKirkland/FTP-Deploy-Action@v4.3.6` — day-to-day work happens on **`develop`**; merging/pushing to **`master`** triggers the build + FTP deploy to cPanel (same pattern as `assisted_self-portrait`)
- **License & openness:** the repo will be **public** so anyone can clone and run their own Georgie. License: **Apache 2.0** (matching `assisted_self-portrait`; standard code licenses like Apache/MIT are the right tool here rather than Creative Commons, which is designed for content, not software — CC BY can cover the docs if desired). All dependencies are permissively licensed (React, Vite, Tailwind, shadcn/ui, react-i18next: MIT) — keep it that way when adding libraries; no GPL/unlicensed deps.
- **Repo layout:** monorepo — `/web` (SPA) + `/apps-script` (backend source, synced with `clasp` so the Apps Script code lives in git too)

### Why a backend at all
The sheet must never be publicly editable, so writes can't come straight from the browser. The Apps Script web app runs **as the sheet owner** and is the only thing that touches the spreadsheet; read requests are served openly, while every write request is authenticated by verifying the caller's Google ID token against the admin allowlist before anything is modified.

### Deployment shape
- **Frontend:** two-branch flow — features and fixes are developed on `develop` (no deploys); pushing/merging to `master` triggers GitHub Actions to build `/web` and FTP-deploy `dist/` to the subdomain's docroot via `SamKirkland/FTP-Deploy-Action@v4.3.6`. FTP credentials live in GitHub repo secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`), never in code. Reference workflow (`.github/workflows/deploy.yml`):

```yaml
name: deploy to cpanel
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
      - name: deploy via ftp
        uses: SamKirkland/FTP-Deploy-Action@v4.3.6
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./web/dist/
          server-dir: ./   # adjust to the georgie subdomain docroot relative to the FTP account root
```

- **Backend:** deployed from the Apps Script editor (or `clasp deploy`) as a web app — "Execute as: me", "Who has access: anyone" (safe because every write is token-verified inside the script). The SPA is configured with the resulting `/exec` URL.
- Config lives in Apps Script **Script Properties** (allowlist, sheet ID) and a small `config.ts` in the SPA (the `/exec` URL, Google OAuth client ID — both safe to publish; the OAuth client ID is public by design). No secrets in the repo.
- **Template-friendly:** since the repo is public, the README documents how anyone can run their own instance — copy a template of the Google Sheet, create the bound Apps Script, set their own Script Properties, OAuth client ID, and `/exec` URL. Keep all personal values in config, never hardcoded.

### Sheets access pattern
1. Create a **bound Apps Script** on the spreadsheet (Extensions → Apps Script) and manage its source in the repo with `clasp`.
2. Implement a JSON API: `doGet` for reads (`?action=books`, `?action=taxonomies`), `doPost` for writes (`addBook`, `updateBook`, `deleteBook`, `setLoan`), all keyed by book ID.
3. Read handlers are public; every **write** handler first verifies the `Authorization` ID token (via Google's `tokeninfo` endpoint, checking audience = the app's OAuth client ID) and matches the email against the admin allowlist in Script Properties.
4. In the SPA, a thin typed client mirrors the same functions: `getBooks()`, `getBook(id)`, `addBook()`, `updateBook(id, patch)`, `deleteBook(id)`, `getTaxonomies()`.

### Quotas & caching
Apps Script inside the sheet has no Sheets-API rate limits to worry about, and web-app execution quotas (~20k requests/day) are far beyond home-library scale. Still:
- Reads return the whole catalog in one response; the SPA caches it in memory and updates optimistically after writes.
- Apps Script cold starts add ~1–2s latency per call — the SPA should show loading states and avoid chatty request patterns (batch writes where natural).
- Last-write-wins is acceptable at this scale; optionally re-check the book's current values by ID before writing to detect conflicts (including manual edits made directly in the sheet).

### Auth model: public read, admin write
- **Reading is public:** anyone can browse the catalog at the subdomain with no login; the Apps Script `doGet` read endpoints require no token.
- **Writing is admin-only:** edit/add/delete/loan actions require Google sign-in (via Google Identity Services; needs one OAuth client ID from a minimal GCP console setup — no keys or secrets). The SPA attaches the ID token to every write call; Apps Script verifies it and checks the email against the admin allowlist (Script Properties or a `Users` tab) — initially maria and leandro.
- Map each admin email → owner label (`leandro`, `maria`, …) in the same `Users` tab.
- The UI hides all edit controls unless signed in as an admin (cosmetic only — the real enforcement is server-side in Apps Script).
- **Privacy (resolved):** all fields are public; the convention is to record borrowers by **first name or nickname only**, never full names. Worth noting in the loan form's placeholder/help text so the convention sticks.

---

## 3. Features

### 3.1 Catalog browsing (public, no login)
- Table/card view of all books; instant client-side search (title/author).
- Filters: Zone, Theme, Owner, Language, Read by, Borrowed, Exchange.
- Sort by title/author/year.
- Book detail view with all fields + Reference URL link + cover image (from `Cover URL`, falling back to Open Library Covers by ISBN, then a generated placeholder).
- Language switcher (flag menu) — full UI in English, Italiano, Español.

### 3.2 Add / edit / remove books (admin-only)
- Form with validation (Title required; Year numeric; ISBN optional but validated — **both ISBN-10 and ISBN-13 accepted**, checksum-verified).
- Theme picker grouped by Zone (from the `Zones` tab; Zone derived automatically); Language and Owner as dropdowns from the `Lists` tab.
- Delete = **archive** (decided): sets the `Archived` flag. Archived books disappear from the public catalog entirely (the public read endpoint filters them out server-side) but remain visible to signed-in admins in an "Archived" view, with an unarchive/restore action. No data is ever destroyed from the app.

### 3.3 Web metadata lookup ("grab book details from the web")
- On the Add form: enter an ISBN → fetch metadata → prefill Title, Author, Year, Publisher, Language, cover image URL.
- Sources, tried in order:
  1. **Google Books API** — `https://www.googleapis.com/books/v1/volumes?q=isbn:...` (no key needed for low volume)
  2. **Open Library** — `https://openlibrary.org/isbn/{isbn}.json` (good coverage for older/European editions)
- Also support search by title+author when there's no ISBN, showing a pick-list of candidate matches.
- **Barcode scanning (done):** the back-cover barcode is a Bookland EAN-13, which *is* the ISBN-13. Native `BarcodeDetector` on Chrome/Android; zxing-wasm lazy-loaded only on Safari/iOS, with its WASM self-hosted rather than pulled from a CDN at scan time. Non-Bookland barcodes are rejected so a stray scan can't write a bogus ISBN. Requires a **secure origin** — it cannot be tested from a phone against a plain-http dev server.
- **Cover reality (measured):** Google Books and Open Library both miss many Italian/European editions outright. The render-time cover chain therefore ends at Amazon-by-ISBN-10, which resolves ~75% of the catalog's otherwise-coverless books — see §3.6.

### 3.4 Loans (admin-only actions)
- Toggle "Borrowed" on a book + set Borrower name (first name/nickname) + `Loan date` (auto-filled with today, editable). Pre-existing loans with unknown dates stay blank and display as "unknown".
- A "Loaned out" view listing everything currently borrowed, grouped by borrower.
- Return action clears the flag/name.
- **Stretch:** a `Loans` history tab in the sheet (book ID, borrower, out date, return date) for a full audit trail.

### 3.5 Categories
- Two-level taxonomy from the `Zones` tab: **Zones** (groups, each with a description and color) contain **Themes** (the specific categories books are assigned to).
- Users pick a Theme (grouped by Zone in the picker); the app writes the Theme and derives its parent Zone automatically, validating both against the `Zones` tab.
- Zone colors and descriptions surface in the UI (badges, filter chips, zone headers).
- The vocabulary is managed by editing the `Zones` tab directly — the app re-reads it, no hardcoding.

### 3.6 Cover photos (planned)

Photograph a book's cover with the phone and attach it to its catalog entry — the last gap for books no online source has a cover for: the no-ISBN art/exhibition catalogs, the self-published items, and the Italian editions even Amazon misses.

**This deliberately breaks a standing invariant.** §1 says Cover URL is *"external image URL only, no image files stored anywhere"*. A photo is a binary that must live somewhere, so adopting this means consciously retiring that rule for photographed covers. Everything else (metadata covers, the Open Library/Amazon fallbacks) stays URL-only.

**Capture is the easy part.** `<input type="file" accept="image/*" capture="environment">` opens the native camera on iOS and Android — no JS decoder, no `getUserMedia`, and none of the scanner's secure-origin friction. The work is storage.

**Open decision — where do the images live?** Options, roughly in order of fit:
1. **Google Drive via Apps Script.** The backend already runs as the sheet owner, so it can write the file to a "georgie covers" folder, share it link-visible, and return a URL for `Cover URL`. No new infrastructure, no new service, no secret. Costs: a new Drive OAuth scope (so admins must re-authorize — and the `script.external_request` episode showed that can need a permissions revoke to take), images count against the owner's Drive quota, and **Google has repeatedly degraded Drive image hotlinking** (`uc?export=view`), so the URLs may not stay stable. Worth a spike before committing.
2. **The cPanel host.** Covers would sit beside the SPA on the subdomain — fast and stable to serve. But deployment is FTP-from-CI, so there's no runtime upload path; cPanel has no Node, which makes adding one awkward.
3. **A dedicated image host** (Cloudinary / imgbb / S3). The most reliable serving, at the cost of an account and an API key — i.e. a **secret**, which this architecture has so far entirely avoided. Would need proxying through Apps Script to keep the key server-side.

**Regardless of host, downscale on the client before upload** (canvas → ~800px JPEG). Phone photos are 3–12 MB, base64 inflates them ~33%, and Apps Script POST size and execution time both have limits — un-resized uploads are the obvious failure mode.

**Also to decide:** whether a photo simply *becomes* the `Cover URL` (simplest, no schema change, and it naturally takes precedence since the stored URL is first in the fallback chain) or is tracked in its own column.

---

## 4. Implementation phases (for Claude Code)

**Phase 0 — Setup**
- Clone the (empty, private-for-now, public-later) repo; scaffold `/web` (Vite + React + TypeScript + Tailwind + shadcn/ui) and `/apps-script` (clasp project bound to the sheet).
- `LICENSE` (Apache 2.0); create `develop` and `master` branches; add the deploy workflow (`SamKirkland/FTP-Deploy-Action@v4.3.6`, triggered on push to `master` only — see "Deployment shape").
- README modeled on [`assisted_self-portrait`](https://github.com/leandroestrella/assisted_self-portrait): lowercase headings, a mermaid "how it works?" flowchart, features, tech stack (with links), setup, license — plus a "run your own instance" guide (sheet template, Apps Script setup, OAuth client ID, config).
- Write a `CLAUDE.md` with project conventions. Code quality bar: readable, well-documented (JSDoc on the data layer and API handlers, comments explaining the *why*), written for strangers cloning the repo.

**Phase 1 — Data layer**
- Apps Script JSON API (`doGet`/`doPost`); typed `Book` model shared with the SPA; header-name-based column mapping.
- ID backfill (Apps Script above, or a repo script) + the same `makeId` call-number logic (with collision suffixes) in the app for new books.
- `getBooks`, CRUD functions, `getTaxonomies` reading the `Zones`/`Lists` tabs; a matching typed API client in the SPA.
- Unit tests for the SPA client (mocked fetch) and for pure Apps Script logic (mapping/ID functions kept framework-free so they're testable).

**Phase 2 — Auth**
- Public read access (no login wall); GIS admin sign-in; ID-token verification + admin allowlist on all write handlers in Apps Script; email→owner mapping; hide edit controls for anonymous visitors; error handling for expired tokens.

**Phase 3 — Read UI**
- Catalog page with search/filters/sort; book detail page with covers; responsive (mobile-first — you'll use it standing at the shelf).
- i18n scaffolding (`react-i18next`), EN/IT/ES translation files, flag/language switcher, persisted choice.

**Phase 4 — Write UI**
- Add/edit forms with taxonomy dropdowns and validation; archive with confirmation; admin "Archived" view with restore.
- Admin "needs attention" filter (missing year, `Year precision = circa`, missing cover, unresolved original language) — the tool for finishing the catalog from the app; see §6.

**Phase 5 — Metadata lookup** *(done)*
- ISBN lookup in the SPA (Google Books → Open Library fallback); prefill flow; title/author search with candidate picker.
- Barcode scanner (was a stretch item, built): camera → EAN-13 → ISBN → lookup.
- Amazon-by-ISBN-10 added to the render-time cover chain, after Google Books and Open Library proved to miss much of the catalog.

**Phase 6 — Loans**
- Borrow/return actions *(done in Phase 4)*; "Loaned out" view grouped by borrower.

**Phase 6.5 — Cover photos** (see §3.6)
- Photograph a cover with the phone and attach it to the book — for the covers no online source has.
- **Blocked on a decision:** where images are stored (Drive via Apps Script / cPanel / image host). Each has a real cost; Drive is the natural fit but its hotlinking has proven unreliable, so spike it before committing.
- Capture via `<input capture="environment">`; downscale client-side (~800px JPEG) before upload; admin-gated write; the returned URL goes in `Cover URL`, which already wins the cover fallback chain.
- Retires the "no image files stored anywhere" rule in §1 for photographed covers — record it in the decisions log when chosen.

**Phase 7 — Polish & deploy**
- Deploy: create the `georgie` subdomain in cPanel, add the FTP secrets to the repo, merge `develop` → `master` to trigger the first deploy; deploy the Apps Script web app and set its `/exec` URL in the SPA config; error states, loading skeletons, empty states.
- Verify the **barcode scanner on a real phone** — it needs a secure origin, so the deployed site is the first place it can be properly tested.
- Make the repo public (final check: no secrets, README complete).
- Stretch items: "complete exchange" flow (one action that archives the outgoing book, marking it exchanged, and opens the add form for the incoming one), loan history tab, CSV export, stats dashboard (books per category/language).

Each phase should end with a working state, committed to `develop`; merges to `master` happen when a feature/fix is ready to go live (and auto-deploy).

---

## 5. Decisions log

1. **Repo:** `leandroestrella/georgie` — currently private and empty; will be made **public** at launch (end of Phase 7). Confirm Claude Code has authenticated push access.
2. **Access model (decided):** the catalog at `https://georgie.leandroestrella.com/` is **publicly readable** with no login; a specific set of admins (initially maria and leandro) sign in to make edits. All fields are public — borrowers are recorded by first name or nickname only, so no masking is needed.
3. **Delete (decided):** archive — `Archived` flag removes the book from the public catalog; admins see an Archived view with restore.
4. **New columns (done / planned):** `ID` (call-number style `AAA-TTT-YYYY`), `Read by` (migrated), `Loan date` (blank = unknown), `Cover URL` (external URL only), `Archived` (checkbox) — all present. Plus `Year precision` (`circa` marks first-pub years needing a colophon check) — added by the research script. Header row confirmed in §1.
5. **Hosting & deploy (decided):** static SPA on the cPanel subdomain + Apps Script backend (no Node.js support on the host); `SamKirkland/FTP-Deploy-Action@v4.3.6` deploys on push to `master`, with `develop` as the working branch. Remaining tasks: create the `georgie` subdomain in cPanel; add FTP secrets to the repo.
6. **UI languages (decided):** English, Italiano, Español with a flag/language switcher.
7. **Source of truth (decided):** the `Catalog` tab; `library_master_catalog` has been deleted.
8. **Open source (decided):** public repo, Apache 2.0, permissive dependencies only, README modeled on `assisted_self-portrait`, template-friendly setup docs so anyone can run their own instance.
9. **Physical labelling (decided): no.** The call-number IDs stay internal — identifiers and URLs, never written on spine labels. This is what makes the `-0000` IDs a cosmetic issue rather than a permanent one: nothing physical or external references them, so they can be re-minted at any time if it ever matters.
10. **`-0000` IDs (decided): accept, don't block launch.** `backfillIds` already ran before the years were complete, so **47 of the real sheet's 357 books** carry `-0000` IDs. Measured on the real sheet: **44 books still lack a Year, and only 6 of those have an ISBN at all** — Open Library resolves none of the 6 — so **~38 require physically opening the book**. Automation cannot close this gap. Rather than delay go-live on an afternoon of colophon work, we ship with `-0000` and fill the years afterwards from the shelf using the admin "needs attention" filter (§6) — exactly what that filter was built for. Per this plan's own rule, "a slightly *wrong* but stable ID is better than a broken reference". Re-minting stays available because of decision 9.
11. **Cover sources (decided):** the render-time chain is stored `Cover URL` → Open Library → **Amazon by ISBN-10** → placeholder. Added after measuring that Google Books and Open Library miss much of this catalog: Amazon resolves ~75% of the otherwise-coverless books. Accepted knowingly: the Amazon URL pattern is undocumented and outside their terms, so it may break — it degrades to placeholders if it does. `isbnsearch.org` (which prompted this) has no API and is reCAPTCHA-gated; its covers are Amazon's, via its Associates membership.

---

## 6. Pre-launch checklist (deferred data work)

Catalog completion is **deferred until just before go-live** — the build starts now against the sheet as it stands. Nothing here blocks development; all of it must be done before the catalog is public.

**Develop against a copy, not the live sheet.** Make a duplicate of the spreadsheet (File → Make a copy) and point the dev `config.ts` / Script Properties at it. The app can then be tested destructively (adds, edits, archives, loans) while the real catalog stays untouched and leandro keeps editing it by hand. Switch config to the real sheet at launch.

**⚠️ ID timing dependency — what actually happened.** IDs embed the year (`ORW-198-1950`). The warning here was that running `backfillIds` before the years were complete would bake `-0000` into every year-less book. **It ran early, and that is now the state of the sheet: 47 books carry `-0000` IDs.** It is not recoverable by script — measured, only 6 of the 49 missing years have an ISBN (and Open Library resolves none), so 43 need the physical book. Resolution: accepted, and it does not block launch — see decisions 9–10. Because the IDs are never physically labelled, re-minting remains possible later if it ever matters; the years themselves get filled from the shelf via the "needs attention" filter.

**Go-live sequence — most of it is already done.** Verified against the **real sheet (357 books)**:
1. ~~`normalizeLanguages`~~ — ✅ no endonyms remain.
2. ~~`stampMissingIsbn`~~ — ✅ 0 blank ISBN cells.
3. ~~`fillOriginalLanguage`~~ — ✅ 0 blanks.
4. ~~`backfillIds`~~ — ✅ ran (early; see above). 0 books lack an ID, **0 duplicate IDs**, 0 books without a Theme — i.e. the two keys the app depends on (ID as row key, Theme→Zone derivation) are sound.
5. `Year` completion — ⬜ 44 outstanding, **deferred until after launch** (only 6 have an ISBN; the rest need the physical book).
6. Remaining, and the real work of Phase 7: point the app at the real sheet, deploy, verify the scanner on a phone, make the repo public.

**Cover reality on the real sheet: 269 of 357 books (75%) have no stored `Cover URL`** and depend entirely on the render-time fallback chain (§3.6, decision 11). This is why the Amazon source matters more than it first appeared — and why §3.6 (photograph a cover) is the natural follow-up for the remainder.

**⚠️ Reading the sheet with a script:** the gviz CSV export honours the tab's **active filter**. A filtered view exports as a near-empty sheet — which once looked exactly like catastrophic data loss. Clear filters before trusting an export, and never conclude "data lost" from a CSV read alone.

**Historical note — the original sequence** (kept for anyone cloning this into a fresh sheet, where the ordering still matters):
1. Finish the missing data — mostly `Year` (colophon pass for the no-ISBN classics), plus anything the research left blank.
2. `normalizeLanguages` — endonyms → English names.
3. `fillMissingYears` — exact years + covers for ISBN rows.
4. `applyResearchedYears` — first-pub years, marks `circa` in `Year precision`.
5. `fillOriginalLanguage` — TRUE inherits own language; FALSE → author's original. Review the "unresolved" log.
6. `stampMissingIsbn` — `N/A` into blank ISBN cells (after 3–4, which need real blanks).
7. **`backfillIds`** — call-number IDs, now with real years.
8. Point the app's config at the real sheet; verify a read; make the repo public.

**Nice-to-have that makes this easier:** build the admin UI so it surfaces incomplete records — a "needs attention" filter (missing year, `Year precision = circa`, no cover) turns the remaining cleanup into a comfortable task done from the app itself, at the shelf, instead of in the spreadsheet. Worth prioritizing in Phase 4 rather than treating as polish: it's the tool that finishes the catalog.

## 7. Risks & mitigations

- **Row drift in Sheets** → stable call-number-style `ID` column + header-based mapping (Phase 1, non-negotiable).
- **API quota / latency** → whole-catalog reads + SPA-side caching; loading states to absorb Apps Script cold starts (~1–2s).
- **Concurrent edits** (two users, or app + manual sheet edits) → last-write-wins with pre-write ID re-check; keep the sheet as the canonical store so manual edits remain safe.
- **`N/A` ISBN sentinel** → the string `N/A` in the ISBN/EAN column means "no ISBN exists". Every ISBN-consuming path treats it as absent: the metadata "grab from web" lookup, the Open Library cover fallback, and validation (which must accept `N/A` as valid-and-empty rather than flagging it as a malformed ISBN). A one-time normalization step writes `N/A` into all currently-blank ISBN cells.
- **Metadata gaps** for older/small-press European editions → dual-source lookup + always-editable prefilled fields.
- **Backend exposure** → reads are public by design; every write handler verifies the Google ID token + admin allowlist before touching the sheet; the sheet itself stays private (never "anyone with link can edit"). Borrowers are recorded by first name/nickname only, so public read responses need no field masking.
