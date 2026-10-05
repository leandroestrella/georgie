# Sheet setup — the catalog schema

Georgie's entire database is one **private Google Sheet**. The backend reads and
writes it by **header name**, never by column position — so you can reorder or
insert columns freely, and any extra columns you add are simply ignored. What
matters is that the header text matches **exactly** (including capitalisation and
spaces).

The workbook has four tabs you create, plus one the backend makes when it needs it:

| Tab          | Holds                                                        | Created by |
| ------------ | ------------------------------------------------------------ | ---------- |
| `Catalog`    | one row per book                                             | you        |
| `Zones`      | your categories: zones → themes                              | you        |
| `Lists`      | the owner and language option lists                          | you        |
| `Users`      | who may make changes (`Email`, `Owner`, `Language`, `Role`)  | you        |
| `Validation` | values the app couldn't take from the sheet, until they're fixed | the backend, when there is something to list |

The app doesn't read the sheet on every request: it works on its own database,
and the two are kept in sync both ways. A change made in the app reaches the
sheet a few seconds later (only the cells that changed are written). An edit
made in the sheet reaches the app the next time someone opens it, or at once
with **Sync → Sync now** from the sheet's menu — see
[server/README.md](../server/README.md) for how the sync treats each kind of
edit.

The activity log (every add, edit, archive, restore, loan and return — made in
the app or in the sheet) lives in the backend's database, viewable in-app at
`/history` by anyone signed in. A `History` tab left in a sheet from before the
log moved there is simply no longer written.

The `Users` tab does double duty: it gates who may write (by `Email`), **and**
its `Owner` labels are the people the in-app overview page reports reading
stats for. Only the `Owner` label is ever sent to the browser — the `Email`
column stays server-side, used solely for the sign-in check.

That second role means the `Owner` value has to line up with the catalog:
match it **exactly**, including capitalisation, to how that person is written
in the Catalog tab's `Owner` and `Read by` columns, or their stats will come
out as zero. It's also why a non-human "owner" you might keep in `Lists`
(a pet whose books are tracked, say) simply doesn't belong in `Users` — no
sign-in, and nothing to report.

The other two `Users` columns can stay empty. `Language` is the language the
app opens in for that person on any device; the app fills it in when they pick
one. `Role` takes `admin` for someone who may also manage the people list and
access tokens through the backend's API; everyone else on the tab can read and
write the catalog all the same.

---

## `Catalog` tab — one row per book

