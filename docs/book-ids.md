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

> The exact rules live in one place: `makeId` in
> [`server/src/schema.ts`](../server/src/schema.ts). The backend mints with it,
> and the app imports the same function for its preview, so the two can't
> disagree.

---

## New books — it's automatic

You never type an ID. When you add a book:

- the **Add book** form shows a live **preview** of the base ID as you fill in
  title/author/year (see `idPreview` in
  [`web/src/catalog/BookForm.tsx`](../web/src/catalog/BookForm.tsx));
- on save, the backend builds the base ID and adds a `-2`/`-3` suffix if needed
  to avoid clashing with an existing book, then keeps it for good. The sheet's
  `ID` cell is filled in when the new row is pushed there, a few seconds later.

## Editing a book does **not** change its ID

This is deliberate. If you later fix a typo in the title, correct the author, or
set a year that was previously blank, the ID **stays the same**: an edit only
ever changes a book's fields, never its ID.

Why: the ID is a stable reference. Regenerating it on every edit would break any
saved URL/bookmark and change the key mid-flight while other edits are in play.
So a book added with a blank year keeps its `-0000` ID even after you fill the
year in — that's expected, not a bug.

---

## Adding books straight in the sheet

Type the new row with its `Title` (and whatever else you know) and **leave the
`ID` cell blank**. On the next sync — **Sync → Sync now** from the sheet's menu,
or the next time someone opens the app — the backend mints the ID with the same
rule and the same collision handling as the Add form, and writes it back into
the cell. That works for one row or for a few hundred pasted at once.

> **The `ID` column must hold static values, never a formula.** A formula
> recomputes whenever you sort or insert rows, which would silently re-mint IDs —
> exactly what must never happen. Leave the cell empty and let the sync fill it.

If you type an ID yourself on a new row, it is kept as typed, so make sure it's
unique: a second row carrying an ID that an earlier row already has is ignored
and listed on the `Validation` tab.

---

## Re-generating an ID by hand (rare)

Because these IDs are **internal only** — they're never printed on the physical
books or spine labels — it is safe to re-mint one if it really
matters (e.g. a book was added with a badly wrong title/author and now carries a
meaningless ID). The only thing you break is any **external link/bookmark** to
the old `/book/<old-id>` URL, and any in-flight edit keyed to the old ID.

There is no button for this. Do it directly in the sheet:

1. Work out the new ID. Easiest: the Add-form preview — start adding a *new*
   book with the same title/author/year, read the previewed ID, then cancel.
2. **Check it's unique.** Scan the `ID` column for the value you computed. If it
   already exists, append `-2` (or the next free number), matching what the
   backend would have done.
3. Open the catalog sheet and **overwrite the `ID` cell** on that book's row with
   the new value, then run **Sync → Sync now**.
4. Reload the app. The book now lives at `/book/<new-id>`.

To the app, that row is a new book, and the old ID is a book whose row vanished
from the sheet — which it archives rather than loses. So the old ID stays behind
in the **Archived** view, with the fields it had. Leave it there (don't restore
it, or it returns to the sheet as a duplicate); its history stays with it.

---

## Quick reference

- Format: `AAA-TTT-YYYY` (+ `-2/-3…` on collision).
- Tokens: 3 letters each, accents/punctuation/articles stripped, `X`-padded.
- Author = first author's surname; year blank/unknown = `0000`.
- New books → assigned automatically, in the app or on a row added in the sheet
  with its `ID` left blank; **edits never change the ID**.
- To change one: edit the `ID` cell in the sheet by hand and sync (safe — IDs
  aren't printed anywhere; old links break, and the old ID stays archived).
