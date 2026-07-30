/**
 * Georgie — pure catalog logic (framework-free, no SpreadsheetApp).
 *
 * Everything here is a plain function of its inputs so it can be unit-tested in
 * Node (`npm test`) without a live spreadsheet. The Apps Script glue in Code.js
 * reads the sheet, hands the raw 2-D values to these functions, and writes the
 * results back. Google Apps Script and Node both load this file:
 *   - in Apps Script every declaration below becomes a global (no imports there);
 *   - in Node the guarded `module.exports` at the bottom exposes them to tests.
 *
 * CORE RULE: columns are always resolved by HEADER NAME, never by position, so
 * reordering or inserting sheet columns can never corrupt the mapping.
 */

/** Canonical Catalog header names (map by name, never by index). */
var COLUMNS = {
  id: 'ID',
  title: 'Title',
  author: 'Author',
  year: 'Year',
  yearPrecision: 'Year precision',
  publisher: 'Publisher',
  isbn: 'ISBN / EAN',
  language: 'Language',
  originalLanguage: 'Original language',
  coverUrl: 'Cover URL',
  theme: 'Theme',
  zone: 'Zone',
  owner: 'Owner',
  referenceUrl: 'Reference URL',
  readBy: 'Read by',
  borrowed: 'Borrowed',
  borrowerName: 'Borrower name',
  loanDate: 'Loan date',
  exchange: 'Exchange',
  archived: 'Archived',
}

/** The literal sentinel meaning "this printing genuinely has no ISBN". */
var NO_ISBN = 'N/A'

/** Leading articles skipped when deriving the title portion of an ID (EN/IT/ES/FR). */
var ARTICLES = [
  'the', 'a', 'an', 'il', 'lo', 'la', 'i', 'gli', 'le', 'l',
  'un', 'una', 'uno', 'el', 'los', 'las', 'les', 'une', 'des',
]

// ---------------------------------------------------------------------------
// Cell parsing / serialization
// ---------------------------------------------------------------------------

/**
 * Normalizes a sheet cell to a trimmed string. Apps Script may hand us numbers,
 * booleans or Date objects depending on the cell, so coerce defensively.
 * @param {*} v
 * @return {string}
 */
function cellToString(v) {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/**
 * Parses a boolean-ish cell. Accepts real booleans (checkbox cells) and the
 * strings TRUE/FALSE/1/0 (case-insensitive); everything else is false.
 * @param {*} v
 * @return {boolean}
 */
function parseBool(v) {
  if (typeof v === 'boolean') return v
  var s = cellToString(v).toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

/**
 * Parses a Year cell into a clean 4-digit integer, or null when unknown.
 * Never returns a partial/garbage year — IDs and sorting rely on this.
 * @param {*} v
 * @return {number|null}
 */
function parseYear(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    var n = Math.trunc(v)
    return n > 0 ? n : null
  }
  var m = /(\d{4})/.exec(cellToString(v))
  return m ? Number(m[1]) : null
}

/**
 * Serializes a Loan date cell to an ISO `YYYY-MM-DD` string. Blank stays blank
 * (meaning "unknown", displayed as such); Date objects and strings both work.
 * @param {*} v
 * @return {string}
 */
function parseDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    var y = v.getFullYear()
    var mo = String(v.getMonth() + 1).padStart(2, '0')
    var d = String(v.getDate()).padStart(2, '0')
    return y + '-' + mo + '-' + d
  }
  return cellToString(v)
}

/**
 * Splits a comma-separated multi-value cell into a trimmed, empty-free array.
 * @param {*} v
 * @return {string[]}
 */
