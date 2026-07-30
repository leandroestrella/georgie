/**
 * Unit tests for the pure catalog logic (run with `npm test` → node --test).
 * These exercise the framework-free functions in catalog.js with data shaped
 * like the real sheet. No SpreadsheetApp, no network.
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const c = require('./catalog.js')

// A Zones tab shaped exactly like the real one (row-grouped), incl. a Marker
// column and per-language Title/Description/Themes/Theme description columns.
// Column order: Title, Title (it), Title (es), Description, Description (it),
// Description (es), Themes, Themes (it), Themes (es), Theme description,
// Theme description (it), Theme description (es), Marker.
const ZONES_VALUES = [
  [
    'Title', 'Title (it)', 'Title (es)', 'Description', 'Description (it)', 'Description (es)',
    'Themes', 'Themes (it)', 'Themes (es)', 'Theme description', 'Theme description (it)', 'Theme description (es)',
    'Marker',
  ],
  [
    'Contemporary Art, Curation & Design', 'Arte contemporanea', 'Arte contemporáneo',
    'Physical and visual practices.', 'Pratiche fisiche e visive.', 'Prácticas físicas y visuales.',
    'Art History & Theory', "Storia e teoria dell'arte", 'Historia y teoría del arte',
    'What came before.', 'Cosa è venuto prima.', '',
    '🖍️',
  ],
  ['', '', '', '', '', '', 'Exhibitions & Catalogs', '', '', '', '', '', ''],
  ['', '', '', '', '', '', 'Architecture & Spatial Design', '', '', '', '', '', ''],
  [
    'The Narrative Universes (Fiction & Poetry)', '', '',
    'The imagined.', "L'immaginato.", '',
    'Dystopia & Alternate Realities', '', '', '', '', '',
    'https://example.com/zone.png',
  ],
  ['', '', '', '', '', '', 'Contemporary & Short Stories', '', '', '', '', '', ''],
  ['', '', '', '', '', '', 'Poetry', '', '', '', '', '', ''],
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
  assert.deepEqual(zones[0].themes.map((t) => t.name), [
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

test('parseZones reads per-language Title/Themes name columns into names', () => {
  const { zones } = c.parseZones(ZONES_VALUES)
  assert.deepEqual(zones[0].names, { it: 'Arte contemporanea', es: 'Arte contemporáneo' })
  // Blank/absent translation cells are omitted (zone 2's Title (it)/(es) are blank).
  assert.deepEqual(zones[1].names, {})
  assert.deepEqual(zones[0].themes[0].names, {
    it: "Storia e teoria dell'arte",
    es: 'Historia y teoría del arte',
  })
  // A theme row with no Themes (it)/(es) cells → empty names object.
  assert.deepEqual(zones[0].themes[1].names, {})
})

test('parseZones reads the Theme description column (+ per-language) onto each theme', () => {
  const { zones } = c.parseZones(ZONES_VALUES)
  assert.equal(zones[0].themes[0].description, 'What came before.')
  assert.deepEqual(zones[0].themes[0].descriptions, { it: 'Cosa è venuto prima.' })
  // A theme row with no Theme description cell → '' rather than undefined.
  assert.equal(zones[0].themes[1].description, '')
  assert.deepEqual(zones[0].themes[1].descriptions, {})
  // No Theme description column at all → '' description, empty descriptions.
  const noCol = c.parseZones([['Title', 'Description', 'Themes'], ['Z', 'd', 'T']])
  assert.equal(noCol.zones[0].themes[0].description, '')
  assert.deepEqual(noCol.zones[0].themes[0].descriptions, {})
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

// --- History (audit log) ---------------------------------------------------

const BOOK_A = {
  id: 'GRE-LES-2018', title: 'Less', author: 'Andrew Sean Greer', year: 2018,
  yearPrecision: '', publisher: 'Abacus', isbn: '9780349143590',
  language: ['English'], originalLanguage: 'English', coverUrl: '',
  theme: 'Contemporary & Short Stories', zone: 'The Narrative Universes (Fiction & Poetry)',
  owner: 'leandro', referenceUrl: '', readBy: [], borrowed: false, borrowerName: '',
  loanDate: '', exchange: false, archived: false,
}

test('diffBook lists only changed fields, arrays joined, blanks shown as —', () => {
  const before = BOOK_A
  const after = { ...BOOK_A, year: 2019, theme: 'Poetry', language: ['English', 'Italian'], publisher: '' }
  assert.equal(
    c.diffBook(before, after),
    'year: 2018 → 2019; publisher: Abacus → —; language: English → English, Italian; theme: Contemporary & Short Stories → Poetry',
  )
  // No diffable field changed → ''
  assert.equal(c.diffBook(before, { ...before }), '')
  // id/zone/archived/borrowed changes are NOT diffed (own dedicated actions)
  assert.equal(c.diffBook(before, { ...before, id: 'OTHER-000-0000', zone: 'Other Zone', archived: true, borrowed: true }), '')
})

test('historyRowCells maps a log entry to History-tab column order by header name', () => {
  const entry = {
    timestamp: '2026-07-30T12:00:00.000Z', actor: 'leandro', action: 'update',
    entityId: 'GRE-LES-2018', title: 'Less', author: 'Andrew Sean Greer',
    theme: 'Contemporary & Short Stories', changes: 'year: 2018 → 2019',
  }
  assert.deepEqual(c.historyRowCells(entry, c.HISTORY_COLUMNS), [
    '2026-07-30T12:00:00.000Z', 'leandro', 'update', 'GRE-LES-2018', 'Less',
    'Andrew Sean Greer', 'Contemporary & Short Stories', 'year: 2018 → 2019',
  ])
  // Reordered header still lines up correctly — resolved by name, not position.
  const reordered = ['Actor', 'Timestamp', 'Action', 'Title', 'EntityId', 'Author', 'Changes', 'Theme']
  assert.deepEqual(c.historyRowCells(entry, reordered), [
    'leandro', '2026-07-30T12:00:00.000Z', 'update', 'Less', 'GRE-LES-2018',
    'Andrew Sean Greer', 'year: 2018 → 2019', 'Contemporary & Short Stories',
  ])
})

test('parseHistory reads rows newest-first, by header name', () => {
  const values = [
    c.HISTORY_COLUMNS,
    ['2026-07-30T10:00:00.000Z', 'leandro', 'add', 'GRE-LES-2018', 'Less', 'Andrew Sean Greer', 'Contemporary & Short Stories', ''],
    ['2026-07-30T11:00:00.000Z', 'maria', 'loan', 'GRE-LES-2018', 'Less', 'Andrew Sean Greer', 'Contemporary & Short Stories', 'borrower: Sam · since 2026-07-30'],
  ]
  const entries = c.parseHistory(values)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].actor, 'maria') // newest first
  assert.equal(entries[0].action, 'loan')
  assert.equal(entries[1].actor, 'leandro')
  assert.deepEqual(c.parseHistory([c.HISTORY_COLUMNS]), []) // header only → no entries
  assert.deepEqual(c.parseHistory([]), [])
})
