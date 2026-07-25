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

## Generating IDs from within the sheet

You normally don't need to — the Add form assigns IDs for you. But if you're
minting them directly in the sheet, note one rule first:

> **The `ID` column must hold static values, never a live formula.** A formula
> recomputes whenever you sort or insert rows, which would silently re-mint IDs —
> exactly what must never happen. So compute in a **helper column**, then
> **Copy → Paste special → Values only** into `ID`, and delete the helper.

### Option A — the `=MAKEID` custom function (exact)

The bound Apps Script exposes a custom function that runs the *same* `makeId`
code as the app, so it matches byte-for-byte (accents and all):

```
=MAKEID(B2, C2, D2)      // title, author, year
```

It returns the **base** `AAA-TTT-YYYY` only — no `-2/-3` collision suffix. After
pasting as values, resolve any duplicates by hand (append `-2`, `-3`, …) or just
run `backfillIds`, which does the whole column with correct collisions.

> Availability: `=MAKEID` lives in each sheet's bound script, so it works after a
> `clasp push` to that script (no `clasp deploy` needed — custom functions use
> HEAD). Push to the dev script for the dev copy, the prod script for the real one.

### Option B — a native spreadsheet formula (no Apps Script)

If you'd rather not touch the script, this reproduces the base ID with built-in
functions (adjust the cell refs — Title `B2`, Author `C2`, Year `D2`):

```
=UPPER(LEFT(REGEXREPLACE(LOWER(REGEXEXTRACT(TRIM(REGEXEXTRACT($C2,"^[^,&;]+")),"(\S+)\s*$")),"[^a-z0-9]","")&"XXX",3))
&"-"&
UPPER(LEFT(REGEXREPLACE(REGEXREPLACE(REGEXREPLACE(LOWER($B2),"[^a-z0-9\s]"," "),"\b(the|a|an|il|lo|la|i|gli|le|l|un|una|uno|el|los|las|les|une|des)\b","")," ","")&"XXX",3))
&"-"&
IF(REGEXMATCH(TEXT($D2,"0"),"^\d{4}$"),TEXT($D2,"0"),"0000")
```

Two gaps vs. the app, so prefer Option A when either applies:

1. **Accents** — Sheets has no Unicode-normalize, so `Über`→`BER` here but `UBE`
   in the app; titles/authors with accents won't match.
2. **Collisions** — base only; it can't add the `-2/-3` suffix (that needs to scan
   all rows in order).

### For bulk — `backfillIds`

To (re)fill the whole column at once with correct collision handling, run the
one-off `backfillIds` Apps Script. Treat it as a deliberate,
run-once maintenance step.

---

## Re-generating an ID by hand (rare)

Because these IDs are **internal only** — they're never printed on the physical
books or spine labels — it is safe to re-mint one if it really
matters (e.g. a book was added with a badly wrong title/author and now carries a
meaningless ID). The only thing you break is any **external link/bookmark** to
the old `/book/<old-id>` URL, and any in-flight edit keyed to the old ID.

There is no button for this. Do it directly in the sheet:

1. Work out the new ID. Easiest: `=MAKEID(...)` in a spare cell (Option A above),
   or the Add-form preview — start adding a *new* book with the same
   title/author/year, read the previewed ID, then cancel.
2. **Check it's unique.** Scan the `ID` column for the value you computed. If it
   already exists, append `-2` (or the next free number), matching what
   `uniqueId` would have done.
3. Open the catalog sheet and **overwrite the `ID` cell** on that book's row with
   the new value. Nothing else needs to change — all other columns are keyed by
   header name, not by the ID.
4. Reload the app. The book now lives at `/book/<new-id>`; the old URL will show
   "book not found".

For many rows at once, use `backfillIds` instead (see above) rather than
hand-editing.

---

## Quick reference

- Format: `AAA-TTT-YYYY` (+ `-2/-3…` on collision).
- Tokens: 3 letters each, accents/punctuation/articles stripped, `X`-padded.
- Author = first author's surname; year blank/unknown = `0000`.
- New books → assigned automatically; **edits never change the ID**.
- To change one: edit the `ID` cell in the sheet by hand (safe — IDs aren't
  printed anywhere; only old links break).
