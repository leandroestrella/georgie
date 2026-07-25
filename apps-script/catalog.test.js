/**
 * Unit tests for the pure catalog logic (run with `npm test` → node --test).
 * These exercise the framework-free functions in catalog.js with data shaped
 * like the real sheet. No SpreadsheetApp, no network.
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const c = require('./catalog.js')

// A Zones tab shaped exactly like the real one (row-grouped), incl. a Marker column
// and per-language Description columns.
const ZONES_VALUES = [
  ['Title', 'Description', 'Description (it)', 'Description (es)', 'Themes', 'Marker'],
  ['Contemporary Art, Curation & Design', 'Physical and visual practices.', 'Pratiche fisiche e visive.', 'Prácticas físicas y visuales.', 'Art History & Theory', '🖍️'],
  ['', '', '', '', 'Exhibitions & Catalogs', ''],
  ['', '', '', '', 'Architecture & Spatial Design', ''],
  ['The Narrative Universes (Fiction & Poetry)', 'The imagined.', "L'immaginato.", '', 'Dystopia & Alternate Realities', 'https://example.com/zone.png'],
  ['', '', '', '', 'Contemporary & Short Stories', ''],
  ['', '', '', '', 'Poetry', ''],
]

const LISTS_VALUES = [
  ['Type options', 'Owner options', 'Languages', 'Owner marker'],
  ['', 'leandro', 'English', 'https://example.com/leandro.ico'],
  ['', 'maria', 'Spanish', '🐈'],
  ['', 'hugo', 'Italian', ''],
  ['', '', 'Polish', ''],
]

const CATALOG_HEADER = [
  'ID', 'Title', 'Author', 'Year', 'Year precision', 'Publisher', 'ISBN / EAN',
  'Language', 'Original language', 'Cover URL', 'Theme', 'Zone', 'Owner',
  'Reference URL', 'Read by', 'Borrowed', 'Borrower name', 'Loan date',
  'Exchange', 'Archived',
]

test('parseZones builds zones + theme→zone map from row groups', () => {
  const { zones, themeToZone } = c.parseZones(ZONES_VALUES)
  assert.equal(zones.length, 2)
  assert.deepEqual(zones[0].themes, [
    'Art History & Theory', 'Exhibitions & Catalogs', 'Architecture & Spatial Design',
  ])
  assert.equal(themeToZone['Poetry'], 'The Narrative Universes (Fiction & Poetry)')
  assert.equal(zones[0].description, 'Physical and visual practices.')
})

test('parseLists reads owners and languages by header name', () => {
  const { owners, languages } = c.parseLists(LISTS_VALUES)
  assert.deepEqual(owners, ['leandro', 'maria', 'hugo'])
  assert.deepEqual(languages, ['English', 'Spanish', 'Italian', 'Polish'])
})

test('parseZones reads per-language Description columns into descriptions', () => {
  const { zones } = c.parseZones(ZONES_VALUES)
  assert.equal(zones[0].description, 'Physical and visual practices.')
  assert.deepEqual(zones[0].descriptions, {
    it: 'Pratiche fisiche e visive.',
    es: 'Prácticas físicas y visuales.',
  })
  // Blank translation cells are omitted (es left blank for this zone).
  assert.deepEqual(zones[1].descriptions, { it: "L'immaginato." })
  // No localized columns at all → empty descriptions object.
  const noLoc = c.parseZones([['Title', 'Description', 'Themes'], ['Z', 'd', 'T']])
  assert.deepEqual(noLoc.zones[0].descriptions, {})
})

test('parseZones reads the Marker column onto each zone (empty when absent)', () => {
  const { zones } = c.parseZones(ZONES_VALUES)
  assert.equal(zones[0].marker, '🖍️')
  assert.equal(zones[1].marker, 'https://example.com/zone.png')
  // A Zones tab without a Marker column yields '' rather than undefined.
  const noMarker = c.parseZones([
    ['Title', 'Description', 'Themes'],
    ['Z', 'd', 'T'],
  ])
  assert.equal(noMarker.zones[0].marker, '')
})

test('parseLists builds owner→marker map, skipping owners with no marker', () => {
  const { ownerMarkers } = c.parseLists(LISTS_VALUES)
  assert.deepEqual(ownerMarkers, {
    leandro: 'https://example.com/leandro.ico',
    maria: '🐈',
  })
  // No Owner marker column → empty map, not undefined.
  const noMarker = c.parseLists([
    ['Owner options', 'Languages'],
    ['leandro', 'English'],
  ])
  assert.deepEqual(noMarker.ownerMarkers, {})
})

test('deriveZone resolves theme parent, empty for unknown', () => {
  const { themeToZone } = c.parseZones(ZONES_VALUES)
  assert.equal(c.deriveZone('Poetry', themeToZone), 'The Narrative Universes (Fiction & Poetry)')
  assert.equal(c.deriveZone('Nonexistent', themeToZone), '')
  assert.equal(c.deriveZone('', themeToZone), '')
})

test('mapRowToBook maps a full row and DERIVES zone from theme', () => {
  const { themeToZone } = c.parseZones(ZONES_VALUES)
  const idx = c.indexHeaders(CATALOG_HEADER)
  // Note: stored Zone column is intentionally wrong to prove it is ignored.
  const row = [
    'GRE-LES-2018', 'Less', 'Andrew Sean Greer', 2018, '', 'Abacus', '9780349143590',
    'English', 'English', 'https://covers/…-M.jpg', 'Contemporary & Short Stories',
    'WRONG ZONE', 'leandro', '', 'leandro, maria', false, '', '', false, false,
  ]
  const b = c.mapRowToBook(row, idx, themeToZone)
  assert.equal(b.id, 'GRE-LES-2018')
  assert.equal(b.year, 2018)
  assert.equal(b.zone, 'The Narrative Universes (Fiction & Poetry)') // derived, not 'WRONG ZONE'
  assert.deepEqual(b.readBy, ['leandro', 'maria'])
  assert.equal(b.borrowed, false)
})

test('mapRowToBook handles N/A isbn, circa year, blank year, multi-language', () => {
  const { themeToZone } = c.parseZones(ZONES_VALUES)
  const idx = c.indexHeaders(CATALOG_HEADER)
  const row = [
    'URB-BAU-2016', 'Bausler Institut', 'Accademia di Belle Arti di Urbino', '', 'circa',
    'Accademia', 'N/A', 'English, Italian', 'English', '', 'Exhibitions & Catalogs',
    '', 'leandro', '', '', 'TRUE', 'Gianluca', '', 'FALSE', 'FALSE',
  ]
  const b = c.mapRowToBook(row, idx, themeToZone)
  assert.equal(b.year, null)
  assert.equal(b.yearPrecision, 'circa')
  assert.equal(b.isbn, 'N/A')
  assert.deepEqual(b.language, ['English', 'Italian'])
  assert.equal(b.borrowed, true) // string 'TRUE'
  assert.equal(b.borrowerName, 'Gianluca')
  assert.equal(b.zone, 'Contemporary Art, Curation & Design')
})

test('mapRowToBook serializes a Date loan date to ISO and returns null for blank rows', () => {
  const idx = c.indexHeaders(CATALOG_HEADER)
  const withDate = CATALOG_HEADER.map(() => '')
  withDate[idx['Title']] = 'Some Book'
  withDate[idx['Loan date']] = new Date(2024, 2, 5) // 5 Mar 2024
  const b = c.mapRowToBook(withDate, idx, {})
  assert.equal(b.loanDate, '2024-03-05')

  const blank = CATALOG_HEADER.map(() => '')
  assert.equal(c.mapRowToBook(blank, idx, {}), null)
})

test('makeId follows the call-number scheme (real examples)', () => {
  assert.equal(c.makeId('1984', 'George Orwell', 1950), 'ORW-198-1950')
  assert.equal(c.makeId('Less', 'Andrew Sean Greer', 2018), 'GRE-LES-2018')
  // institution / anthology author
  assert.equal(c.makeId('III Warsaw Media Art', 'AA. VV.', 2010), 'VVX-III-2010')
  // leading article skipped in title; hyphen/accents collapse "Saint-Exupéry" → SAI
  assert.equal(c.makeId('The Master', 'Antoine de Saint-Exupéry', 1939), 'SAI-MAS-1939')
  // unknown year → 0000
  assert.equal(c.makeId('OSM Kids', 'Paolo A. Ruggeri', ''), 'RUG-OSM-0000')
})

test('uniqueId appends collision suffixes', () => {
  const used = { 'ORW-198-1950': true, 'ORW-198-1950-2': true }
  assert.equal(c.uniqueId('1984', 'George Orwell', 1950, used), 'ORW-198-1950-3')
  assert.equal(c.uniqueId('Fresh', 'New Author', 2020, used), 'AUT-FRE-2020')
  // also works with a Set
  assert.equal(c.uniqueId('1984', 'George Orwell', 1950, new Set(['ORW-198-1950'])), 'ORW-198-1950-2')
})

test('bookToCells round-trips and writes derived Zone + joined multi-values', () => {
  const { themeToZone } = c.parseZones(ZONES_VALUES)
  const book = {
    id: 'X', title: 'T', author: 'A', year: null, yearPrecision: 'circa',
    publisher: '', isbn: 'N/A', language: ['English', 'Italian'], originalLanguage: '',
    coverUrl: '', theme: 'Poetry', zone: 'ignored', owner: 'leandro', referenceUrl: '',
    readBy: ['leandro'], borrowed: true, borrowerName: 'Sam', loanDate: '2024-01-01',
    exchange: false, archived: false,
  }
  const cells = c.bookToCells(book, CATALOG_HEADER, themeToZone)
  assert.equal(cells['Zone'], 'The Narrative Universes (Fiction & Poetry)') // derived
  assert.equal(cells['Year'], '') // null → blank
  assert.equal(cells['Language'], 'English, Italian')
  assert.equal(cells['Read by'], 'leandro')
  assert.equal(cells['Borrowed'], true)
})

test('isbnIsAbsent treats blank and N/A as absent', () => {
  assert.equal(c.isbnIsAbsent(''), true)
  assert.equal(c.isbnIsAbsent('N/A'), true)
  assert.equal(c.isbnIsAbsent('n/a'), true)
  assert.equal(c.isbnIsAbsent('9780349143590'), false)
})
