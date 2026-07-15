/**
 * Georgie — Apps Script web app (bound to the "library home" spreadsheet).
 *
 * The ONLY thing that touches the spreadsheet. Runs as the sheet owner and
 * exposes a small JSON API:
 *   - doGet  → public reads  (?action=books, ?action=taxonomies)
 *   - doPost → admin writes   (addBook, updateBook, deleteBook, restoreBook, setLoan)
 *
 * All pure logic (mapping, taxonomy, ID generation) lives in catalog.js and is
 * unit-tested in Node. This file is just the glue: read values → call pure fn →
 * write values. Columns are resolved by header name (see catalog.js).
 *
 * ⚠️  AUTH: write handlers are NOT yet protected — Phase 2 fills in
 *     `requireAdmin_` with Google ID-token verification + the admin allowlist.
 *     Until then, only deploy this against the throwaway DEV sheet copy.
 *
 * Cross-origin note: browsers can't send a JSON preflight to Apps Script, so the
 * SPA POSTs with Content-Type text/plain and a JSON string body — hence the
 * manual JSON.parse of e.postData.contents below.
 */

var CATALOG_SHEET = 'Catalog'
var ZONES_SHEET = 'Zones'
var LISTS_SHEET = 'Lists'
var VERSION = '0.1.0'

/**
 * GET entry point. Reads are public.
 * @param {GoogleAppsScript.Events.DoGet} e
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'health'
    switch (action) {
      case 'health':
        return json({ ok: true, service: 'georgie', version: VERSION })
      case 'books':
        return json({ ok: true, books: getBooks_(false) })
      case 'taxonomies':
        return json({ ok: true, taxonomies: getTaxonomies_() })
      default:
        return json({ ok: false, error: 'unknown action: ' + action })
    }
  } catch (err) {
    return json({ ok: false, error: errorMessage_(err) })
  }
}

/**
 * POST entry point. Every write should be admin-gated (Phase 2).
 * @param {GoogleAppsScript.Events.DoPost} e
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var admin = requireAdmin_(body) // throws if not an allowed admin (Phase 2)
    switch (body.action) {
      case 'addBook':
        return json({ ok: true, book: addBook_(body.book, admin) })
      case 'updateBook':
        return json({ ok: true, book: updateBook_(body.id, body.patch) })
      case 'deleteBook':
        return json({ ok: true, book: updateBook_(body.id, { archived: true }) })
      case 'restoreBook':
        return json({ ok: true, book: updateBook_(body.id, { archived: false }) })
      case 'setLoan':
        return json({ ok: true, book: setLoan_(body.id, body.loan) })
      default:
        return json({ ok: false, error: 'unknown action: ' + body.action })
    }
  } catch (err) {
    return json({ ok: false, error: errorMessage_(err) })
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Returns all books, mapped and with Zone derived from Theme. Archived books are
 * excluded unless `includeArchived` (an admin-only path, gated in Phase 2).
 * @param {boolean} includeArchived
 * @return {Book[]}
 */
function getBooks_(includeArchived) {
  var values = readValues_(CATALOG_SHEET)
  if (values.length < 2) return []
  var headerIndex = indexHeaders(values[0])
  var themeToZone = parseZones(readValues_(ZONES_SHEET)).themeToZone
  var books = []
  for (var r = 1; r < values.length; r++) {
    var b = mapRowToBook(values[r], headerIndex, themeToZone)
    if (!b) continue
    if (!includeArchived && b.archived) continue
    books.push(b)
  }
  return books
}

/**
 * Reads the Zones + Lists tabs into the taxonomy the SPA needs.
 * @return {{ zones: Zone[], themeToZone: Object<string,string>, owners: string[], languages: string[] }}
 */
