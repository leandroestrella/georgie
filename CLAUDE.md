# CLAUDE.md

Guidance for working in this repo. The full product/architecture design lives in
[PLAN.md](PLAN.md) — read it before making non-trivial changes.

## What this is

Georgie is a home-library manager. A static React SPA (`web/`) reads and displays
a catalog stored in a Google Sheet. Writes go through a Google Apps Script web app
(`apps-script/`) that runs as the sheet owner and is the only thing that touches the
spreadsheet. Reads are public; writes are gated by Google ID-token verification against
an admin allowlist.

## Repo layout

```
web/          Vite + React + TypeScript + Tailwind v4 + shadcn/ui SPA
apps-script/  Google Apps Script backend (JSON API), synced with clasp
assets/       brand art (used by the README)
PLAN.md       the design source of truth
```

## Non-negotiable conventions

- **Column access by HEADER NAME, never by position.** The sheet is edited by hand;
  columns get reordered/inserted. All mapping code resolves columns via the header row
  (`headers.indexOf('Title')`), never by a hardcoded index. This is the core mitigation
  for row/column drift.
- **IDs are immutable.** The call-number ID (`AAA-TTT-YYYY`, e.g. `ORW-198-1950`) is
  generated once at creation and never regenerated — even to fix a later typo in
  title/author/year. Same `makeId` logic is shared by the backfill script and the app.
- **`N/A` is the no-ISBN sentinel.** Every ISBN-consuming path (metadata lookup, cover
  fallback, validation) treats the literal string `N/A` as "absent", not malformed.
- **No secrets in the repo.** The Apps Script `/exec` URL and the Google OAuth client ID
  are public by design and live in `VITE_*` env vars / `web/src/config.ts`. Admin
  allowlist and sheet ID live in Apps Script Script Properties. `.clasp.json` and
  `.env.local` are gitignored.
- **Permissive dependencies only** (MIT/Apache). No GPL/unlicensed deps — the repo is
  (or will be) public and Apache-2.0 licensed.
- **Written for strangers.** The repo is a public template. JSDoc the data layer and API
  handlers; comment the *why*, not the *what*.

## Working style

- Day-to-day work happens on `develop`. Merging/pushing to `master` triggers the GitHub
  Actions build + FTP deploy to cPanel — so `master` merges are deliberate, not casual.
- Keep pure logic (column mapping, `makeId`, taxonomy parsing) framework-free so it is
  unit-testable without a live sheet.
- The SPA runs on **mock fixtures** until the backend is wired (`hasBackend` in
  `web/src/config.ts`), so the UI can be developed before/without the deployed API.

## Commands

```bash
# SPA
cd web && npm install
npm run dev        # local dev server
npm run build      # typecheck + production build → dist/
npm run lint       # oxlint

# backend (Apps Script)
cd apps-script && npm install
npm run login      # clasp login (interactive, one-time)
npm run push       # push local source to the bound Apps Script project
npm run test       # node --test on pure logic
```
