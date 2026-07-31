/**
 * Georgie — Apps Script web app (bound to the "library home" spreadsheet).
 *
 * The ONLY thing that touches the spreadsheet. Runs as the sheet owner and
 * exposes a small JSON API:
 *   - doGet  → public reads  (?action=books, ?action=taxonomies)
 *   - doPost → admin-gated: writes (addBook, updateBook, deleteBook, restoreBook,
 *     setLoan, setExchange, completeExchange, saveCover) and admin-only reads
 *     (allBooks, history)
 *
 * All pure logic (mapping, taxonomy, ID generation, auth decisions) lives in
 * catalog.js / auth.js and is unit-tested in Node. This file is just the glue:
 * read values → call pure fn → write values. Columns are resolved by header name.
 *
 * AUTH: reads are public; every write verifies the caller's Google ID token
 * (via Google's tokeninfo endpoint) and checks the email against the admin
 * allowlist in the `Users` tab before touching the sheet (see requireAdmin_).
 *
 * Cross-origin note: browsers can't send a JSON preflight to Apps Script, so the
 * SPA POSTs with Content-Type text/plain and a JSON string body — hence the
 * manual JSON.parse of e.postData.contents below.
 */

var CATALOG_SHEET = 'Catalog'
var ZONES_SHEET = 'Zones'
var LISTS_SHEET = 'Lists'
var USERS_SHEET = 'Users'
var HISTORY_SHEET = 'History'
var VERSION = '0.2.0'

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
    // "me" reports the caller's admin status without throwing — the SPA uses it
    // to decide whether to show edit controls after sign-in.
    if (body.action === 'me') return json(whoAmI_(body))

    var admin = requireAdmin_(body) // throws unless the caller is an allowed admin
    switch (body.action) {
      // Admin-only read: the public GET hides archived books, but admins need to
      // see them (Archived view / restore), so this goes through the auth gate.
      case 'allBooks':
        return json({ ok: true, books: getBooks_(true) })
      // Admin-only read: the audit log of every write, newest first.
      case 'history':
        return json({ ok: true, entries: getHistory_() })
      case 'addBook':
        return json({ ok: true, book: addBook_(body.book, admin) })
      case 'updateBook':
        return json({ ok: true, book: updateBook_(body.id, body.patch, admin.owner, 'update') })
      case 'deleteBook':
        return json({ ok: true, book: updateBook_(body.id, { archived: true }, admin.owner, 'archive', '') })
      case 'restoreBook':
        return json({ ok: true, book: updateBook_(body.id, { archived: false }, admin.owner, 'restore', '') })
      case 'setLoan':
        return json({ ok: true, book: setLoan_(body.id, body.loan, admin.owner) })
      case 'setExchange':
        return json({ ok: true, book: setExchange_(body.id, body.exchange, admin.owner) })
      case 'completeExchange':
        return json({ ok: true, book: completeExchange_(body.id, admin.owner) })
      case 'saveCover':
        return json({ ok: true, book: saveCover_(body, admin.owner) })
      default:
        return json({ ok: false, error: 'unknown action: ' + body.action })
    }
  } catch (err) {
    return json({ ok: false, error: errorMessage_(err) })
  }
}

/**
 * Snapshots a cover image to the cover host (cPanel `upload-cover.php`) and points
 * the book's `Cover URL` at the stored copy, so the cover no longer depends on a
 * live external source. The image is either fetched from a URL (`url` — the cover
 * currently shown in the app) or supplied as base64 bytes (`image` — e.g. a photo
 * of the physical cover taken by the admin).
 *
 * Config via Script Properties: `COVERS_UPLOAD_URL` (the PHP endpoint) and
 * `COVERS_UPLOAD_SECRET` (shared with it). Requires the UrlFetchApp scope, which
 * the token verifier already uses.
 *
 * @param {{id: string, url?: string, image?: string, contentType?: string}} body
 * @param {string} actor the acting admin's owner label, for the audit log
 * @return {Book} the updated book
 */