function getTaxonomies_() {
  var z = parseZones(readValues_(ZONES_SHEET))
  var lists = parseLists(readValues_(LISTS_SHEET))
  return {
    zones: z.zones,
    themeToZone: z.themeToZone,
    owners: lists.owners,
    languages: lists.languages,
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Appends a new book. Generates an immutable, collision-free call-number ID from
 * the existing IDs, then writes a fully-mapped row.
 * @param {Book} input partial book from the form (no id)
 * @param {{owner: string}} admin the acting admin
 * @return {Book} the created book (with its assigned id)
 */
function addBook_(input, admin) {
  if (!input || !cellToString(input.title)) throw new Error('Title is required')
  var sheet = getSheet_(CATALOG_SHEET)
  var values = sheet.getDataRange().getValues()
  var header = values[0]
  var headerIndex = indexHeaders(header)
  var themeToZone = parseZones(readValues_(ZONES_SHEET)).themeToZone

  var used = {}
  var iId = headerIndex[COLUMNS.id]
  for (var r = 1; r < values.length; r++) {
    var id = cellToString(values[r][iId])
    if (id) used[id] = true
  }

  var book = normalizeInput_(input)
  book.owner = book.owner || (admin && admin.owner) || ''
  book.id = uniqueId(book.title, book.author, book.year, used)

  var cells = bookToCells(book, header, themeToZone)
  sheet.appendRow(header.map(function (h) {
    var name = cellToString(h)
    return name in cells ? cells[name] : ''
  }))
  return book
}

/**
 * Applies a partial patch to an existing book (found by ID) and rewrites its
 * known columns. The ID itself is immutable and never changed here.
 * @param {string} id
 * @param {Object} patch partial Book fields to overwrite
 * @return {Book} the updated book
 */
function updateBook_(id, patch) {
  var sheet = getSheet_(CATALOG_SHEET)
  var values = sheet.getDataRange().getValues()
  var header = values[0]
  var headerIndex = indexHeaders(header)
  var themeToZone = parseZones(readValues_(ZONES_SHEET)).themeToZone

  var rowNumber = findRowById_(values, headerIndex, id)
  if (rowNumber === -1) throw new Error('Book not found: ' + id)

  var current = mapRowToBook(values[rowNumber - 1], headerIndex, themeToZone)
  var merged = mergeBook_(current, patch)
  merged.id = current.id // never regenerate

  var cells = bookToCells(merged, header, themeToZone)
  var rowValues = header.map(function (h, i) {
    var name = cellToString(h)
    return name in cells ? cells[name] : values[rowNumber - 1][i]
  })
  sheet.getRange(rowNumber, 1, 1, header.length).setValues([rowValues])
  return merged
}

/**
 * Sets or clears a loan. `loan` = null/false returns the book (clears flag,
 * borrower, date); otherwise borrows it (date defaults to today).
 * @param {string} id
 * @param {{borrowerName?: string, loanDate?: string}|null} loan
 * @return {Book}
 */
function setLoan_(id, loan) {
  if (!loan) {
    return updateBook_(id, { borrowed: false, borrowerName: '', loanDate: '' })
  }
  return updateBook_(id, {
    borrowed: true,
    borrowerName: loan.borrowerName || '',
    loanDate: loan.loanDate || todayIso_(),
  })
}

// ---------------------------------------------------------------------------
// Auth (Phase 2 fills this in)
// ---------------------------------------------------------------------------

/**
 * Verifies the caller is an allowed admin and returns their identity.
 *
 * ⚠️ STUB — Phase 2 will verify `body.idToken` via Google's tokeninfo endpoint
 * (audience = OAuth client ID) and match the email against the admin allowlist
 * in Script Properties. Until then this performs NO enforcement and must only
 * run against the dev sheet copy.
 *
 * @param {Object} body the parsed POST body
 * @return {{email: string, owner: string}}
 */
function requireAdmin_(body) {
  return { email: '', owner: (body && body.owner) || '' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The spreadsheet to operate on: the Script Property `SHEET_ID` if set,
 * otherwise the bound active spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive()
}

/**
 * @param {string} name
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name)
  if (!sheet) throw new Error('Missing sheet tab: ' + name)
  return sheet
}

/**
 * Reads a tab's full 2-D values (header row included).
 * @param {string} name
 * @return {Array<Array<*>>}
 */
function readValues_(name) {
  return getSheet_(name).getDataRange().getValues()
}

/**
 * Finds the 1-based row number of the row whose ID column equals `id`.
 * @param {Array<Array<*>>} values
 * @param {Object<string, number>} headerIndex
 * @param {string} id
 * @return {number} 1-based row number, or -1
 */
function findRowById_(values, headerIndex, id) {
  var iId = headerIndex[COLUMNS.id]
  if (iId === undefined) return -1
  var target = cellToString(id)
  for (var r = 1; r < values.length; r++) {
    if (cellToString(values[r][iId]) === target) return r + 1
  }
  return -1
}

/**
 * Coerces a raw form input into a well-typed Book (arrays, year, flags).
 * @param {Object} input
 * @return {Book}
 */
function normalizeInput_(input) {
  return {
    id: cellToString(input.id),
    title: cellToString(input.title),
    author: cellToString(input.author),
    year: input.year == null || input.year === '' ? null : parseYear(input.year),
    yearPrecision: cellToString(input.yearPrecision).toLowerCase() === 'circa' ? 'circa' : '',
    publisher: cellToString(input.publisher),
    isbn: cellToString(input.isbn),
    language: toArray_(input.language),
    originalLanguage: cellToString(input.originalLanguage),
    coverUrl: cellToString(input.coverUrl),
    theme: cellToString(input.theme),
    zone: '',
    owner: cellToString(input.owner),
    referenceUrl: cellToString(input.referenceUrl),
    readBy: toArray_(input.readBy),
    borrowed: parseBool(input.borrowed),
    borrowerName: cellToString(input.borrowerName),
    loanDate: cellToString(input.loanDate),
    exchange: parseBool(input.exchange),
    archived: parseBool(input.archived),
  }
}

/**
 * Applies a shallow patch onto a Book, coercing array/flag fields when present.
 * @param {Book} current
 * @param {Object} patch
 * @return {Book}
 */
function mergeBook_(current, patch) {
  var merged = {}
  for (var k in current) merged[k] = current[k]
  if (!patch) return merged
  for (var key in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    var v = patch[key]
    if (key === 'language' || key === 'readBy') merged[key] = toArray_(v)
    else if (key === 'borrowed' || key === 'exchange' || key === 'archived') merged[key] = parseBool(v)
    else if (key === 'year') merged[key] = v == null || v === '' ? null : parseYear(v)
    else merged[key] = v
  }
  return merged
}

/**
 * Normalizes a value into a string array (accepts arrays or comma-strings).
 * @param {*} v
 * @return {string[]}
 */
function toArray_(v) {
  if (Array.isArray(v)) return v.map(function (s) { return cellToString(s) }).filter(Boolean)
  return splitMulti(v)
}

/** @return {string} today as ISO YYYY-MM-DD in the script's timezone. */
function todayIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
}

/**
 * Wraps a payload as a JSON TextOutput response.
 * @param {*} payload
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

/**
 * @param {*} err
 * @return {string}
 */
function errorMessage_(err) {
  return err && err.message ? err.message : String(err)
}
