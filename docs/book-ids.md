# Book IDs — how they're generated (and re-generated)

Every book has a **call-number ID** in the `ID` column of the catalog sheet, e.g.
`ORW-198-1950` or `PRO-QUE-2007`. This is the book's permanent handle: it's what
the app puts in the URL (`/book/PRO-QUE-2007`), what every edit/loan/delete call
is keyed by, and the one value that must stay stable even when the sheet's rows
and columns get shuffled around by hand.

This page explains the format, how new books get an ID automatically, and the
(rare) manual procedure to re-mint one.

---

## The format: `AAA-TTT-YYYY`

| Part   | Meaning                    | How it's derived                                                     |
| ------ | -------------------------- | ------------------------------------------------------------------- |
| `AAA`  | author surname token       | first author's **surname**, reduced to 3 letters                    |
| `TTT`  | title token                | title with leading articles removed, reduced to 3 letters           |
| `YYYY` | edition year               | the 4-digit `Year`; unknown/blank year → `0000`                     |

A trailing `-2`, `-3`, … is appended only when a freshly built ID would collide
with one that already exists.

### How the 3-letter tokens are built (`threeOf`)

For both the surname and the title:

1. lower-case it;
2. strip accents (`Öñü` → `onu`) and punctuation;
3. drop leading **articles** — `the a an il lo la i gli le l un una uno el los las les une des`;
4. join the remaining words and take the **first 3 letters**, upper-cased;
5. if fewer than 3 letters remain, pad with `X` (empty → `XXX`).

**Author** uses only the **first** author (split on `,`, `&`, `;`) and only that
author's **last word** as the surname.

### Worked examples

| Title                     | Author                  | Year   | ID             |
| ------------------------- | ----------------------- | ------ | -------------- |
| *1984*                    | George Orwell           | 1950   | `ORW-198-1950` |
| *¿Qué es la propiedad?*   | Pierre-Joseph Proudhon  | 2007   | `PRO-QUE-2007` |
| *The Left Hand of Darkness* | Ursula K. Le Guin     | 1969   | `GUI-LEF-1969` |
| *Il nome della rosa*      | Umberto Eco             | (blank)| `ECO-NOM-0000` |

Note `The`/`Il` are dropped from the title token, and `Le Guin` → surname `Guin`.

> The exact rules live in one place, mirrored byte-for-byte in two files so the
> app's preview always matches what the backend assigns:
> [`web/src/api/ids.ts`](../web/src/api/ids.ts) and the `makeId`/`threeOf`/
> `uniqueId` functions in [`apps-script/catalog.js`](../apps-script/catalog.js).

---

## New books — it's automatic

You never type an ID. When you add a book:

- the **Add book** form shows a live **preview** of the base ID as you fill in
  title/author/year (see `idPreview` in
  [`web/src/catalog/BookForm.tsx`](../web/src/catalog/BookForm.tsx));
- on save, the backend (`addBook_` in [`apps-script/Code.js`](../apps-script/Code.js))
  calls `uniqueId(...)`, which builds the base ID and adds a `-2`/`-3` suffix if
  needed to avoid clashing with an existing row, then writes it to the `ID` cell.

## Editing a book does **not** change its ID

This is deliberate. If you later fix a typo in the title, correct the author, or
set a year that was previously blank, the ID **stays the same**. In the backend,
`updateBook_` sets `merged.id = current.id` and never recomputes it.

Why: the ID is a stable reference. Regenerating it on every edit would break any
saved URL/bookmark and change the key mid-flight while other edits are in play.
So a book added with a blank year keeps its `-0000` ID even after you fill the
year in — that's expected, not a bug.

---

## Re-generating an ID by hand (rare)

Because these IDs are **internal only** — they're never printed on the physical
books or spine labels (PLAN.md §6) — it is safe to re-mint one if it really
matters (e.g. a book was added with a badly wrong title/author and now carries a
meaningless ID). The only thing you break is any **external link/bookmark** to
the old `/book/<old-id>` URL, and any in-flight edit keyed to the old ID.

There is no button for this. Do it directly in the sheet:

1. Work out the new ID from the rules above. Two easy ways:
   - **let the app compute it for you:** start adding a *new* book with the same
     title/author/year and read the ID from the Add-form preview (then cancel), or
   - run the pure function in a Node REPL from `web/`:
     ```js
     // node --input-type=module
     import { makeId } from './src/api/ids.ts' // via tsx/vite, or copy the function
     console.log(makeId('¿Qué es la propiedad?', 'Pierre-Joseph Proudhon', 2007))
     // → PRO-QUE-2007
     ```
2. **Check it's unique.** Scan the `ID` column for the value you computed. If it
   already exists, append `-2` (or the next free number), matching what
   `uniqueId` would have done.
3. Open the catalog sheet and **overwrite the `ID` cell** on that book's row with
   the new value. Nothing else needs to change — all other columns are keyed by
   header name, not by the ID.
4. Reload the app. The book now lives at `/book/<new-id>`; the old URL will show
   "book not found".

### Bulk re-minting

If many rows need it at once (e.g. after a big cleanup), don't hand-edit — use the
one-off `backfillIds` script described in PLAN.md §1/§6, which walks every row and
assigns `uniqueId(...)` with collision suffixes. Treat it as a deliberate,
run-once maintenance step, not part of normal use.

---

## Quick reference

- Format: `AAA-TTT-YYYY` (+ `-2/-3…` on collision).
- Tokens: 3 letters each, accents/punctuation/articles stripped, `X`-padded.
- Author = first author's surname; year blank/unknown = `0000`.
- New books → assigned automatically; **edits never change the ID**.
- To change one: edit the `ID` cell in the sheet by hand (safe — IDs aren't
  printed anywhere; only old links break).