function saveCover_(body, actor) {
  var props = PropertiesService.getScriptProperties()
  var endpoint = props.getProperty('COVERS_UPLOAD_URL')
  var secret = props.getProperty('COVERS_UPLOAD_SECRET')
  if (!endpoint || !secret) {
    throw new Error('Cover host not configured (set COVERS_UPLOAD_URL / COVERS_UPLOAD_SECRET)')
  }
  var id = cellToString(body.id)
  if (!id) throw new Error('Book id is required')

  var blob
  if (body.image) {
    blob = Utilities.newBlob(Utilities.base64Decode(body.image), body.contentType || 'image/jpeg', id)
  } else if (body.url) {
    var resp = UrlFetchApp.fetch(body.url, { muteHttpExceptions: true, followRedirects: true })
    if (resp.getResponseCode() !== 200) {
      throw new Error('Could not fetch the cover (HTTP ' + resp.getResponseCode() + ')')
    }
    blob = resp.getBlob()
    if ((blob.getContentType() || '').indexOf('image/') !== 0) {
      throw new Error('That URL is not an image (' + blob.getContentType() + ')')
    }
    if (blob.getBytes().length < 1024) throw new Error('The cover image looks empty')
  } else {
    throw new Error('Provide a cover url or an uploaded image')
  }

  var up = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    headers: { 'X-Upload-Secret': secret },
    payload: { id: id, file: blob },
    muteHttpExceptions: true,
  })
  if (up.getResponseCode() !== 200) {
    throw new Error('Cover host rejected the upload (HTTP ' + up.getResponseCode() + '): ' + up.getContentText().slice(0, 200))
  }
  var out = JSON.parse(up.getContentText())
  if (!out || !out.ok || !out.url) {
    throw new Error('Cover host error: ' + (out && out.error ? out.error : 'unknown'))
  }

  // Cache-buster so re-uploading the same id shows the new image immediately.
  var coverUrl = out.url + (out.url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now()
  return updateBook_(id, { coverUrl: coverUrl }, actor, 'update')
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
 * @return {{ zones: Zone[], themeToZone: Object<string,string>, owners: string[], languages: string[], users: string[] }}
 */
function getTaxonomies_() {
  var z = parseZones(readValues_(ZONES_SHEET))
  var lists = parseLists(readValues_(LISTS_SHEET))
  return {
    zones: z.zones,
    themeToZone: z.themeToZone,
    owners: lists.owners,
    languages: lists.languages,
    ownerMarkers: lists.ownerMarkers,
    users: getUsers_(),
  }
}

/**
 * The distinct Owner labels from the `Users` tab (the admin write-allowlist) —
 * i.e. real people, as opposed to `Lists`' `owners` which can include
 * non-human entries (e.g. a pet whose books are tracked but who doesn't
 * "read"). Only the Owner label is exposed here, never the Email column.
 * @return {string[]}
 */
function getUsers_() {
  var owners = Object.values(getAdmins_())
  var seen = {}
  var out = []
  for (var i = 0; i < owners.length; i++) {
    var name = owners[i]
    if (name && !seen[name]) {
      seen[name] = true
      out.push(name)
    }
  }
  return out
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
  logHistory_(admin && admin.owner, 'add', book, '')
  return book
}

/**
 * Applies a partial patch to an existing book (found by ID) and rewrites its
 * known columns. The ID itself is immutable and never changed here.
 * @param {string} id
 * @param {Object} patch partial Book fields to overwrite
 * @param {string=} actor the acting admin's owner label — when given, logs a
 *   `History` entry; omit for internal calls that shouldn't log (none today).
 * @param {string=} action defaults to `'update'` (auto-diffed); pass
 *   `'archive'`/`'restore'`/`'loan'`/`'return'` for actions whose name alone
 *   already says what changed.
 * @param {string=} changes explicit audit-log summary, overriding the
 *   auto-diff — pass `''` for actions that need no summary at all.
 * @return {Book} the updated book
 */
function updateBook_(id, patch, actor, action, changes) {
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

  if (actor) {
    var act = action || 'update'
    var summary = changes !== undefined ? changes : act === 'update' ? diffBook(current, merged) : ''
    logHistory_(actor, act, merged, summary)
  }
  return merged
}

/**
 * Sets or clears a loan. `loan` = null/false returns the book (clears flag,
 * borrower, date); otherwise borrows it (date defaults to today).
 * @param {string} id
 * @param {{borrowerName?: string, loanDate?: string}|null} loan
 * @param {string} actor the acting admin's owner label, for the audit log
 * @return {Book}
 */
function setLoan_(id, loan, actor) {
  if (!loan) {
    return updateBook_(id, { borrowed: false, borrowerName: '', loanDate: '' }, actor, 'return', '')
  }
  var borrowerName = loan.borrowerName || ''
  var loanDate = loan.loanDate || todayIso_()
  var summary = 'borrower: ' + (borrowerName || '(unknown)') + ' · since ' + loanDate
  return updateBook_(id, { borrowed: true, borrowerName: borrowerName, loanDate: loanDate }, actor, 'loan', summary)
}

/**
 * Sets or clears a book's exchange stage (offered → confirmed → in transit).
 * `exchange` = null withdraws it (clears all three exchange fields). Stage 4
 * ("received") isn't set here — see `completeExchange_`, which archives the
 * book instead of writing a fourth status value.
 * @param {string} id
 * @param {{status: string, note?: string, link?: string}|null} exchange
 * @param {string} actor the acting admin's owner label, for the audit log
 * @return {Book}
 */
function setExchange_(id, exchange, actor) {
  if (!exchange) {
    return updateBook_(
      id,
      { exchangeStatus: '', exchangeNote: '', exchangeLink: '' },
      actor,
      'exchange',
      'withdrawn',
    )
  }
  var status = normalizeExchangeStatus(exchange.status)
  if (!status) throw new Error('Invalid exchange status: ' + exchange.status)
  var note = exchange.note || ''
  var link = exchange.link || ''
  var summary = status + (note ? ' · ' + note : '')
  return updateBook_(
    id,
    { exchangeStatus: status, exchangeNote: note, exchangeLink: link },
    actor,
    'exchange',
    summary,
  )
}

/**
 * Finishes an exchange (stage 4, received): archives the outgoing book and, if
 * its `Exchange link` names another catalog book, clears that book's loan (it
 * reused `Borrowed` to mark "incoming, not yet on the shelf" — see
 * `setExchange_`'s caller in the SPA) and its own `Exchange link`. A missing
 * or stale link is not an error — the outgoing book is archived regardless.
 * @param {string} id the outgoing book's id
 * @param {string} actor the acting admin's owner label, for the audit log
 * @return {Book} the archived outgoing book
 */
function completeExchange_(id, actor) {
  var linkedId = findBookById_(id).exchangeLink
  var outgoing = updateBook_(
    id,
    { exchangeStatus: '', exchangeNote: '', exchangeLink: '', archived: true },
    actor,
    'archive',
    '',
  )
  if (linkedId) {
    try {
      updateBook_(
        linkedId,
        { borrowed: false, borrowerName: '', loanDate: '', exchangeLink: '' },
        actor,
        'return',
        '',
      )
    } catch (err) {
      // The linked book may have been renamed/removed by hand — the outgoing
      // book is still correctly archived, so this isn't fatal.
    }
  }
  return outgoing
}

// ---------------------------------------------------------------------------
// History (audit log)
// ---------------------------------------------------------------------------

/**
 * Reads the `History` tab, newest first. Returns an empty list rather than
 * throwing when the tab doesn't exist yet (no admin action has logged
 * anything yet, or this is a freshly-copied sheet).
 * @return {Array<Object>}
 */
function getHistory_() {
  var sheet = getSpreadsheet_().getSheetByName(HISTORY_SHEET)
  if (!sheet) return []
  return parseHistory(sheet.getDataRange().getValues())
}

/**
 * Appends one row to the `History` tab, creating it (with its header row) on
 * first use. Logging failures must never break the write they're describing —
 * every error here is swallowed, not rethrown.
 * @param {string} actor the acting admin's owner label
 * @param {string} action `add` / `update` / `archive` / `restore` / `loan` / `return`
 * @param {Book} book the book after the write (its post-write state)
 * @param {string} changes a diff summary, or '' when the action needs none
 */
function logHistory_(actor, action, book, changes) {
  try {
    var ss = getSpreadsheet_()
    var sheet = ss.getSheetByName(HISTORY_SHEET)
    if (!sheet) {
      sheet = ss.insertSheet(HISTORY_SHEET)
      sheet.appendRow(HISTORY_COLUMNS)
    }
    var row = historyRowCells(
      {
        timestamp: new Date().toISOString(),
        actor: actor || '',
        action: action,
        entityId: book.id,
        title: book.title,
        author: book.author,
        theme: book.theme,
        changes: changes || '',
      },
      HISTORY_COLUMNS,
    )
    sheet.appendRow(row)
  } catch (err) {
    // Swallowed on purpose — see the JSDoc above.
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Reports the caller's identity + admin status. Never throws — returns
 * `admin: false` (with a reason) for anonymous or non-admin callers.
 * @param {Object} body parsed POST body (expects `idToken`)
 * @return {{ok: true, admin: boolean, email: string, owner: string, reason: string}}
 */
function whoAmI_(body) {
  var r = authorize_(body)
  return { ok: true, admin: r.admin, email: r.email, owner: r.owner, reason: r.reason }
}

/**
 * Verifies the caller is an allowed admin, or throws. Returns their identity so
 * write handlers can attribute the change (email → owner label).
 * @param {Object} body parsed POST body (expects `idToken`)
 * @return {{email: string, owner: string}}
 */
function requireAdmin_(body) {
  var r = authorize_(body)
  if (!r.admin) throw new Error('Not authorized: ' + r.reason)
  return { email: r.email, owner: r.owner }
}

/**
 * Runs the full authorization decision for a request: validate the ID token with
 * Google, then apply audience + allowlist checks (pure logic in auth.js).
 * @param {Object} body
 * @return {{admin: boolean, email: string, owner: string, reason: string}}
 */
function authorize_(body) {
  var token = body && body.idToken
  if (!token) return { admin: false, email: '', owner: '', reason: 'sign-in required' }
  var claims = verifyIdToken_(token)
  return evaluateAdmin(claims, getClientId_(), getAdmins_())
}

/**
 * Validates a Google ID token via the public tokeninfo endpoint (checks the
 * signature and expiry server-side) and returns its claims, or null if invalid.
 * @param {string} idToken
 * @return {Object|null}
 */
function verifyIdToken_(idToken) {
  try {
    var res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true },
    )
    if (res.getResponseCode() !== 200) return null
    return JSON.parse(res.getContentText())
  } catch (err) {
    return null
  }
}

/** @return {string} the OAuth client ID this backend accepts tokens for. */
function getClientId_() {
  return PropertiesService.getScriptProperties().getProperty('OAUTH_CLIENT_ID') || ''
}

/**
 * Reads the admin allowlist from the `Users` tab (email→owner). Returns an empty
 * allowlist when the tab is absent, so writes simply fail closed.
 * @return {Object<string, string>}
 */
function getAdmins_() {
  var sheet = getSpreadsheet_().getSheetByName(USERS_SHEET)
  if (!sheet) return {}
  return parseUsers(sheet.getDataRange().getValues())
}

/**
 * One-time setup: creates the `Users` admin-allowlist tab if missing and seeds
 * it with the deploying account. Run once from the editor, then edit the tab to
 * add/remove admins (Email, Owner columns). Safe to re-run.
 * @return {string} a human-readable status.
 */
function setupUsersTab() {
  var ss = getSpreadsheet_()
  var sheet = ss.getSheetByName(USERS_SHEET)
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET)
    sheet.appendRow(['Email', 'Owner'])
    sheet.appendRow([Session.getEffectiveUser().getEmail(), 'leandro'])
  }
  return USERS_SHEET + ' tab ready with ' + Math.max(0, sheet.getLastRow() - 1) + ' admin(s).'
}

