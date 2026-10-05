/**
 * The controlled vocabularies, parsed from the `Zones` and `Lists` tabs as the
 * sync keeps them: rows of raw cells, header row first. Pure functions of their
 * input, so they are unit-tested without a sheet or a database.
 *
 * Columns are resolved by header name, never by position. A row may be shorter
 * than the header row (the Sheets API drops trailing blanks), so every cell
 * read tolerates a missing value.
 */
import type { Cell } from '@lndrstrll/pomuku-server'

/** One theme within a zone, e.g. `Classics & Canon`. */
export interface Theme {
  name: string
  /** Per-language name overrides keyed by language code, from `Themes (it)`/`Themes (es)`. */
  names: Record<string, string>
  /** The English description (`Theme description`), '' if unset. */
  description: string
  /** Per-language description overrides, from `Theme description (it)`/`(es)`. */
  descriptions: Record<string, string>
}

/** A top-level zone grouping several themes. */
export interface Zone {
  name: string
  /** Per-language name overrides keyed by language code, from `Title (it)`/`Title (es)`. */
  names: Record<string, string>
  description: string
  descriptions: Record<string, string>
  /** An emoji or an image URL; '' when the column is absent or the cell is blank. */
  marker: string
  themes: Theme[]
}

export interface Taxonomies {
  zones: Zone[]
  /** Theme name → parent zone name. */
  themeToZone: Record<string, string>
  owners: string[]
  languages: string[]
  /** Owner (and reader) name → visual marker (emoji or image URL). */
  ownerMarkers: Record<string, string>
  /** Real people: the `Users` tab's distinct owner labels (never their emails). */
  users: string[]
}

const str = (cell: Cell): string => (cell === null || cell === undefined ? '' : String(cell).trim())

function indexHeaders(header: Cell[] | undefined): Record<string, number> {
  const index: Record<string, number> = {}
  ;(header ?? []).forEach((cell, position) => {
    const name = str(cell)
    if (name) index[name] = position
  })
  return index
}

/** The localized siblings of a base header — `Title (it)`, `Title (es)` — as languageCode → column index. */
function localizedColumns(headers: Record<string, number>, base: string): Record<string, number> {
  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(([a-z]{2})\\)$`, 'i')
  const columns: Record<string, number> = {}
  for (const [name, position] of Object.entries(headers)) {
    const match = pattern.exec(name)
    if (match) columns[match[1]!.toLowerCase()] = position
  }
  return columns
}

function localizedValues(row: Cell[], columns: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [language, position] of Object.entries(columns)) {
    const value = str(row[position])
    if (value) out[language] = value
  }
  return out
}

/**
 * Parses the row-grouped `Zones` tab into a two-level taxonomy. A row carrying
 * a `Title` starts a new zone; following rows with an empty `Title` but a
 * `Themes` value belong to it. Names and descriptions are canonical in English;
 * `<base> (xx)` sibling columns supply per-language overrides.
 */
export function parseZones(values: Cell[][]): Pick<Taxonomies, 'zones' | 'themeToZone'> {
  if (!values.length) return { zones: [], themeToZone: {} }
  const h = indexHeaders(values[0])
  const at = (row: Cell[], header: string) => (h[header] === undefined ? '' : str(row[h[header]]))
  const zoneNames = localizedColumns(h, 'Title')
  const zoneDescriptions = localizedColumns(h, 'Description')
  const themeNames = localizedColumns(h, 'Themes')
  const themeDescriptions = localizedColumns(h, 'Theme description')
  const zones: Zone[] = []
  const themeToZone: Record<string, string> = {}
  let current: Zone | null = null

  for (const row of values.slice(1)) {
    const title = at(row, 'Title')
    if (title) {
      current = {
        name: title,
        names: localizedValues(row, zoneNames),
        description: at(row, 'Description'),
        descriptions: localizedValues(row, zoneDescriptions),
        marker: at(row, 'Marker'),
        themes: [],
      }
      zones.push(current)
    }
    const theme = at(row, 'Themes')
    if (theme && current) {
      current.themes.push({
        name: theme,
        names: localizedValues(row, themeNames),
        description: at(row, 'Theme description'),
        descriptions: localizedValues(row, themeDescriptions),
      })
      themeToZone[theme] = current.name
    }
  }
  return { zones, themeToZone }
}

/** The non-empty, de-duplicated values of one column, in order. */
function readColumn(values: Cell[][], position: number | undefined): string[] {
  if (position === undefined) return []
  return [...new Set(values.slice(1).map((row) => str(row[position])).filter(Boolean))]
}

/**
 * Parses the `Lists` tab: the `Owner options` and `Languages` columns as
 * independent lists, and `Owner marker` (on the same row as each owner) as an
 * owner → marker map.
 */
export function parseLists(values: Cell[][]): Pick<Taxonomies, 'owners' | 'languages' | 'ownerMarkers'> {
  if (!values.length) return { owners: [], languages: [], ownerMarkers: {} }
  const h = indexHeaders(values[0])
  const owner = h['Owner options']
  const marker = h['Owner marker']
  const ownerMarkers: Record<string, string> = {}
  if (owner !== undefined && marker !== undefined) {
    for (const row of values.slice(1)) {
      const name = str(row[owner])
      const value = str(row[marker])
      if (name && value) ownerMarkers[name] = value
    }
  }
  return { owners: readColumn(values, owner), languages: readColumn(values, h['Languages']), ownerMarkers }
}