function splitMulti(v) {
  return cellToString(v)
    .split(',')
    .map(function (s) { return s.trim() })
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------

/**
 * Builds a `{ headerName: columnIndex }` lookup from the sheet's header row.
 * @param {Array<*>} headerRow
 * @return {Object<string, number>}
 */
function indexHeaders(headerRow) {
  var idx = {}
  for (var i = 0; i < headerRow.length; i++) {
    var name = cellToString(headerRow[i])
    if (name) idx[name] = i
  }
  return idx
}

/**
 * Reads a cell from a data row by header name, tolerating missing columns.
 * @param {Array<*>} row
 * @param {Object<string, number>} headerIndex
 * @param {string} name
 * @return {*}
 */
function cell(row, headerIndex, name) {
  var i = headerIndex[name]
  return i === undefined ? '' : row[i]
}

/**
 * Maps one raw Catalog row to a typed Book object. The book's Zone is DERIVED
 * from its Theme via `themeToZone` — the sheet's own Zone column is unreliable
 * and is never trusted for reads.
 *
 * @param {Array<*>} row
 * @param {Object<string, number>} headerIndex
 * @param {Object<string, string>} themeToZone theme name → parent zone name
 * @return {Book|null} null for blank rows (no Title)
 */
function mapRowToBook(row, headerIndex, themeToZone) {
  var title = cellToString(cell(row, headerIndex, COLUMNS.title))
  if (!title) return null

  var theme = cellToString(cell(row, headerIndex, COLUMNS.theme))
  var rawIsbn = cellToString(cell(row, headerIndex, COLUMNS.isbn))

  return {
    id: cellToString(cell(row, headerIndex, COLUMNS.id)),
    title: title,
    author: cellToString(cell(row, headerIndex, COLUMNS.author)),
    year: parseYear(cell(row, headerIndex, COLUMNS.year)),
    yearPrecision:
      cellToString(cell(row, headerIndex, COLUMNS.yearPrecision)).toLowerCase() === 'circa'
        ? 'circa'
        : '',
    publisher: cellToString(cell(row, headerIndex, COLUMNS.publisher)),
    isbn: rawIsbn,
    language: splitMulti(cell(row, headerIndex, COLUMNS.language)),
    originalLanguage: cellToString(cell(row, headerIndex, COLUMNS.originalLanguage)),
    coverUrl: cellToString(cell(row, headerIndex, COLUMNS.coverUrl)),
    theme: theme,
    zone: deriveZone(theme, themeToZone),
    owner: cellToString(cell(row, headerIndex, COLUMNS.owner)),
    referenceUrl: cellToString(cell(row, headerIndex, COLUMNS.referenceUrl)),
    readBy: splitMulti(cell(row, headerIndex, COLUMNS.readBy)),
    borrowed: parseBool(cell(row, headerIndex, COLUMNS.borrowed)),
    borrowerName: cellToString(cell(row, headerIndex, COLUMNS.borrowerName)),
    loanDate: parseDate(cell(row, headerIndex, COLUMNS.loanDate)),
    exchange: parseBool(cell(row, headerIndex, COLUMNS.exchange)),
    archived: parseBool(cell(row, headerIndex, COLUMNS.archived)),
  }
}

/**
 * Serializes a Book back into a full row array aligned to the given headers, so
 * a write only ever touches known columns and leaves unknown ones untouched
 * (callers merge this against the existing row). Zone is written as the derived
 * parent of the Theme so the sheet stays human-consistent.
 *
 * @param {Book} book
 * @param {Array<*>} headerRow
 * @param {Object<string, string>} themeToZone
 * @return {Object<string, *>} header name → value to write
 */
function bookToCells(book, headerRow, themeToZone) {
  var out = {}
  out[COLUMNS.id] = book.id
  out[COLUMNS.title] = book.title
  out[COLUMNS.author] = book.author
  out[COLUMNS.year] = book.year == null ? '' : book.year
  out[COLUMNS.yearPrecision] = book.yearPrecision || ''
  out[COLUMNS.publisher] = book.publisher || ''
  out[COLUMNS.isbn] = book.isbn || ''
  out[COLUMNS.language] = (book.language || []).join(', ')
  out[COLUMNS.originalLanguage] = book.originalLanguage || ''
  out[COLUMNS.coverUrl] = book.coverUrl || ''
  out[COLUMNS.theme] = book.theme || ''
  out[COLUMNS.zone] = deriveZone(book.theme, themeToZone)
  out[COLUMNS.owner] = book.owner || ''
  out[COLUMNS.referenceUrl] = book.referenceUrl || ''
  out[COLUMNS.readBy] = (book.readBy || []).join(', ')
  out[COLUMNS.borrowed] = !!book.borrowed
  out[COLUMNS.borrowerName] = book.borrowerName || ''
  out[COLUMNS.loanDate] = book.loanDate || ''
  out[COLUMNS.exchange] = !!book.exchange
  out[COLUMNS.archived] = !!book.archived
  return out
}

// ---------------------------------------------------------------------------
// Taxonomy (Zones + Lists tabs)
// ---------------------------------------------------------------------------

/**
 * Looks up a Theme's parent Zone. Returns '' when the theme is unknown.
 * @param {string} theme
 * @param {Object<string, string>} themeToZone
 * @return {string}
 */
function deriveZone(theme, themeToZone) {
  if (!theme || !themeToZone) return ''
  return themeToZone[theme] || ''
}

/**
 * Finds the localized columns for a given base header on the Zones tab — any
 * header shaped like `<base> (xx)` where `xx` is a language code (e.g. `base`
 * `Title` matches `Title (it)`, `Title (es)`). Returns a map of
 * languageCode → column index.
 *
 * @param {Object<string,number>} headerIndex header name → column index
 * @param {string} base exact header text preceding the `(xx)` suffix
 * @return {Object<string,number>}
 */
function localizedColumns_(headerIndex, base) {
  var cols = {}
  var re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\(([a-z]{2})\\)$', 'i')
  for (var name in headerIndex) {
    if (!Object.prototype.hasOwnProperty.call(headerIndex, name)) continue
    var m = re.exec(String(name).trim())
    if (m) cols[m[1].toLowerCase()] = headerIndex[name]
  }
  return cols
}

/**
 * Reads one row's non-empty localized values into { languageCode: text }.
 *
 * @param {Array<*>} row
 * @param {Object<string,number>} langCols languageCode → column index
 * @return {Object<string,string>}
 */
function readLocalizedValues_(row, langCols) {
  var out = {}
  for (var lang in langCols) {
    if (!Object.prototype.hasOwnProperty.call(langCols, lang)) continue
    var text = cellToString(row[langCols[lang]])
    if (text) out[lang] = text
  }
  return out
}

/**
 * Parses the row-grouped `Zones` tab into a two-level taxonomy. A row carrying a
 * Title starts a new zone; following rows with an empty Title but a Theme belong
 * to it. Columns are resolved by header name. Zone and theme names/descriptions
 * are canonical in English (`Title`/`Description`/`Themes`/`Theme description`);
 * `<base> (xx)` sibling columns (e.g. `Title (it)`, `Themes (es)`) supply
 * per-language overrides, read the same way the theme→zone map ignores column
 * order.
 *
 * @param {Array<Array<*>>} values full sheet values incl. header row
 * @return {{ zones: Zone[], themeToZone: Object<string,string> }}
 */
function parseZones(values) {
  if (!values || !values.length) return { zones: [], themeToZone: {} }
  var h = indexHeaders(values[0])
  var iTitle = h['Title'], iDesc = h['Description'], iTheme = h['Themes'], iMarker = h['Marker']
  var iThemeDesc = h['Theme description']
  var zoneNameLangCols = localizedColumns_(h, 'Title')
  var zoneDescLangCols = localizedColumns_(h, 'Description')
  var themeNameLangCols = localizedColumns_(h, 'Themes')
  var themeDescLangCols = localizedColumns_(h, 'Theme description')
  var zones = []
  var themeToZone = {}
  var current = null

  for (var r = 1; r < values.length; r++) {
    var row = values[r]
    var title = cellToString(row[iTitle])
    if (title) {
      current = {
        name: title,
        // Non-empty translated names keyed by language code (e.g. { it, es }).
        names: readLocalizedValues_(row, zoneNameLangCols),
        description: iDesc === undefined ? '' : cellToString(row[iDesc]),
        descriptions: readLocalizedValues_(row, zoneDescLangCols),
        // Optional visual marker (emoji or image URL); '' when the column is absent.
        marker: iMarker === undefined ? '' : cellToString(row[iMarker]),
        themes: [],
      }
      zones.push(current)
    }
    var theme = iTheme === undefined ? '' : cellToString(row[iTheme])
    if (theme && current) {
      current.themes.push({
        name: theme,
        names: readLocalizedValues_(row, themeNameLangCols),
        description: iThemeDesc === undefined ? '' : cellToString(row[iThemeDesc]),
        descriptions: readLocalizedValues_(row, themeDescLangCols),
      })
      themeToZone[theme] = current.name
    }
  }
  return { zones: zones, themeToZone: themeToZone }
}

/**
 * Parses the `Lists` tab. Reads the "Owner options" and "Languages" columns by
 * header name into de-duplicated, order-preserving arrays. When an "Owner marker"
 * column is present, its cell on each owner's row (an emoji or image URL) is
 * collected into an owner→marker map, keyed by the exact owner name.
 *
 * @param {Array<Array<*>>} values full sheet values incl. header row
 * @return {{ owners: string[], languages: string[], ownerMarkers: Object<string,string> }}
 */
function parseLists(values) {
  if (!values || !values.length) return { owners: [], languages: [], ownerMarkers: {} }
  var h = indexHeaders(values[0])
  var iOwner = h['Owner options'], iMarker = h['Owner marker']
  var ownerMarkers = {}
  if (iOwner !== undefined && iMarker !== undefined) {
    for (var r = 1; r < values.length; r++) {
      var name = cellToString(values[r][iOwner])
      if (!name) continue
      var marker = cellToString(values[r][iMarker])
      if (marker) ownerMarkers[name] = marker
    }
  }
  return {
    owners: readColumn(values, h['Owner options']),
    languages: readColumn(values, h['Languages']),
    ownerMarkers: ownerMarkers,
  }
}

/**
 * Collects the non-empty, de-duplicated values of one column (below the header).
 * @param {Array<Array<*>>} values
 * @param {number|undefined} colIndex
 * @return {string[]}
 */
function readColumn(values, colIndex) {
  if (colIndex === undefined) return []
  var seen = {}
  var out = []
  for (var r = 1; r < values.length; r++) {
    var v = cellToString(values[r][colIndex])
    if (v && !seen[v]) {
      seen[v] = true
      out.push(v)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Call-number ID generation
// ---------------------------------------------------------------------------

/**
 * Reduces text to a 3-char uppercase token: strips accents/punctuation and
 * leading articles, keeps digits, pads short results with X.
 * @param {string} text
 * @return {string}
 */
function threeOf(text) {
  var words = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (combining diacritics)
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(function (w) { return w && ARTICLES.indexOf(w) === -1 })
  return (words.join('').toUpperCase().slice(0, 3) || 'XXX').padEnd(3, 'X')
}

/**
 * Builds the base call-number ID `AAA-TTT-YYYY` (author-surname / title / year).
 * Collision suffixes (-2, -3…) are applied separately by `uniqueId`.
 * @param {string} title
 * @param {string} author
 * @param {number|string} year
 * @return {string}
 */
function makeId(title, author, year) {
  var firstAuthor = String(author || '').split(/[,&;]/)[0].trim()
  var surname = firstAuthor.split(/\s+/).pop() || ''
  var y = /^\d{4}$/.test(String(year).trim()) ? String(year).trim() : '0000'
  return threeOf(surname) + '-' + threeOf(title) + '-' + y
}

/**
 * Returns a collision-free ID: `makeId(...)`, then -2, -3… against `used`.
 * Immutability is the caller's responsibility (generate once, at creation).
 * @param {string} title
 * @param {string} author
 * @param {number|string} year
 * @param {Object<string, boolean>|Set} used existing IDs (map or Set)
 * @return {string}
 */
function uniqueId(title, author, year, used) {
  var has = used instanceof Set
    ? function (id) { return used.has(id) }
    : function (id) { return !!used[id] }
  var base = makeId(title, author, year)
  var id = base
  var n = 2
  while (has(id)) id = base + '-' + n++
  return id
}

/** True when an ISBN cell is genuinely empty for lookup purposes (blank or N/A). */
function isbnIsAbsent(isbn) {
  var s = cellToString(isbn).toUpperCase()
  return s === '' || s === NO_ISBN
}

// ---------------------------------------------------------------------------
// History (audit log)
// ---------------------------------------------------------------------------

/** The `History` tab's header row, in column order. Auto-created on first log. */
var HISTORY_COLUMNS = ['Timestamp', 'Actor', 'Action', 'EntityId', 'Title', 'Author', 'Theme', 'Changes']

/**
 * Book fields compared for an `update` entry's diff. Deliberately excludes:
 * `id` (immutable), `zone` (derived from theme — diffing it too would just
 * echo the theme change), and `archived`/`borrowed`/`borrowerName`/`loanDate`
 * (those go through their own dedicated actions — archive/restore/loan/return
 * — whose action name already says what changed, per the "no diff needed"
 * rule below).
 * @type {string[]}
 */
var DIFF_FIELDS = [
  'title', 'author', 'year', 'yearPrecision', 'publisher', 'isbn',
  'language', 'originalLanguage', 'coverUrl', 'theme', 'owner',
  'referenceUrl', 'readBy', 'exchange',
]

/**
 * Renders one Book field for display in a diff (arrays joined, blanks shown
 * as an em dash so an empty→value change doesn't look like a no-op).
 * @param {*} v
 * @return {string}
 */
function diffFieldText_(v) {
  if (Array.isArray(v)) return v.join(', ') || '—'
  var s = cellToString(v)
  return s || '—'
}

/**
 * Field-by-field diff between two Book snapshots, e.g.
 * `year: 1998 → 1999; theme: Political Theory → Utopia`. Only changed fields
 * are listed; '' when nothing in `DIFF_FIELDS` differs.
 * @param {Object} before
 * @param {Object} after
 * @return {string}
 */
function diffBook(before, after) {
  var parts = []
  for (var i = 0; i < DIFF_FIELDS.length; i++) {
    var f = DIFF_FIELDS[i]
    var a = diffFieldText_(before[f])
    var b = diffFieldText_(after[f])
    if (a !== b) parts.push(f + ': ' + a + ' → ' + b)
  }
  return parts.join('; ')
}

/**
 * Builds one `History` row (in header order) from a log entry. Resolved by
 * header name like every other sheet write in this file, even though the
 * header is our own constant — reordering `HISTORY_COLUMNS` should never
 * silently misalign a row.
 * @param {{timestamp: string, actor: string, action: string, entityId: string, title: string, author: string, theme: string, changes: string}} entry
 * @param {Array<string>} header
 * @return {Array<string>}
 */
function historyRowCells(entry, header) {
  var map = {
    Timestamp: entry.timestamp,
    Actor: entry.actor,
    Action: entry.action,
    EntityId: entry.entityId,
    Title: entry.title,
    Author: entry.author,
    Theme: entry.theme,
    Changes: entry.changes,
  }
  return header.map(function (h) {
    var v = map[cellToString(h)]
    return v === undefined || v === null ? '' : v
  })
}

/**
 * Parses the `History` tab's raw values into entries, newest row first (the
 * tab itself is append-only, so the last row is the most recent). Column
 * order is resolved by header name.
 * @param {Array<Array<*>>} values full sheet values incl. header row
 * @return {Array<Object>}
 */
function parseHistory(values) {
  if (!values || values.length < 2) return []
  var h = indexHeaders(values[0])
  var out = []
  for (var r = values.length - 1; r >= 1; r--) {
    var row = values[r]
    out.push({
      timestamp: cellToString(cell(row, h, 'Timestamp')),
      actor: cellToString(cell(row, h, 'Actor')),
      action: cellToString(cell(row, h, 'Action')),
      entityId: cellToString(cell(row, h, 'EntityId')),
      title: cellToString(cell(row, h, 'Title')),
      author: cellToString(cell(row, h, 'Author')),
      theme: cellToString(cell(row, h, 'Theme')),
      changes: cellToString(cell(row, h, 'Changes')),
    })
  }
  return out
}

// Node-only export (skipped in Apps Script, where `module` is undefined).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COLUMNS: COLUMNS,
    NO_ISBN: NO_ISBN,
    ARTICLES: ARTICLES,
    cellToString: cellToString,
    parseBool: parseBool,
    parseYear: parseYear,
    parseDate: parseDate,
    splitMulti: splitMulti,
    indexHeaders: indexHeaders,
    mapRowToBook: mapRowToBook,
    bookToCells: bookToCells,
    deriveZone: deriveZone,
    parseZones: parseZones,
    parseLists: parseLists,
    threeOf: threeOf,
    makeId: makeId,
    uniqueId: uniqueId,
    isbnIsAbsent: isbnIsAbsent,
    HISTORY_COLUMNS: HISTORY_COLUMNS,
    diffBook: diffBook,
    historyRowCells: historyRowCells,
    parseHistory: parseHistory,
  }
}
