/**
 * Shared data model for the Georgie SPA.
 *
 * The shapes pages work with. `api/client.ts` builds them from what the backend
 * sends (see `server/src/schema.ts` for the stored model): an empty field is ''
 * / [] / false here, and a book carries its derived zone.
 */

/** `''` = a known/exact edition year; `'circa'` = a first-publication year that still wants a colophon check. */
export type YearPrecision = '' | 'circa'

/**
 * A book's exchange stage. `''` = not in an exchange. `'received'` (stage 4)
 * is never stored — completing an exchange archives the outgoing book and
 * clears the incoming book's loan instead, so it never appears here.
 */
export type ExchangeStatus = '' | 'offered' | 'confirmed' | 'in transit'

/** A single catalogued book. Multi-value fields (`language`, `readBy`) arrive as arrays. */
export interface Book {
  /** Immutable call-number ID, e.g. `ORW-198-1950`. Assigned once at creation. */
  id: string
  title: string
  author: string
  /** Clean 4-digit edition year, or `null` when unknown. */
  year: number | null
  yearPrecision: YearPrecision
  publisher: string
  /** ISBN-10/13, or the literal `N/A` when this printing genuinely has none. */
  isbn: string
  /** Languages of this edition (English names). */
  language: string[]
  /** Language the work was first written in. */
  originalLanguage: string
  /** External cover image URL (no files are stored). May be empty. */
  coverUrl: string
  /** The book's specific category — one of the taxonomy's themes. */
  theme: string
  /** The theme's parent zone — derived from the taxonomy, never chosen independently. */
  zone: string
  owner: string
  referenceUrl: string
  /** First names of people who've read it. */
  readBy: string[]
  borrowed: boolean
  /** First name / nickname only (the catalog is public). */
  borrowerName: string
  /** ISO `YYYY-MM-DD`, or `''` for an unknown (pre-existing) loan. */
  loanDate: string
  exchangeStatus: ExchangeStatus
  /** Free text about the exchange partner / incoming book (set at `confirmed`). */
  exchangeNote: string
  /** The paired book's id — the incoming book while outgoing, or vice versa. */
  exchangeLink: string
  archived: boolean
}

/** Fields accepted when creating a book. The backend assigns `id`, `zone`. */
export type NewBook = Omit<Book, 'id' | 'zone'>

/** A partial patch applied to an existing book (id is immutable). */
export type BookPatch = Partial<Omit<Book, 'id'>>

/** Loan details; `null` clears the loan (returns the book). */
export interface LoanInput {
  borrowerName: string
  /** ISO date; the backend defaults to today when omitted. */
  loanDate?: string
}

/** Exchange transition details; `null` withdraws the book from exchange. */
export interface ExchangeInput {
  status: Exclude<ExchangeStatus, ''>
  /** Free text about the exchange partner / incoming book. */
  note?: string
  /** The paired book's id, once known (set at `confirmed`). */
  link?: string
}

/** One theme within a zone, e.g. `Classics & Canon`. */
export interface Theme {
  name: string
  /** Per-language name overrides keyed by language code (e.g. `it`, `es`), from
   *  the `Themes (it)`/`Themes (es)` columns. English lives in `name`; missing
   *  translations fall back to it. */
  names?: Record<string, string>
  /** The English description (the `Theme description` column), '' if unset. */
  description?: string
  /** Per-language description overrides, from `Theme description (it)`/`(es)`. */
  descriptions?: Record<string, string>
}

/** A top-level zone grouping several themes. */
export interface Zone {
  name: string
  /** Per-language name overrides keyed by language code (e.g. `it`, `es`), from
   *  the `Title (it)`/`Title (es)` columns. English lives in `name`; missing
   *  translations fall back to it. */
  names?: Record<string, string>
  /** The English description (the `Description` column on the `Zones` tab). */
  description: string
  /** Per-language description overrides keyed by language code (e.g. `it`, `es`),
   *  from the `Description (it)`/`Description (es)` columns. English lives in
   *  `description`; missing translations fall back to it. */
  descriptions?: Record<string, string>
  /** Optional accent color mirrored from the physical shelves (may be absent). */
  color?: string
  /** Optional visual marker for the zone — an emoji or an image URL (may be absent). */
  marker?: string
  themes: Theme[]
}

/** One entry of the log of changes to books, newest first. */
export interface HistoryEntry {
  /** The entry's place in the log: unique, and higher for a later change. */
  seq: number
  /** ISO 8601 UTC. */
  timestamp: string
  /** Who made the change: a person's owner label (never an email), or `sheet`
   *  for an edit made in the spreadsheet itself. */
  actor: string
  /** `delete` is a row removed outright (Georgie's own "delete" is an archive);
   *  `conflict` is a spreadsheet edit that lost to a change made in the app —
   *  the entry keeps the spreadsheet's value. */
  action: 'add' | 'update' | 'archive' | 'restore' | 'loan' | 'return' | 'exchange' | 'delete' | 'conflict'
  /** The book's call-number ID. */
  entityId: string
  title: string
  /** What changed, field by field (`year: 1998 → 1999`); every field of a book
   *  just added. */
  changes: string
}

/** The controlled vocabularies read from the `Zones` and `Lists` tabs. */
export interface Taxonomies {
  zones: Zone[]
  /** theme name → parent zone name. */
  themeToZone: Record<string, string>
  owners: string[]
  languages: string[]
  /** owner (and reader) name → visual marker (emoji or image URL). Optional: a
   *  backend without the `Owner marker` column omits it. */
  ownerMarkers?: Record<string, string>
  /** Real people (the `Users` tab's distinct Owner labels) — unlike `owners`,
   *  never includes non-human entries (e.g. a pet whose books are tracked but
   *  who doesn't "read"). Optional: an un-redeployed backend omits it. */
  users?: string[]
}