/**
 * One-time migration (§3.9): after adding the `Exchange status` / `Exchange
 * note` / `Exchange link` columns by hand, run this once to carry over the old
 * boolean `Exchange` column — every truthy row becomes `offered`. Does not
 * touch or delete the old `Exchange` column; remove it by hand once verified.
 * Safe to re-run (skips rows that already have a status).
 * @return {string} a human-readable summary.
 */
function migrateExchangeStatus() {
  var sheet = getSheet_(CATALOG_SHEET)
  var values = sheet.getDataRange().getValues()
  var header = values[0]
  var headerIndex = indexHeaders(header)
  var iOld = headerIndex['Exchange']
  var iNew = headerIndex[COLUMNS.exchangeStatus]
  if (iOld === undefined) return 'No old "Exchange" column found — nothing to migrate.'
  if (iNew === undefined) return 'Add the "Exchange status" column before running this.'

  var migrated = 0
  for (var r = 1; r < values.length; r++) {
    if (cellToString(values[r][iNew])) continue // already has a status
    if (parseBool(values[r][iOld])) {
      sheet.getRange(r + 1, iNew + 1).setValue('offered')
      migrated++
    }
  }
  return 'Migrated ' + migrated + ' row(s) to Exchange status = offered.'
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
 * Reads one book by ID, current sheet state. Throws if not found.
 * @param {string} id
 * @return {Book}
 */
function findBookById_(id) {
  var values = readValues_(CATALOG_SHEET)
  var headerIndex = indexHeaders(values[0])
  var themeToZone = parseZones(readValues_(ZONES_SHEET)).themeToZone
  var rowNumber = findRowById_(values, headerIndex, id)
  if (rowNumber === -1) throw new Error('Book not found: ' + id)
  return mapRowToBook(values[rowNumber - 1], headerIndex, themeToZone)
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
    exchangeStatus: normalizeExchangeStatus(input.exchangeStatus),
    exchangeNote: cellToString(input.exchangeNote),
    exchangeLink: cellToString(input.exchangeLink),
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
    else if (key === 'borrowed' || key === 'archived') merged[key] = parseBool(v)
    else if (key === 'exchangeStatus') merged[key] = normalizeExchangeStatus(v)
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

/**
 * Google Sheets custom function — the base call-number ID for a book, using the
 * exact same `makeId` logic as the app (accents included). Returns
 * `AAA-TTT-YYYY` **without** the `-2/-3` collision suffix.
 *
 * Use it in a HELPER column, then Paste special → Values only into the real `ID`
 * column and delete the helper — never leave IDs as a live formula, or sorting
 * the sheet would re-mint them. See docs/book-ids.md.
 *
 *   =MAKEID(B2, C2, D2)   // title, author, year
 *
 * @param {string} title The book title.
 * @param {string} author The author(s); only the first author's surname is used.
 * @param {number|string} year The edition year; blank/invalid → 0000.
 * @return {string} The base call-number ID.
 * @customfunction
 */
function MAKEID(title, author, year) {
  return makeId(title, author, year)
}
