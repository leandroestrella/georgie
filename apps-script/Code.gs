/**
 * Georgie — Apps Script backend (bound to the "library home" spreadsheet).
 *
 * This web app is the ONLY thing that touches the spreadsheet. It runs as the
 * sheet owner and exposes a small JSON API:
 *   - doGet  → public reads  (?action=books, ?action=taxonomies)
 *   - doPost → admin writes   (addBook, updateBook, deleteBook, setLoan)
 *
 * Reads are open; every write is verified against a Google ID token + admin
 * allowlist before anything is modified (added in Phase 2). Column access is
 * always by HEADER NAME, never by position, so inserting/reordering sheet
 * columns can never corrupt the mapping.
 *
 * Source of truth for the design: PLAN.md at the repo root.
 *
 * NOTE: This is the Phase 0 scaffold — a health check only. The full read/write
 * API and the pure, testable mapping/ID/taxonomy logic land in Phase 1.
 */

/**
 * Handles GET requests. For now, only a health check so the deployed web app
 * can be verified end-to-end before the real read handlers exist.
 *
 * @param {GoogleAppsScript.Events.DoGet} e The request event.
 * @return {GoogleAppsScript.Content.TextOutput} JSON response.
 */
function doGet(e) {
  return jsonResponse({ ok: true, service: 'georgie', version: '0.0.0' })
}

/**
 * Serializes a value as a JSON `TextOutput` response.
 *
 * @param {*} payload Any JSON-serializable value.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
