/**
 * Georgie's data model on pomuku: the `Catalog` tab as a table, the `Users` tab
 * as the write-allowlist, and the `Zones` and `Lists` tabs kept whole.
 *
 * Everything else is derived from this file: the database's tables, the REST
 * routes, the history log's fields, and how each sheet column is read and
 * written. Columns are matched by HEADER NAME, never by position — the header
 * text here is the contract with the spreadsheet (see docs/sheet-setup.md).
 *
 * Nothing here touches a database or a server, so the SPA imports the same file
 * for its row types, its form validation and its preview of a new book's ID.
 */
import { boolean, date, defineSchema, integer, list, table, text, threeOf, type RowOf } from '@lndrstrll/pomuku-server/schema'

/**
 * Valid `Exchange status` values, in flow order. Blank means "not in an
 * exchange". `received` (stage 4) is never stored — completing an exchange
 * archives the outgoing book instead.
 */
export const EXCHANGE_STATUSES = ['offered', 'confirmed', 'in transit'] as const

/** The literal sentinel meaning "this printing genuinely has no ISBN". */
export const NO_ISBN = 'N/A'

/**
 * Builds the base call-number ID `AAA-TTT-YYYY` (author-surname / title / year).
 * Only the first author's surname is used; a year that isn't four digits reads
 * as `0000`. Collision suffixes (`-2`, `-3`…) are added by pomuku when the ID is
 * minted, once, at creation — an ID is never regenerated (see docs/book-ids.md).
 */
export function makeId(title: string, author: string | null | undefined, year: number | string | null | undefined): string {
  const firstAuthor = String(author ?? '').split(/[,&;]/)[0]!.trim()
  const surname = firstAuthor.split(/\s+/).pop() ?? ''
  const y = /^\d{4}$/.test(String(year ?? '').trim()) ? String(year).trim() : '0000'
  return `${threeOf(surname)}-${threeOf(title)}-${y}`
}

const books = table({
  tab: 'Catalog',
  columns: {
    title: text('Title', { required: true }),
    author: text('Author'),
    year: integer('Year', { check: (year) => (year < 1 || year > 9999 ? 'must be a year' : null) }),
    // `circa` marks the year as the first-publication year, still wanting a colophon check.
    yearPrecision: text('Year precision', { oneOf: ['circa'] }),
    publisher: text('Publisher'),
    isbn: text('ISBN / EAN'),
    language: list('Language'),
    originalLanguage: text('Original language'),
    coverUrl: text('Cover URL'),
    theme: text('Theme'),
    owner: text('Owner'),
    referenceUrl: text('Reference URL'),
    readBy: list('Read by'),
    borrowed: boolean('Borrowed'),
    borrowerName: text('Borrower name'),
    loanDate: date('Loan date'),
    exchangeStatus: text('Exchange status', { oneOf: EXCHANGE_STATUSES }),
    exchangeNote: text('Exchange note'),
    exchangeLink: text('Exchange link'),
    // Soft delete. Having this column is also what makes a row deleted in the
    // sheet archive the book instead of removing it.
    archived: boolean('Archived'),
  },
  id: ({ row }) => makeId(row.title, row.author, row.year),
  label: (row) => row.title,
  // The whole table (archived books included) is for signed-in people; the
  // public reads the catalog through `GET /catalog`, which leaves those out.
  read: 'member',
  write: 'member',
})

export const schema = defineSchema({
  tables: { books },
  // The `Users` tab names each person in its `Owner` column: the label that has
  // to match the catalog's `Owner` and `Read by` values, and the only thing
  // about a user that is ever sent to a browser.
  userHeaders: { name: 'Owner' },
  // Not tables: a row-grouped outline and three independent option lists. Kept
  // as the sheet has them and parsed by taxonomy.ts.
  tabs: { zones: 'Zones', lists: 'Lists' },
})

/**
 * A book as the API returns it. Empty fields are `null`. The book's zone isn't
 * stored: it is derived from `theme` through the taxonomy (`themeToZone`).
 */
export type Book = RowOf<typeof books>
