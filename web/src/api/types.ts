/**
 * Shared data model for the Georgie SPA.
 *
 * These types mirror the JSON the Apps Script backend returns (see
 * `apps-script/catalog.js` — same field names, same shapes). The backend does
 * all row↔object mapping; the SPA only ever sees already-typed objects.
 */

/** `''` = a known/exact edition year; `'circa'` = a first-publication year that still wants a colophon check. */
export type YearPrecision = '' | 'circa'

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
  /** The theme's parent zone — derived server-side, never chosen independently. */
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
  exchange: boolean
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

/** One row of the admin audit log (the `History` tab), newest first. */
export interface HistoryEntry {
  /** ISO 8601 UTC. */
  timestamp: string
  /** The acting admin's owner label (never a raw email). */
  actor: string
  action: 'add' | 'update' | 'archive' | 'restore' | 'loan' | 'return'
  /** The book's call-number ID — always present (Georgie's "delete" is an
   *  archive, so there's never a row this can't safely link back to). */
  entityId: string
  title: string
  author: string
  theme: string
  /** A field-by-field diff summary (`update`) or a short context line
   *  (`loan`) — '' when the action name already says everything (`add`,
   *  `archive`, `restore`, `return`). */
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
