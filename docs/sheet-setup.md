# Sheet setup — the catalog schema

Georgie's entire database is one **private Google Sheet**. The backend reads and
writes it by **header name**, never by column position — so you can reorder or
insert columns freely, and any extra columns you add are simply ignored. What
matters is that the header text matches **exactly** (including capitalisation and
spaces).

The workbook has three tabs you create, plus a `Users` tab the backend makes for
you:

| Tab       | Holds                                             | Created by |
| --------- | ------------------------------------------------- | ---------- |
| `Catalog` | one row per book                                  | you        |
| `Zones`   | your categories: zones → themes                   | you        |
| `Lists`   | the owner and language option lists               | you        |
| `Users`   | the admin write-allowlist (`Email`, `Owner`)      | `setupUsersTab` — see the README |

---

## `Catalog` tab — one row per book

The header row must contain these columns (order doesn't matter):

| Header             | Meaning                                    | Notes |
| ------------------ | ------------------------------------------ | ----- |
| `ID`               | permanent call-number handle               | **Assigned by the app** — don't hand-type it. See [book-ids.md](book-ids.md). |
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
| `Zone`             | parent zone                                | **Derived, not authored.** The app writes it, but never trusts it on read (it's recomputed from `Theme`). You can leave it blank. |
| `Owner`            | who owns the copy                          | a name from the `Owner options` list. |
| `Reference URL`    | external link about the book               | must be `http(s)` to render as a link. |
| `Read by`          | who has read it                            | comma-separated names (same people as owners). |
| `Borrowed`         | on loan right now?                          | checkbox / `TRUE`·`FALSE`·`1`·`0`·`yes`. |
| `Borrower name`    | who has it on loan                         | first name / nickname (the catalog is public). |
| `Loan date`        | when it went out                            | a date, or blank for "unknown". Stored as `YYYY-MM-DD`. |
| `Exchange`         | offered for exchange?                       | checkbox / boolean, like `Borrowed`. |
| `Archived`         | soft-deleted?                               | checkbox / boolean. Archived books drop out of the public catalog but stay in the sheet (restorable from the admin Archived view). |

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
| `Marker`           | *(optional)* an emoji or image URL for the zone — see [markers.md](markers.md) |
| `Description (it)`, `Description (es)`, … | *(optional)* translated descriptions — see [translations.md](translations.md) |

Example (the `Marker`/`Description` columns omitted for brevity):

| Title (zone)                          | Themes                        |
| ------------------------------------- | ----------------------------- |
| Contemporary Art, Curation & Design   | Art theory                    |
|                                       | Curatorial practice           |
|                                       | Graphic & type design         |
| Radical Politics, Philosophy & Society| Political philosophy          |
|                                       | Anarchism                     |

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
- **Keep the sheet private.** The app reads it through the backend (which runs as
  you), so it never needs to be link-shared.