The header row must contain these columns (order doesn't matter):

| Header             | Meaning                                    | Notes |
| ------------------ | ------------------------------------------ | ----- |
| `ID`               | permanent call-number handle               | **Assigned by the app** — don't hand-type it. Leave it blank on a row you add in the sheet: the next sync fills it in. See [book-ids.md](book-ids.md). |
| `Title`            | book title                                 | **The only required field.** A row with a blank Title is skipped entirely. |
| `Author`           | author(s)                                  | Multiple authors separated by `,` `&` or `;`; each becomes its own filterable author. |
| `Year`             | this edition's year                        | 4 digits, or blank for unknown. Non-numeric text is treated as unknown. |
| `Year precision`   | `circa` or blank                           | `circa` marks the year as the *first-publication* year (needs checking); flagged by the "needs attention" filter. |
| `Publisher`        | publisher                                  | free text |
| `ISBN / EAN`       | ISBN-10 / ISBN-13 / EAN                     | Use the literal `N/A` when a printing genuinely has no ISBN; blank means "not filled in yet". |
| `Language`         | edition language(s)                        | comma-separated (e.g. `English, Italian`). Names should match the `Languages` list. |
| `Original language`| language the work was originally written in | single value; blank is flagged by "needs attention". |
| `Cover URL`        | image URL for the cover                    | blank → the app falls back to Open Library, then Amazon, then a zone-tinted placeholder. Admins can pin a stored cover here — see [cover hosting](../cpanel/README.md). |
| `Theme`            | the book's theme                           | **Must match a theme defined on the `Zones` tab** — the Zone is derived from it. |
| `Zone`             | parent zone                                | **Derived, not authored, and optional.** The app works the zone out from `Theme` and neither reads nor writes this column; keep it as a formula of your own if you like seeing it in the sheet, or leave it out. |
| `Owner`            | who owns the copy                          | one or more names from the `Owner options` list; separate co-owners with `,` `&` or `;` (each owner's marker is shown). |
| `Reference URL`    | external link about the book               | must be `http(s)` to render as a link. |
| `Read by`          | who has read it                            | comma-separated names (same people as owners). |
| `Borrowed`         | on loan right now?                          | checkbox / `TRUE`·`FALSE`·`1`·`0`·`yes`. |
| `Borrower name`    | who has it on loan                         | first name / nickname (the catalog is public). |
| `Loan date`        | when it went out                            | a date, or blank for "unknown". Stored as `YYYY-MM-DD`. |
| `Exchange status`  | exchange stage                              | blank, `offered`, `confirmed`, or `in transit`. Anything else is treated as blank. The app also reuses `Borrowed` on an incoming book to mean "not yet on the shelf" while its exchange is in progress. Moving to `in transit` also sets `Archived` to `TRUE` automatically — see below. |
| `Exchange note`    | free text about the exchange                | set at `confirmed` — the incoming book / partner. |
| `Exchange link`    | the paired book's `ID`                      | links the outgoing and incoming rows so "Exchange received" finishes both in one action. |
| `Archived`         | soft-deleted?                               | checkbox / boolean. Archived books drop out of the public catalog but stay in the sheet (restorable from the admin Archived view). Deleting a book's row in the sheet archives the book rather than losing it. **Also set automatically** the moment a book's exchange goes `in transit` — once mailed out, it's gone for good, unlike a loan, so the app archives it immediately rather than waiting for "Exchange received". Don't restore it by hand while `Exchange status` still reads `in transit`; that leaves a dangling state the app doesn't expect. |

You don't have to fill everything in by hand: the **Add book** form assigns the
`ID`, derives the `Zone`, and can fetch Title/Author/Year/Publisher/Language/Cover
from the web by ISBN (or a barcode scan). This tab is just where it all lands.

---

## `Zones` tab — your categories

This tab is **row-grouped**: a row with a `Title` starts a new zone, and the rows
below it that have a `Themes` value (but a blank `Title`) belong to that zone.

| Header             | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| `Title`            | the **zone** name (only on a zone's first row)      |
| `Themes`           | one theme name per row under the zone               |
| `Description`      | the zone's description (English), on its title row  |
| `Theme description`| the theme's description (English), on its own row   |
| `Marker`           | *(optional)* an emoji or image URL for the zone — see [markers.md](markers.md) |
| `Title (it)`, `Themes (es)`, `Description (it)`, `Theme description (es)`, … | *(optional)* translated names/descriptions — see [translations.md](translations.md) |

Example (the `Marker`/`Description` columns omitted for brevity):

| Title (zone)                | Themes                        |
| ---------------------------- | ----------------------------- |
| The Studio (Making & Images) | Art theory                    |
|                               | Curatorial practice           |
|                               | Graphic & type design         |
| The Commons (Power & Collective Life) | Political philosophy |
|                               | Anarchism                     |

Each **Theme** must be unique across the whole tab — it's how a Catalog row's
`Theme` maps to its parent zone. Zone **colours** are built into the app (not a
sheet column); zone **markers** and **descriptions** come from here.

---

## `Lists` tab — option lists

Three independent single-column lists (one value per row, under each header):

| Header          | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `Owner options` | the people who own / have read books (owner + reader picker) |
| `Owner marker`  | *(optional)* each owner's badge (emoji or image URL) — see [markers.md](markers.md) |
| `Languages`     | the languages offered in the Language pickers               |

`Owner marker` sits next to `Owner options`, on the **same row** as each owner.
The three lists are independent otherwise — a blank cell just means "no entry".

---

## Rules of thumb

- **Header text is the contract.** Match it exactly; column order is free; extra
  columns are ignored, so you can keep your own working columns on any tab.
- **Blank `Title` rows are skipped** on the Catalog tab — handy for spacer rows.
- **Keep the sheet private.** The app reads it through the backend (which reaches
  it as a service account the sheet is shared with), so it never needs to be
  link-shared.
- **A value the app can't take is never lost silently.** A `Year` that isn't a
  number, an unknown `Exchange status`: the cell is left as you typed it, the
  app keeps its previous value, and the problem is listed on the `Validation`
  tab until it's fixed.
